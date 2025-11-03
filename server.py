#!/usr/bin/env python3
"""
FastAPI WebSocket Server for AI Team Multi-Agent System
Handles real-time communication between React frontend and Python backend
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
from typing import Dict, List
import base64
import time

from agents import MultiAgentSystem, AGENTS
from kg_loader import get_kg_loader
from graph_view import GraphView
from graph_highlighter import GraphHighlighter
from utils import get_openai_api_key
from openai import OpenAI
import websockets
from conversation_manager import get_conversation_manager
from graph_analytics import GraphAnalytics
import uuid

# Initialize
app = FastAPI(title="AI Team Multi-Agent API")

# CORS for React frontend (includes Azure Static Web App)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "https://calm-forest-029210d0f.3.azurestaticapps.net",
        "https://kg-frontend-app-free.azurestaticapps.net",
        "https://purple-ocean-0a69d8a0f.3.azurestaticapps.net",  # Student deployment frontend
        "https://agency-window-atmospheric-pushing.trycloudflare.com",  # Old Cloudflare Tunnel
        "https://warren-really-interactive-launched.trycloudflare.com"  # Current Cloudflare Tunnel HTTPS
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load knowledge graph and agents
kg_loader = get_kg_loader()
graph_view = GraphView(kg_loader)
graph_highlighter = GraphHighlighter(kg_loader)
graph_analytics = GraphAnalytics(kg_loader.merged_graph)
agent_system = MultiAgentSystem(kg_loader, use_gpt5=True)
openai_client = OpenAI(api_key=get_openai_api_key())
conversation_manager = get_conversation_manager()

# Pre-compute analytics
print("Pre-computing graph analytics...")
graph_analytics.compute_centrality_metrics()
graph_analytics.detect_communities()
print("Graph analytics ready!")

# Active WebSocket connections
active_connections: List[WebSocket] = []


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.browser_sessions: Dict[str, WebSocket] = {}  # browser_session_id -> websocket
        self.websocket_to_session: Dict[WebSocket, str] = {}  # websocket -> browser_session_id

    async def connect(self, websocket: WebSocket):
        """
        Connect a WebSocket (session registration happens later)
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"✅ [WS-ACCEPT] WebSocket accepted (Total: {len(self.active_connections)} connections)")

    async def register_session(self, websocket: WebSocket, browser_session_id: str):
        """
        Register a browser session ID for this WebSocket
        PRODUCTION-READY: Handles multiple users + multiple tabs per user
        """
        # CONNECTION DEDUPLICATION: Close existing connection from same browser session
        if browser_session_id in self.browser_sessions:
            old_websocket = self.browser_sessions[browser_session_id]
            if old_websocket != websocket and old_websocket in self.active_connections:
                print(f"⚠️ [DEDUP] Closing existing connection from browser session: {browser_session_id}")
                try:
                    await old_websocket.close(code=1000, reason="New connection from same browser session")
                    self.active_connections.remove(old_websocket)
                    # Clean up old mapping
                    if old_websocket in self.websocket_to_session:
                        del self.websocket_to_session[old_websocket]
                except Exception as e:
                    print(f"⚠️ [DEDUP] Error closing old connection: {e}")

        # Register new session
        self.browser_sessions[browser_session_id] = websocket
        self.websocket_to_session[websocket] = browser_session_id
        print(f"✅ [SESSION-REG] Browser session {browser_session_id} registered (Total: {len(self.browser_sessions)} unique browsers)")

    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket and clean up tracking"""
        # Remove from active connections
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

        # Clean up session tracking
        if websocket in self.websocket_to_session:
            browser_session_id = self.websocket_to_session[websocket]
            if browser_session_id in self.browser_sessions and self.browser_sessions[browser_session_id] == websocket:
                del self.browser_sessions[browser_session_id]
            del self.websocket_to_session[websocket]
            print(f"❌ [DISCONNECT] Browser session {browser_session_id} disconnected (Total: {len(self.browser_sessions)} unique browsers)")
        else:
            print(f"❌ [DISCONNECT] WebSocket disconnected (no session registered)")

    async def send_personal(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)


manager = ConnectionManager()


@app.get("/")
async def root():
    return {
        "service": "AI Team Multi-Agent API",
        "status": "running",
        "agents": len(AGENTS),
        "nodes": len(kg_loader.node_data)
    }


@app.get("/api/graph")
async def get_graph_data():
    """Get knowledge graph data"""
    elements = graph_view.generate_cytoscape_elements()
    return {
        "nodes": len(kg_loader.node_data),
        "edges": kg_loader.merged_graph.number_of_edges(),
        "elements": elements
    }


@app.get("/api/agents")
async def get_agents():
    """Get agent information"""
    return {
        "agents": AGENTS
    }


@app.get("/api/graph/analytics")
async def get_graph_analytics():
    """Get graph analytics and metrics"""
    try:
        centrality = graph_analytics.compute_centrality_metrics()
        importance = graph_analytics.compute_importance_scores(centrality)
        clusters = graph_analytics.detect_communities()
        stats = graph_analytics.get_stats()

        return {
            "stats": stats,
            "centrality_computed": True,
            "num_clusters": len(set(clusters.values())),
            "top_nodes_by_importance": sorted(
                importance.items(),
                key=lambda x: x[1],
                reverse=True
            )[:20]
        }
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/graph/filter")
async def filter_graph(data: dict):
    """Filter graph by various criteria"""
    try:
        # Accept both camelCase (from frontend) and snake_case for compatibility
        node_types = data.get("nodeTypes") or data.get("node_types", None)
        agents = data.get("agents", None)
        min_importance = data.get("minImportance") or data.get("min_importance", 0)
        clusters = data.get("clusters", None)

        # Normalize inputs to lists for consistent filtering
        if node_types is not None and not isinstance(node_types, list):
            node_types = [node_types] if isinstance(node_types, str) else []

        if agents is not None and not isinstance(agents, list):
            agents = [agents] if isinstance(agents, str) else []

        if clusters is not None and not isinstance(clusters, list):
            clusters = [clusters] if isinstance(clusters, str) else []

        # Get all nodes
        all_nodes = set(kg_loader.merged_graph.nodes())
        filtered_nodes = all_nodes.copy()

        # Filter by node type
        if node_types is not None and len(node_types) > 0:
            type_nodes = set()
            for node in all_nodes:
                node_data = kg_loader.merged_graph.nodes[node]
                if node_data.get('type') in node_types:
                    type_nodes.add(node)
            filtered_nodes &= type_nodes

        # Filter by agent/person
        if agents is not None and len(agents) > 0:
            agent_nodes = set()
            for node in all_nodes:
                node_data = kg_loader.merged_graph.nodes[node]
                if node_data.get('person') in agents:
                    agent_nodes.add(node)
            filtered_nodes &= agent_nodes

        # Filter by importance
        if min_importance > 0:
            importance_scores = graph_analytics.compute_importance_scores()
            important_nodes = {
                node for node, score in importance_scores.items()
                if score >= min_importance
            }
            filtered_nodes &= important_nodes

        # Filter by cluster
        if clusters is not None and len(clusters) > 0:
            cluster_map = graph_analytics.detect_communities()
            cluster_nodes = {
                node for node, cluster_id in cluster_map.items()
                if cluster_id in clusters
            }
            filtered_nodes &= cluster_nodes

        return {
            "filtered_nodes": list(filtered_nodes),
            "count": len(filtered_nodes),
            "original_count": len(all_nodes)
        }

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/graph/search")
async def search_graph(data: dict):
    """Search for nodes by name/properties"""
    try:
        query = data.get("query", "").lower()
        max_results = data.get("max_results", 50)

        if not query:
            return {"results": [], "count": 0}

        results = []

        for node in kg_loader.merged_graph.nodes():
            node_data = kg_loader.merged_graph.nodes[node]
            label = node_data.get('label', '').lower()
            node_type = node_data.get('type', '').lower()

            # Simple fuzzy matching
            if query in label or query in node_type or query in node.lower():
                results.append({
                    "id": node,
                    "label": node_data.get('label', node),
                    "type": node_data.get('type'),
                    "person": node_data.get('person'),
                    "score": 1.0  # Placeholder for fuzzy match score
                })

                if len(results) >= max_results:
                    break

        return {
            "results": results,
            "count": len(results),
            "query": query
        }

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/graph/neighborhood/{node_id}")
async def get_neighborhood(node_id: str, depth: int = 2):
    """Get N-hop neighborhood of a node"""
    try:
        neighborhood = graph_analytics.get_neighborhood(node_id, depth=depth)

        return {
            "node_id": node_id,
            "depth": depth,
            "neighbors": list(neighborhood),
            "count": len(neighborhood)
        }

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/graph/agent/{agent_id}")
async def get_agent_graph(agent_id: str):
    """Get graph for a specific agent"""
    try:
        nodes = graph_analytics.get_agent_subgraph_nodes(agent_id)

        # Get subgraph elements
        subgraph_elements = []
        for node in nodes:
            node_data = kg_loader.merged_graph.nodes[node]
            subgraph_elements.append({
                "data": {
                    "id": node,
                    "label": node_data.get('label', node),
                    "type": node_data.get('type'),
                    **node_data
                }
            })

        # Get edges within this subgraph
        for u, v in kg_loader.merged_graph.edges():
            if u in nodes and v in nodes:
                edge_data = kg_loader.merged_graph.edges[u, v]
                subgraph_elements.append({
                    "data": {
                        "source": u,
                        "target": v,
                        "type": edge_data.get('type', 'related'),
                        **edge_data
                    }
                })

        return {
            "agent_id": agent_id,
            "nodes": list(nodes),
            "node_count": len(nodes),
            "elements": subgraph_elements
        }

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/graph/compare/{agent1_id}/{agent2_id}")
async def compare_agents(agent1_id: str, agent2_id: str):
    """Compare two agents' graphs"""
    try:
        comparison = graph_analytics.compare_agent_graphs(agent1_id, agent2_id)

        return {
            "agent1_id": agent1_id,
            "agent2_id": agent2_id,
            "agent1_node_count": len(comparison['agent1_only']),
            "agent2_node_count": len(comparison['agent2_only']),
            "shared_count": len(comparison['shared']),
            "shared_nodes": list(comparison['shared']),
            "agent1_nodes": list(comparison['agent1_only']),
            "agent2_nodes": list(comparison['agent2_only'])
        }

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/graph/clusters")
async def get_clusters():
    """Get cluster/community assignments"""
    try:
        clusters = graph_analytics.detect_communities()
        metadata_clusters = graph_analytics.get_node_metadata_clustering()

        # Group nodes by cluster
        cluster_groups = {}
        for node, cluster_id in clusters.items():
            if cluster_id not in cluster_groups:
                cluster_groups[cluster_id] = []
            cluster_groups[cluster_id].append(node)

        return {
            "algorithm_clusters": cluster_groups,
            "num_clusters": len(cluster_groups),
            "metadata_clusters": {
                k: {k2: list(v2) for k2, v2 in v.items()}
                for k, v in metadata_clusters.items()
            }
        }

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/transcribe")
async def transcribe_audio(data: dict):
    """Transcribe audio from base64"""
    try:
        audio_base64 = data.get("audio")
        if not audio_base64:
            return JSONResponse({"error": "No audio provided"}, status_code=400)
        
        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_base64)
        
        # Save to temp file
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            temp_path = f.name
        
        # Transcribe with Whisper
        with open(temp_path, "rb") as audio_file:
            transcript = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        
        # Cleanup
        import os
        os.unlink(temp_path)
        
        return {"transcript": transcript.text}
    
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/tts")
async def text_to_speech(data: dict):
    """Convert text to speech"""
    try:
        text = data.get("text", "")
        voice = data.get("voice", "alloy")
        
        response = openai_client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text[:4096]  # TTS limit
        )
        
        # Return audio as base64
        audio_bytes = response.content
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        return {"audio": audio_base64, "format": "mp3"}
    
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/chat")
async def chat_endpoint(data: dict):
    """
    HTTP endpoint for chat (no WebSocket needed)
    Returns streaming responses from agents
    """
    try:
        user_message = data.get("message", "")
        mode = data.get("mode", "group")
        
        responses = []
        
        if mode == "group":
            # Group chat mode - sequential responses like WhatsApp
            response_gen = agent_system.group_chat_mode(user_message, [])
            
            # Group chunks by agent
            agent_responses_dict = {}
            for agent_id, chunk in response_gen:
                if agent_id not in agent_responses_dict:
                    agent_responses_dict[agent_id] = ""
                if not chunk.startswith('[Error'):
                    agent_responses_dict[agent_id] += chunk
            
            # Process each agent's complete response in order
            for agent_id in ['rahil', 'mathew', 'shreyas', 'siddarth']:
                if agent_id in agent_responses_dict:
                    agent_response = agent_responses_dict[agent_id]
                    
                    # Extract entities and generate highlights
                    entities = graph_highlighter.extract_entities(agent_response, agent_id)
                    highlight_data = graph_highlighter.get_highlight_data(agent_id, entities)
                    
                    responses.append({
                        "agent_id": agent_id,
                        "agent_name": AGENTS[agent_id]['name'],
                        "response": agent_response,
                        "highlights": highlight_data
                    })
        
        elif mode == "orchestrator":
            # Orchestrator mode - collect streaming responses
            response_gen = agent_system.orchestrator_mode(user_message, [])
            
            # Group chunks by agent
            agent_responses_dict = {}
            for agent_id, chunk in response_gen:
                if agent_id not in agent_responses_dict:
                    agent_responses_dict[agent_id] = ""
                if not chunk.startswith('[Error'):
                    agent_responses_dict[agent_id] += chunk
            
            # Process each agent's complete response
            for agent_id, agent_response in agent_responses_dict.items():
                # Extract entities and generate highlights
                entities = graph_highlighter.extract_entities(agent_response, agent_id)
                highlight_data = graph_highlighter.get_highlight_data(agent_id, entities)
                
                responses.append({
                    "agent_id": agent_id,
                    "agent_name": AGENTS[agent_id]['name'],
                    "response": agent_response,
                    "highlights": highlight_data
                })
        
        return {
            "responses": responses,
            "mode": mode
        }
    
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time chat with knowledge graph highlighting"""
    await manager.connect(websocket)

    # Create new session for this WebSocket connection
    session_id = str(uuid.uuid4())
    session = conversation_manager.create_session(
        session_id=session_id,
        metadata={"websocket_id": id(websocket)}
    )

    try:
        # Send initial data with session ID
        await manager.send_personal({
            "type": "connected",
            "session_id": session_id,
            "agents": AGENTS,
            "graph_stats": {
                "nodes": len(kg_loader.node_data),
                "edges": kg_loader.merged_graph.number_of_edges()
            }
        }, websocket)
        
        # Start server-side keepalive (best practice from research)
        async def send_keepalive():
            while True:
                try:
                    await asyncio.sleep(30)  # Ping every 30 seconds
                    await manager.send_personal({"type": "keepalive"}, websocket)
                except:
                    break
        
        keepalive_task = asyncio.create_task(send_keepalive())
        
        try:
            while True:
                # Receive message from client (with timeout to prevent blocking)
                try:
                    message = await asyncio.wait_for(websocket.receive(), timeout=120.0)
                    
                    if message["type"] == "websocket.disconnect":
                        break
                        
                    # Parse JSON from text
                    if message["type"] == "websocket.receive":
                        if "text" in message:
                            data = json.loads(message["text"])
                        elif "bytes" in message:
                            data = json.loads(message["bytes"].decode())
                        else:
                            continue
                    else:
                        continue
                except asyncio.TimeoutError:
                    # No message received, but connection still alive
                    continue
                except Exception as e:
                    print(f"❌ ERROR receiving/parsing WebSocket message: {e}")
                    import traceback
                    traceback.print_exc()
                    # Send error to client instead of breaking
                    try:
                        await manager.send_personal({
                            "type": "error",
                            "message": f"Message processing error: {str(e)}"
                        }, websocket)
                    except:
                        pass
                    continue  # Don't break - keep processing other messages

                message_type = data.get("type")
                print(f"📨 Received WebSocket message type: {message_type}")

                if message_type == "register_session":
                    # PRODUCTION-READY: Register browser session ID for connection deduplication
                    browser_session_id = data.get("browser_session_id")
                    if browser_session_id:
                        await manager.register_session(websocket, browser_session_id)
                    continue

                if message_type == "chat":
                    user_message = data.get("message", "")
                    mode = data.get("mode", "group")  # group or orchestrator
                    print(f"💬 Processing chat message: {user_message[:100]}...")
                    print(f"📍 MODE RECEIVED: {mode}")
                    try:
                        # Handle chat message

                        # Add user message to session
                        conversation_manager.add_user_message(session_id, user_message)

                        # Send acknowledgment
                        await manager.send_personal({
                            "type": "processing",
                            "message": "Agents are thinking..."
                        }, websocket)

                        # Get conversation history
                        conversation_history = session.get_history(max_messages=20)

                        # Get responses from agents (with dynamic routing and context)
                        if mode == "group":
                            response_gen = agent_system.group_chat_mode(
                                user_message,
                                conversation_history,
                                use_dynamic_routing=True  # Enable new LLM routing
                            )

                            # Stream responses sequentially with typing indicators
                            current_agent = None
                            current_response = ""
                            current_timestamp = None

                            for agent_id, chunk in response_gen:
                                # Skip invalid agent IDs (like 'system')
                                if agent_id not in AGENTS:
                                    print(f"⚠️ Skipping invalid agent_id: {agent_id}")
                                    continue

                                # New agent starting
                                if current_agent != agent_id:
                                    # Send previous agent's complete message
                                    if current_agent and current_response:
                                        entities = graph_highlighter.extract_entities(current_response, current_agent)
                                        highlight_data = graph_highlighter.get_highlight_data(current_agent, entities)

                                        await manager.send_personal({
                                            "type": "agent_complete",
                                            "agent_id": current_agent,
                                            "full_response": current_response,
                                            "highlights": highlight_data
                                        }, websocket)

                                    # New agent - show typing indicator
                                    current_agent = agent_id
                                    current_response = ""
                                    current_timestamp = int(time.time() * 1000)

                                    await manager.send_personal({
                                        "type": "agent_typing",
                                        "agent_id": agent_id,
                                        "agent_name": AGENTS[agent_id]['name']
                                    }, websocket)

                                    # Small delay for typing indicator visibility
                                    await asyncio.sleep(0.5)

                                    # Signal agent started
                                    await manager.send_personal({
                                        "type": "agent_start",
                                        "agent_id": agent_id,
                                        "agent_name": AGENTS[agent_id]['name'],
                                        "timestamp": current_timestamp
                                    }, websocket)

                                # Stream chunk
                                if not chunk.startswith('[Error'):
                                    current_response += chunk
                                    await manager.send_personal({
                                        "type": "agent_chunk",
                                        "agent_id": agent_id,
                                        "chunk": chunk,
                                        "timestamp": current_timestamp
                                    }, websocket)

                            # Send final agent's completion
                            if current_agent and current_response:
                                entities = graph_highlighter.extract_entities(current_response, current_agent)
                                highlight_data = graph_highlighter.get_highlight_data(current_agent, entities)

                                # Add agent response to session
                                conversation_manager.add_agent_message(
                                    session_id,
                                    current_agent,
                                    AGENTS[current_agent]['name'],
                                    current_response,
                                    metadata={"highlights": highlight_data}
                                )

                                await manager.send_personal({
                                    "type": "agent_complete",
                                    "agent_id": current_agent,
                                    "full_response": current_response,
                                    "highlights": highlight_data
                                }, websocket)

                            # Signal all complete
                            await manager.send_personal({
                                "type": "all_complete"
                            }, websocket)

                        elif mode == "orchestrator":
                            responses = agent_system.orchestrator_mode(user_message, conversation_history)

                            for response in responses:
                                agent_id = response['agent']
                                agent_response = response['response']

                                # Extract entities and generate highlights
                                entities = graph_highlighter.extract_entities(agent_response, agent_id)
                                highlight_data = graph_highlighter.get_highlight_data(agent_id, entities)

                                await manager.send_personal({
                                    "type": "agent_response",
                                    "agent_id": agent_id,
                                    "response": agent_response,
                                    "highlights": highlight_data  # NEW: AI observability
                                }, websocket)

                        elif mode == "think_tank":
                            # Think Tank mode - multi-round discussion with citations
                            response_gen = agent_system.think_tank_mode(
                                user_message,
                                conversation_history,
                                max_rounds=5,  # Default, can be made configurable
                                min_consensus=0.85
                            )

                            # Track current agent and response
                            current_agent = None
                            current_response = ""
                            current_timestamp = None

                            for item in response_gen:
                                agent_id, chunk = item

                                # Handle system messages (JSON metadata)
                                if agent_id == "system":
                                    try:
                                        system_data = json.loads(chunk)
                                        await manager.send_personal({
                                            "type": "think_tank_system",
                                            **system_data
                                        }, websocket)
                                    except json.JSONDecodeError:
                                        print(f"⚠️ Invalid system JSON: {chunk}")
                                    continue

                                # Handle Rahil's final summary
                                if agent_id == "rahil_summary":
                                    await manager.send_personal({
                                        "type": "think_tank_summary",
                                        "chunk": chunk
                                    }, websocket)
                                    continue

                                # Handle regular agent responses
                                if agent_id not in AGENTS:
                                    print(f"⚠️ Skipping invalid agent_id: {agent_id}")
                                    continue

                                # New agent starting
                                if current_agent != agent_id:
                                    # Send previous agent's complete message
                                    if current_agent and current_response:
                                        entities = graph_highlighter.extract_entities(current_response, current_agent)
                                        highlight_data = graph_highlighter.get_highlight_data(current_agent, entities)

                                        await manager.send_personal({
                                            "type": "agent_complete",
                                            "agent_id": current_agent,
                                            "full_response": current_response,
                                            "highlights": highlight_data
                                        }, websocket)

                                    # New agent - show typing indicator
                                    current_agent = agent_id
                                    current_response = ""
                                    current_timestamp = int(time.time() * 1000)

                                    await manager.send_personal({
                                        "type": "agent_typing",
                                        "agent_id": agent_id,
                                        "agent_name": AGENTS[agent_id]['name']
                                    }, websocket)

                                    await asyncio.sleep(0.5)

                                    await manager.send_personal({
                                        "type": "agent_start",
                                        "agent_id": agent_id,
                                        "agent_name": AGENTS[agent_id]['name'],
                                        "timestamp": current_timestamp
                                    }, websocket)

                                # Stream chunk
                                if not chunk.startswith('[Error'):
                                    current_response += chunk
                                    await manager.send_personal({
                                        "type": "agent_chunk",
                                        "agent_id": agent_id,
                                        "chunk": chunk,
                                        "timestamp": current_timestamp
                                    }, websocket)

                            # Send final agent's completion
                            if current_agent and current_response:
                                entities = graph_highlighter.extract_entities(current_response, current_agent)
                                highlight_data = graph_highlighter.get_highlight_data(current_agent, entities)

                                conversation_manager.add_agent_message(
                                    session_id,
                                    current_agent,
                                    AGENTS[current_agent]['name'],
                                    current_response,
                                    metadata={"highlights": highlight_data}
                                )

                                await manager.send_personal({
                                    "type": "agent_complete",
                                    "agent_id": current_agent,
                                    "full_response": current_response,
                                    "highlights": highlight_data
                                }, websocket)

                            # Signal all complete
                            await manager.send_personal({
                                "type": "all_complete"
                            }, websocket)

                    except Exception as e:
                        print(f"❌ ERROR processing chat message: {e}")
                        import traceback
                        traceback.print_exc()
                        # Send error to client
                        await manager.send_personal({
                            "type": "error",
                            "message": f"Failed to process message: {str(e)}"
                        }, websocket)
                        # Send all_complete to reset frontend state
                        await manager.send_personal({
                            "type": "all_complete"
                        }, websocket)

                elif message_type == "ping":
                    await manager.send_personal({"type": "pong"}, websocket)

                elif message_type == "clear_history":
                    # Allow clients to clear conversation history
                    conversation_manager.clear_session_history(session_id)
                    await manager.send_personal({
                        "type": "history_cleared",
                        "session_id": session_id
                    }, websocket)
        finally:
            keepalive_task.cancel()

    except WebSocketDisconnect:
        # Clean up session on disconnect
        conversation_manager.delete_session(session_id)
        manager.disconnect(websocket)
    except Exception as e:
        # Clean up session on error
        conversation_manager.delete_session(session_id)
        manager.disconnect(websocket)


@app.websocket("/ws/realtime")
async def realtime_endpoint(websocket: WebSocket):
    """
    OpenAI Realtime API proxy for bidirectional voice
    Handles voice input → transcription → agent processing → TTS
    """
    await manager.connect(websocket)
    
    try:
        await manager.send_personal({
            "type": "realtime_connected",
            "message": "Realtime audio session started"
        }, websocket)
        
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "audio_data":
                # Receive audio from client
                audio_base64 = data.get("audio")
                mode = data.get("mode", "group")
                
                # Transcribe audio using Whisper
                try:
                    audio_bytes = base64.b64decode(audio_base64)
                    
                    # Save to temp file
                    import tempfile
                    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
                        f.write(audio_bytes)
                        temp_path = f.name
                    
                    # Transcribe
                    with open(temp_path, "rb") as audio_file:
                        transcript = openai_client.audio.transcriptions.create(
                            model="whisper-1",
                            file=audio_file
                        )
                    
                    import os
                    os.unlink(temp_path)
                    
                    # Send transcription to client
                    await manager.send_personal({
                        "type": "transcription",
                        "text": transcript.text
                    }, websocket)
                    
                    # Process as chat message
                    user_message = transcript.text
                    
                    # Get agent responses
                    if mode == "group":
                        response_generators = agent_system.group_chat_mode(user_message, [])
                        
                        for agent_id, response_gen in response_generators.items():
                            await manager.send_personal({
                                "type": "agent_start",
                                "agent_id": agent_id,
                                "agent_name": AGENTS[agent_id]['name']
                            }, websocket)
                            
                            full_response = ""
                            for chunk in response_gen:
                                if not chunk.startswith('[Error'):
                                    full_response += chunk
                                    await manager.send_personal({
                                        "type": "agent_chunk",
                                        "agent_id": agent_id,
                                        "chunk": chunk
                                    }, websocket)
                            
                            # Generate highlights
                            entities = graph_highlighter.extract_entities(full_response, agent_id)
                            highlight_data = graph_highlighter.get_highlight_data(agent_id, entities)
                            
                            # Generate TTS
                            voice = AGENTS[agent_id].get('voice', 'alloy')
                            tts_response = openai_client.audio.speech.create(
                                model="tts-1",
                                voice=voice,
                                input=full_response[:4096]
                            )
                            
                            audio_bytes = tts_response.content
                            audio_base64_out = base64.b64encode(audio_bytes).decode('utf-8')
                            
                            await manager.send_personal({
                                "type": "agent_audio",
                                "agent_id": agent_id,
                                "text": full_response,
                                "audio": audio_base64_out,
                                "highlights": highlight_data
                            }, websocket)
                    
                except Exception as e:
                    await manager.send_personal({
                        "type": "error",
                        "message": f"Audio processing error: {str(e)}"
                    }, websocket)
            
            elif message_type == "ping":
                await manager.send_personal({"type": "pong"}, websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("🚀 Starting AI Team Multi-Agent API Server")
    print("=" * 60)
    print(f"📊 Knowledge Graph: {len(kg_loader.node_data)} nodes")
    print(f"🤖 Agents: {len(AGENTS)} agents initialized")
    print(f"🌐 Server: http://localhost:8000")
    print(f"🔌 WebSocket: ws://localhost:8000/ws")
    print(f"📖 API Docs: http://localhost:8000/docs")
    print("=" * 60)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )



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
        "https://*.azurestaticapps.net"  # Allow all Azure Static Web Apps during deployment
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load knowledge graph and agents
kg_loader = get_kg_loader()
graph_view = GraphView(kg_loader)
graph_highlighter = GraphHighlighter(kg_loader)
agent_system = MultiAgentSystem(kg_loader, use_gpt5=False)
openai_client = OpenAI(api_key=get_openai_api_key())

# Active WebSocket connections
active_connections: List[WebSocket] = []


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
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
    
    try:
        # Send initial data
        await manager.send_personal({
            "type": "connected",
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
                    break
                
                message_type = data.get("type")
                
                if message_type == "chat":
                    # Handle chat message
                    user_message = data.get("message", "")
                    mode = data.get("mode", "group")  # group or orchestrator
                    
                    # Send acknowledgment
                    await manager.send_personal({
                        "type": "processing",
                        "message": "Agents are thinking..."
                    }, websocket)
                    
                    # Get responses from agents (sequential like WhatsApp with streaming)
                    if mode == "group":
                        response_gen = agent_system.group_chat_mode(user_message, [])
                        
                        # Stream responses sequentially with typing indicators
                        current_agent = None
                        current_response = ""
                        current_timestamp = None
                        
                        for agent_id, chunk in response_gen:
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
                        responses = agent_system.orchestrator_mode(user_message, [])
                        
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
                
                elif message_type == "ping":
                    await manager.send_personal({"type": "pong"}, websocket)
        finally:
            keepalive_task.cancel()
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
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



"""
OpenAI GPT-5 Multi-Agent System
Implements 4 specialized agents + orchestrator for knowledge graph discussions
"""
import os
import json
from typing import Dict, List, Any, Generator, Optional, Tuple
from openai import OpenAI
from utils import get_openai_api_key, extract_entities, parse_agent_citations


# Agent metadata
AGENTS = {
    'mathew': {
        'name': 'Mathew Jerry Meleth',
        'title': 'Data Engineer',
        'color': '#2196F3',
        'persona_file': 'personas/mathew.md',
        'voice': 'echo'  # Technical, clear
    },
    'rahil': {
        'name': 'Rahil M. Harihar',
        'title': 'AI Architect',
        'color': '#7E57C2',
        'persona_file': 'personas/rahil.md',
        'voice': 'alloy'  # Leadership, warm - ALWAYS SPEAKS FIRST & ORCHESTRATES WITH @TAGS
    },
    'shreyas': {
        'name': 'Shreyas B Subramanya',
        'title': 'Product Manager',
        'color': '#4CAF50',
        'persona_file': 'personas/shreyas.md',
        'voice': 'fable'  # Professional, steady
    },
    'siddarth': {
        'name': 'Siddarth Bhave',
        'title': 'Software Engineer',
        'color': '#FF9800',
        'persona_file': 'personas/siddarth.md',
        'voice': 'onyx'  # Analytical, direct
    }
}


class OpenAIClient:
    """Wrapper for OpenAI API - supports GPT-5 (Responses API) and GPT-4o (Chat Completions)"""
    
    def __init__(self, use_gpt5=False):
        self.client = OpenAI(api_key=get_openai_api_key())
        self.use_gpt5 = use_gpt5
        
        if use_gpt5:
            # GPT-5: Responses API
            self.model = 'gpt-5'
            self.config = {
                'reasoning': {'effort': 'low'},  # minimal, low, medium, high
                'text': {'verbosity': 'medium'},  # low, medium, high  
                'max_output_tokens': 2048
            }
        else:
            # GPT-4o: Chat Completions API (default, works immediately)
            self.model = 'gpt-4o'
            self.config = {
                'temperature': 0.7,
                'max_tokens': 2048,
            }
    
    def generate(self, messages: List[Dict[str, str]], stream: bool = True) -> Generator[str, None, None]:
        """Generate response with optional streaming"""
        try:
            if self.use_gpt5:
                # GPT-5: Responses API
                input_text = self._messages_to_input(messages)
                response = self.client.responses.create(
                    model=self.model,
                    input=input_text,
                    stream=stream,
                    **self.config
                )
                
                if stream:
                    for chunk in response:
                        if hasattr(chunk, 'output_text_delta') and chunk.output_text_delta:
                            yield chunk.output_text_delta
                else:
                    yield response.output_text
            else:
                # GPT-4o: Chat Completions API
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    stream=stream,
                    **self.config
                )
                
                if stream:
                    for chunk in response:
                        if chunk.choices[0].delta.content:
                            yield chunk.choices[0].delta.content
                else:
                    yield response.choices[0].message.content
                    
        except Exception as e:
            print(f"Error generating response: {e}")
            yield f"[Error: {str(e)}]"
    
    def _messages_to_input(self, messages: List[Dict[str, str]]) -> str:
        """Convert messages to GPT-5 input format"""
        parts = []
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            if role == 'system':
                parts.append(f"[System Instructions]\n{content}")
            elif role == 'user':
                parts.append(f"User: {content}")
            elif role == 'assistant':
                parts.append(f"Assistant: {content}")
        return "\n\n".join(parts)


class Agent:
    """Base agent class with persona and KG context"""
    
    def __init__(self, agent_id: str, kg_loader, openai_client: OpenAIClient):
        self.agent_id = agent_id
        self.metadata = AGENTS[agent_id]
        self.kg_loader = kg_loader
        self.openai_client = openai_client
        self.persona = self._load_persona()
        self.context = self._load_kg_context()
    
    def _load_persona(self) -> str:
        """Load persona from markdown file"""
        persona_file = self.metadata['persona_file']
        if os.path.exists(persona_file):
            with open(persona_file, 'r') as f:
                return f.read()
        return f"You are {self.metadata['name']}, a {self.metadata['title']}."
    
    def _load_kg_context(self) -> Dict[str, Any]:
        """Load relevant KG context for this agent"""
        return self.kg_loader.get_person_context(self.agent_id)
    
    def _format_kg_context(self) -> str:
        """Format KG context for prompt"""
        context_parts = []
        
        # Skills
        if self.context['skills']:
            skills_text = "\n".join([
                f"- **{s['name']}** ({s['proficiency']}): {s['category']}"
                for s in self.context['skills'][:20]
            ])
            context_parts.append(f"### Your Skills\n{skills_text}")
        
        # Technologies
        if self.context['technologies']:
            tech_text = "\n".join([
                f"- **{t['name']}**: {t['category']}"
                for t in self.context['technologies'][:30]
            ])
            context_parts.append(f"### Your Technologies\n{tech_text}")
        
        # Projects
        if self.context['projects']:
            project_text = "\n".join([
                f"- **{p['name']}**: {p['description']} (Impact: {p['impact']})"
                for p in self.context['projects'][:10]
            ])
            context_parts.append(f"### Your Key Projects\n{project_text}")
        
        # Achievements
        if self.context['achievements']:
            achievement_text = "\n".join([
                f"- {a['metric']}: {a['impact']}"
                for a in self.context['achievements'][:10]
            ])
            context_parts.append(f"### Your Achievements\n{achievement_text}")
        
        return "\n\n".join(context_parts)
    
    def build_messages(
        self,
        user_query: str,
        conversation_history: List[Dict[str, str]] = None,
        mode: str = "group"
    ) -> List[Dict[str, str]]:
        """Build messages array for OpenAI chat"""
        system_content = f"""# Your Persona
{self.persona}

# Your Knowledge Graph Context
{self._format_kg_context()}

# Response Format Requirements (CRITICAL - FOLLOW STRICTLY)
Structure your response like this:

**[Greeting/Reaction]** - Address teammates by name if building on their points
- Keep it witty and natural ("Hey team!", "Building on what Rahil said...", "Great point Mathew!")

**[Main Heading]**
- Short punchy sentence
- Another concise point
  - Sub-point with specific detail
  - Another sub-point
- Next key point (2-4 words per line)

**[Second Section if Needed]**
- Brief, witty observation
- Concrete example or data point

**[Closing Line]** - Keep it conversational and brief

# Style Rules
- **Bold** for all headings and key technologies/skills
- Maximum 2-3 sentences per point
- Each bullet point: 1 short sentence (5-10 words ideal)
- Be witty, use casual language
- Reference teammates by first name when building on their ideas
- Use emojis sparingly for emphasis (1-2 max)
- Keep total response to 4-6 sections max"""
        
        if mode == "group":
            system_content += "\n\n**Mode: WhatsApp Group Chat**\n- Read what teammates said above\n- Build on their points or add new perspective\n- Keep it conversational like a real team chat"
            
            # Special instructions for Rahil (AI Architect & Orchestrator)
            if self.agent_id == "rahil":
                system_content += """

**YOUR ROLE (RAHIL - AI ARCHITECT):**
You ALWAYS respond FIRST and orchestrate the team.

**CRITICAL - Use @ Tagging Format:**
1. State what YOU will handle personally
2. Tag each relevant teammate with @[Name]
3. Assign specific tasks to each

Example:
"**Hey team!** Let me coordinate this.

**My Part:**
- I'll design the AI architecture
- I'll handle the integration strategy

**Team Assignments:**
- @Mathew - Can you build the data pipeline?
- @Siddarth - You handle the performance optimization
- @Shreyas - I need your input on the workflow

**Let's make this happen!**"

ALWAYS use @Mathew, @Siddarth, @Shreyas to delegate."""
            else:
                system_content += f"""

**YOUR ROLE ({self.metadata['name'].upper()}):**
- Check if @{self.metadata['name'].split()[0]} was tagged by Rahil
- If tagged: Acknowledge the tag and respond to your assignment
- If not tagged but relevant: Still contribute your expertise
- Reference what Rahil and others said

Example when tagged:
"**@Rahil - Got it!** On the [task] front...

**My Approach:**
- [Specific point 1]
- [Specific point 2]

Building on what @[Other] mentioned..."

Example when not tagged but contributing:
"**Hey team!** Adding my perspective on [topic]..."

ALWAYS acknowledge @mentions directed at you!"""
        elif mode == "orchestrator":
            if self.agent_id == "rahil":
                system_content += """

**YOUR ROLE (RAHIL - AI ARCHITECT in Orchestrator Mode):**
You analyze the question and tag specific teammates.

**CRITICAL - Use @ Tagging:**
"**Hey team!** Based on this question, here's my plan:

**My Part:**
- I'll handle [AI architecture/integration]

**Tagging:**
- @Mathew - You're best for [data/infrastructure task]
- @Siddarth - You should handle [engineering/performance]
  
**Let's coordinate on this!**"

ALWAYS delegate with @mentions!"""
            else:
                system_content += f"""

**YOUR ROLE ({self.metadata['name'].upper()} - Orchestrator Mode):**
- Rahil tagged you in the orchestration
- Acknowledge: "@Rahil - On it!"
- Address your specific assignment
- Reference what Rahil assigned you

Example:
"**@Rahil - Got it, handling [task]!**

**My Approach:**
- [Specific solution 1]
- [Specific solution 2]

**[Closing]**" """
        elif mode == "conference":
            system_content += "\n\n**Mode: Voice Conference**\n- This is a voice call - everyone can hear\n- Acknowledge what others said\n- Keep responses natural and flowing"
        
        messages = [{"role": "system", "content": system_content}]
        
        # Add conversation history
        if conversation_history:
            for msg in conversation_history[-5:]:  # Last 5 messages
                role = "assistant" if msg.get('role') == 'agent' else "user"
                content = f"{msg.get('agent', 'User')}: {msg['message']}" if msg.get('agent') else msg['message']
                messages.append({"role": role, "content": content})
        
        # Add user query
        messages.append({"role": "user", "content": user_query})
        
        return messages
    
    def respond(
        self,
        user_query: str,
        conversation_history: List[Dict[str, str]] = None,
        mode: str = "group"
    ) -> Generator[str, None, None]:
        """Generate streaming response"""
        messages = self.build_messages(user_query, conversation_history, mode)
        return self.openai_client.generate(messages, stream=True)
    
    def extract_mentioned_nodes(self, response_text: str) -> List[str]:
        """Extract node IDs mentioned in response"""
        # Get all node names from KG
        node_names = self.kg_loader.get_all_node_names()
        
        # Extract entities from response
        mentioned_nodes = extract_entities(response_text, node_names)
        
        # Also check for explicit citations
        citations = parse_agent_citations(response_text)
        for citation in citations:
            # Try to match citation to node
            matches = [nid for nid, name in node_names if citation.lower() in name.lower()]
            mentioned_nodes.extend(matches)
        
        return list(set(mentioned_nodes))


class Orchestrator:
    """Central orchestrator for coordinating agent responses"""
    
    def __init__(self, agents: Dict[str, Agent], openai_client: OpenAIClient):
        self.agents = agents
        self.openai_client = openai_client
    
    def analyze_query(self, user_query: str) -> List[str]:
        """Determine which agents should respond and in what order"""
        messages = [
            {
                "role": "system",
                "content": """You are Rahil, the AI Architect orchestrating the team conversation.

Analyze the question and decide who should respond. Always include yourself (rahil) first to set context and delegate.

Team Members:
- rahil (AI Architect): AI/ML architecture, multi-agent systems, enterprise integration, team orchestration
- mathew (Data Engineer): AWS/Azure, ETL, big data, cloud platforms, data pipelines
- shreyas (Product Manager): Supply chain planning, APS, data validation, ERP systems
- siddarth (Software Engineer): Distributed systems, observability, full-stack, performance optimization

Rules:
- ALWAYS include "rahil" first (you introduce the topic)
- Then include 2-3 others based on relevance
- For greetings/casual: include everyone (all 4)
- For technical: pick specialists (2-3 agents)

Respond with ONLY a JSON array: ["rahil", "agent2", "agent3"]"""
            },
            {
                "role": "user",
                "content": f"Question: {user_query}\n\nJSON array:"
            }
        ]
        
        try:
            response = self.openai_client.generate(messages, stream=False)
            response_text = next(response)
            
            # Extract JSON from response
            import re
            json_match = re.search(r'\[.*?\]', response_text, re.DOTALL)
            if json_match:
                agent_order = json.loads(json_match.group())
                # Validate agent names
                agent_order = [a for a in agent_order if a in self.agents]
                return agent_order if agent_order else list(self.agents.keys())
            
        except Exception as e:
            print(f"Error analyzing query: {e}")
        
        # Default: all agents
        return list(self.agents.keys())
    
    def coordinate_responses(
        self,
        user_query: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Generator[Tuple[str, str], None, None]:
        """Coordinate sequential agent responses with handoffs"""
        agent_order = self.analyze_query(user_query)
        
        local_history = conversation_history.copy() if conversation_history else []
        
        for agent_id in agent_order:
            agent = self.agents[agent_id]
            
            # Generate response
            response_chunks = []
            for chunk in agent.respond(user_query, local_history, mode="orchestrator"):
                response_chunks.append(chunk)
                yield (agent_id, chunk)
            
            # Add to history for next agent
            full_response = "".join(response_chunks)
            local_history.append({
                'agent': agent.metadata['name'],
                'message': full_response
            })


class ConferenceOrchestrator(Orchestrator):
    """Orchestrator for voice conference with Rahil-first routing"""
    
    def __init__(self, agents: Dict[str, Agent], openai_client: OpenAIClient):
        super().__init__(agents, openai_client)
        self.leader = 'rahil'  # Always speaks first
    
    def coordinate_conference(
        self,
        user_query: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Generator[Tuple[str, str], None, None]:
        """
        Coordinate conference call responses with Rahil leading.
        Returns (agent_id, response_chunk) tuples.
        """
        local_history = conversation_history.copy() if conversation_history else []
        
        # 1. Rahil ALWAYS responds first
        rahil_agent = self.agents[self.leader]
        response_chunks = []
        
        for chunk in rahil_agent.respond(user_query, local_history, mode="conference"):
            response_chunks.append(chunk)
            yield (self.leader, chunk)
        
        # Add Rahil's response to history
        rahil_response = "".join(response_chunks)
        local_history.append({
            'agent': rahil_agent.metadata['name'],
            'message': rahil_response,
            'role': 'agent'
        })
        
        # 2. Analyze Rahil's response to determine who else should speak
        remaining_agents = self.analyze_query(user_query)
        remaining_agents = [a for a in remaining_agents if a != self.leader]
        
        # 3. Other agents respond based on relevance
        for agent_id in remaining_agents:
            agent = self.agents[agent_id]
            response_chunks = []
            
            for chunk in agent.respond(user_query, local_history, mode="conference"):
                response_chunks.append(chunk)
                yield (agent_id, chunk)
            
            # Add to shared history
            full_response = "".join(response_chunks)
            local_history.append({
                'agent': agent.metadata['name'],
                'message': full_response,
                'role': 'agent'
            })


class MultiAgentSystem:
    """Main system coordinating all agents"""
    
    def __init__(self, kg_loader, use_gpt5=False):
        self.kg_loader = kg_loader
        self.openai_client = OpenAIClient(use_gpt5=use_gpt5)
        self.agents = {
            agent_id: Agent(agent_id, kg_loader, self.openai_client)
            for agent_id in AGENTS.keys()
        }
        self.orchestrator = Orchestrator(self.agents, self.openai_client)
        self.conference_orchestrator = ConferenceOrchestrator(self.agents, self.openai_client)
    
    def group_chat_mode(
        self,
        user_query: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Generator[Tuple[str, str], None, None]:
        """
        Group chat mode: Sequential responses like WhatsApp group chat.
        Rahil orchestrates the flow, others build on each other.
        Yields (agent_id, response_chunk) tuples.
        """
        # Always start with Rahil as the orchestrator
        agent_order = ['rahil', 'mathew', 'shreyas', 'siddarth']
        
        local_history = conversation_history.copy() if conversation_history else []
        
        for agent_id in agent_order:
            if agent_id not in self.agents:
                continue
                
            agent = self.agents[agent_id]
            
            # Generate response with context from previous responses
            response_chunks = []
            for chunk in agent.respond(user_query, local_history, mode="group"):
                response_chunks.append(chunk)
                yield (agent_id, chunk)
            
            # Add to history for next agent to see
            full_response = "".join(response_chunks)
            local_history.append({
                'agent': agent.metadata['name'],
                'message': full_response,
                'role': 'agent'
            })
    
    def orchestrator_mode(
        self,
        user_query: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Generator[Tuple[str, str], None, None]:
        """
        Orchestrator mode: Central coordinator sequences responses.
        Yields (agent_id, response_chunk) tuples.
        """
        return self.orchestrator.coordinate_responses(user_query, conversation_history)
    
    def conference_mode(
        self,
        user_query: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Generator[Tuple[str, str], None, None]:
        """
        Conference mode: Voice conference with Rahil leading.
        Yields (agent_id, response_chunk) tuples.
        """
        return self.conference_orchestrator.coordinate_conference(user_query, conversation_history)
    
    def extract_all_mentioned_nodes(
        self,
        agent_responses: Dict[str, str]
    ) -> Dict[str, List[str]]:
        """
        Extract nodes mentioned by each agent.
        Returns dict of {agent_id: [node_ids]}
        """
        mentioned_nodes = {}
        for agent_id, response_text in agent_responses.items():
            agent = self.agents[agent_id]
            mentioned_nodes[agent_id] = agent.extract_mentioned_nodes(response_text)
        return mentioned_nodes
    
    def get_agent_metadata(self) -> Dict[str, Dict[str, str]]:
        """Get metadata for all agents"""
        return AGENTS

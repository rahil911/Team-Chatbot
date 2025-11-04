"""
OpenAI GPT-5 Multi-Agent System
Implements 4 specialized agents + orchestrator for knowledge graph discussions
"""
import os
import json
from typing import Dict, List, Any, Generator, Optional, Tuple, Set
from openai import OpenAI
from utils import get_openai_api_key, extract_entities, parse_agent_citations
from intent_router import IntentRouter, IntentRouterError, MentionParser
from web_search import get_web_search_tool


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
    """Wrapper for OpenAI API - supports GPT-5, GPT-4o, and o1 reasoning models"""

    def __init__(self, use_gpt5=False, reasoning_model=None):
        self.client = OpenAI(api_key=get_openai_api_key())
        self.use_gpt5 = use_gpt5
        self.reasoning_model = reasoning_model  # 'o1-preview', 'o1-mini', or None

        if reasoning_model in ['o1-preview', 'o1-mini']:
            # o1 reasoning models: Chat Completions (no streaming, no system messages)
            self.model = reasoning_model
            self.config = {
                'max_completion_tokens': 4096,  # o1 uses completion_tokens not max_tokens
            }
        elif use_gpt5:
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

        # Log which model is active
        print(f"🤖 [AI Model] Initialized: {self.model}")

    def generate(self, messages: List[Dict[str, str]], stream: bool = True) -> Generator[str, None, None]:
        """Generate response with optional streaming"""
        try:
            if self.reasoning_model:
                # o1 reasoning models: No streaming, convert system messages to user
                print(f"\n🧠 [REASONING MODEL] Using {self.reasoning_model} for deep analysis...", flush=True)

                # Convert system messages to user messages (o1 doesn't support system role)
                processed_messages = []
                for msg in messages:
                    if msg['role'] == 'system':
                        processed_messages.append({
                            'role': 'user',
                            'content': f"[System Instructions]\n{msg['content']}"
                        })
                    else:
                        processed_messages.append(msg)

                # o1 models don't support streaming
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=processed_messages,
                    **self.config
                )

                # Return full response at once
                content = response.choices[0].message.content
                yield content

                # Log thinking tokens if available
                if hasattr(response.usage, 'completion_tokens_details'):
                    reasoning_tokens = response.usage.completion_tokens_details.get('reasoning_tokens', 0)
                    if reasoning_tokens > 0:
                        print(f"    💭 Reasoning tokens used: {reasoning_tokens}", flush=True)

            elif self.use_gpt5:
                # GPT-5: Responses API (non-streaming until organization verified)
                input_text = self._messages_to_input(messages)
                response = self.client.responses.create(
                    model=self.model,
                    input=input_text,
                    stream=False,  # Disabled until OpenAI organization is verified
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
            print(f"Error generating response: {e}", flush=True)
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
        self.web_search_tool = get_web_search_tool()
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
        mode: str = "group",
        routing_context: str = None
    ) -> List[Dict[str, str]]:
        """Build messages array for OpenAI chat

        Args:
            routing_context: Intent context from LLM router ("greeting", "team_activation", "expertise_match", "explicit_mention")
        """
        system_content = f"""# Your Persona
{self.persona}

# Your Knowledge Graph Context
{self._format_kg_context()}

# Response Format Requirements (CRITICAL - FOLLOW STRICTLY)
Structure your response like this:

**[Greeting/Reaction]** - Address teammates with @ if building on their points
- Keep it witty and natural ("Hey team!", "Building on @Rahil's idea...", "Great point @Mathew!")

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
- **ALWAYS use @ when mentioning teammates** (e.g., "@Rahil", "@Mathew", "@Shreyas", "@Siddarth")
- Reference teammates by @ format when building on their ideas (e.g., "Building on @Rahil's point...")
- Use emojis sparingly for emphasis (1-2 max)
- Keep total response to 4-6 sections max"""
        
        if mode == "group":
            system_content += """

**Mode: WhatsApp Group Chat**
- Read what teammates said above
- Build on their points or add new perspective
- Keep it conversational like a real team chat

**CRITICAL - MANDATORY ACKNOWLEDGMENT:**
1. **YOU MUST acknowledge previous responses** - Never ignore what others said
2. **YOU MUST use @ mentions** - When referring to anyone, use @Name format
3. **YOU MUST build on previous ideas** - Don't propose from scratch if others already suggested solutions
4. **YOU MUST reference teammates** - Use phrases like:
   - "Building on @Mathew's idea about [Azure/Kafka/etc]..."
   - "I agree with @Rahil's approach, and I'll..."
   - "Adding to @Siddarth's point..."
   - "Like @Shreyas mentioned..."

**CRITICAL - DO NOT QUOTE OTHERS:**
- NEVER repeat what teammates said verbatim
- NEVER write "Teammate Name: [their message]"
- DO reference their ideas: "Building on @Rahil's point about..."
- DO respond naturally as YOURSELF only"""
            
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
IMPORTANT: You ARE {self.metadata['name']}. Always respond AS yourself in first person.
- Check if YOU were tagged (look for @{self.metadata['name'].split()[0]} in the conversation)
- If tagged: Acknowledge being tagged and respond DIRECTLY as yourself
- If not tagged but relevant: Still contribute your expertise AS yourself
- Reference what Rahil and others said, but NEVER act like you're relaying to yourself
- When someone asks about you or tags you, respond as "I" not "{self.metadata['name'].split()[0]} will" or "Let me get {self.metadata['name'].split()[0]}"

**@ MENTION RULES (CRITICAL):**
- ALWAYS use @ when referring to teammates (e.g., "@Mathew", "@Rahil", "@Shreyas", "@Siddarth")
- When building on someone's point: "Building on @Rahil's idea..."
- When asking someone: "Hey @Mathew, can you help with..."
- When acknowledging: "@Siddarth - great point!"
- Team members: @Rahil, @Mathew, @Shreyas, @Siddarth

**RESPONSE FORMAT (MANDATORY):**

If you're the 2nd+ agent to respond, you MUST start by acknowledging what others said:

Example when tagged:
"**@Rahil - Got it!** On the [task] front...

Building on @Mathew's idea about [specific tech he mentioned], I'll...

**My Approach:**
- [Specific addition to what was already proposed]
- [New contribution that complements others]

@Siddarth - can you optimize the [specific thing mentioned]?"

Example when not tagged but contributing:
"**Love the direction here!**

Building on @Rahil's architecture and @Mathew's data pipeline design, I'll add...

**My Contribution:**
- [Specific addition]
- [Complementary approach]"

CRITICAL: When someone asks you a question or mentions your work, respond as "I" (first person).
WRONG: "Shreyas will handle that" or "Let me get Shreyas"
RIGHT: "I'll handle that" or "Here's my perspective"

ALWAYS acknowledge @mentions directed at you!"""

            # GREETING MODE DETECTION - Special handling for sponsor-friendly intros
            # Uses routing_context from LLM semantic intent detection (supports ANY language)
            if routing_context == "greeting":
                if self.agent_id == "rahil":
                    system_content += """

**⚠️ GREETING MODE ACTIVATED - SPONSOR DEMO**

This is a casual greeting. Provide a WARM, CONCISE, ENGAGING introduction (4-5 sentences max).

**Response Structure:**
1. **Warm greeting** (1 sentence): "Hey there! 👋" or "Welcome!"
2. **Self + Team intro** (2 sentences): Introduce yourself briefly, then name your team members and their roles
3. **Platform description** (1 sentence): "Our AI-powered knowledge graph brings our collective expertise to life"
4. **Interactive invitation** (1 sentence): End with "Ask me anything, or say **'bring in the team'** to dive deeper with specific experts!"

**Example Response:**
"**Hey there!** 👋 Welcome! I'm Rahil, the AI Architect leading this crew.

I work alongside **Mathew** (Data Engineer), **Shreyas** (Product Manager), and **Siddarth** (Software Engineer). Together, we've built this interactive knowledge graph that showcases our collective expertise and makes our team's capabilities easily explorable.

**Ask me anything about our work**, or say **'bring in the team'** to hear directly from specific experts!"

**CRITICAL RULES:**
- NO @tagging (this is an intro, not delegation)
- NO technical deep-dives (save for follow-up questions)
- NO more than 5 sentences total
- YES emojis (1-2 for warmth)
- YES engaging and proactive tone
- ALWAYS end with the activation trigger invitation"""
                else:
                    # Other agents: DO NOT respond to greetings
                    system_content += f"""

**⚠️ GREETING MODE - DO NOT RESPOND**

The user sent a casual greeting. ONLY Rahil responds to greetings.

**YOU MUST NOT GENERATE ANY RESPONSE.**

Rahil will provide the warm introduction to the team. You will only respond when:
1. The user says "bring in the team" or similar activation phrase
2. The user asks a technical question (not a greeting)
3. Rahil explicitly tags you with @{self.metadata['name'].split()[0]}

For now: Stay silent. Your time to shine will come when explicitly invited."""

        elif mode == "think_tank":
            system_content += """

**Mode: Think Tank Session (Multi-Round Discussion)**
- This is a MULTI-ROUND brainstorming session for complex case studies
- Discussion continues until team reaches consensus
- Each agent may respond multiple times across rounds
- Build on previous rounds, refine ideas, challenge assumptions

**CRITICAL - KNOWLEDGE GRAPH CITATIONS (MANDATORY):**
1. **EVERY claim must be cited** using format: `[NodeType: NodeName]`
2. Examples:
   - "I have expertise in [Skill: Python] from my work on [Project: SAP CPI Integration]"
   - "At [Company: AaMaRa Technologies], I built [Technology: Multi-tenant SaaS platforms]"
   - "My education in [Education: MS Information Management] covered [Skill: Product Strategy]"
3. If you don't have a relevant node, either:
   - Ask teammates: "@Mathew - do you have experience with X?"
   - Research it: "Let me research this... [research online]... Based on this, I understand X"
   - Be honest: "I don't have direct experience with X in my background"

**THINK TANK DISCUSSION RULES:**
1. **Acknowledge previous rounds** - Reference what was discussed before
2. **Use @ mentions** - When referring to teammates or their ideas
3. **Build consensus** - Look for agreement, propose synthesis
4. **Challenge constructively** - If you disagree, explain why politely
5. **Cite evidence** - Back every claim with knowledge graph nodes
6. **Research when needed** - Use web search to fill gaps

**CONSENSUS INDICATORS (Use these phrases):**
- "I agree with @[Name]'s approach because..."
- "Building on what @[Name] proposed, I'd add..."
- "This aligns with @[Name]'s idea about..."
- "Exactly - and to @[Name]'s point..."
- "We seem to be converging on [solution]..."

**DISAGREEMENT INDICATORS (Use carefully):**
- "I see it differently - here's why..."
- "While I appreciate @[Name]'s approach, I'm concerned about..."
- "An alternative could be..."
- "Have we considered [different angle]?"

**RESEARCH FORMAT (When you need information not in your knowledge graph):**
"Let me research [topic]...

[You research online using available tools]

Based on this research, [what you learned and how it applies].

I'll incorporate this knowledge: [summarize key findings]"

**RESPONSE STRUCTURE FOR THINK TANK:**

**Round 1 (Initial Ideas):**
- Share your initial expertise
- Cite your knowledge graph nodes
- Propose approach

**Round 2+ (Refinement):**
- Acknowledge previous round discussions
- Build consensus or offer alternatives
- Add new insights or research
- Move toward unified solution

Example Round 2+ response:
"**Great progress from Round 1!**

Building on @Rahil's architecture and @Mathew's data pipeline design, I see us converging on [solution]. Here's what I'll add:

**My Contribution ([cite your expertise]):**
- [Specific addition based on [NodeType: NodeName]]
- [Enhancement to team's proposal]

This aligns with our team's capabilities: [list cited nodes used]"

ALWAYS use citation format: [Type: Name]"""

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
                # Use 'content' key (conversation_manager format) with fallback to 'message' for backwards compatibility
                msg_content = msg.get('content', msg.get('message', ''))
                # Include agent first name for context (agents know who said what)
                # But system prompt explicitly forbids quoting/repeating these messages
                if msg.get('agent'):
                    agent_first_name = msg.get('agent', '').split()[0]  # Just first name
                    content = f"{agent_first_name}: {msg_content}"
                else:
                    content = msg_content
                messages.append({"role": role, "content": content})
        
        # Add user query
        messages.append({"role": "user", "content": user_query})
        
        return messages
    
    def respond(
        self,
        user_query: str,
        conversation_history: List[Dict[str, str]] = None,
        mode: str = "group",
        routing_context: str = None
    ) -> Generator[str, None, None]:
        """Generate streaming response

        Args:
            routing_context: Intent context from LLM router ("greeting", "team_activation", "expertise_match", "explicit_mention")
        """
        messages = self.build_messages(user_query, conversation_history, mode, routing_context)
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
        self.intent_router = IntentRouter(self.openai_client)
        self.max_agent_to_agent_rounds = 2  # Prevent infinite loops
    
    def group_chat_mode(
        self,
        user_query: str,
        conversation_history: List[Dict[str, str]] = None,
        use_dynamic_routing: bool = True
    ) -> Generator[Tuple[str, str], None, None]:
        """
        Group chat mode: Sequential responses with smart LLM routing.
        Supports multi-tier routing: user→agents, agent→agent mentions.
        Yields (agent_id, response_chunk) tuples.

        Args:
            user_query: The user's message
            conversation_history: Previous conversation context
            use_dynamic_routing: Use LLM routing (True) or hardcoded order (False, legacy)
        """
        if use_dynamic_routing:
            yield from self._group_chat_dynamic_routing(user_query, conversation_history)
        else:
            yield from self._group_chat_legacy_routing(user_query, conversation_history)

    def _group_chat_legacy_routing(
        self,
        user_query: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Generator[Tuple[str, str], None, None]:
        """Legacy hardcoded routing (all 4 agents in fixed order)"""
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

    def _group_chat_dynamic_routing(
        self,
        user_query: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Generator[Tuple[str, str], None, None]:
        """
        Dynamic routing with LLM-based intent analysis.
        Supports multi-tier agent-to-agent communication.
        """
        local_history = conversation_history.copy() if conversation_history else []

        try:
            # Tier 1: Route user query to appropriate agents
            routing_decision = self.intent_router.route_user_query(user_query, local_history)
            agent_queue = routing_decision.agent_ids.copy()

            # DEBUG: Log routing decision
            print(f"\n🎯 [ROUTING DECISION]", flush=True)
            print(f"    Query: '{user_query[:100]}'", flush=True)
            print(f"    Agents: {routing_decision.agent_ids}", flush=True)
            print(f"    Intent: {routing_decision.context}", flush=True)
            print(f"    Reasoning: {routing_decision.reasoning}", flush=True)

            # Track which agents have responded to avoid duplicates
            responded_agents: Set[str] = set()

            # Track rounds of agent-to-agent communication
            agent_to_agent_round = 0

            # Hard limit on total iterations to prevent infinite loops
            max_total_iterations = 10
            iteration_count = 0

            while agent_queue and agent_to_agent_round <= self.max_agent_to_agent_rounds and iteration_count < max_total_iterations:
                iteration_count += 1
                print(f"\n🔄 [ROUTING LOOP] Iteration {iteration_count}/{max_total_iterations}", flush=True)
                print(f"    Queue: {agent_queue}, Responded: {responded_agents}, Round: {agent_to_agent_round}/{self.max_agent_to_agent_rounds}", flush=True)
                # Get next agent from queue
                agent_id = agent_queue.pop(0)

                # Skip if already responded
                if agent_id in responded_agents:
                    continue

                # Skip if agent doesn't exist
                if agent_id not in self.agents:
                    continue

                agent = self.agents[agent_id]
                responded_agents.add(agent_id)

                # Debug: Log what history this agent sees
                print(f"\n📨 [{agent_id}] Starting response generation...", flush=True)
                print(f"    Agent queue remaining: {agent_queue}", flush=True)
                print(f"    Conversation history size: {len(local_history)} messages", flush=True)
                if local_history:
                    print(f"    Recent history:", flush=True)
                    for i, msg in enumerate(local_history[-3:]):  # Last 3 messages
                        role = msg.get('role', 'unknown')
                        if role == 'agent':
                            agent_name = msg.get('agent', 'Unknown')
                            content_preview = msg.get('content', msg.get('message', ''))[:80]
                            print(f"      [{i}] {agent_name}: {content_preview}...", flush=True)
                        else:
                            content_preview = msg.get('content', msg.get('message', ''))[:80]
                            print(f"      [{i}] User: {content_preview}...", flush=True)
                else:
                    print(f"    No conversation history available", flush=True)

                # Generate response with context from previous responses
                response_chunks = []
                for chunk in agent.respond(user_query, local_history, mode="group", routing_context=routing_decision.context):
                    response_chunks.append(chunk)
                    yield (agent_id, chunk)

                # Build full response
                full_response = "".join(response_chunks)

                # Add to history for next agent to see
                local_history.append({
                    'agent': agent.metadata['name'],
                    'agent_id': agent_id,
                    'message': full_response,
                    'content': full_response,
                    'role': 'agent'
                })

                # Tier 2: Check if this agent mentioned other agents
                try:
                    # Quick pre-check with MentionParser
                    print(f"\n🔍 [{agent_id}] Checking for @mentions in response...", flush=True)
                    print(f"    Response preview: {full_response[:150]}...", flush=True)

                    has_mentions = MentionParser.has_mentions(full_response)
                    print(f"    MentionParser.has_mentions() = {has_mentions}", flush=True)

                    if has_mentions:
                        # Extract mentions for debugging
                        extracted_mentions = MentionParser.extract_mentions(full_response)
                        print(f"    Extracted mentions: {extracted_mentions}", flush=True)

                        # Use LLM to analyze mentions and route
                        print(f"    Calling LLM for mention routing analysis...", flush=True)
                        mention_routing = self.intent_router.route_agent_response(
                            agent_id,
                            full_response
                        )

                        print(f"    LLM routing result: {mention_routing.agent_ids}", flush=True)
                        print(f"    Reasoning: {mention_routing.reasoning}", flush=True)
                        print(f"    Responded agents so far: {responded_agents}", flush=True)

                        # Add mentioned agents to queue (if not already responded and not already in queue)
                        newly_added = []
                        for mentioned_agent_id in mention_routing.agent_ids:
                            if mentioned_agent_id not in responded_agents and mentioned_agent_id not in agent_queue:
                                agent_queue.append(mentioned_agent_id)
                                newly_added.append(mentioned_agent_id)

                        if newly_added:
                            print(f"    ✅ Added {newly_added} to agent queue", flush=True)
                            # Increment round counter only when we actually add new agents
                            agent_to_agent_round += 1
                        else:
                            print(f"    ⚠️ No new agents added (all already responded or in queue)", flush=True)
                    else:
                        print(f"    No @mentions detected in response", flush=True)

                except IntentRouterError as e:
                    # Log error but continue (agent-to-agent routing is optional)
                    print(f"❌ Warning: Agent-to-agent routing failed for {agent_id}: {e}", flush=True)
                    pass

        except IntentRouterError as e:
            # LLM routing failed - raise error (no fallback per user requirement)
            error_msg = f"[Routing Error: {str(e)}]"
            yield ("system", error_msg)
            raise

    def think_tank_mode(
        self,
        user_query: str,
        conversation_history: List[Dict[str, str]] = None,
        max_rounds: int = 5,
        min_consensus: float = 0.85
    ) -> Generator[Tuple[str, str], None, None]:
        """
        Think Tank Mode: Multi-round brainstorming with consensus-driven conclusion.

        Features:
        - Multi-round discussions (3-20 rounds adaptive)
        - Knowledge graph citations mandatory [NodeType: NodeName]
        - Real-time web research per agent
        - Consensus detection after each round
        - Final unified summary when consensus reached

        Args:
            user_query: User's case study or complex question
            conversation_history: Previous conversation context
            max_rounds: Maximum discussion rounds (default 5, can extend to 20)
            min_consensus: Minimum consensus score to conclude (0.0-1.0, default 0.85)

        Yields:
            (agent_id, response_chunk) or ("system", metadata_json) tuples
        """
        print(f"\n🧠 [THINK TANK MODE] Starting multi-round discussion...", flush=True)
        print(f"    Max rounds: {max_rounds}, Min consensus: {min_consensus}", flush=True)

        # Analyze query complexity and determine if reasoning model needed
        reasoning_model = self._analyze_query_complexity(user_query)
        if reasoning_model:
            print(f"    🎯 Detected complex query - will use {reasoning_model} for final summary", flush=True)
        else:
            print(f"    ✨ Standard complexity - using GPT-4o", flush=True)

        # Initialize discussion state
        local_history = conversation_history.copy() if conversation_history else []
        discussion_round = 0
        consensus_reached = False
        all_round_responses = []  # Track all responses for consensus detection

        try:
            # Emit mode metadata to frontend
            yield ("system", json.dumps({
                "type": "think_tank_start",
                "max_rounds": max_rounds,
                "min_consensus": min_consensus,
                "reasoning_model": reasoning_model
            }))

            # FIX: Route agents ONCE before starting rounds (not every round)
            routing_decision = self.intent_router.route_user_query(user_query, local_history)
            participating_agents = routing_decision.agent_ids.copy()
            print(f"\n🎯 [THINK TANK] Participating agents: {participating_agents}", flush=True)

            # FIX: Skip multi-round discussion for greetings - just give a simple response
            if routing_decision.context == "greeting":
                print(f"👋 [THINK TANK] Greeting detected - using simple response mode instead of multi-round", flush=True)
                # Use regular group chat for greetings (single response, no rounds)
                yield from self.group_chat_mode(user_query, conversation_history, use_dynamic_routing=True)
                return

            while discussion_round < max_rounds and not consensus_reached:
                discussion_round += 1
                print(f"\n🔄 [ROUND {discussion_round}/{max_rounds}] Starting discussion round...", flush=True)

                # Emit round start event
                yield ("system", json.dumps({
                    "type": "round_start",
                    "round": discussion_round,
                    "total_rounds": max_rounds
                }))

                # FIX: Use the same participating agents for each round (no re-routing)
                agent_queue = participating_agents.copy()
                responded_agents_this_round = set()
                round_responses = []

                # Hard limit on iterations per round to prevent infinite loops
                max_iterations_per_round = 10
                round_iteration_count = 0

                # Process each agent in the queue
                while agent_queue and round_iteration_count < max_iterations_per_round:
                    round_iteration_count += 1
                    print(f"    🔄 Round {discussion_round} iteration {round_iteration_count}/{max_iterations_per_round}", flush=True)
                    print(f"       Queue: {agent_queue}, Responded: {responded_agents_this_round}", flush=True)
                    agent_id = agent_queue.pop(0)

                    if agent_id in responded_agents_this_round:
                        continue

                    if agent_id not in self.agents:
                        continue

                    agent = self.agents[agent_id]
                    responded_agents_this_round.add(agent_id)

                    print(f"\n📨 [{agent_id}] Responding in round {discussion_round}...", flush=True)

                    # Generate response with think_tank mode
                    response_chunks = []
                    for chunk in agent.respond(user_query, local_history, mode="think_tank"):
                        response_chunks.append(chunk)
                        yield (agent_id, chunk)

                    full_response = "".join(response_chunks)

                    # Execute web research if agent requested it
                    full_response_with_research = self._execute_web_research(agent_id, full_response)

                    # If research was added, stream the research results
                    if full_response_with_research != full_response:
                        research_addition = full_response_with_research[len(full_response):]
                        for char in research_addition:
                            yield (agent_id, char)

                    full_response = full_response_with_research

                    # Parse citations from response
                    citations = self._parse_citations(full_response)

                    # Add to history
                    response_data = {
                        'agent': agent.metadata['name'],
                        'agent_id': agent_id,
                        'message': full_response,
                        'content': full_response,
                        'role': 'agent',
                        'round': discussion_round,
                        'citations': citations
                    }

                    local_history.append(response_data)
                    round_responses.append(response_data)

                    # Emit citation metadata
                    if citations:
                        yield ("system", json.dumps({
                            "type": "citations",
                            "agent_id": agent_id,
                            "citations": citations
                        }))

                    # Check for @mentions to add more agents
                    if MentionParser.has_mentions(full_response):
                        try:
                            mention_routing = self.intent_router.route_agent_response(agent_id, full_response)
                            for mentioned_agent_id in mention_routing.agent_ids:
                                if mentioned_agent_id not in responded_agents_this_round and mentioned_agent_id not in agent_queue:
                                    agent_queue.append(mentioned_agent_id)
                                    print(f"    ✅ Added {mentioned_agent_id} via @mention", flush=True)
                        except Exception as e:
                            print(f"    ⚠️ Mention routing failed: {e}", flush=True)

                # Store round responses for consensus analysis
                all_round_responses.append({
                    'round': discussion_round,
                    'responses': round_responses
                })

                # Emit round complete
                yield ("system", json.dumps({
                    "type": "round_complete",
                    "round": discussion_round,
                    "agents_responded": len(responded_agents_this_round)
                }))

                # Check consensus after round (except first round)
                if discussion_round > 1:
                    consensus_score = self._detect_consensus(all_round_responses)
                    print(f"\n🎯 [CONSENSUS CHECK] Round {discussion_round}: {consensus_score:.0%}", flush=True)

                    # Emit consensus score
                    yield ("system", json.dumps({
                        "type": "consensus_update",
                        "round": discussion_round,
                        "consensus": consensus_score
                    }))

                    if consensus_score >= min_consensus:
                        consensus_reached = True
                        print(f"    ✅ Consensus reached! ({consensus_score:.0%} >= {min_consensus:.0%})", flush=True)
                        break
                    else:
                        print(f"    ⏳ Continuing discussion ({consensus_score:.0%} < {min_consensus:.0%})", flush=True)

            # Generate final summary (Rahil synthesizes)
            print(f"\n📝 [FINAL SUMMARY] Rahil generating unified answer...", flush=True)

            yield ("system", json.dumps({
                "type": "summary_start",
                "rounds_completed": discussion_round,
                "consensus_reached": consensus_reached
            }))

            # Rahil creates final summary (use reasoning model if complex query)
            rahil = self.agents['rahil']

            # Temporarily swap to reasoning model if needed
            original_client = rahil.openai_client
            if reasoning_model:
                print(f"    🧠 Using {reasoning_model} for deep synthesis...", flush=True)
                rahil.openai_client = self._create_reasoning_client(reasoning_model)

            summary_prompt = f"""Based on the team discussion, provide a FINAL UNIFIED ANSWER.

Synthesize all perspectives into one coherent solution. Include:
1. **Final Recommendation** - The agreed-upon approach
2. **Key Insights** - Important points from the discussion
3. **Implementation Plan** - Concrete next steps
4. **Citations** - Reference knowledge graph nodes used

Discussion rounds: {discussion_round}
Consensus: {'Reached' if consensus_reached else 'Not fully reached, but concluding'}
"""

            summary_chunks = []
            for chunk in rahil.respond(summary_prompt, local_history, mode="think_tank"):
                summary_chunks.append(chunk)
                yield ("rahil_summary", chunk)

            final_summary = "".join(summary_chunks)

            # Restore original client
            if reasoning_model:
                rahil.openai_client = original_client

            # Parse final citations
            final_citations = self._parse_citations(final_summary)

            # Emit final metadata
            yield ("system", json.dumps({
                "type": "think_tank_complete",
                "rounds_completed": discussion_round,
                "consensus_reached": consensus_reached,
                "final_citations": final_citations,
                "total_agents": len(set(r['agent_id'] for round_data in all_round_responses for r in round_data['responses']))
            }))

            print(f"\n✅ [THINK TANK COMPLETE] Discussion concluded after {discussion_round} rounds", flush=True)

        except Exception as e:
            error_msg = f"[Think Tank Error: {str(e)}]"
            print(f"\n❌ {error_msg}", flush=True)
            yield ("system", json.dumps({
                "type": "error",
                "message": error_msg
            }))
            raise

    def _parse_citations(self, text: str) -> List[Dict[str, str]]:
        """
        Parse knowledge graph citations from text.
        Format: [NodeType: NodeName] or [NodeName]

        Returns list of {type, name, original} dicts
        """
        import re
        citations = []

        # Pattern: [Skill: Python] or [Project: SAP CPI] or [Python]
        patterns = [
            r'\[([A-Z][a-z]+):\s*([^\]]+)\]',  # [Type: Name]
            r'\[([A-Z][a-z\s]+)\]'  # [Name]
        ]

        for pattern in patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                if len(match.groups()) == 2:
                    citations.append({
                        'type': match.group(1),
                        'name': match.group(2).strip(),
                        'original': match.group(0)
                    })
                else:
                    citations.append({
                        'type': 'Unknown',
                        'name': match.group(1).strip(),
                        'original': match.group(0)
                    })

        return citations

    def _detect_consensus(self, all_round_responses: List[Dict]) -> float:
        """
        Analyze discussion rounds to detect consensus level.

        Returns consensus score (0.0 to 1.0) based on:
        - Agreement indicators in responses
        - Repeated technologies/approaches
        - Lack of conflicting proposals
        - References to previous ideas

        Args:
            all_round_responses: List of round data with responses

        Returns:
            float: Consensus score 0.0-1.0 (1.0 = full consensus)
        """
        if len(all_round_responses) < 2:
            return 0.0

        # Get last two rounds for comparison
        prev_round = all_round_responses[-2]['responses']
        curr_round = all_round_responses[-1]['responses']

        # Simple heuristic: check for agreement keywords
        agreement_keywords = [
            'i agree', 'building on', 'like @', 'as @',
            'mentioned', 'great point', 'exactly', 'precisely',
            'aligns with', 'supports', 'same approach', 'consistent'
        ]

        conflict_keywords = [
            'however', 'but', 'instead', 'different approach',
            'disagree', 'alternative', 'on the other hand'
        ]

        agreement_count = 0
        conflict_count = 0

        for response in curr_round:
            text_lower = response['content'].lower()

            for keyword in agreement_keywords:
                if keyword in text_lower:
                    agreement_count += 1

            for keyword in conflict_keywords:
                if keyword in text_lower:
                    conflict_count += 1

        # Calculate consensus score
        total_indicators = agreement_count + conflict_count
        if total_indicators == 0:
            return 0.5  # Neutral if no indicators

        consensus = agreement_count / total_indicators

        # Boost if multiple agents agree (strong signal)
        if len(curr_round) >= 3 and agreement_count >= 2:
            consensus = min(1.0, consensus + 0.2)

        return consensus

    def _execute_web_research(self, agent_id: str, response_text: str) -> str:
        """
        Detect and execute web research requests in agent responses.

        Looks for patterns like:
        - "Let me research [topic]..."
        - "I'll research [topic]..."
        - "Researching [topic]..."

        Args:
            agent_id: Agent making the research request
            response_text: Agent's response text

        Returns:
            Modified response with research results appended, or original if no research
        """
        import re

        # Research trigger patterns
        research_patterns = [
            r"[Ll]et me research ([^\n.]+)",
            r"I'll research ([^\n.]+)",
            r"[Rr]esearching ([^\n.]+)",
            r"[Nn]eed to research ([^\n.]+)"
        ]

        # Check for research requests
        research_topics = []
        for pattern in research_patterns:
            matches = re.finditer(pattern, response_text)
            for match in matches:
                topic = match.group(1).strip().rstrip('.,!?')
                research_topics.append(topic)

        if not research_topics:
            return response_text

        # Execute web searches
        agent = self.agents.get(agent_id)
        if not agent or not hasattr(agent, 'web_search_tool'):
            return response_text

        research_results = []
        for topic in research_topics[:2]:  # Limit to 2 searches per response
            print(f"\n🔍 [{agent_id}] Researching: {topic}", flush=True)

            try:
                search_result = agent.web_search_tool.search(topic, max_results=2)

                if search_result.get('results'):
                    # Format research results
                    formatted = f"\n\n**Research Results: {topic}**\n\n"
                    formatted += f"{search_result['summary']}\n\n"

                    if search_result.get('sources'):
                        formatted += "**Sources:**\n"
                        for i, source in enumerate(search_result['sources'], 1):
                            formatted += f"{i}. {source}\n"

                    research_results.append(formatted)
                    print(f"    ✅ Found {len(search_result['results'])} results", flush=True)
                else:
                    research_results.append(f"\n\n**Research Note:** Limited information available for '{topic}'.\n")
                    print(f"    ⚠️ No results found", flush=True)

            except Exception as e:
                print(f"    ❌ Research failed: {e}", flush=True)
                research_results.append(f"\n\n**Research Note:** Unable to research '{topic}' at this time.\n")

        # Append research results to response
        if research_results:
            response_text += "\n" + "\n".join(research_results)

        return response_text

    def _analyze_query_complexity(self, query: str) -> str:
        """
        Analyze query complexity to determine if reasoning model should be used.

        Returns:
            'o1-mini' for complex queries requiring reasoning
            'o1-preview' for highly complex queries (multi-step, mathematical, strategic)
            None for normal queries (use default GPT-4o)
        """
        # Complexity indicators
        high_complexity_keywords = [
            'analyze', 'evaluate', 'compare', 'tradeoff', 'pros and cons',
            'strategy', 'architecture', 'design pattern', 'optimize',
            'calculate', 'mathematical', 'algorithm', 'complexity analysis',
            'multi-step', 'step-by-step', 'systematic approach'
        ]

        medium_complexity_keywords = [
            'explain', 'why', 'how', 'what if', 'scenario',
            'problem', 'solution', 'approach', 'consider',
            'think', 'reason', 'justify', 'debate'
        ]

        query_lower = query.lower()

        # Count complexity indicators
        high_complexity_count = sum(1 for keyword in high_complexity_keywords if keyword in query_lower)
        medium_complexity_count = sum(1 for keyword in medium_complexity_keywords if keyword in query_lower)

        # Additional heuristics
        word_count = len(query.split())
        has_multiple_questions = query.count('?') > 1
        has_code_context = any(keyword in query_lower for keyword in ['code', 'implementation', 'function', 'class'])

        # Scoring
        complexity_score = 0
        complexity_score += high_complexity_count * 3
        complexity_score += medium_complexity_count * 1
        complexity_score += 2 if word_count > 100 else 0
        complexity_score += 2 if has_multiple_questions else 0
        complexity_score += 1 if has_code_context else 0

        # Decision thresholds
        if complexity_score >= 8:
            return 'o1-preview'  # Highly complex
        elif complexity_score >= 4:
            return 'o1-mini'  # Moderately complex
        else:
            return None  # Normal complexity, use GPT-4o

    def _create_reasoning_client(self, reasoning_model: str) -> OpenAIClient:
        """Create a new OpenAI client with reasoning model support"""
        return OpenAIClient(reasoning_model=reasoning_model)

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

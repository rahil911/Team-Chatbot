"""
LLM-Based Intent Router for Multi-Agent System
Routes user queries and agent responses to the appropriate agents based on LLM analysis
NO FALLBACKS - Pure LLM routing or explicit error
"""
import json
import re
from typing import Dict, List, Any, Set, Optional
from dataclasses import dataclass

# Avoid circular import - AGENTS will be imported when needed
AGENTS = None


def _get_agents():
    """Lazy import to avoid circular dependency"""
    global AGENTS
    if AGENTS is None:
        from agents import AGENTS as _AGENTS
        AGENTS = _AGENTS
    return AGENTS


@dataclass
class RoutingDecision:
    """Represents a routing decision made by the LLM"""
    agent_ids: List[str]  # Which agents should respond
    reasoning: str  # Why these agents were selected
    is_targeted: bool  # Whether specific agents were mentioned
    confidence: float  # Confidence score (0.0-1.0)
    context: Optional[str] = None  # Additional context


class IntentRouterError(Exception):
    """Raised when LLM routing fails"""
    pass


class IntentRouter:
    """
    Routes messages to appropriate agents using LLM analysis
    Supports both user-to-agent and agent-to-agent routing
    """

    def __init__(self, openai_client):
        """
        Initialize the intent router

        Args:
            openai_client: OpenAIClient instance for LLM calls
        """
        self.openai_client = openai_client
        self._build_agent_expertise_map()

    def _build_agent_expertise_map(self) -> None:
        """Build a map of agent expertise for routing prompts"""
        AGENTS = _get_agents()
        self.agent_expertise = {
            'rahil': {
                'domains': ['AI/ML', 'system architecture', 'deep learning', 'multi-agent systems', 'LLMs', 'orchestration', 'leadership'],
                'skills': ['Python', 'PyTorch', 'GPT', 'system design', 'research'],
                'role': 'AI Architect & Orchestrator'
            },
            'mathew': {
                'domains': ['data engineering', 'cloud infrastructure', 'ETL pipelines', 'databases', 'big data', 'AWS', 'Azure'],
                'skills': ['Python', 'SQL', 'Apache technologies', 'cloud platforms', 'data pipelines'],
                'role': 'Data Engineer'
            },
            'shreyas': {
                'domains': ['product management', 'strategy', 'planning', 'workflows', 'business', 'user experience', 'requirements'],
                'skills': ['product strategy', 'roadmapping', 'stakeholder management', 'process optimization'],
                'role': 'Product Manager'
            },
            'siddarth': {
                'domains': ['software engineering', 'distributed systems', 'performance', 'code quality', 'architecture', 'scalability'],
                'skills': ['Java', 'backend development', 'system performance', 'code optimization', 'debugging'],
                'role': 'Software Engineer'
            }
        }

    def route_user_query(
        self,
        user_query: str,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> RoutingDecision:
        """
        Route a user query to appropriate agents using LLM analysis

        Args:
            user_query: The user's message
            conversation_history: Recent conversation context

        Returns:
            RoutingDecision with selected agents

        Raises:
            IntentRouterError: If LLM routing fails
        """
        try:
            # Build routing prompt (LLM handles ALL intent detection semantically)
            routing_prompt = self._build_user_query_routing_prompt(user_query, conversation_history)

            # Call LLM for routing decision
            messages = [
                {
                    "role": "system",
                    "content": "You are an expert routing system for a multi-agent team. Analyze queries and determine which team members should respond based on their expertise."
                },
                {
                    "role": "user",
                    "content": routing_prompt
                }
            ]

            # Get LLM response (non-streaming for routing)
            response_chunks = []
            for chunk in self.openai_client.generate(messages, stream=False):
                response_chunks.append(chunk)

            response_text = "".join(response_chunks)

            # Parse JSON response
            routing_data = self._parse_routing_response(response_text)

            # Validate agent IDs
            AGENTS = _get_agents()
            valid_agents = [aid for aid in routing_data['agents'] if aid in AGENTS]

            # Fallback to all agents if LLM returns no valid agents
            if not valid_agents:
                print(f"⚠️ LLM returned no valid agents: {routing_data['agents']}. Falling back to all agents.")
                valid_agents = list(AGENTS.keys())

            return RoutingDecision(
                agent_ids=valid_agents,
                reasoning=routing_data.get('reasoning', 'No reasoning provided (fallback to all agents)') if not routing_data.get('agents') else routing_data.get('reasoning', 'No reasoning provided'),
                is_targeted=routing_data.get('is_targeted', False),
                confidence=routing_data.get('confidence', 0.5),  # Lower confidence for fallback
                context=routing_data.get('intent')  # Pass intent from LLM ("greeting", "team_activation", "expertise_match", "explicit_mention")
            )

        except Exception as e:
            raise IntentRouterError(f"LLM routing failed: {str(e)}")

    def route_agent_response(
        self,
        agent_id: str,
        agent_response: str
    ) -> RoutingDecision:
        """
        Analyze an agent's response for @mentions and determine follow-up routing

        Args:
            agent_id: ID of the agent who responded
            agent_response: The agent's response text

        Returns:
            RoutingDecision with agents to route to next (empty if no mentions)

        Raises:
            IntentRouterError: If LLM routing fails
        """
        try:
            # Build routing prompt for agent response analysis
            routing_prompt = self._build_agent_response_routing_prompt(agent_id, agent_response)

            # Call LLM for routing decision
            messages = [
                {
                    "role": "system",
                    "content": "You are an expert at analyzing agent responses for @mentions and delegation patterns. Identify which team members are being asked to respond or contribute."
                },
                {
                    "role": "user",
                    "content": routing_prompt
                }
            ]

            # Get LLM response (non-streaming)
            response_chunks = []
            for chunk in self.openai_client.generate(messages, stream=False):
                response_chunks.append(chunk)

            response_text = "".join(response_chunks)

            # Parse JSON response
            routing_data = self._parse_routing_response(response_text)

            # Validate agent IDs (exclude the agent who just responded)
            AGENTS = _get_agents()
            valid_agents = [
                aid for aid in routing_data['agents']
                if aid in AGENTS and aid != agent_id
            ]

            return RoutingDecision(
                agent_ids=valid_agents,
                reasoning=routing_data.get('reasoning', 'No mentions found'),
                is_targeted=len(valid_agents) > 0,
                confidence=routing_data.get('confidence', 0.9)
            )

        except Exception as e:
            raise IntentRouterError(f"Agent response routing failed: {str(e)}")

    def _build_user_query_routing_prompt(
        self,
        user_query: str,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """Build prompt for user query routing"""
        # Format conversation context
        context_str = ""
        if conversation_history:
            recent_context = conversation_history[-3:]  # Last 3 messages
            context_parts = []
            for msg in recent_context:
                role = msg.get('role', 'unknown')
                if role == 'user':
                    context_parts.append(f"User: {msg.get('content', '')[:200]}")
                elif role == 'agent':
                    agent_name = msg.get('agent', 'Agent')
                    context_parts.append(f"{agent_name}: {msg.get('content', '')[:200]}")
            context_str = "\n".join(context_parts)

        # Format agent expertise
        AGENTS = _get_agents()
        agent_list = []
        for agent_id, expertise in self.agent_expertise.items():
            agent_name = AGENTS[agent_id]['name']
            agent_title = AGENTS[agent_id]['title']
            domains = ", ".join(expertise['domains'][:5])
            agent_list.append(f"- {agent_id} ({agent_name} - {agent_title}): {domains}")

        agents_str = "\n".join(agent_list)

        prompt = f"""You are an expert routing system for a multi-agent team. Analyze the user's message semantically to detect intent and route appropriately.

Team Members:
{agents_str}

Recent Conversation Context:
{context_str if context_str else "No recent context"}

User Message: "{user_query}"

# ROUTING PRIORITY (Check in this exact order)

## 🔥 PRIORITY 1: EXPLICIT MENTIONS (HIGHEST PRIORITY - Check FIRST!)
If the user explicitly mentions a specific team member by name (e.g., "Hi Siddarth", "@Mathew", "Rahil, can you..."), route ONLY to that person.

Examples: "Hi Siddarth", "Hello Mathew", "@Rahil help me", "Shreyas, what do you think?", "Hey Siddarth, how are you?"

CRITICAL: Even if message contains a greeting, if a specific person is mentioned, route to THAT person, NOT Rahil.

If explicit mention detected, respond:
{{
    "agents": ["mentioned_agent_id"],
    "is_targeted": true,
    "reasoning": "User explicitly addressed [agent_name]",
    "confidence": 1.0,
    "intent": "explicit_mention"
}}

## PRIORITY 2: TEAM ACTIVATION DETECTION
Detect requests to involve the ENTIRE team (no specific person mentioned):

Examples: "Bring in the team", "Let's hear from everyone", "I want all of you to respond", "Get everyone's input"

If team activation detected, respond:
{{
    "agents": ["rahil", "mathew", "shreyas", "siddarth"],
    "is_targeted": true,
    "reasoning": "Team activation requested - all agents respond",
    "confidence": 1.0,
    "intent": "team_activation"
}}

## PRIORITY 3: GENERAL GREETING (No specific person mentioned)
If message is a general greeting WITHOUT mentioning a specific person (e.g., "Hi", "Hello", "Hey team"), route to Rahil.

Examples: "Hi", "Hello", "Hey team", "Good morning", "What's up?", "Who are you?"

⚠️ IMPORTANT: Do NOT use this rule if a specific team member was mentioned!

If general greeting detected (no specific person), respond:
{{
    "agents": ["rahil"],
    "is_targeted": false,
    "reasoning": "General greeting - Rahil provides team introduction",
    "confidence": 1.0,
    "intent": "greeting"
}}

## PRIORITY 4: EXPERTISE-BASED ROUTING
If none of the above apply, match query content to agent expertise:

- AI/ML, architecture, orchestration → rahil
- Data engineering, cloud, pipelines → mathew
- Product management, strategy, workflows → shreyas
- Software engineering, performance, systems → siddarth

Select 1-4 agents (prefer fewer, focused responses).

Respond:
{{
    "agents": ["agent_id1", "agent_id2"],
    "is_targeted": false,
    "reasoning": "Brief explanation",
    "confidence": 0.0-1.0,
    "intent": "expertise_match"
}}

# OUTPUT FORMAT
Respond ONLY with valid JSON:
{{
    "agents": ["agent_id1", "agent_id2"],
    "is_targeted": true/false,
    "reasoning": "Brief explanation (1-2 sentences)",
    "confidence": 0.0-1.0,
    "intent": "greeting" | "team_activation" | "expertise_match" | "explicit_mention"
}}

Valid agent IDs: rahil, mathew, shreyas, siddarth

IMPORTANT: Detect intent semantically, not by exact string matching. Support ANY language."""

        return prompt

    def _build_agent_response_routing_prompt(
        self,
        agent_id: str,
        agent_response: str
    ) -> str:
        """Build prompt for agent response analysis (detecting @mentions)"""
        AGENTS = _get_agents()
        agent_name = AGENTS[agent_id]['name']

        # Format other agents
        other_agents = []
        for aid, metadata in AGENTS.items():
            if aid != agent_id:
                other_agents.append(f"- {aid} ({metadata['name']} - {metadata['title']})")

        other_agents_str = "\n".join(other_agents)

        prompt = f"""Analyze this agent's response to determine if they are ACTIVELY delegating or requesting another agent to respond.

Agent: {agent_name} ({agent_id})

Response:
"{agent_response}"

Other Team Members:
{other_agents_str}

# CRITICAL: PASSIVE vs ACTIVE MENTIONS

## ❌ PASSIVE MENTIONS (DO NOT ROUTE - Return empty agents list)

Passive mentions are when an agent simply TALKS ABOUT or REFERENCES another team member without asking them to respond.

**Examples of PASSIVE mentions (return []):**
- "I work with Mathew on data pipelines" ❌
- "Our team includes Mathew, Shreyas, and Siddarth" ❌
- "Mathew handles data engineering" ❌
- "Thanks @Siddarth for the introduction" ❌
- "Appreciate @Mathew's work on this" ❌
- "I'm Rahil, leading this crew. I work alongside Mathew, Shreyas, Siddarth" ❌
- "Welcome! Meet our team: Mathew (Data Engineer), Shreyas (Product Manager)..." ❌
- "Building on @Mathew's earlier ping" ❌
- "Following up on what @Shreyas mentioned" ❌
- "@Siddarth and I worked on this together" ❌
- "This aligns with @Rahil's vision" ❌
- General introductions, acknowledgments, or team descriptions ❌
- Thank you messages or appreciation ❌
- Contextual references to past work ❌

## ✅ ACTIVE HANDOFFS (DO ROUTE - Return agent IDs)

Active handoffs are when an agent explicitly ASKS, REQUESTS, or DELEGATES to another agent to respond or contribute.

**Examples of ACTIVE handoffs (return agent IDs):**
- "@Mathew, can you help with this?" ✅
- "Mathew, please explain the data pipeline" ✅
- "Let me hand this over to Siddarth" ✅
- "I think Shreyas should weigh in here" ✅
- "Siddarth, what's your take on this?" ✅
- "@Rahil, can you clarify your approach?" ✅
- "Mathew - could you confirm the ETA?" ✅
- "Shreyas, what are your thoughts?" ✅
- "Can @Siddarth review this?" ✅
- "I'd like @Rahil to chime in on this" ✅
- "Mathew, mind sharing the status?" ✅
- Direct questions with agent's name ✅
- Explicit delegation language ("hand over", "should weigh in", "can you") ✅

# DETECTION RULES

1. **Look for interrogative patterns**: Questions directed at specific agents (e.g., "Mathew, can you...", "What do you think, Shreyas?")
2. **Look for imperative requests**: Commands or requests (e.g., "Mathew, please...", "Siddarth, help with...")
3. **Look for delegation language**: "hand over", "should weigh in", "would like [agent] to", "let's ask [agent]"
4. **Ignore gratitude/acknowledgment**: "Thanks @Mathew", "Appreciate @Siddarth", "Building on @Rahil's idea"
5. **Ignore descriptive references**: "I work with X", "X handles Y", "Our team includes X"
6. **Ignore introductions**: Team member lists, role descriptions, welcome messages
7. **When in doubt, return EMPTY list []** - Better to miss an edge case than create unwanted loops

# OUTPUT FORMAT

Respond ONLY with valid JSON in this exact format:
{{
    "agents": [],  // ONLY include agents if EXPLICIT delegation detected, otherwise MUST be []
    "is_targeted": false,  // true ONLY if explicit @mentions or direct requests found
    "reasoning": "Brief explanation of why agents were/weren't added",
    "confidence": 0.95
}}

Valid agent IDs: rahil, mathew, shreyas, siddarth (excluding {agent_id})

# EXAMPLES

**Example 1 - PASSIVE (return []):**
Response: "Thanks @Mathew for the intro! I work with Siddarth on backend systems."
Output: {{"agents": [], "is_targeted": false, "reasoning": "Only acknowledgment and descriptive reference, no delegation", "confidence": 0.95}}

**Example 2 - ACTIVE (return ["mathew"]):**
Response: "Good point! @Mathew, can you share the database schema?"
Output: {{"agents": ["mathew"], "is_targeted": true, "reasoning": "Direct question asking Mathew to share information", "confidence": 0.95}}

**Example 3 - PASSIVE (return []):**
Response: "Our team includes @Mathew (Data Engineer), @Shreyas (PM), and @Siddarth (SWE)."
Output: {{"agents": [], "is_targeted": false, "reasoning": "Team introduction, no requests for response", "confidence": 0.95}}

**Example 4 - ACTIVE (return ["shreyas", "siddarth"]):**
Response: "@Shreyas, what's your take on this? @Siddarth, can you help implement?"
Output: {{"agents": ["shreyas", "siddarth"], "is_targeted": true, "reasoning": "Direct questions requesting Shreyas and Siddarth to respond", "confidence": 0.95}}"""

        return prompt

    def _parse_routing_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse LLM routing response (expects JSON)

        Args:
            response_text: Raw LLM response

        Returns:
            Parsed routing data

        Raises:
            IntentRouterError: If parsing fails
        """
        try:
            # Try to extract JSON from response (in case of markdown code blocks)
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try to find JSON object directly
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    raise ValueError("No JSON object found in response")

            # Parse JSON
            data = json.loads(json_str)

            # Validate required fields
            if 'agents' not in data:
                raise ValueError("Missing 'agents' field in routing response")

            if not isinstance(data['agents'], list):
                raise ValueError("'agents' field must be a list")

            return data

        except Exception as e:
            raise IntentRouterError(f"Failed to parse LLM routing response: {str(e)}\nResponse: {response_text}")


class MentionParser:
    """
    Simple mention parser for extracting @mentions from text
    Used as a fast pre-check before LLM routing
    """

    @staticmethod
    def extract_mentions(text: str) -> Set[str]:
        """
        Extract @mentions and direct name mentions from text

        Args:
            text: Text to analyze

        Returns:
            Set of agent IDs mentioned
        """
        from intent_router import _get_agents
        AGENTS = _get_agents()

        mentioned_agents = set()
        text_lower = text.lower()

        # Check for @mentions
        at_mentions = re.findall(r'@(\w+)', text)
        for mention in at_mentions:
            mention_lower = mention.lower()
            for agent_id in AGENTS.keys():
                agent_name = AGENTS[agent_id]['name']
                first_name = agent_name.split()[0].lower()
                if mention_lower == first_name or mention_lower == agent_id:
                    mentioned_agents.add(agent_id)

        # Check for direct name mentions (without @)
        for agent_id, metadata in AGENTS.items():
            full_name = metadata['name'].lower()
            first_name = full_name.split()[0]

            # Look for patterns like "Mathew, can you..." or "Hey Mathew"
            patterns = [
                rf'\b{first_name}\b[,:]',  # Name followed by comma or colon
                rf'(?:^|\.\s+){first_name}\b',  # Name at start or after period
                rf'(?:hey|hi|yo)\s+{first_name}\b',  # Greeting + name
            ]

            for pattern in patterns:
                if re.search(pattern, text_lower):
                    mentioned_agents.add(agent_id)
                    break

        return mentioned_agents

    @staticmethod
    def has_mentions(text: str) -> bool:
        """Quick check if text contains any mentions"""
        return bool(MentionParser.extract_mentions(text))

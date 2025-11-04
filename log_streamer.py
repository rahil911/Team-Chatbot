"""
Real-time backend log streaming utility for WebSocket clients.

Streams structured logs to frontend for observability and user transparency.
Categories: connection, routing, agent, model, think_tank, mention, research, knowledge_graph, processing, error
"""

import time
from typing import Optional, Dict, Any, Literal
from fastapi import WebSocket

# Type definitions for log levels and categories
LogLevel = Literal["info", "warning", "error", "debug", "success"]
LogCategory = Literal[
    "connection",      # WebSocket lifecycle events
    "routing",         # LLM routing decisions
    "agent",          # Agent orchestration & responses
    "model",          # AI model selection & usage
    "think_tank",     # Multi-round discussions
    "mention",        # @mention detection & routing
    "research",       # Web search events
    "knowledge_graph",# KG operations
    "processing",     # Message handling
    "error"           # Errors & warnings
]


class LogStreamer:
    """
    Centralized utility for streaming backend logs to frontend via WebSocket.

    Usage:
        log_streamer = LogStreamer(connection_manager)
        await log_streamer.emit(
            websocket,
            level="info",
            category="routing",
            message="🎯 Routing decision: Rahil, Mathew",
            metadata={"agents": ["rahil", "mathew"], "intent": "expertise_match"}
        )
    """

    def __init__(self, connection_manager):
        """
        Initialize log streamer with connection manager.

        Args:
            connection_manager: WebSocket connection manager instance
        """
        self.manager = connection_manager
        self._start_times: Dict[str, int] = {}  # Track operation start times for duration calculation

    async def emit(
        self,
        websocket: WebSocket,
        level: LogLevel,
        category: LogCategory,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        duration_ms: Optional[int] = None
    ):
        """
        Emit a structured log to the frontend via WebSocket.

        Args:
            websocket: WebSocket connection to send log to
            level: Log level (info, warning, error, debug, success)
            category: Log category (routing, agent, model, etc.)
            message: Human-readable log message
            metadata: Additional structured data for progressive disclosure
            duration_ms: Optional duration in milliseconds for the operation
        """
        try:
            log_data = {
                "type": "log_stream",
                "level": level,
                "category": category,
                "message": message,
                "timestamp": int(time.time() * 1000),  # Unix timestamp in milliseconds
                "metadata": metadata or {}
            }

            # Add duration if provided
            if duration_ms is not None:
                log_data["duration_ms"] = duration_ms

            await self.manager.send_personal(log_data, websocket)
        except Exception as e:
            # Don't crash if log streaming fails - just print to server console
            print(f"⚠️ [LOG-STREAMER] Failed to emit log: {e}")

    def start_timer(self, operation_id: str):
        """
        Start a timer for an operation to track duration.

        Args:
            operation_id: Unique identifier for the operation
        """
        self._start_times[operation_id] = int(time.time() * 1000)

    def get_duration(self, operation_id: str) -> Optional[int]:
        """
        Get the duration of an operation in milliseconds.

        Args:
            operation_id: Unique identifier for the operation

        Returns:
            Duration in milliseconds, or None if timer wasn't started
        """
        start_time = self._start_times.get(operation_id)
        if start_time is None:
            return None

        duration = int(time.time() * 1000) - start_time
        # Clean up the timer
        del self._start_times[operation_id]
        return duration

    async def emit_with_duration(
        self,
        websocket: WebSocket,
        level: LogLevel,
        category: LogCategory,
        message: str,
        operation_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Emit a log with automatic duration calculation from a previously started timer.

        Args:
            websocket: WebSocket connection to send log to
            level: Log level
            category: Log category
            message: Human-readable log message
            operation_id: ID of the operation (must have called start_timer first)
            metadata: Additional structured data
        """
        duration = self.get_duration(operation_id)
        await self.emit(websocket, level, category, message, metadata, duration)


# Helper functions for common log patterns

async def log_routing_decision(
    log_streamer: LogStreamer,
    websocket: WebSocket,
    agents: list,
    intent: str,
    reasoning: str,
    query_preview: str,
    duration_ms: Optional[int] = None
):
    """
    Log a routing decision with all relevant metadata.

    Args:
        log_streamer: LogStreamer instance
        websocket: WebSocket connection
        agents: List of selected agent IDs
        intent: Routing intent (greeting, expertise_match, etc.)
        reasoning: LLM reasoning for the decision
        query_preview: Preview of user query (first 100 chars)
        duration_ms: Optional duration of routing decision
    """
    agent_names = ", ".join(agents) if agents else "None"
    await log_streamer.emit(
        websocket,
        level="info",
        category="routing",
        message=f"🎯 Agents selected: {agent_names}",
        metadata={
            "agents": agents,
            "intent": intent,
            "reasoning": reasoning,
            "query_preview": query_preview
        },
        duration_ms=duration_ms
    )


async def log_agent_start(
    log_streamer: LogStreamer,
    websocket: WebSocket,
    agent_id: str,
    queue_remaining: list,
    history_size: int
):
    """
    Log when an agent starts generating a response.

    Args:
        log_streamer: LogStreamer instance
        websocket: WebSocket connection
        agent_id: ID of the agent starting
        queue_remaining: Remaining agents in queue
        history_size: Size of conversation history
    """
    await log_streamer.emit(
        websocket,
        level="info",
        category="agent",
        message=f"📨 {agent_id.capitalize()} is responding...",
        metadata={
            "agent_id": agent_id,
            "queue_remaining": queue_remaining,
            "history_size": history_size
        }
    )


async def log_model_selection(
    log_streamer: LogStreamer,
    websocket: WebSocket,
    model_name: str,
    is_reasoning: bool = False
):
    """
    Log AI model selection and initialization.

    Args:
        log_streamer: LogStreamer instance
        websocket: WebSocket connection
        model_name: Name of the AI model (gpt-4o, gpt-5, o1-preview, etc.)
        is_reasoning: Whether this is a reasoning model
    """
    emoji = "🧠" if is_reasoning else "🤖"
    label = "Reasoning model" if is_reasoning else "AI Model"
    await log_streamer.emit(
        websocket,
        level="info",
        category="model",
        message=f"{emoji} {label}: {model_name}",
        metadata={
            "model": model_name,
            "is_reasoning": is_reasoning
        }
    )


async def log_think_tank_round(
    log_streamer: LogStreamer,
    websocket: WebSocket,
    round_num: int,
    max_rounds: int,
    consensus: Optional[float] = None,
    participating_agents: Optional[list] = None
):
    """
    Log Think Tank mode round progress.

    Args:
        log_streamer: LogStreamer instance
        websocket: WebSocket connection
        round_num: Current round number
        max_rounds: Maximum rounds
        consensus: Optional consensus score (0.0 to 1.0)
        participating_agents: Optional list of participating agents
    """
    consensus_text = f" | Consensus: {consensus:.0%}" if consensus is not None else ""
    await log_streamer.emit(
        websocket,
        level="info",
        category="think_tank",
        message=f"🔄 Round {round_num}/{max_rounds}{consensus_text}",
        metadata={
            "round": round_num,
            "max_rounds": max_rounds,
            "consensus": consensus,
            "participating_agents": participating_agents
        }
    )


async def log_mention_detection(
    log_streamer: LogStreamer,
    websocket: WebSocket,
    detecting_agent: str,
    mentioned_agents: list,
    added_to_queue: list,
    response_preview: str
):
    """
    Log @mention detection and routing.

    Args:
        log_streamer: LogStreamer instance
        websocket: WebSocket connection
        detecting_agent: Agent whose response contained mentions
        mentioned_agents: List of mentioned agent IDs
        added_to_queue: List of agents actually added to queue (may be subset if some already responded)
        response_preview: Preview of response with mentions (first 150 chars)
    """
    agents_text = ", ".join([f"@{a}" for a in added_to_queue]) if added_to_queue else "None"
    await log_streamer.emit(
        websocket,
        level="info",
        category="mention",
        message=f"🔍 Detected mentions: {agents_text} → Added to queue",
        metadata={
            "detecting_agent": detecting_agent,
            "mentioned_agents": mentioned_agents,
            "added_to_queue": added_to_queue,
            "response_preview": response_preview
        }
    )


async def log_web_research(
    log_streamer: LogStreamer,
    websocket: WebSocket,
    agent_id: str,
    topic: str,
    result_count: int,
    duration_ms: Optional[int] = None
):
    """
    Log web research events.

    Args:
        log_streamer: LogStreamer instance
        websocket: WebSocket connection
        agent_id: Agent performing research
        topic: Research topic/query
        result_count: Number of results found
        duration_ms: Optional duration of research
    """
    await log_streamer.emit(
        websocket,
        level="info",
        category="research",
        message=f"🔍 {agent_id.capitalize()} researching: \"{topic}\" → {result_count} results",
        metadata={
            "agent_id": agent_id,
            "topic": topic,
            "result_count": result_count
        },
        duration_ms=duration_ms
    )


async def log_error(
    log_streamer: LogStreamer,
    websocket: WebSocket,
    error_message: str,
    context: Optional[str] = None,
    affected_agent: Optional[str] = None
):
    """
    Log an error event.

    Args:
        log_streamer: LogStreamer instance
        websocket: WebSocket connection
        error_message: Error message
        context: Optional context about where the error occurred
        affected_agent: Optional agent ID if error is agent-specific
    """
    await log_streamer.emit(
        websocket,
        level="error",
        category="error",
        message=f"❌ Error: {error_message}",
        metadata={
            "error": error_message,
            "context": context,
            "affected_agent": affected_agent
        }
    )

"""
Conversation Manager for Multi-Agent System
Handles session state, conversation history, and context persistence
FIX: Converted to use asyncio.Lock for proper async/await compatibility
"""
import time
import uuid
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from collections import defaultdict
import asyncio


@dataclass
class ConversationSession:
    """Represents a single conversation session"""
    session_id: str
    messages: List[Dict[str, Any]] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def add_message(self, message: Dict[str, Any]):
        """Add a message to the conversation history"""
        self.messages.append({
            **message,
            'timestamp': time.time()
        })
        self.last_active = time.time()

    def get_history(self, max_messages: int = 20, role_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get conversation history with optional filtering

        Args:
            max_messages: Maximum number of messages to return (default 20)
            role_filter: Filter by role ('user', 'agent', None for all)

        Returns:
            List of messages
        """
        messages = self.messages

        if role_filter:
            messages = [m for m in messages if m.get('role') == role_filter]

        # Return last N messages
        return messages[-max_messages:] if max_messages else messages

    def get_context_summary(self) -> str:
        """Generate a summary of recent conversation context"""
        recent_messages = self.get_history(max_messages=5)
        if not recent_messages:
            return "No recent conversation history."

        summary_parts = []
        for msg in recent_messages:
            role = msg.get('role', 'unknown')
            if role == 'user':
                summary_parts.append(f"User: {msg.get('content', '')[:100]}")
            elif role == 'agent':
                agent_name = msg.get('agent', 'Agent')
                summary_parts.append(f"{agent_name}: {msg.get('content', '')[:100]}")

        return "\n".join(summary_parts)

    def is_stale(self, timeout_seconds: int = 3600) -> bool:
        """Check if session is stale (inactive for more than timeout)"""
        return (time.time() - self.last_active) > timeout_seconds

    def is_first_user_message(self) -> bool:
        """
        Check if this session has received any user messages yet

        Returns:
            True if no user messages exist yet (first message scenario)
        """
        user_messages = [m for m in self.messages if m.get('role') == 'user']
        return len(user_messages) == 0

    def get_user_message_count(self) -> int:
        """Get the total number of user messages in this session"""
        return len([m for m in self.messages if m.get('role') == 'user'])


class ConversationManager:
    """
    Manages conversation sessions for the multi-agent system

    Features:
    - Session tracking with unique IDs
    - Conversation history persistence
    - Automatic cleanup of stale sessions
    - Thread-safe operations
    """

    def __init__(self, cleanup_interval: int = 900, session_timeout: int = 3600):
        """
        Initialize the conversation manager

        Args:
            cleanup_interval: How often to run cleanup (seconds, default 15 min)
            session_timeout: How long before a session is considered stale (seconds, default 1 hour)
        """
        self.sessions: Dict[str, ConversationSession] = {}
        self.cleanup_interval = cleanup_interval
        self.session_timeout = session_timeout
        self._lock_instance = None  # Lazy initialization to avoid event loop issues
        self._lock_loop = None  # Track which event loop the lock belongs to
        self._last_cleanup = time.time()

    @property
    def _lock(self):
        """Lazy initialization of asyncio.Lock to ensure it uses the current event loop"""
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            # No running loop, return None - let the caller handle it
            return None

        # If we have a lock but it's from a different event loop, reset it
        if self._lock_instance is not None and self._lock_loop is not current_loop:
            self._lock_instance = None

        # Create new lock if needed
        if self._lock_instance is None:
            self._lock_instance = asyncio.Lock()
            self._lock_loop = current_loop

        return self._lock_instance

    async def create_session(self, session_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> ConversationSession:
        """
        Create a new conversation session

        Args:
            session_id: Optional custom session ID (auto-generated if not provided)
            metadata: Optional metadata to attach to the session

        Returns:
            ConversationSession instance
        """
        async with self._lock:
            if session_id is None:
                session_id = str(uuid.uuid4())

            session = ConversationSession(
                session_id=session_id,
                metadata=metadata or {}
            )
            self.sessions[session_id] = session
            await self._maybe_cleanup()
            return session

    async def get_session(self, session_id: str) -> Optional[ConversationSession]:
        """
        Get an existing session by ID

        Args:
            session_id: The session ID to retrieve

        Returns:
            ConversationSession if found, None otherwise
        """
        async with self._lock:
            return self.sessions.get(session_id)

    async def get_or_create_session(self, session_id: str, metadata: Optional[Dict[str, Any]] = None) -> ConversationSession:
        """
        Get existing session or create new one if not found

        Args:
            session_id: The session ID
            metadata: Optional metadata for new sessions

        Returns:
            ConversationSession instance
        """
        async with self._lock:
            if session_id in self.sessions:
                return self.sessions[session_id]
            # Release lock before calling create_session (which will acquire it again)
        # If not found, create new session (will acquire lock internally)
        return await self.create_session(session_id, metadata)

    async def add_user_message(self, session_id: str, message: str, metadata: Optional[Dict[str, Any]] = None) -> ConversationSession:
        """
        Add a user message to a session

        Args:
            session_id: The session ID
            message: The user's message text
            metadata: Optional metadata (e.g., timestamp, source)

        Returns:
            Updated ConversationSession
        """
        session = await self.get_or_create_session(session_id)
        session.add_message({
            'role': 'user',
            'content': message,
            **(metadata or {})
        })
        return session

    async def add_agent_message(
        self,
        session_id: str,
        agent_id: str,
        agent_name: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ConversationSession:
        """
        Add an agent response to a session

        Args:
            session_id: The session ID
            agent_id: The agent's ID (e.g., 'rahil', 'mathew')
            agent_name: The agent's display name
            message: The agent's response text
            metadata: Optional metadata (e.g., highlights, citations)

        Returns:
            Updated ConversationSession
        """
        session = await self.get_or_create_session(session_id)
        session.add_message({
            'role': 'agent',
            'agent_id': agent_id,
            'agent': agent_name,
            'content': message,
            **(metadata or {})
        })
        return session

    async def delete_session(self, session_id: str) -> bool:
        """
        Delete a conversation session

        Args:
            session_id: The session ID to delete

        Returns:
            True if deleted, False if not found
        """
        async with self._lock:
            if session_id in self.sessions:
                del self.sessions[session_id]
                return True
            return False

    async def clear_session_history(self, session_id: str) -> bool:
        """
        Clear the message history for a session (keeps session alive)

        Args:
            session_id: The session ID

        Returns:
            True if cleared, False if session not found
        """
        async with self._lock:
            session = self.sessions.get(session_id)
            if session:
                session.messages.clear()
                session.last_active = time.time()
                return True
            return False

    async def get_all_sessions(self) -> List[ConversationSession]:
        """Get all active sessions"""
        async with self._lock:
            return list(self.sessions.values())

    async def get_session_count(self) -> int:
        """Get the number of active sessions"""
        async with self._lock:
            return len(self.sessions)

    async def cleanup_stale_sessions(self) -> int:
        """
        Remove stale sessions that have been inactive

        Returns:
            Number of sessions removed
        """
        async with self._lock:
            stale_ids = [
                sid for sid, session in self.sessions.items()
                if session.is_stale(self.session_timeout)
            ]

            for sid in stale_ids:
                del self.sessions[sid]

            self._last_cleanup = time.time()
            return len(stale_ids)

    async def _maybe_cleanup(self):
        """Run cleanup if enough time has passed"""
        if (time.time() - self._last_cleanup) > self.cleanup_interval:
            await self.cleanup_stale_sessions()

    async def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about active sessions

        Returns:
            Dictionary with session statistics
        """
        async with self._lock:
            total_messages = sum(len(s.messages) for s in self.sessions.values())
            avg_messages = total_messages / len(self.sessions) if self.sessions else 0

            return {
                'total_sessions': len(self.sessions),
                'total_messages': total_messages,
                'avg_messages_per_session': avg_messages,
                'oldest_session_age': min(
                    (time.time() - s.created_at for s in self.sessions.values()),
                    default=0
                ),
                'most_recent_activity': max(
                    (s.last_active for s in self.sessions.values()),
                    default=0
                )
            }


# Global conversation manager instance
_global_conversation_manager: Optional[ConversationManager] = None


def get_conversation_manager() -> ConversationManager:
    """Get or create the global conversation manager instance"""
    global _global_conversation_manager
    if _global_conversation_manager is None:
        _global_conversation_manager = ConversationManager()
    return _global_conversation_manager

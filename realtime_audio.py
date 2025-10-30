"""
OpenAI Realtime API Integration for Conference Call Audio
Handles WebSocket connections, audio streaming, and conference orchestration
"""
import asyncio
import json
import base64
import websockets
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field
from utils import get_openai_api_key
from agents import AGENTS


@dataclass
class AudioMessage:
    """Represents an audio message in the conference"""
    agent_id: str
    audio_data: bytes
    transcript: str
    timestamp: float
    
@dataclass
class ConferenceSession:
    """Manages a single conference call session"""
    session_id: str
    user_id: str
    leader: str = 'rahil'  # Always starts first
    audio_streams: Dict[str, List[bytes]] = field(default_factory=dict)
    transcripts: Dict[str, List[str]] = field(default_factory=dict)
    conversation_buffer: List[Dict[str, Any]] = field(default_factory=list)
    turn_order: List[str] = field(default_factory=list)
    current_speaker: Optional[str] = None
    is_active: bool = True
    start_time: float = field(default_factory=lambda: __import__('time').time())
    duration_limit: float = 180.0  # 3 minutes in seconds
    
    def get_remaining_time(self) -> float:
        """Get remaining time in seconds"""
        import time
        elapsed = time.time() - self.start_time
        remaining = max(0, self.duration_limit - elapsed)
        return remaining
    
    def is_time_expired(self) -> bool:
        """Check if the 3-minute time limit has been reached"""
        return self.get_remaining_time() <= 0
    
    def add_message(self, agent_id: str, audio: bytes, transcript: str):
        """Add a message to the conversation"""
        if agent_id not in self.audio_streams:
            self.audio_streams[agent_id] = []
            self.transcripts[agent_id] = []
        
        self.audio_streams[agent_id].append(audio)
        self.transcripts[agent_id].append(transcript)
        self.conversation_buffer.append({
            'agent': agent_id,
            'transcript': transcript,
            'role': 'agent' if agent_id in AGENTS else 'user'
        })
    
    def get_context_for_agent(self) -> List[Dict[str, str]]:
        """Get conversation context for agent prompting"""
        return self.conversation_buffer.copy()


class OpenAIRealtimeClient:
    """Client for OpenAI Realtime API with voice capabilities"""
    
    def __init__(self, model: str = "gpt-5-realtime-preview"):
        self.api_key = get_openai_api_key()
        self.model = model
        self.ws_url = "wss://api.openai.com/v1/realtime"
        self.websocket = None
        self.session_id = None
        
    async def connect(self, voice: str = "alloy") -> bool:
        """Establish WebSocket connection to OpenAI Realtime API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "OpenAI-Beta": "realtime=v1"
            }
            
            self.websocket = await websockets.connect(
                f"{self.ws_url}?model={self.model}",
                extra_headers=headers
            )
            
            # Configure session
            config = {
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "voice": voice,
                    "input_audio_format": "pcm16",
                    "output_audio_format": "pcm16",
                    "input_audio_transcription": {
                        "model": "whisper-1"
                    },
                    "turn_detection": None  # Manual turn management for conference
                }
            }
            await self.websocket.send(json.dumps(config))
            
            # Wait for session creation
            response = await self.websocket.recv()
            session_data = json.loads(response)
            if session_data.get("type") == "session.created":
                self.session_id = session_data["session"]["id"]
                return True
                
            return False
            
        except Exception as e:
            print(f"Error connecting to Realtime API: {e}")
            return False
    
    async def send_audio(self, audio_data: bytes):
        """Send audio input to the API"""
        if not self.websocket:
            raise ConnectionError("WebSocket not connected")
        
        # Convert audio to base64
        audio_b64 = base64.b64encode(audio_data).decode()
        
        message = {
            "type": "input_audio_buffer.append",
            "audio": audio_b64
        }
        await self.websocket.send(json.dumps(message))
    
    async def commit_audio(self):
        """Commit the audio buffer to trigger processing"""
        if not self.websocket:
            raise ConnectionError("WebSocket not connected")
        
        message = {"type": "input_audio_buffer.commit"}
        await self.websocket.send(json.dumps(message))
    
    async def send_text(self, text: str, system_prompt: Optional[str] = None):
        """Send text input to generate audio response"""
        if not self.websocket:
            raise ConnectionError("WebSocket not connected")
        
        # Create conversation item
        message = {
            "type": "conversation.item.create",
            "item": {
                "type": "message",
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": text
                    }
                ]
            }
        }
        await self.websocket.send(json.dumps(message))
        
        # Request response
        response_message = {
            "type": "response.create",
            "response": {
                "modalities": ["text", "audio"],
            }
        }
        
        if system_prompt:
            response_message["response"]["instructions"] = system_prompt
        
        await self.websocket.send(json.dumps(response_message))
    
    async def receive_events(self, callback: Callable[[Dict], None]):
        """Receive and process events from the API"""
        if not self.websocket:
            raise ConnectionError("WebSocket not connected")
        
        try:
            async for message in self.websocket:
                event = json.loads(message)
                await callback(event)
                
        except websockets.exceptions.ConnectionClosed:
            print("WebSocket connection closed")
    
    async def close(self):
        """Close the WebSocket connection"""
        if self.websocket:
            await self.websocket.close()
            self.websocket = None


class AudioSession:
    """Manages audio session for a single agent"""
    
    def __init__(self, agent_id: str, voice: str):
        self.agent_id = agent_id
        self.voice = voice
        self.client = OpenAIRealtimeClient()
        self.audio_buffer = []
        self.transcript_buffer = []
        self.is_speaking = False
        
    async def start(self) -> bool:
        """Start the audio session"""
        return await self.client.connect(voice=self.voice)
    
    async def speak(self, text: str, system_prompt: Optional[str] = None) -> tuple[bytes, str]:
        """Generate audio response from text"""
        self.is_speaking = True
        audio_chunks = []
        transcript_parts = []
        
        # Send text and get audio response
        await self.client.send_text(text, system_prompt)
        
        async def handle_event(event: Dict):
            event_type = event.get("type")
            
            if event_type == "response.audio.delta":
                # Received audio chunk
                audio_b64 = event.get("delta", "")
                if audio_b64:
                    audio_bytes = base64.b64decode(audio_b64)
                    audio_chunks.append(audio_bytes)
            
            elif event_type == "response.audio_transcript.delta":
                # Received transcript chunk
                transcript_text = event.get("delta", "")
                if transcript_text:
                    transcript_parts.append(transcript_text)
            
            elif event_type == "response.done":
                # Response complete
                self.is_speaking = False
        
        # Process events
        await self.client.receive_events(handle_event)
        
        # Combine audio and transcript
        full_audio = b''.join(audio_chunks) if audio_chunks else b''
        full_transcript = ''.join(transcript_parts)
        
        return full_audio, full_transcript
    
    async def listen(self, audio_data: bytes) -> str:
        """Transcribe user audio input"""
        await self.client.send_audio(audio_data)
        await self.client.commit_audio()
        
        transcript = ""
        
        async def handle_event(event: Dict):
            nonlocal transcript
            event_type = event.get("type")
            
            if event_type == "conversation.item.input_audio_transcription.completed":
                transcript = event.get("transcript", "")
        
        await self.client.receive_events(handle_event)
        return transcript
    
    async def stop(self):
        """Stop the audio session"""
        await self.client.close()


class ConferenceManager:
    """Orchestrates multi-agent conference calls with Rahil leading"""
    
    def __init__(self, agents_metadata: Dict[str, Dict]):
        self.agents_metadata = agents_metadata
        self.sessions: Dict[str, AudioSession] = {}
        self.active_conference: Optional[ConferenceSession] = None
        self.leader = 'rahil'
        
    async def start_conference(self, session_id: str, user_id: str) -> bool:
        """Start a new conference session"""
        # Initialize audio sessions for all agents
        for agent_id, metadata in self.agents_metadata.items():
            voice = metadata.get('voice', 'alloy')
            session = AudioSession(agent_id, voice)
            
            if await session.start():
                self.sessions[agent_id] = session
            else:
                print(f"Failed to start session for {agent_id}")
                return False
        
        # Create conference session
        self.active_conference = ConferenceSession(
            session_id=session_id,
            user_id=user_id,
            leader=self.leader
        )
        
        return True
    
    async def handle_user_question(
        self,
        audio_input: bytes,
        agent_prompts: Dict[str, str],
        on_agent_response: Optional[Callable[[str, bytes, str], None]] = None
    ) -> List[Dict[str, Any]]:
        """
        Handle user question in conference mode.
        
        1. Transcribe user question
        2. Rahil responds first (leader)
        3. Rahil's response determines next speakers
        4. Other agents respond based on relevance
        5. All agents hear previous responses (conference awareness)
        
        Returns empty list if time limit exceeded (triggers fallback to text)
        """
        if not self.active_conference:
            raise ValueError("No active conference session")
        
        # Check if 3-minute limit exceeded
        if self.active_conference.is_time_expired():
            print("Conference time limit (3 minutes) exceeded. Switching to text mode.")
            return []  # Empty response signals mode switch
        
        responses = []
        
        # 1. Transcribe user question
        transcription_session = self.sessions[self.leader]
        user_question = await transcription_session.listen(audio_input)
        
        self.active_conference.add_message('user', audio_input, user_question)
        
        # 2. RAHIL RESPONDS FIRST (always)
        rahil_session = self.sessions[self.leader]
        rahil_prompt = agent_prompts.get(self.leader, user_question)
        
        rahil_audio, rahil_transcript = await rahil_session.speak(
            user_question,
            system_prompt=rahil_prompt
        )
        
        self.active_conference.add_message(self.leader, rahil_audio, rahil_transcript)
        self.active_conference.current_speaker = self.leader
        
        responses.append({
            'agent_id': self.leader,
            'audio': rahil_audio,
            'transcript': rahil_transcript
        })
        
        if on_agent_response:
            on_agent_response(self.leader, rahil_audio, rahil_transcript)
        
        # 3. Determine turn order based on question relevance
        # (This would use the orchestrator logic from agents.py)
        remaining_agents = [a for a in self.agents_metadata.keys() if a != self.leader]
        self.active_conference.turn_order = remaining_agents
        
        # 4. Other agents respond (they've "heard" Rahil and the user)
        context = self.active_conference.get_context_for_agent()
        
        for agent_id in remaining_agents:
            agent_session = self.sessions[agent_id]
            agent_prompt = agent_prompts.get(agent_id, "")
            
            # Create contextualized prompt including what they've "heard"
            context_text = f"User: {user_question}\n\nRahil: {rahil_transcript}\n\nYour turn to respond:"
            
            agent_audio, agent_transcript = await agent_session.speak(
                context_text,
                system_prompt=agent_prompt
            )
            
            self.active_conference.add_message(agent_id, agent_audio, agent_transcript)
            self.active_conference.current_speaker = agent_id
            
            responses.append({
                'agent_id': agent_id,
                'audio': agent_audio,
                'transcript': agent_transcript
            })
            
            if on_agent_response:
                on_agent_response(agent_id, agent_audio, agent_transcript)
        
        return responses
    
    async def end_conference(self):
        """End the conference and close all sessions"""
        for session in self.sessions.values():
            await session.stop()
        
        self.sessions.clear()
        self.active_conference = None
    
    def get_current_speaker(self) -> Optional[str]:
        """Get the ID of the currently speaking agent"""
        if self.active_conference:
            return self.active_conference.current_speaker
        return None
    
    def get_turn_order(self) -> List[str]:
        """Get the current turn order"""
        if self.active_conference:
            return self.active_conference.turn_order
        return []
    
    def is_conference_active(self) -> bool:
        """Check if a conference is currently active"""
        return self.active_conference is not None and self.active_conference.is_active


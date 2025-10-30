"""
Voice Configuration and Selection for Multi-Agent Conference
Maps agent personalities to appropriate voices
"""
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class VoiceProfile:
    """Profile for a voice option"""
    voice_id: str
    name: str
    description: str
    personality_traits: List[str]
    best_for: str
    sample_text: str = "Hello, I'm here to help with your questions."


# Available OpenAI Realtime API voices
AVAILABLE_VOICES = {
    'alloy': VoiceProfile(
        voice_id='alloy',
        name='Alloy',
        description='Warm, friendly, and approachable',
        personality_traits=['Leadership', 'Empathetic', 'Clear communication'],
        best_for='Product leaders, team coordinators, client-facing roles',
        sample_text="As the product lead, I'd like to frame this discussion around our strategic goals."
    ),
    'echo': VoiceProfile(
        voice_id='echo',
        name='Echo',
        description='Technical, clear, and precise',
        personality_traits=['Analytical', 'Detail-oriented', 'Professional'],
        best_for='Engineers, technical experts, data analysts',
        sample_text="From a technical perspective, we should consider the architecture and performance implications."
    ),
    'fable': VoiceProfile(
        voice_id='fable',
        name='Fable',
        description='Professional, steady, and methodical',
        personality_traits=['Process-oriented', 'Organized', 'Reliable'],
        best_for='Project managers, operations, planning roles',
        sample_text="Let's break this down into actionable steps and establish clear timelines."
    ),
    'onyx': VoiceProfile(
        voice_id='onyx',
        name='Onyx',
        description='Analytical, direct, and confident',
        personality_traits=['Decisive', 'Systems-thinking', 'Pragmatic'],
        best_for='Software engineers, architects, problem solvers',
        sample_text="Here's the practical approach: we need to focus on scalability and performance first."
    ),
    'nova': VoiceProfile(
        voice_id='nova',
        name='Nova',
        description='Energetic, enthusiastic, and engaging',
        personality_traits=['Dynamic', 'Collaborative', 'Innovative'],
        best_for='Creative roles, designers, UX specialists',
        sample_text="I'm excited about this opportunity! Let's explore some innovative solutions."
    ),
    'shimmer': VoiceProfile(
        voice_id='shimmer',
        name='Shimmer',
        description='Calm, thoughtful, and reflective',
        personality_traits=['Thoughtful', 'Strategic', 'Patient'],
        best_for='Advisors, strategists, mentors',
        sample_text="Let's take a moment to consider the long-term implications of this approach."
    )
}


# Default voice assignments based on agent personalities
DEFAULT_VOICE_MAPPING = {
    'mathew': 'echo',      # Technical, clear - Data Engineer
    'rahil': 'alloy',      # Leadership, warm - Product Lead (ALWAYS SPEAKS FIRST)
    'shreyas': 'fable',    # Professional, steady - Product Manager
    'siddarth': 'onyx'     # Analytical, direct - Software Engineer
}


# Personality descriptions for each agent to guide voice selection
AGENT_PERSONALITY_GUIDES = {
    'mathew': {
        'name': 'Mathew Jerry Meleth',
        'title': 'Data Engineer',
        'personality': 'Technical and metric-driven with deep cloud expertise',
        'traits': ['Detail-oriented', 'Analytical', 'Cloud-focused', 'Performance-conscious'],
        'recommended_voices': ['echo', 'onyx', 'fable'],
        'reasoning': 'Needs a clear, technical voice that conveys precision and expertise'
    },
    'rahil': {
        'name': 'Rahil M. Harihar',
        'title': 'Product Lead',
        'personality': 'Strategic leader who bridges business and technology',
        'traits': ['Leadership', 'Visionary', 'Collaborative', 'Business-focused'],
        'recommended_voices': ['alloy', 'nova', 'shimmer'],
        'reasoning': 'Requires a warm, confident voice that commands attention and inspires trust. ALWAYS SPEAKS FIRST in conferences.'
    },
    'shreyas': {
        'name': 'Shreyas B Subramanya',
        'title': 'Product Manager',
        'personality': 'Process-oriented with supply chain and planning expertise',
        'traits': ['Organized', 'Methodical', 'Stakeholder-focused', 'Process-driven'],
        'recommended_voices': ['fable', 'shimmer', 'echo'],
        'reasoning': 'Benefits from a steady, professional voice that conveys reliability'
    },
    'siddarth': {
        'name': 'Siddarth Bhave',
        'title': 'Software Engineer',
        'personality': 'Pragmatic systems thinker with distributed systems focus',
        'traits': ['Systems-thinking', 'Performance-oriented', 'Direct', 'Practical'],
        'recommended_voices': ['onyx', 'echo', 'fable'],
        'reasoning': 'Needs a confident, analytical voice that reflects engineering expertise'
    }
}


class VoiceSelector:
    """Manages voice selection and configuration for agents"""
    
    def __init__(self, initial_mapping: Optional[Dict[str, str]] = None):
        """
        Initialize with optional custom voice mapping.
        Falls back to defaults if not provided.
        """
        self.voice_mapping = initial_mapping or DEFAULT_VOICE_MAPPING.copy()
        self.custom_settings = {}
    
    def get_voice_for_agent(self, agent_id: str) -> str:
        """Get the configured voice for an agent"""
        return self.voice_mapping.get(agent_id, DEFAULT_VOICE_MAPPING.get(agent_id, 'alloy'))
    
    def set_voice_for_agent(self, agent_id: str, voice_id: str) -> bool:
        """
        Set a custom voice for an agent.
        Returns True if successful, False if voice_id is invalid.
        """
        if voice_id not in AVAILABLE_VOICES:
            return False
        
        self.voice_mapping[agent_id] = voice_id
        self.custom_settings[agent_id] = voice_id
        return True
    
    def reset_to_defaults(self):
        """Reset all voices to default assignments"""
        self.voice_mapping = DEFAULT_VOICE_MAPPING.copy()
        self.custom_settings.clear()
    
    def get_all_voices(self) -> Dict[str, VoiceProfile]:
        """Get information about all available voices"""
        return AVAILABLE_VOICES
    
    def get_voice_profile(self, voice_id: str) -> Optional[VoiceProfile]:
        """Get detailed profile for a specific voice"""
        return AVAILABLE_VOICES.get(voice_id)
    
    def get_agent_personality_guide(self, agent_id: str) -> Optional[Dict]:
        """Get personality guide to help with voice selection"""
        return AGENT_PERSONALITY_GUIDES.get(agent_id)
    
    def get_recommended_voices_for_agent(self, agent_id: str) -> List[str]:
        """Get list of recommended voices for an agent"""
        guide = AGENT_PERSONALITY_GUIDES.get(agent_id, {})
        return guide.get('recommended_voices', ['alloy'])
    
    def export_settings(self) -> Dict[str, str]:
        """Export current voice settings for storage"""
        return self.voice_mapping.copy()
    
    def import_settings(self, settings: Dict[str, str]) -> bool:
        """
        Import voice settings from storage.
        Validates all voice IDs before applying.
        """
        # Validate all voice IDs
        for voice_id in settings.values():
            if voice_id not in AVAILABLE_VOICES:
                return False
        
        self.voice_mapping.update(settings)
        self.custom_settings.update(settings)
        return True
    
    def get_voice_comparison(self, agent_id: str) -> Dict[str, any]:
        """
        Get comparison data for UI to show current vs recommended voices.
        """
        current_voice = self.get_voice_for_agent(agent_id)
        recommended = self.get_recommended_voices_for_agent(agent_id)
        guide = self.get_agent_personality_guide(agent_id)
        
        return {
            'agent_id': agent_id,
            'agent_name': guide.get('name') if guide else agent_id,
            'current_voice': current_voice,
            'current_voice_profile': self.get_voice_profile(current_voice),
            'recommended_voices': [
                {
                    'voice_id': v,
                    'profile': self.get_voice_profile(v),
                    'is_current': v == current_voice
                }
                for v in recommended
            ],
            'personality_guide': guide
        }


# Singleton instance for global voice configuration
_voice_selector_instance = None

def get_voice_selector() -> VoiceSelector:
    """Get or create the global voice selector instance"""
    global _voice_selector_instance
    if _voice_selector_instance is None:
        _voice_selector_instance = VoiceSelector()
    return _voice_selector_instance


def set_global_voice_settings(settings: Dict[str, str]):
    """Set global voice settings from user preferences"""
    selector = get_voice_selector()
    selector.import_settings(settings)


"""
Utility functions for the Knowledge Graph Multi-Agent System
"""
import os
import re
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Agent color palette
AGENT_COLORS = {
    'mathew': '#2196F3',      # Blue
    'rahil': '#7E57C2',       # Purple  
    'shreyas': '#4CAF50',     # Green
    'siddarth': '#FF9800'     # Orange
}

# Node type colors
NODE_TYPE_COLORS = {
    'person': '#555555',
    'skill': '#9C27B0',
    'technology': '#2196F3',
    'project': '#FF5722',
    'company': '#4CAF50',
    'education': '#FFC107',
    'certification': '#00BCD4',
    'achievement': '#E91E63',
    'role': '#607D8B'
}

# Fallback OpenAI API key (set this in .env file or environment variable)
FALLBACK_API_KEY = None


def get_openai_api_key() -> str:
    """Get OpenAI API key from environment or use fallback"""
    api_key = os.getenv('OPENAI_API_KEY', FALLBACK_API_KEY)
    return api_key


def normalize_text(text: str) -> str:
    """Normalize text for matching (lowercase, remove special chars)"""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def extract_entities(text: str, node_names: List[str]) -> List[str]:
    """
    Extract entity mentions from text by matching against known node names.
    Returns list of matched node IDs.
    """
    normalized_text = normalize_text(text)
    matched_entities = []
    
    for node_id, node_name in node_names:
        normalized_name = normalize_text(node_name)
        # Check for exact match or partial match
        if normalized_name in normalized_text or any(
            word in normalized_text.split() 
            for word in normalized_name.split() 
            if len(word) > 3
        ):
            matched_entities.append(node_id)
    
    return matched_entities


def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors"""
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return dot_product / (norm1 * norm2)


def get_embedding(text: str) -> Optional[np.ndarray]:
    """Get embedding vector for text using OpenAI API"""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=get_openai_api_key())
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return np.array(response.data[0].embedding)
    except Exception as e:
        print(f"Error getting embedding: {e}")
        return None


def find_relevant_nodes(
    query: str,
    node_embeddings: Dict[str, np.ndarray],
    top_k: int = 20
) -> List[Tuple[str, float]]:
    """
    Find most relevant nodes for a query using embedding similarity.
    Returns list of (node_id, similarity_score) tuples.
    """
    # Get query embedding
    query_embedding = get_embedding(query)
    
    if query_embedding is None:
        return []
    
    # Calculate similarities
    similarities = []
    for node_id, node_embedding in node_embeddings.items():
        similarity = cosine_similarity(query_embedding, node_embedding)
        similarities.append((node_id, similarity))
    
    # Sort by similarity and return top k
    similarities.sort(key=lambda x: x[1], reverse=True)
    return similarities[:top_k]


def get_node_color(node_type: str, agent: Optional[str] = None, intensity: float = 1.0) -> str:
    """
    Get color for a node based on type and agent.
    If agent is specified, use agent color with given intensity.
    Otherwise use node type color.
    """
    if agent and agent in AGENT_COLORS:
        base_color = AGENT_COLORS[agent]
        # Convert hex to RGB and adjust opacity
        r = int(base_color[1:3], 16)
        g = int(base_color[3:5], 16)
        b = int(base_color[5:7], 16)
        alpha = min(1.0, max(0.3, intensity))
        return f'rgba({r}, {g}, {b}, {alpha})'
    
    return NODE_TYPE_COLORS.get(node_type, '#888888')


def format_node_tooltip(node_data: Dict[str, Any]) -> str:
    """Format node data for tooltip display"""
    node_type = node_data.get('type', 'Unknown')
    properties = node_data.get('properties', {})
    
    lines = [f"<b>{node_data.get('label', 'Node')}</b>"]
    lines.append(f"<i>Type: {node_type}</i>")
    
    # Add key properties based on type
    if node_type == 'person':
        if 'title' in properties:
            lines.append(f"Title: {properties['title']}")
        if 'yearsOfExperience' in properties:
            lines.append(f"Experience: {properties['yearsOfExperience']} years")
    
    elif node_type == 'skill':
        if 'category' in properties:
            lines.append(f"Category: {properties['category']}")
        if 'proficiencyLevel' in properties:
            lines.append(f"Level: {properties['proficiencyLevel']}")
    
    elif node_type == 'technology':
        if 'category' in properties:
            lines.append(f"Category: {properties['category']}")
    
    elif node_type == 'project':
        if 'impact' in properties:
            lines.append(f"Impact: {properties['impact']}")
    
    elif node_type == 'achievement':
        if 'metric' in properties:
            lines.append(f"Metric: {properties['metric']}")
    
    return '<br>'.join(lines)


def create_pulse_animation(node_id: str, duration_ms: int = 1000) -> Dict[str, Any]:
    """Create animation data for node pulse effect"""
    return {
        'node_id': node_id,
        'animation': 'pulse',
        'duration': duration_ms,
        'iterations': 2
    }


def get_shortest_path_nodes(
    graph,
    source_id: str,
    target_ids: List[str]
) -> List[str]:
    """
    Get all nodes in shortest paths from source to multiple targets.
    Returns list of node IDs to highlight.
    """
    import networkx as nx
    
    path_nodes = set()
    for target_id in target_ids:
        try:
            if source_id in graph and target_id in graph:
                path = nx.shortest_path(graph, source_id, target_id)
                path_nodes.update(path)
        except nx.NetworkXNoPath:
            continue
    
    return list(path_nodes)


def aggregate_highlight_intensity(
    current_highlights: Dict[str, Dict[str, float]],
    new_highlights: Dict[str, str],
    intensity: float = 0.3
) -> Dict[str, Dict[str, float]]:
    """
    Aggregate highlight intensity for nodes mentioned multiple times.
    
    current_highlights: {node_id: {agent: intensity}}
    new_highlights: {node_id: agent}
    intensity: base intensity for new highlights
    
    Returns updated highlights dictionary
    """
    # Handle None or empty dict
    if not current_highlights:
        current_highlights = {}
    
    # Deep copy to avoid mutation issues
    updated = {}
    for k, v in current_highlights.items():
        if isinstance(v, dict):
            updated[k] = v.copy()
        else:
            updated[k] = {}
    
    for node_id, agent in new_highlights.items():
        if node_id not in updated:
            updated[node_id] = {}
        
        # Ensure updated[node_id] is a dict
        if not isinstance(updated[node_id], dict):
            updated[node_id] = {}
        
        if agent not in updated[node_id]:
            updated[node_id][agent] = intensity
        else:
            # Increase intensity with diminishing returns
            current = updated[node_id][agent]
            updated[node_id][agent] = min(1.0, current + intensity * 0.5)
    
    return updated


def generate_suggested_questions(agent_names: List[str]) -> List[str]:
    """Generate suggested questions for the chat interface"""
    return [
        "How would you build BI dashboards on ERP systems with AI?",
        "What's your approach to implementing a data pipeline for real-time analytics?",
        "How would you design a scalable observability platform?",
        "What technologies would you use for a multi-agent AI system?",
        "How do you approach product management for enterprise software?",
        "What's your experience with cloud infrastructure and distributed systems?",
        "How would you optimize supply chain planning workflows?",
        "What machine learning frameworks and tools do you prefer?"
    ]


def parse_agent_citations(text: str) -> List[str]:
    """
    Parse agent response for explicit node citations.
    Looking for patterns like [node:technology_aws001] or **AWS**
    """
    # Match patterns in markdown bold or brackets
    bold_pattern = r'\*\*([^*]+)\*\*'
    bracket_pattern = r'\[node:([^\]]+)\]'
    
    citations = []
    
    # Extract bold items
    for match in re.finditer(bold_pattern, text):
        citations.append(match.group(1))
    
    # Extract explicit node references
    for match in re.finditer(bracket_pattern, text):
        citations.append(match.group(1))
    
    return citations


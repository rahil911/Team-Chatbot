"""
Graph Highlighter - Extracts entities from agent responses and generates highlighting data
"""
import re
from typing import Dict, List, Any, Set, Tuple
from kg_loader import KnowledgeGraphLoader
from utils import normalize_text, get_embedding, cosine_similarity, AGENT_COLORS
import numpy as np


class GraphHighlighter:
    """Handles node highlighting logic for AI observability"""
    
    def __init__(self, kg_loader: KnowledgeGraphLoader):
        self.kg_loader = kg_loader
        self.agent_colors = AGENT_COLORS
        
        # Build node name lookup for entity extraction
        self.node_lookup = {}
        for node_id, node_data in kg_loader.node_data.items():
            label = node_data.get('label', node_id)
            normalized_label = normalize_text(label)
            self.node_lookup[normalized_label] = node_id
            
            # Also add properties that might be mentioned
            props = node_data.get('properties', {})
            if 'name' in props:
                normalized_name = normalize_text(props['name'])
                self.node_lookup[normalized_name] = node_id
    
    def extract_entities(self, agent_response: str, agent_id: str) -> List[Tuple[str, float]]:
        """
        Extract skills/tech/projects mentioned in agent response
        Returns list of (node_id, relevance_score) tuples
        """
        entities_with_scores = []
        normalized_response = normalize_text(agent_response)
        response_words = set(normalized_response.split())
        
        # Method 1: Direct keyword matching
        for normalized_label, node_id in self.node_lookup.items():
            label_words = set(normalized_label.split())
            
            # Check for exact phrase match
            if normalized_label in normalized_response:
                entities_with_scores.append((node_id, 1.0))
                continue
            
            # Check for significant word overlap (for multi-word terms)
            if len(label_words) > 1:
                overlap = label_words.intersection(response_words)
                if len(overlap) >= len(label_words) * 0.6:  # 60% word match
                    score = len(overlap) / len(label_words)
                    entities_with_scores.append((node_id, score))
                    continue
            
            # Check for single significant word
            if len(label_words) == 1:
                word = list(label_words)[0]
                if len(word) > 3 and word in response_words:
                    entities_with_scores.append((node_id, 0.8))
        
        # Method 2: Get nodes owned by this agent
        agent_nodes = self._get_agent_nodes(agent_id)
        for node_id in agent_nodes:
            if node_id not in [e[0] for e in entities_with_scores]:
                # Add with lower relevance if not already found
                entities_with_scores.append((node_id, 0.3))
        
        # Method 3: Common tech keywords
        tech_keywords = {
            'python': ['python', 'pandas', 'numpy', 'fastapi', 'django'],
            'javascript': ['javascript', 'react', 'node', 'typescript', 'vue'],
            'data': ['sql', 'postgres', 'mongodb', 'redis', 'database'],
            'cloud': ['aws', 'azure', 'gcp', 'kubernetes', 'docker'],
            'ai': ['machine learning', 'ai', 'llm', 'gpt', 'openai', 'neural network']
        }
        
        for category, keywords in tech_keywords.items():
            for keyword in keywords:
                if keyword in normalized_response:
                    # Find matching nodes
                    for node_id, node_data in self.kg_loader.node_data.items():
                        node_label = normalize_text(node_data.get('label', ''))
                        if keyword in node_label and node_id not in [e[0] for e in entities_with_scores]:
                            entities_with_scores.append((node_id, 0.6))
        
        # Remove duplicates and sort by score
        seen = set()
        unique_entities = []
        for node_id, score in sorted(entities_with_scores, key=lambda x: x[1], reverse=True):
            if node_id not in seen:
                seen.add(node_id)
                unique_entities.append((node_id, score))
        
        return unique_entities[:15]  # Limit to top 15 nodes
    
    def _get_agent_nodes(self, agent_id: str) -> List[str]:
        """Get all nodes owned by a specific agent"""
        agent_nodes = []
        for node_id, node_data in self.kg_loader.node_data.items():
            if node_data.get('person') == agent_id:
                agent_nodes.append(node_id)
        return agent_nodes
    
    def get_highlight_data(self, agent_id: str, entities: List[Tuple[str, float]]) -> Dict[str, Any]:
        """
        Return Cytoscape-compatible highlight data
        entities: List of (node_id, relevance_score) tuples
        """
        agent_color = self.agent_colors.get(agent_id, '#999999')
        
        # Prepare nodes for highlighting
        highlighted_nodes = []
        for node_id, score in entities:
            if node_id in self.kg_loader.node_data:
                highlighted_nodes.append({
                    'id': node_id,
                    'color': agent_color,
                    'intensity': min(score, 1.0),  # 0.0 to 1.0
                    'pulse': score > 0.7,  # Only pulse high-relevance nodes
                    'agent': agent_id
                })
        
        # Get relevant edges (connecting highlighted nodes)
        relevant_edges = self._get_relevant_edges([n['id'] for n in highlighted_nodes])
        
        return {
            'nodes': highlighted_nodes,
            'edges': relevant_edges,
            'agent_id': agent_id,
            'agent_color': agent_color
        }
    
    def _get_relevant_edges(self, node_ids: List[str]) -> List[Dict[str, Any]]:
        """Get edges connecting highlighted nodes"""
        node_set = set(node_ids)
        relevant_edges = []
        
        for source, target, edge_data in self.kg_loader.merged_graph.edges(data=True):
            if source in node_set and target in node_set:
                relevant_edges.append({
                    'id': f"{source}-{target}",
                    'source': source,
                    'target': target,
                    'relationship': edge_data.get('relationship', 'related')
                })
        
        return relevant_edges
    
    def aggregate_highlights(self, highlights_by_agent: Dict[str, Dict]) -> Dict[str, Any]:
        """
        Aggregate highlights from multiple agents
        Handles overlapping nodes by blending colors and intensities
        """
        all_nodes = {}
        all_edges = {}
        
        for agent_id, highlight_data in highlights_by_agent.items():
            # Process nodes
            for node in highlight_data.get('nodes', []):
                node_id = node['id']
                if node_id in all_nodes:
                    # Node already highlighted by another agent
                    # Increase intensity (up to max 1.0)
                    all_nodes[node_id]['intensity'] = min(
                        all_nodes[node_id]['intensity'] + node['intensity'] * 0.5,
                        1.0
                    )
                    # Add this agent to the list
                    all_nodes[node_id]['agents'].append(agent_id)
                    # Keep pulse if any agent has it
                    all_nodes[node_id]['pulse'] = all_nodes[node_id]['pulse'] or node['pulse']
                else:
                    all_nodes[node_id] = {
                        **node,
                        'agents': [agent_id]
                    }
            
            # Process edges
            for edge in highlight_data.get('edges', []):
                edge_id = edge['id']
                all_edges[edge_id] = edge
        
        return {
            'nodes': list(all_nodes.values()),
            'edges': list(all_edges.values())
        }


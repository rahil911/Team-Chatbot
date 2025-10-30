"""
Knowledge Graph Loader
Loads and merges JSON knowledge graphs for all team members
"""
import json
import os
from typing import Dict, List, Any, Tuple
import networkx as nx


class KnowledgeGraphLoader:
    """Loads and processes knowledge graph data"""
    
    def __init__(self, data_dir: str = "data/knowledgeGraphs"):
        self.data_dir = data_dir
        self.graphs = {}
        self.merged_graph = nx.DiGraph()
        self.node_data = {}
        self.edge_data = {}
        
    def load_all_graphs(self) -> Dict[str, Dict]:
        """Load all knowledge graph JSON files"""
        files = {
            'mathew': 'mathew_knowledge_graph.json',
            'rahil': 'rahil_knowledge_graph.json',
            'shreyas': 'shreyas_knowledge_graph.json',
            'siddarth': 'siddarth_knowledge_graph.json'
        }
        
        for person, filename in files.items():
            filepath = os.path.join(self.data_dir, filename)
            if os.path.exists(filepath):
                with open(filepath, 'r') as f:
                    self.graphs[person] = json.load(f)
                print(f"Loaded {filename}: {len(self.graphs[person].get('nodes', []))} nodes, "
                      f"{len(self.graphs[person].get('edges', []))} edges")
            else:
                print(f"Warning: {filepath} not found")
        
        return self.graphs
    
    def build_merged_graph(self) -> nx.DiGraph:
        """Build a unified NetworkX graph from all loaded graphs"""
        if not self.graphs:
            self.load_all_graphs()
        
        # Add nodes from all graphs
        for person, graph_data in self.graphs.items():
            self._add_nodes_from_graph(person, graph_data)
            self._add_edges_from_graph(person, graph_data)
        
        print(f"Merged graph: {self.merged_graph.number_of_nodes()} nodes, "
              f"{self.merged_graph.number_of_edges()} edges")
        
        return self.merged_graph
    
    def _add_nodes_from_graph(self, person: str, graph_data: Dict):
        """Add nodes from a single person's graph"""
        nodes = graph_data.get('nodes', [])
        
        for node in nodes:
            node_id = node['id']
            node_type = node['type']
            properties = node.get('properties', {})
            
            # Determine node label
            label = properties.get('name', node_id)
            
            # Add node with enriched attributes
            self.merged_graph.add_node(
                node_id,
                label=label,
                type=node_type,
                person=person,
                properties=properties,
                category=self._get_node_category(node_type, properties)
            )
            
            # Store in node_data for quick access
            self.node_data[node_id] = {
                'id': node_id,
                'label': label,
                'type': node_type,
                'person': person,
                'properties': properties,
                'category': self._get_node_category(node_type, properties)
            }
    
    def _add_edges_from_graph(self, person: str, graph_data: Dict):
        """Add edges from a single person's graph"""
        edges = graph_data.get('edges', [])
        
        for edge in edges:
            source = edge['source']
            target = edge['target']
            edge_type = edge['type']
            properties = edge.get('properties', {})
            
            # Only add edge if both nodes exist
            if source in self.merged_graph and target in self.merged_graph:
                self.merged_graph.add_edge(
                    source,
                    target,
                    type=edge_type,
                    person=person,
                    properties=properties
                )
                
                # Store in edge_data
                edge_id = f"{source}-{target}"
                self.edge_data[edge_id] = {
                    'source': source,
                    'target': target,
                    'type': edge_type,
                    'person': person,
                    'properties': properties
                }
    
    def _get_node_category(self, node_type: str, properties: Dict) -> str:
        """Determine the category of a node for filtering"""
        if node_type == 'skill':
            return properties.get('category', 'Other')
        elif node_type == 'technology':
            return properties.get('category', 'Technology')
        elif node_type in ['project', 'achievement']:
            return node_type.capitalize()
        else:
            return node_type.capitalize()
    
    def get_nodes_by_person(self, person: str) -> List[str]:
        """Get all node IDs associated with a person"""
        return [
            node_id for node_id, data in self.node_data.items()
            if data.get('person') == person
        ]
    
    def get_nodes_by_type(self, node_type: str) -> List[str]:
        """Get all node IDs of a specific type"""
        return [
            node_id for node_id, data in self.node_data.items()
            if data.get('type') == node_type
        ]
    
    def get_nodes_by_category(self, category: str) -> List[str]:
        """Get all node IDs in a specific category"""
        return [
            node_id for node_id, data in self.node_data.items()
            if data.get('category') == category
        ]
    
    def get_person_central_node(self, person: str) -> str:
        """Get the main person node ID for a given person"""
        for node_id, data in self.node_data.items():
            if data.get('type') == 'person' and data.get('person') == person:
                return node_id
        return None
    
    def get_connected_nodes(self, node_id: str, depth: int = 1) -> List[str]:
        """Get all nodes connected to a given node up to specified depth"""
        if node_id not in self.merged_graph:
            return []
        
        connected = set([node_id])
        current_level = set([node_id])
        
        for _ in range(depth):
            next_level = set()
            for node in current_level:
                # Get successors (outgoing edges)
                next_level.update(self.merged_graph.successors(node))
                # Get predecessors (incoming edges)
                next_level.update(self.merged_graph.predecessors(node))
            
            connected.update(next_level)
            current_level = next_level
        
        return list(connected)
    
    def get_node_details(self, node_id: str) -> Dict[str, Any]:
        """Get full details for a node"""
        return self.node_data.get(node_id, {})
    
    def search_nodes(self, query: str, limit: int = 20) -> List[Tuple[str, float]]:
        """
        Search nodes by name/label.
        Returns list of (node_id, relevance_score) tuples.
        """
        query_lower = query.lower()
        results = []
        
        for node_id, data in self.node_data.items():
            label = data.get('label', '').lower()
            
            # Simple relevance scoring
            if query_lower == label:
                score = 1.0
            elif query_lower in label:
                score = 0.8
            elif any(word in label for word in query_lower.split()):
                score = 0.5
            else:
                continue
            
            results.append((node_id, score))
        
        # Sort by relevance
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:limit]
    
    def get_person_context(self, person: str, max_items: int = 50) -> Dict[str, Any]:
        """
        Get relevant context for a person for agent grounding.
        Returns a structured summary of their skills, projects, technologies.
        """
        person_nodes = self.get_nodes_by_person(person)
        person_node_id = self.get_person_central_node(person)
        
        context = {
            'person': person,
            'person_node_id': person_node_id,
            'skills': [],
            'technologies': [],
            'projects': [],
            'companies': [],
            'achievements': [],
            'education': []
        }
        
        for node_id in person_nodes:
            node = self.node_data.get(node_id, {})
            node_type = node.get('type')
            properties = node.get('properties', {})
            
            if node_type == 'skill':
                context['skills'].append({
                    'id': node_id,
                    'name': node.get('label'),
                    'category': properties.get('category'),
                    'proficiency': properties.get('proficiencyLevel')
                })
            
            elif node_type == 'technology':
                context['technologies'].append({
                    'id': node_id,
                    'name': node.get('label'),
                    'category': properties.get('category')
                })
            
            elif node_type == 'project':
                context['projects'].append({
                    'id': node_id,
                    'name': node.get('label'),
                    'description': properties.get('description'),
                    'impact': properties.get('impact'),
                    'technologies': properties.get('technologies')
                })
            
            elif node_type == 'company':
                context['companies'].append({
                    'id': node_id,
                    'name': node.get('label'),
                    'industry': properties.get('industry')
                })
            
            elif node_type == 'achievement':
                context['achievements'].append({
                    'id': node_id,
                    'name': node.get('label'),
                    'metric': properties.get('metric'),
                    'impact': properties.get('impact')
                })
            
            elif node_type == 'education':
                context['education'].append({
                    'id': node_id,
                    'name': node.get('label'),
                    'degree': properties.get('degree'),
                    'gpa': properties.get('gpa')
                })
        
        # Limit items to avoid overwhelming the agent
        for key in ['skills', 'technologies', 'projects', 'achievements']:
            if len(context[key]) > max_items:
                context[key] = context[key][:max_items]
        
        return context
    
    def get_all_node_names(self) -> List[Tuple[str, str]]:
        """Get list of (node_id, node_label) for all nodes"""
        return [(node_id, data.get('label', '')) for node_id, data in self.node_data.items()]
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics about the knowledge graph"""
        stats = {
            'total_nodes': len(self.node_data),
            'total_edges': len(self.edge_data),
            'nodes_by_type': {},
            'nodes_by_person': {},
            'nodes_by_category': {}
        }
        
        for node_id, data in self.node_data.items():
            # Count by type
            node_type = data.get('type', 'unknown')
            stats['nodes_by_type'][node_type] = stats['nodes_by_type'].get(node_type, 0) + 1
            
            # Count by person
            person = data.get('person', 'unknown')
            stats['nodes_by_person'][person] = stats['nodes_by_person'].get(person, 0) + 1
            
            # Count by category
            category = data.get('category', 'unknown')
            stats['nodes_by_category'][category] = stats['nodes_by_category'].get(category, 0) + 1
        
        return stats


# Singleton instance
_kg_loader = None

def get_kg_loader(data_dir: str = "data/knowledgeGraphs") -> KnowledgeGraphLoader:
    """Get or create singleton KG loader instance"""
    global _kg_loader
    if _kg_loader is None:
        _kg_loader = KnowledgeGraphLoader(data_dir)
        _kg_loader.load_all_graphs()
        _kg_loader.build_merged_graph()
    return _kg_loader


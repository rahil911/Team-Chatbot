"""
Graph View - Converts NetworkX graph to Cytoscape.js format
"""
from typing import Dict, List, Any
from kg_loader import KnowledgeGraphLoader
from utils import AGENT_COLORS, NODE_TYPE_COLORS


class GraphView:
    """Converts knowledge graph data to Cytoscape.js format"""
    
    def __init__(self, kg_loader: KnowledgeGraphLoader):
        self.kg_loader = kg_loader
        
    def generate_cytoscape_elements(self) -> List[Dict[str, Any]]:
        """Generate Cytoscape.js elements (nodes + edges)"""
        elements = []
        
        # Add nodes
        for node_id, node_attrs in self.kg_loader.node_data.items():
            node_type = node_attrs.get('type', 'unknown')
            person = node_attrs.get('person', '')
            label = node_attrs.get('label', node_id)
            
            # Color by person (agent) if it's a person node, otherwise by type
            if node_type == 'person':
                color = AGENT_COLORS.get(person, '#999999')
            else:
                color = NODE_TYPE_COLORS.get(node_type, '#999999')
            
            elements.append({
                'data': {
                    'id': node_id,
                    'label': label,
                    'type': node_type,
                    'person': person,
                    'color': color,
                    'properties': node_attrs.get('properties', {})
                },
                'classes': f"{node_type} {person}"
            })
        
        # Add edges
        for source, target, edge_attrs in self.kg_loader.merged_graph.edges(data=True):
            edge_id = f"{source}-{target}"
            relationship = edge_attrs.get('relationship', 'related')
            
            elements.append({
                'data': {
                    'id': edge_id,
                    'source': source,
                    'target': target,
                    'label': relationship,
                    'relationship': relationship
                }
            })
        
        return elements


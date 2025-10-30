#!/usr/bin/env python3
"""
Connect team members in the knowledge graph by creating edges between:
1. Person nodes (colleagues relationship)
2. Shared skills, technologies, companies
"""
import json
import os
from collections import defaultdict

# Load all knowledge graphs
kg_dir = "data/knowledgeGraphs"
people = ['mathew', 'rahil', 'shreyas', 'siddarth']
graphs = {}

for person in people:
    filepath = os.path.join(kg_dir, f"{person}_knowledge_graph.json")
    with open(filepath, 'r') as f:
        graphs[person] = json.load(f)
    print(f"Loaded {person}: {len(graphs[person]['nodes'])} nodes, {len(graphs[person]['edges'])} edges")

# Find all person nodes
person_nodes = {}
for person, graph in graphs.items():
    for node in graph['nodes']:
        if node['type'] == 'person':
            person_nodes[person] = node['id']
            break

print(f"\nPerson nodes: {person_nodes}")

# Find shared nodes by name and type
shared_nodes = defaultdict(lambda: defaultdict(list))  # {(name, type): {person: [node_ids]}}

for person, graph in graphs.items():
    for node in graph['nodes']:
        node_type = node['type']
        name = node['properties'].get('name', '').lower().strip()
        
        if name and node_type in ['skill', 'technology', 'company', 'education']:
            shared_nodes[(name, node_type)][person].append(node['id'])

# Find actually shared items (present in 2+ people)
truly_shared = {}
for (name, node_type), people_dict in shared_nodes.items():
    if len(people_dict) >= 2:
        truly_shared[(name, node_type)] = people_dict

print(f"\nFound {len(truly_shared)} shared nodes across team members")
print("\nTop shared items:")
for (name, node_type), people_dict in list(truly_shared.items())[:20]:
    print(f"  {node_type}: {name} - shared by {list(people_dict.keys())}")

# Create new edges
new_edges_count = {}
for person in people:
    new_edges_count[person] = 0

# 1. Connect all person nodes to each other as colleagues
print("\n\nAdding colleague relationships...")
for person, graph in graphs.items():
    person_node_id = person_nodes[person]
    
    for other_person, other_node_id in person_nodes.items():
        if person != other_person:
            # Add colleague edge
            new_edge = {
                "id": f"colleague_{person}_{other_person}",
                "source": person_node_id,
                "target": other_node_id,
                "type": "colleague",
                "properties": {
                    "relationship": "Team Member",
                    "organization": "University of Washington - iSchool",
                    "note": "Part of the same team"
                }
            }
            
            # Check if edge already exists
            edge_exists = any(
                e['source'] == new_edge['source'] and 
                e['target'] == new_edge['target'] and 
                e['type'] == new_edge['type']
                for e in graph['edges']
            )
            
            if not edge_exists:
                graph['edges'].append(new_edge)
                new_edges_count[person] += 1
                print(f"  Added: {person} -> {other_person}")

# 2. Create "shared_skill" edges between people through shared skills
print("\nAdding shared skill connections...")
for (name, node_type), people_dict in truly_shared.items():
    if node_type in ['skill', 'technology'] and len(people_dict) >= 2:
        people_list = list(people_dict.keys())
        
        # For each pair of people who share this skill
        for i, person1 in enumerate(people_list):
            for person2 in people_list[i+1:]:
                # Get the skill node IDs
                skill_nodes_1 = people_dict[person1]
                skill_nodes_2 = people_dict[person2]
                
                # Add edge from person1's skill to person2's person node
                for skill_node in skill_nodes_1[:1]:  # Just use first one
                    new_edge = {
                        "id": f"shared_{node_type}_{person1}_{person2}_{name[:20].replace(' ', '_')}",
                        "source": skill_node,
                        "target": person_nodes[person2],
                        "type": f"shared_{node_type}",
                        "properties": {
                            "sharedWith": person2,
                            "skillName": name
                        }
                    }
                    
                    edge_exists = any(
                        e['id'] == new_edge['id']
                        for e in graphs[person1]['edges']
                    )
                    
                    if not edge_exists:
                        graphs[person1]['edges'].append(new_edge)
                        new_edges_count[person1] += 1

# Save updated graphs
print("\n\nSaving updated knowledge graphs...")
for person, graph in graphs.items():
    filepath = os.path.join(kg_dir, f"{person}_knowledge_graph.json")
    
    # Update metadata
    graph['metadata']['nodeCount'] = len(graph['nodes'])
    graph['metadata']['edgeCount'] = len(graph['edges'])
    
    with open(filepath, 'w') as f:
        json.dump(graph, f, indent=2)
    
    print(f"✅ {person}: Added {new_edges_count[person]} new edges (total: {len(graph['edges'])} edges)")

print("\n✨ Team members are now connected!")
print("\nRestart the app to see the changes:")
print("  pkill -f 'python3.*app.py'")
print("  cd /Users/rahilharihar/Projects/tbd/kg && python3 app.py")


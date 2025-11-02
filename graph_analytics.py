"""
Graph Analytics for Knowledge Graph
Computes centrality metrics, clustering, and spatial layouts
"""
import networkx as nx
from typing import Dict, List, Any, Set, Tuple, Optional
from collections import defaultdict
import math


class GraphAnalytics:
    """
    Analyzes knowledge graph structure and computes various metrics

    Features:
    - Centrality calculations (degree, betweenness, PageRank)
    - Community detection / clustering
    - Importance scoring
    - Spatial layout with person separation
    - Connected components analysis
    """

    def __init__(self, graph: nx.DiGraph):
        """
        Initialize graph analytics

        Args:
            graph: NetworkX DiGraph to analyze
        """
        self.graph = graph
        self._centrality_cache = {}
        self._cluster_cache = None

    def compute_centrality_metrics(self, force_recompute: bool = False) -> Dict[str, Dict[str, float]]:
        """
        Compute all centrality metrics for nodes

        Args:
            force_recompute: Force recomputation even if cached

        Returns:
            Dictionary mapping node IDs to centrality scores
        """
        if self._centrality_cache and not force_recompute:
            return self._centrality_cache

        print("Computing centrality metrics...")

        metrics = {}

        # Convert to undirected for some metrics
        undirected_graph = self.graph.to_undirected()

        # 1. Degree Centrality (normalized)
        degree_centrality = nx.degree_centrality(undirected_graph)

        # 2. Betweenness Centrality (how often node appears on shortest paths)
        try:
            betweenness_centrality = nx.betweenness_centrality(undirected_graph, k=100)
        except:
            betweenness_centrality = {node: 0.0 for node in self.graph.nodes()}

        # 3. PageRank (importance based on connections)
        try:
            pagerank = nx.pagerank(self.graph, max_iter=100)
        except:
            pagerank = {node: 1.0 / len(self.graph.nodes()) for node in self.graph.nodes()}

        # 4. Eigenvector Centrality (connections to important nodes)
        try:
            eigenvector_centrality = nx.eigenvector_centrality(
                undirected_graph,
                max_iter=100,
                tol=1e-3
            )
        except:
            eigenvector_centrality = {node: 0.0 for node in self.graph.nodes()}

        # Combine metrics
        for node in self.graph.nodes():
            metrics[node] = {
                'degree': degree_centrality.get(node, 0.0),
                'betweenness': betweenness_centrality.get(node, 0.0),
                'pagerank': pagerank.get(node, 0.0),
                'eigenvector': eigenvector_centrality.get(node, 0.0)
            }

        self._centrality_cache = metrics
        print(f"Centrality metrics computed for {len(metrics)} nodes")
        return metrics

    def compute_importance_scores(self, centrality_metrics: Optional[Dict[str, Dict[str, float]]] = None) -> Dict[str, float]:
        """
        Compute overall importance score for each node (0-100)

        Args:
            centrality_metrics: Pre-computed centrality metrics (optional)

        Returns:
            Dictionary mapping node IDs to importance scores (0-100)
        """
        if centrality_metrics is None:
            centrality_metrics = self.compute_centrality_metrics()

        importance_scores = {}

        for node, metrics in centrality_metrics.items():
            # Weighted average of centrality metrics
            score = (
                0.3 * metrics['degree'] +
                0.2 * metrics['betweenness'] +
                0.3 * metrics['pagerank'] +
                0.2 * metrics['eigenvector']
            )

            # Scale to 0-100
            importance_scores[node] = score * 100

        return importance_scores

    def detect_communities(self, algorithm: str = "louvain") -> Dict[str, int]:
        """
        Detect communities/clusters in the graph

        Args:
            algorithm: Clustering algorithm ('louvain', 'label_propagation', 'greedy_modularity')

        Returns:
            Dictionary mapping node IDs to cluster IDs
        """
        if self._cluster_cache is not None:
            return self._cluster_cache

        print(f"Detecting communities using {algorithm} algorithm...")

        # Convert to undirected graph
        undirected = self.graph.to_undirected()

        try:
            if algorithm == "louvain":
                # Louvain community detection (requires python-louvain package)
                try:
                    import community as community_louvain
                    clusters = community_louvain.best_partition(undirected)
                except ImportError:
                    print("Warning: python-louvain not installed, falling back to greedy_modularity")
                    algorithm = "greedy_modularity"

            if algorithm == "label_propagation":
                communities = nx.algorithms.community.label_propagation_communities(undirected)
                clusters = {}
                for idx, community in enumerate(communities):
                    for node in community:
                        clusters[node] = idx

            elif algorithm == "greedy_modularity":
                communities = nx.algorithms.community.greedy_modularity_communities(undirected)
                clusters = {}
                for idx, community in enumerate(communities):
                    for node in community:
                        clusters[node] = idx

        except Exception as e:
            print(f"Community detection failed: {e}, assigning all to cluster 0")
            clusters = {node: 0 for node in self.graph.nodes()}

        self._cluster_cache = clusters
        num_clusters = len(set(clusters.values()))
        print(f"Found {num_clusters} communities")
        return clusters

    def get_node_metadata_clustering(self) -> Dict[str, Dict[str, Set[str]]]:
        """
        Cluster nodes by metadata attributes (type, person, category)

        Returns:
            Dictionary with cluster types and their node sets
        """
        clusters = {
            'by_type': defaultdict(set),
            'by_person': defaultdict(set),
            'by_category': defaultdict(set)
        }

        for node in self.graph.nodes():
            node_data = self.graph.nodes[node]

            # Cluster by type
            node_type = node_data.get('type', 'unknown')
            clusters['by_type'][node_type].add(node)

            # Cluster by person
            person = node_data.get('person', 'unknown')
            clusters['by_person'][person].add(node)

            # Cluster by category
            category = node_data.get('category', 'uncategorized')
            clusters['by_category'][category].add(node)

        # Convert defaultdict to regular dict
        return {
            key: dict(value) for key, value in clusters.items()
        }

    def get_person_to_person_connections(self) -> Dict[Tuple[str, str], List[str]]:
        """
        Find shared nodes between people (intermediate connections)

        Returns:
            Dictionary mapping (person1, person2) to list of shared node IDs
        """
        # Get nodes by person
        person_nodes = defaultdict(set)
        for node in self.graph.nodes():
            person = self.graph.nodes[node].get('person')
            if person:
                person_nodes[person].add(node)

        # Find connections through shared nodes
        connections = {}
        people = list(person_nodes.keys())

        for i, person1 in enumerate(people):
            for person2 in people[i + 1:]:
                # Get neighbors of person1's nodes
                person1_neighbors = set()
                for node in person_nodes[person1]:
                    person1_neighbors.update(self.graph.neighbors(node))
                    person1_neighbors.update(self.graph.predecessors(node))

                # Get neighbors of person2's nodes
                person2_neighbors = set()
                for node in person_nodes[person2]:
                    person2_neighbors.update(self.graph.neighbors(node))
                    person2_neighbors.update(self.graph.predecessors(node))

                # Find shared intermediate nodes
                shared = person1_neighbors & person2_neighbors
                # Exclude person nodes themselves
                shared = shared - person_nodes[person1] - person_nodes[person2]

                if shared:
                    connections[(person1, person2)] = list(shared)

        return connections

    def compute_spatial_layout_positions(
        self,
        min_person_distance: float = 500.0,
        person_repulsion: float = 5000.0
    ) -> Dict[str, Tuple[float, float]]:
        """
        Compute spatial layout with person nodes separated

        Args:
            min_person_distance: Minimum distance between person nodes
            person_repulsion: Repulsion force between person nodes

        Returns:
            Dictionary mapping node IDs to (x, y) positions
        """
        print("Computing spatial layout with person separation...")

        # Identify person nodes
        person_nodes = set()
        for node in self.graph.nodes():
            if self.graph.nodes[node].get('type') == 'person':
                person_nodes.add(node)

        # Use spring layout with custom settings
        # Person nodes get strong repulsion
        k_value = 1.0 / math.sqrt(len(self.graph.nodes())) if self.graph.nodes() else 1.0

        pos = nx.spring_layout(
            self.graph,
            k=k_value * 2,  # Increase spacing
            iterations=100,
            scale=1000,  # Larger scale
            seed=42  # Reproducible layout
        )

        # Post-process: ensure person nodes are far apart
        person_positions = {node: pos[node] for node in person_nodes}

        # Apply additional repulsion between person nodes
        for _ in range(50):  # Multiple passes
            moved = False
            for p1 in person_nodes:
                for p2 in person_nodes:
                    if p1 >= p2:
                        continue

                    # Calculate distance
                    dx = pos[p2][0] - pos[p1][0]
                    dy = pos[p2][1] - pos[p1][1]
                    dist = math.sqrt(dx * dx + dy * dy)

                    # If too close, push apart
                    if dist < min_person_distance and dist > 0:
                        moved = True
                        # Normalize and push
                        push_force = (min_person_distance - dist) / dist
                        push_x = dx * push_force * 0.5
                        push_y = dy * push_force * 0.5

                        pos[p1] = (pos[p1][0] - push_x, pos[p1][1] - push_y)
                        pos[p2] = (pos[p2][0] + push_x, pos[p2][1] + push_y)

            if not moved:
                break

        print(f"Spatial layout computed: {len(person_nodes)} person nodes separated")
        return pos

    def get_neighborhood(
        self,
        node_id: str,
        depth: int = 2,
        include_node: bool = True
    ) -> Set[str]:
        """
        Get N-hop neighborhood of a node

        Args:
            node_id: Starting node ID
            depth: Number of hops (default 2)
            include_node: Include the starting node itself

        Returns:
            Set of node IDs in the neighborhood
        """
        if node_id not in self.graph:
            return set()

        neighborhood = set()
        if include_node:
            neighborhood.add(node_id)

        # BFS to get N-hop neighbors
        current_level = {node_id}
        visited = {node_id}

        for _ in range(depth):
            next_level = set()
            for node in current_level:
                # Get both successors and predecessors (undirected neighborhood)
                neighbors = set(self.graph.successors(node)) | set(self.graph.predecessors(node))
                for neighbor in neighbors:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        next_level.add(neighbor)
                        neighborhood.add(neighbor)

            current_level = next_level
            if not current_level:
                break

        return neighborhood

    def get_agent_subgraph_nodes(self, agent_id: str) -> Set[str]:
        """
        Get all nodes associated with an agent/person

        Args:
            agent_id: Agent ID (e.g., 'mathew', 'rahil')

        Returns:
            Set of node IDs
        """
        nodes = set()
        for node in self.graph.nodes():
            if self.graph.nodes[node].get('person') == agent_id:
                nodes.add(node)
        return nodes

    def compare_agent_graphs(self, agent1_id: str, agent2_id: str) -> Dict[str, Set[str]]:
        """
        Compare two agents' graphs to find overlaps

        Args:
            agent1_id: First agent ID
            agent2_id: Second agent ID

        Returns:
            Dictionary with 'agent1_only', 'agent2_only', 'shared' node sets
        """
        agent1_nodes = self.get_agent_subgraph_nodes(agent1_id)
        agent2_nodes = self.get_agent_subgraph_nodes(agent2_id)

        # Get neighbors to find shared connections
        agent1_neighbors = set()
        for node in agent1_nodes:
            agent1_neighbors.update(self.graph.neighbors(node))
            agent1_neighbors.update(self.graph.predecessors(node))

        agent2_neighbors = set()
        for node in agent2_nodes:
            agent2_neighbors.update(self.graph.neighbors(node))
            agent2_neighbors.update(self.graph.predecessors(node))

        shared = agent1_neighbors & agent2_neighbors - agent1_nodes - agent2_nodes

        return {
            'agent1_only': agent1_nodes,
            'agent2_only': agent2_nodes,
            'shared': shared,
            'agent1_connections': agent1_neighbors,
            'agent2_connections': agent2_neighbors
        }

    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive graph statistics"""
        stats = {
            'num_nodes': self.graph.number_of_nodes(),
            'num_edges': self.graph.number_of_edges(),
            'density': nx.density(self.graph),
            'is_connected': nx.is_weakly_connected(self.graph),
        }

        # Connected components
        num_components = nx.number_weakly_connected_components(self.graph)
        stats['num_components'] = num_components

        # Node type distribution
        type_counts = defaultdict(int)
        person_counts = defaultdict(int)
        for node in self.graph.nodes():
            node_data = self.graph.nodes[node]
            type_counts[node_data.get('type', 'unknown')] += 1
            person_counts[node_data.get('person', 'unknown')] += 1

        stats['node_types'] = dict(type_counts)
        stats['nodes_by_person'] = dict(person_counts)

        return stats

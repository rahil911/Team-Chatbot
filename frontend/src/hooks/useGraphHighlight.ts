import { useState, useCallback } from 'react';
import type { HighlightData } from '../types';

export const useGraphHighlight = () => {
  const [highlightedNodes, setHighlightedNodes] = useState<Map<string, any>>(new Map());
  const [highlightedEdges, setHighlightedEdges] = useState<Map<string, any>>(new Map());

  const addHighlight = useCallback((highlightData: HighlightData) => {
    if (!highlightData || !highlightData.nodes) {
      return;
    }

    // Add nodes to map
    setHighlightedNodes(prev => {
      const newMap = new Map(prev);
      highlightData.nodes.forEach(node => {
        newMap.set(node.id, {
          ...node,
          agent: highlightData.agent_id
        });
      });
      return newMap;
    });

    // Add edges to map
    setHighlightedEdges(prev => {
      const newMap = new Map(prev);
      if (highlightData.edges) {
        highlightData.edges.forEach(edge => {
          newMap.set(edge.id, {
            ...edge,
            agent: highlightData.agent_id
          });
        });
      }
      return newMap;
    });
  }, []);

  const clearHighlights = useCallback(() => {
    setHighlightedNodes(new Map());
    setHighlightedEdges(new Map());
  }, []);

  // Convert maps to array for easier consumption
  const highlights = {
    nodes: Array.from(highlightedNodes.values()),
    edges: Array.from(highlightedEdges.values())
  };

  return {
    highlights,
    addHighlight,
    clearHighlights
  };
};

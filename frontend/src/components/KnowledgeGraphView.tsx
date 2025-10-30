import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Text, Stat, StatLabel, StatNumber, HStack, VStack, Badge, Spinner } from '@chakra-ui/react';
import CytoscapeComponent from 'react-cytoscapejs';
import type cytoscape from 'cytoscape';
import type { CytoscapeElement } from '../types';
import { token } from '../theme';

interface KnowledgeGraphViewProps {
  highlights: {
    nodes: any[];
    edges: any[];
  };
}

export const KnowledgeGraphView = ({ highlights }: KnowledgeGraphViewProps) => {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [elements, setElements] = useState<CytoscapeElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const stats = useMemo(() => {
    const nodeCount = elements.filter(e => 'label' in e.data).length;
    const edgeCount = elements.filter(e => 'source' in e.data).length;
    return { nodeCount, edgeCount };
  }, [elements]);

  const highlightCount = highlights?.nodes?.length ?? 0;
  
  // Load graph data from API
  useEffect(() => {
    fetch('http://localhost:8000/api/graph')
      .then(res => res.json())
      .then(data => {
        setElements(data.elements);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading graph:', err);
        setError('Failed to load knowledge graph');
        setLoading(false);
      });
  }, []);
  
  // Apply highlights in real-time
  useEffect(() => {
    if (!cyRef.current) return;
    
    const cy = cyRef.current;
    
    // If no highlights, show everything normally
    if (!highlights || !highlights.nodes || highlights.nodes.length === 0) {
      cy.batch(() => {
        cy.nodes().style({
          'opacity': 0.9,
          'border-width': 1.8,
          'border-color': '#94A3B8',
          'background-opacity': 0.95,
        });
        cy.edges().style({
          'opacity': 0.35,
          'line-color': 'rgba(148, 163, 184, 0.28)',
          'width': 1.8,
        });
        cy.nodes().removeClass('pulsing');
      });
      return;
    }
    
    // Use batch for better performance
    cy.batch(() => {
      const highlightedNodeIds = new Set(highlights.nodes.map((n: any) => n.id));
      
      cy.nodes().forEach(node => {
        const isHighlighted = highlightedNodeIds.has(node.id());
        
        if (isHighlighted) {
          const nodeData = highlights.nodes.find((n: any) => n.id === node.id());
          const borderWidth = 3 + ((nodeData?.intensity ?? 0.7) * 3.2);
          
          node.style({
            'opacity': 1,
            'border-width': borderWidth,
            'border-color': nodeData?.color || '#F97316',
            'border-opacity': 1,
            'background-opacity': 1,
            'z-index': 999
          });
          
          if (nodeData?.pulse) {
            node.addClass('pulsing');
          }
        } else {
          node.style({
            'opacity': 0.18,
            'border-width': 1,
            'border-color': 'rgba(148, 163, 184, 0.25)',
            'border-opacity': 0.25,
            'background-opacity': 0.18,
            'z-index': 1,
          });
          node.removeClass('pulsing');
        }
      });
      
      cy.edges().forEach(edge => {
        const source = edge.source().id();
        const target = edge.target().id();
        const bothHighlighted = highlightedNodeIds.has(source) && highlightedNodeIds.has(target);
        
        if (bothHighlighted) {
          const edgeData = highlights.edges?.find((e: any) => 
            (e.source === source && e.target === target) || e.id === edge.id()
          );
          
          edge.style({
            'line-color': edgeData?.color || token.accent.orange,
            'width': 3,
            'opacity': 0.85,
            'z-index': 100,
          });
        } else {
          edge.style({
            'line-color': 'rgba(148, 163, 184, 0.15)',
            'width': 1,
            'opacity': 0.1,
            'z-index': 1
          });
        }
      });
    });
  }, [highlights]);
  
  if (loading) {
    return (
      <Flex h="full" align="center" justify="center" direction="column" gap={3}>
        <Spinner size="xl" color="brand.blue" thickness="4px" />
        <Text color="gray.400">Loading knowledge graph...</Text>
      </Flex>
    );
  }
  
  if (error) {
    return (
      <Flex h="full" align="center" justify="center" direction="column" gap={3}>
        <Text color="red.400" fontSize="lg">Error loading graph</Text>
        <Text color="gray.500" fontSize="sm">{error}</Text>
      </Flex>
    );
  }
  
  return (
    <Box position="relative" h="full" w="full" bg="gray.925">
      {/* Header */}
      <Box px={6} py={3} borderBottom="1px" borderColor="whiteAlpha.100" bg="rgba(15, 23, 42, 0.6)">
        <HStack spacing={2}>
          <Box
            w="4"
            h="4"
            rounded="full"
            bg="brand.green"
            animation="pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
          />
          <Text fontSize="sm" fontWeight="bold" color="white">
            Knowledge Graph
          </Text>
          <Badge colorScheme="green" variant="subtle" fontSize="9px" ml="auto">
            {highlightCount} Active
          </Badge>
        </HStack>
      </Box>
      
      {/* Stats Overlay */}
      <Box position="absolute" top={16} left={5} zIndex={10}>
        <Box bg="rgba(15, 23, 42, 0.85)" backdropFilter="blur(12px)" p={3} rounded="lg" borderWidth="1px" borderColor="whiteAlpha.200">
          <HStack spacing={6}>
            <Stat size="sm">
              <StatLabel fontSize="10px" color="gray.400">Nodes</StatLabel>
              <StatNumber fontSize="xl" color="white">{stats.nodeCount}</StatNumber>
            </Stat>
            <Box h="8" w="px" bg="whiteAlpha.200" />
            <Stat size="sm">
              <StatLabel fontSize="10px" color="gray.400">Edges</StatLabel>
              <StatNumber fontSize="xl" color="white">{stats.edgeCount}</StatNumber>
            </Stat>
            <Box h="8" w="px" bg="whiteAlpha.200" />
            <Stat size="sm">
              <StatLabel fontSize="10px" color="gray.400">Highlighted</StatLabel>
              <StatNumber fontSize="xl" color={highlightCount ? 'brand.orange' : 'gray.500'}>{highlightCount}</StatNumber>
            </Stat>
          </HStack>
        </Box>
      </Box>
      
      <CytoscapeComponent
        elements={elements as any}
        stylesheet={cytoscapeStyles}
        layout={layoutConfig}
        cy={(cy: any) => { 
          cyRef.current = cy;
          cy.on('tap', 'node', (evt: any) => {
            const node = evt.target;
            console.log('Node clicked:', node.data());
          });
          cy.fit(undefined, 50);
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </Box>
  );
};

// Cytoscape styles
const cytoscapeStyles: any[] = [
  {
    selector: 'node',
    style: {
      'background-color': (ele: any) => ele.data('color') || '#38BDF8',
      'label': 'data(label)',
      'font-size': 11,
      'color': '#F8FAFC',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': 120,
      'width': 36,
      'height': 36,
      'border-width': 1.8,
      'border-color': '#94A3B8',
      'border-opacity': 0.6,
      'background-opacity': 0.95,
      'text-outline-width': 2,
      'text-outline-color': 'rgba(2, 6, 23, 0.82)',
      'font-family': 'Inter, sans-serif',
      'font-weight': 600,
    }
  },
  {
    selector: 'node[type="person"]',
    style: {
      'width': 56,
      'height': 56,
      'font-size': 12,
      'font-weight': 700
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 1.4,
      'line-color': 'rgba(148, 163, 184, 0.25)',
      'line-style': 'solid',
      'target-arrow-color': 'rgba(148, 163, 184, 0.25)',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 0.8,
      'opacity': 0.5
    }
  },
];

const layoutConfig = {
  name: 'cose',
  animate: true,
  animationDuration: 500,
  fit: true,
  padding: 50,
  nodeRepulsion: 8000,
  idealEdgeLength: 100,
  edgeElasticity: 100,
  nestingFactor: 1.2,
  gravity: 1,
  numIter: 1000,
  initialTemp: 200,
  coolingFactor: 0.95,
  minTemp: 1.0
};


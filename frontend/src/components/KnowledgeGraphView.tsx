import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Box,
  Flex,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  HStack,
  VStack,
  Badge,
  Spinner,
  Button,
  IconButton,
  Tooltip,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from '@chakra-ui/react';
import {
  ChevronRightIcon,
  RepeatIcon,
} from '@chakra-ui/icons';
import CytoscapeComponent from 'react-cytoscapejs';
import type cytoscape from 'cytoscape';
import type { CytoscapeElement } from '../types';
import { token } from '../theme';
import { config } from '../config';
import { GraphFilterPanel, type GraphFilters } from './GraphFilterPanel';
import { GraphSearchBar, type SearchResult } from './GraphSearchBar';
import { AgentViewSwitch } from './AgentViewSwitch';
import { AgentComparison, type ComparisonData } from './AgentComparison';

interface KnowledgeGraphViewProps {
  highlights: {
    nodes: any[];
    edges: any[];
  };
}

type ViewMode = 'normal' | 'neighborhood' | 'agent' | 'comparison' | 'filtered';

export const KnowledgeGraphView = ({ highlights }: KnowledgeGraphViewProps) => {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [elements, setElements] = useState<CytoscapeElement[]>([]);
  const [allElements, setAllElements] = useState<CytoscapeElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [selectedAgent, setSelectedAgent] = useState<string | 'all'>('all');

  // Neighborhood focus state
  const [neighborhoodDepth] = useState(2);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; label: string }>>([]);

  // Agent node counts
  const [agentNodeCounts, setAgentNodeCounts] = useState<Record<string, number>>({});

  const stats = useMemo(() => {
    const nodeCount = elements.filter((e) => 'label' in e.data).length;
    const edgeCount = elements.filter((e) => 'source' in e.data).length;
    return { nodeCount, edgeCount };
  }, [elements]);

  const highlightCount = highlights?.nodes?.length ?? 0;

  // Helper function to re-layout the graph
  const runLayout = useCallback(() => {
    // Don't run layout immediately, let Cytoscape settle first
    setTimeout(() => {
      if (!cyRef.current) {
        console.warn('Cytoscape not initialized, skipping layout');
        return;
      }

      try {
        const cy = cyRef.current;

        // Check if cytoscape instance is destroyed
        if (!cy || (cy.destroyed && cy.destroyed())) {
          console.warn('Cytoscape instance destroyed, skipping layout');
          return;
        }

        // Ensure we have nodes before running layout
        if (!cy.nodes || cy.nodes().length === 0) {
          console.warn('No nodes to layout');
          return;
        }

        // Stop any running layout
        try {
          cy.stop();
        } catch (e) {
          // Ignore stop errors
        }

        // Run layout
        const layout = cy.layout({
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
          minTemp: 1.0,
        });

        if (layout && layout.run) {
          layout.run();
        }
      } catch (error) {
        console.error('Layout error:', error);
      }
    }, 100);
  }, []);

  // Load graph data from API
  useEffect(() => {
    fetch(`${config.apiEndpoint}/graph`)
      .then((res) => res.json())
      .then((data) => {
        setElements(data.elements);
        setAllElements(data.elements);
        setLoading(false);

        // Count nodes per agent
        const counts: Record<string, number> = { all: 0 };
        data.elements.forEach((el: any) => {
          if ('label' in el.data) {
            counts.all = (counts.all || 0) + 1;
            const person = el.data.person;
            if (person) {
              counts[person] = (counts[person] || 0) + 1;
            }
          }
        });
        setAgentNodeCounts(counts);
      })
      .catch((err) => {
        console.error('Error loading graph:', err);
        setError('Failed to load knowledge graph');
        setLoading(false);
      });
  }, []);

  // Apply highlights in real-time
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;

    // Check if destroyed
    try {
      if (cy.destroyed()) return;
    } catch (e) {
      return;
    }

    // If no highlights, show everything normally
    if (!highlights || !highlights.nodes || highlights.nodes.length === 0) {
      cy.batch(() => {
        cy.nodes().style({
          opacity: 0.9,
          'border-width': 1.8,
          'border-color': '#94A3B8',
          'background-opacity': 0.95,
        });
        cy.edges().style({
          opacity: 0.35,
          'line-color': 'rgba(148, 163, 184, 0.28)',
          width: 1.8,
        });
        cy.nodes().removeClass('pulsing');
      });
      return;
    }

    // Use batch for better performance
    cy.batch(() => {
      const highlightedNodeIds = new Set(highlights.nodes.map((n: any) => n.id));

      cy.nodes().forEach((node) => {
        const isHighlighted = highlightedNodeIds.has(node.id());

        if (isHighlighted) {
          const nodeData = highlights.nodes.find((n: any) => n.id === node.id());
          const borderWidth = 3 + ((nodeData?.intensity ?? 0.7) * 3.2);

          node.style({
            opacity: 1,
            'border-width': borderWidth,
            'border-color': nodeData?.color || '#F97316',
            'border-opacity': 1,
            'background-opacity': 1,
            'z-index': 999,
          });

          if (nodeData?.pulse) {
            node.addClass('pulsing');
          }
        } else {
          node.style({
            opacity: 0.18,
            'border-width': 1,
            'border-color': 'rgba(148, 163, 184, 0.25)',
            'border-opacity': 0.25,
            'background-opacity': 0.18,
            'z-index': 1,
          });
          node.removeClass('pulsing');
        }
      });

      cy.edges().forEach((edge) => {
        const source = edge.source().id();
        const target = edge.target().id();
        const bothHighlighted = highlightedNodeIds.has(source) && highlightedNodeIds.has(target);

        if (bothHighlighted) {
          const edgeData = highlights.edges?.find(
            (e: any) => (e.source === source && e.target === target) || e.id === edge.id()
          );

          edge.style({
            'line-color': edgeData?.color || token.accent.orange,
            width: 3,
            opacity: 0.85,
            'z-index': 100,
          });
        } else {
          edge.style({
            'line-color': 'rgba(148, 163, 184, 0.15)',
            width: 1,
            opacity: 0.1,
            'z-index': 1,
          });
        }
      });
    });
  }, [highlights]);

  // Level of Detail (LOD) rendering based on zoom
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;

    // Check if destroyed
    try {
      if (cy.destroyed()) return;
    } catch (e) {
      return;
    }

    const handleZoom = () => {
      const zoom = cy.zoom();

      cy.batch(() => {
        if (zoom < 0.5) {
          // Zoomed out: minimal detail
          cy.style()
            .selector('node')
            .style('label', '')
            .update();
          cy.style()
            .selector('edge')
            .style('opacity', 0.1)
            .update();
        } else if (zoom < 1.5) {
          // Medium zoom: abbreviated labels
          cy.nodes().forEach((node: any) => {
            const fullLabel = node.data('label');
            const abbrev = fullLabel.length > 15 ? fullLabel.substring(0, 12) + '...' : fullLabel;
            node.style('label', abbrev);
          });
          cy.style()
            .selector('edge')
            .style('opacity', 0.3)
            .update();
        } else {
          // Zoomed in: full detail
          cy.style()
            .selector('node')
            .style('label', 'data(label)')
            .update();
          cy.style()
            .selector('edge')
            .style('opacity', 0.5)
            .update();
        }
      });
    };

    cy.on('zoom', handleZoom);

    return () => {
      cy.off('zoom', handleZoom);
    };
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback(
    async (filters: GraphFilters) => {
      if (!cyRef.current) return;

      // If all filters are empty, show all
      const hasFilters =
        filters.nodeTypes.length > 0 ||
        filters.agents.length > 0 ||
        filters.minImportance > 0 ||
        filters.clusters.length > 0;

      if (!hasFilters) {
        setElements(allElements);
        setViewMode('normal');
        setTimeout(() => {
          runLayout();
        }, 100);
        return;
      }

      try {
        const response = await fetch(`${config.apiEndpoint}/graph/filter`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filters),
        });

        const data = await response.json();
        const filteredNodeIds = new Set(data.filtered_nodes);

        // Filter elements
        const filteredElements = allElements.filter((el: any) => {
          if ('label' in el.data) {
            return filteredNodeIds.has(el.data.id);
          } else if ('source' in el.data) {
            return filteredNodeIds.has(el.data.source) && filteredNodeIds.has(el.data.target);
          }
          return false;
        });

        setElements(filteredElements);
        setViewMode('filtered');
        setTimeout(() => {
          runLayout();
        }, 100);
      } catch (error) {
        console.error('Filter error:', error);
      }
    },
    [allElements, runLayout]
  );

  // Handle search result selection
  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    if (!cyRef.current) return;

    try {
      const cy = cyRef.current;
      if (cy.destroyed()) return;

      const node = cy.getElementById(result.id);

      if (node.length === 0) return;

      // Select and center on node
      cy.nodes().unselect();
      node.select();
      cy.animate({
        center: { eles: node },
        zoom: 1.5,
        duration: 500,
      });

      // Highlight for 2 seconds
      node.style({ 'border-color': '#FFD700', 'border-width': 6 });
      setTimeout(() => {
        if (cyRef.current && !cyRef.current.destroyed()) {
          node.style({ 'border-color': '#94A3B8', 'border-width': 1.8 });
        }
      }, 2000);
    } catch (error) {
      console.error('Search selection error:', error);
    }
  }, []);

  // Handle focus on all search results
  const handleFocusResults = useCallback(
    (results: SearchResult[]) => {
      if (!cyRef.current) return;

      const nodeIds = results.map((r) => r.id);

      // Filter to only these nodes
      const focusedElements = allElements.filter((el: any) => {
        if ('label' in el.data) {
          return nodeIds.includes(el.data.id);
        } else if ('source' in el.data) {
          return nodeIds.includes(el.data.source) && nodeIds.includes(el.data.target);
        }
        return false;
      });

      setElements(focusedElements);
      setViewMode('filtered');
      setTimeout(() => {
        runLayout();
      }, 100);
    },
    [allElements, runLayout]
  );

  // Handle agent view switch
  const handleAgentChange = useCallback(
    async (agentId: string | 'all') => {
      if (!cyRef.current) return;

      setSelectedAgent(agentId);

      if (agentId === 'all') {
        setElements(allElements);
        setViewMode('normal');
        setTimeout(() => {
          runLayout();
        }, 100);
        return;
      }

      try {
        const response = await fetch(`${config.apiEndpoint}/graph/agent/${agentId}`);
        const data = await response.json();

        setElements(data.elements);
        setViewMode('agent');
        setTimeout(() => {
          runLayout();
        }, 100);
      } catch (error) {
        console.error('Agent view error:', error);
      }
    },
    [allElements, runLayout]
  );

  // Handle agent comparison
  const handleCompare = useCallback(
    (_agent1: string, _agent2: string, data: ComparisonData) => {
      if (!cyRef.current) return;

      try {
        const cy = cyRef.current;
        if (cy.destroyed()) return;

        const agent1Color = '#2196F3'; // Blue
        const agent2Color = '#7E57C2'; // Purple
        const sharedColor = '#10B981'; // Green

        // Color nodes based on ownership
        cy.batch(() => {
          cy.nodes().forEach((node) => {
            const nodeId = node.id();

            if (data.agent1_nodes.includes(nodeId)) {
              node.style({ 'border-color': agent1Color, 'border-width': 4 });
            } else if (data.agent2_nodes.includes(nodeId)) {
              node.style({ 'border-color': agent2Color, 'border-width': 4 });
            } else if (data.shared_nodes.includes(nodeId)) {
              node.style({ 'border-color': sharedColor, 'border-width': 5 });
            }
          });
        });

        setViewMode('comparison');
      } catch (error) {
        console.error('Comparison error:', error);
      }
    },
    []
  );

  // Handle node click for neighborhood focus
  const handleNodeClick = useCallback(
    async (nodeId: string, nodeLabel: string) => {
      try {
        const response = await fetch(
          `${config.apiEndpoint}/graph/neighborhood/${nodeId}?depth=${neighborhoodDepth}`
        );
        const data = await response.json();

        const neighborIds = new Set(data.neighbors);

        // Filter to neighborhood
        const neighborhoodElements = allElements.filter((el: any) => {
          if ('label' in el.data) {
            return neighborIds.has(el.data.id);
          } else if ('source' in el.data) {
            return neighborIds.has(el.data.source) && neighborIds.has(el.data.target);
          }
          return false;
        });

        setElements(neighborhoodElements);
        setViewMode('neighborhood');
        setBreadcrumbs([...breadcrumbs, { id: nodeId, label: nodeLabel }]);

        setTimeout(() => {
          runLayout();
        }, 100);
      } catch (error) {
        console.error('Neighborhood error:', error);
      }
    },
    [allElements, neighborhoodDepth, breadcrumbs, runLayout]
  );

  // Reset to normal view
  const handleResetView = useCallback(() => {
    if (!cyRef.current) return;

    setElements(allElements);
    setViewMode('normal');
    setBreadcrumbs([]);
    setSelectedAgent('all');
    setShowComparison(false);

    // Reset node styles
    try {
      if (cyRef.current && !cyRef.current.destroyed()) {
        cyRef.current.batch(() => {
          cyRef.current!.nodes().style({
            'border-color': '#94A3B8',
            'border-width': 1.8,
          });
        });
      }
    } catch (error) {
      console.error('Reset style error:', error);
    }

    setTimeout(() => {
      runLayout();
    }, 100);
  }, [allElements, runLayout]);

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
        <Text color="red.400" fontSize="lg">
          Error loading graph
        </Text>
        <Text color="gray.500" fontSize="sm">
          {error}
        </Text>
      </Flex>
    );
  }

  return (
    <Box position="relative" h="full" w="full" bg="gray.925">
      {/* Top Controls Bar */}
      <Box
        px={4}
        py={3}
        borderBottom="1px"
        borderColor="gray.700"
        bg="rgba(15, 23, 42, 0.95)"
        zIndex={100}
      >
        <VStack spacing={3} align="stretch">
          {/* First Row: Search and Buttons */}
          <HStack spacing={3} justify="space-between">
            <GraphSearchBar
              onResultSelect={handleSearchResultSelect}
              onFocusResults={handleFocusResults}
            />

            <HStack spacing={2}>
              <Tooltip label="Toggle Filters" placement="bottom">
                <Button
                  size="sm"
                  variant={showFilters ? 'solid' : 'outline'}
                  colorScheme="purple"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  Filters
                  {(viewMode === 'filtered') && (
                    <Badge ml={2} colorScheme="purple">
                      Active
                    </Badge>
                  )}
                </Button>
              </Tooltip>

              <Tooltip label="Compare Agents" placement="bottom">
                <Button
                  size="sm"
                  variant={showComparison ? 'solid' : 'outline'}
                  colorScheme="green"
                  onClick={() => setShowComparison(!showComparison)}
                >
                  Compare
                </Button>
              </Tooltip>

              {viewMode !== 'normal' && (
                <Tooltip label="Reset View" placement="bottom">
                  <IconButton
                    aria-label="Reset view"
                    icon={<RepeatIcon />}
                    size="sm"
                    colorScheme="orange"
                    onClick={handleResetView}
                  />
                </Tooltip>
              )}
            </HStack>
          </HStack>

          {/* Second Row: Agent Switcher */}
          <AgentViewSwitch
            selectedAgent={selectedAgent}
            onAgentChange={handleAgentChange}
            agentNodeCounts={agentNodeCounts}
          />

          {/* Breadcrumbs for neighborhood navigation */}
          {viewMode === 'neighborhood' && breadcrumbs.length > 0 && (
            <Breadcrumb
              spacing="4px"
              separator={<ChevronRightIcon color="gray.500" />}
              fontSize="sm"
            >
              <BreadcrumbItem>
                <BreadcrumbLink onClick={handleResetView} color="blue.400">
                  All Nodes
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.map((crumb, index) => (
                <BreadcrumbItem key={crumb.id} isCurrentPage={index === breadcrumbs.length - 1}>
                  <BreadcrumbLink color={index === breadcrumbs.length - 1 ? 'white' : 'gray.400'}>
                    {crumb.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              ))}
            </Breadcrumb>
          )}
        </VStack>
      </Box>

      {/* Filter Panel Overlay */}
      {showFilters && (
        <Box position="absolute" top="140px" right="20px" zIndex={1000}>
          <GraphFilterPanel
            onFilterChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        </Box>
      )}

      {/* Comparison Panel Overlay */}
      {showComparison && (
        <Box position="absolute" top="140px" right="20px" zIndex={1000}>
          <AgentComparison onCompare={handleCompare} onClose={() => setShowComparison(false)} />
        </Box>
      )}

      {/* Stats Overlay */}
      <Box position="absolute" top={140} left={5} zIndex={10}>
        <Box
          bg="rgba(15, 23, 42, 0.85)"
          backdropFilter="blur(12px)"
          p={3}
          rounded="lg"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
        >
          <HStack spacing={6}>
            <Stat size="sm">
              <StatLabel fontSize="10px" color="gray.400">
                Nodes
              </StatLabel>
              <StatNumber fontSize="xl" color="white">
                {stats.nodeCount}
              </StatNumber>
            </Stat>
            <Box h="8" w="px" bg="whiteAlpha.200" />
            <Stat size="sm">
              <StatLabel fontSize="10px" color="gray.400">
                Edges
              </StatLabel>
              <StatNumber fontSize="xl" color="white">
                {stats.edgeCount}
              </StatNumber>
            </Stat>
            <Box h="8" w="px" bg="whiteAlpha.200" />
            <Stat size="sm">
              <StatLabel fontSize="10px" color="gray.400">
                Highlighted
              </StatLabel>
              <StatNumber fontSize="xl" color={highlightCount ? 'brand.orange' : 'gray.500'}>
                {highlightCount}
              </StatNumber>
            </Stat>
          </HStack>
          {viewMode !== 'normal' && (
            <Badge mt={2} colorScheme="blue" fontSize="xs">
              {viewMode.toUpperCase()} MODE
            </Badge>
          )}
        </Box>
      </Box>

      {/* Cytoscape Graph */}
      <CytoscapeComponent
        key="knowledge-graph"
        elements={elements as any}
        stylesheet={cytoscapeStyles}
        layout={layoutConfig}
        cy={(cy: any) => {
          if (!cy) return;

          cyRef.current = cy;

          // Remove existing listeners to prevent duplicates
          try {
            cy.off('tap', 'node');
          } catch (e) {
            console.warn('Error removing listeners:', e);
          }

          // Add node click listener
          cy.on('tap', 'node', (evt: any) => {
            try {
              const node = evt.target;
              const nodeData = node.data();
              console.log('Node clicked:', nodeData);
              handleNodeClick(nodeData.id, nodeData.label);
            } catch (e) {
              console.error('Node click error:', e);
            }
          });

          // Fit graph with padding only if we have nodes
          setTimeout(() => {
            try {
              if (cy && !cy.destroyed() && cy.nodes && cy.nodes().length > 0) {
                cy.fit(undefined, 50);
              }
            } catch (e) {
              console.warn('Fit error:', e);
            }
          }, 200);
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
      label: 'data(label)',
      'font-size': 11,
      color: '#F8FAFC',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': 120,
      width: 36,
      height: 36,
      'border-width': 1.8,
      'border-color': '#94A3B8',
      'border-opacity': 0.6,
      'background-opacity': 0.95,
      'text-outline-width': 2,
      'text-outline-color': 'rgba(2, 6, 23, 0.82)',
      'font-family': 'Inter, sans-serif',
      'font-weight': 600,
    },
  },
  {
    selector: 'node[type="person"]',
    style: {
      width: 56,
      height: 56,
      'font-size': 12,
      'font-weight': 700,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1.4,
      'line-color': 'rgba(148, 163, 184, 0.25)',
      'line-style': 'solid',
      'target-arrow-color': 'rgba(148, 163, 184, 0.25)',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 0.8,
      opacity: 0.5,
    },
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
  minTemp: 1.0,
};

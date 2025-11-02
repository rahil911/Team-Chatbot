import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Checkbox,
  CheckboxGroup,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Button,
  Divider,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Badge,
  Tooltip,
  IconButton,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';
import { config } from '../config';

export interface GraphFilters {
  nodeTypes: string[];
  agents: string[];
  minImportance: number;
  clusters: number[];
}

interface GraphFilterPanelProps {
  onFilterChange: (filters: GraphFilters) => void;
  onClose?: () => void;
}

const NODE_TYPES = [
  { value: 'person', label: 'People', color: '#7C3AED' },
  { value: 'skill', label: 'Skills', color: '#10B981' },
  { value: 'technology', label: 'Technologies', color: '#3B82F6' },
  { value: 'project', label: 'Projects', color: '#F59E0B' },
  { value: 'company', label: 'Companies', color: '#EF4444' },
  { value: 'role', label: 'Roles', color: '#8B5CF6' },
  { value: 'education', label: 'Education', color: '#06B6D4' },
  { value: 'certification', label: 'Certifications', color: '#EC4899' },
  { value: 'achievement', label: 'Achievements', color: '#14B8A6' },
];

const AGENTS = [
  { id: 'rahil', name: 'Rahil M. Harihar', color: '#7E57C2' },
  { id: 'mathew', name: 'Mathew Jerry Meleth', color: '#2196F3' },
  { id: 'shreyas', name: 'Shreyas B Subramanya', color: '#4CAF50' },
  { id: 'siddarth', name: 'Siddarth Bhave', color: '#FF9800' },
];

export const GraphFilterPanel: React.FC<GraphFilterPanelProps> = ({ onFilterChange, onClose }) => {
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [minImportance, setMinImportance] = useState<number>(0);
  const [selectedClusters, setSelectedClusters] = useState<number[]>([]);
  const [availableClusters, setAvailableClusters] = useState<number[]>([]);
  const [clusterSizes, setClusterSizes] = useState<Record<number, number>>({});
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Load available clusters
  useEffect(() => {
    fetch(`${config.apiEndpoint}/graph/clusters`)
      .then(res => res.json())
      .then(data => {
        const clusterIds = Object.keys(data.algorithm_clusters).map(Number);
        setAvailableClusters(clusterIds);

        // Calculate cluster sizes
        const sizes: Record<number, number> = {};
        for (const [clusterId, nodes] of Object.entries(data.algorithm_clusters)) {
          sizes[Number(clusterId)] = (nodes as any[]).length;
        }
        setClusterSizes(sizes);
      })
      .catch(err => console.error('Error loading clusters:', err));
  }, []);

  // Calculate active filters count
  useEffect(() => {
    let count = 0;
    if (selectedNodeTypes.length > 0) count++;
    if (selectedAgents.length > 0) count++;
    if (minImportance > 0) count++;
    if (selectedClusters.length > 0) count++;
    setActiveFiltersCount(count);
  }, [selectedNodeTypes, selectedAgents, minImportance, selectedClusters]);

  const handleApplyFilters = () => {
    const filters: GraphFilters = {
      nodeTypes: selectedNodeTypes.length > 0 ? selectedNodeTypes : [],
      agents: selectedAgents.length > 0 ? selectedAgents : [],
      minImportance,
      clusters: selectedClusters.length > 0 ? selectedClusters : [],
    };

    onFilterChange(filters);
  };

  const handleReset = () => {
    setSelectedNodeTypes([]);
    setSelectedAgents([]);
    setMinImportance(0);
    setSelectedClusters([]);

    // Apply reset immediately
    onFilterChange({
      nodeTypes: [],
      agents: [],
      minImportance: 0,
      clusters: [],
    });
  };

  const handleSelectAllNodeTypes = () => {
    if (selectedNodeTypes.length === NODE_TYPES.length) {
      setSelectedNodeTypes([]);
    } else {
      setSelectedNodeTypes(NODE_TYPES.map(t => t.value));
    }
  };

  const handleSelectAllAgents = () => {
    if (selectedAgents.length === AGENTS.length) {
      setSelectedAgents([]);
    } else {
      setSelectedAgents(AGENTS.map(a => a.id));
    }
  };

  return (
    <Box
      bg="gray.900"
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.700"
      p={4}
      w="320px"
      maxH="90vh"
      overflowY="auto"
      boxShadow="xl"
    >
      <HStack justifyContent="space-between" mb={3}>
        <HStack>
          <Text fontSize="lg" fontWeight="bold" color="white">
            Graph Filters
          </Text>
          {activeFiltersCount > 0 && (
            <Badge colorScheme="purple" fontSize="xs">
              {activeFiltersCount} active
            </Badge>
          )}
        </HStack>
        {onClose && (
          <IconButton
            aria-label="Close filters"
            icon={<CloseIcon />}
            size="sm"
            variant="ghost"
            onClick={onClose}
          />
        )}
      </HStack>

      <VStack spacing={4} align="stretch">
        {/* Action Buttons */}
        <HStack spacing={2}>
          <Button
            flex={1}
            size="sm"
            colorScheme="purple"
            onClick={handleApplyFilters}
          >
            Apply Filters
          </Button>
          <Button
            flex={1}
            size="sm"
            variant="outline"
            colorScheme="gray"
            onClick={handleReset}
            isDisabled={activeFiltersCount === 0}
          >
            Reset
          </Button>
        </HStack>

        <Divider borderColor="gray.700" />

        {/* Node Types Filter */}
        <Accordion allowToggle defaultIndex={[0]}>
          <AccordionItem border="none">
            <AccordionButton px={0} _hover={{ bg: 'transparent' }}>
              <Box flex="1" textAlign="left">
                <Text fontWeight="semibold" color="white" fontSize="sm">
                  Node Types
                  {selectedNodeTypes.length > 0 && (
                    <Badge ml={2} colorScheme="blue" fontSize="xs">
                      {selectedNodeTypes.length}
                    </Badge>
                  )}
                </Text>
              </Box>
              <AccordionIcon color="white" />
            </AccordionButton>
            <AccordionPanel pb={4} px={0}>
              <VStack align="stretch" spacing={2}>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={handleSelectAllNodeTypes}
                  colorScheme="blue"
                >
                  {selectedNodeTypes.length === NODE_TYPES.length ? 'Deselect All' : 'Select All'}
                </Button>

                <CheckboxGroup
                  value={selectedNodeTypes}
                  onChange={(values) => setSelectedNodeTypes(values as string[])}
                >
                  <VStack align="stretch" spacing={2}>
                    {NODE_TYPES.map(type => (
                      <Checkbox
                        key={type.value}
                        value={type.value}
                        colorScheme="blue"
                        size="sm"
                      >
                        <HStack spacing={2}>
                          <Box
                            w="10px"
                            h="10px"
                            borderRadius="full"
                            bg={type.color}
                          />
                          <Text fontSize="sm" color="gray.200">
                            {type.label}
                          </Text>
                        </HStack>
                      </Checkbox>
                    ))}
                  </VStack>
                </CheckboxGroup>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>

        <Divider borderColor="gray.700" />

        {/* Agent/Person Filter */}
        <Accordion allowToggle>
          <AccordionItem border="none">
            <AccordionButton px={0} _hover={{ bg: 'transparent' }}>
              <Box flex="1" textAlign="left">
                <Text fontWeight="semibold" color="white" fontSize="sm">
                  Team Members
                  {selectedAgents.length > 0 && (
                    <Badge ml={2} colorScheme="purple" fontSize="xs">
                      {selectedAgents.length}
                    </Badge>
                  )}
                </Text>
              </Box>
              <AccordionIcon color="white" />
            </AccordionButton>
            <AccordionPanel pb={4} px={0}>
              <VStack align="stretch" spacing={2}>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={handleSelectAllAgents}
                  colorScheme="purple"
                >
                  {selectedAgents.length === AGENTS.length ? 'Deselect All' : 'Select All'}
                </Button>

                <CheckboxGroup
                  value={selectedAgents}
                  onChange={(values) => setSelectedAgents(values as string[])}
                >
                  <VStack align="stretch" spacing={2}>
                    {AGENTS.map(agent => (
                      <Checkbox
                        key={agent.id}
                        value={agent.id}
                        colorScheme="purple"
                        size="sm"
                      >
                        <HStack spacing={2}>
                          <Box
                            w="10px"
                            h="10px"
                            borderRadius="full"
                            bg={agent.color}
                          />
                          <Text fontSize="sm" color="gray.200">
                            {agent.name}
                          </Text>
                        </HStack>
                      </Checkbox>
                    ))}
                  </VStack>
                </CheckboxGroup>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>

        <Divider borderColor="gray.700" />

        {/* Importance Slider */}
        <Accordion allowToggle>
          <AccordionItem border="none">
            <AccordionButton px={0} _hover={{ bg: 'transparent' }}>
              <Box flex="1" textAlign="left">
                <Text fontWeight="semibold" color="white" fontSize="sm">
                  Minimum Importance
                  {minImportance > 0 && (
                    <Badge ml={2} colorScheme="orange" fontSize="xs">
                      ≥ {minImportance}%
                    </Badge>
                  )}
                </Text>
              </Box>
              <AccordionIcon color="white" />
            </AccordionButton>
            <AccordionPanel pb={4} px={0}>
              <VStack align="stretch" spacing={3}>
                <Text fontSize="xs" color="gray.400">
                  Filter nodes by their importance score (based on centrality metrics)
                </Text>
                <Slider
                  value={minImportance}
                  onChange={setMinImportance}
                  min={0}
                  max={100}
                  step={5}
                  colorScheme="orange"
                >
                  <SliderTrack bg="gray.700">
                    <SliderFilledTrack />
                  </SliderTrack>
                  <Tooltip label={`${minImportance}%`} placement="top" hasArrow>
                    <SliderThumb boxSize={5} />
                  </Tooltip>
                </Slider>
                <HStack justifyContent="space-between">
                  <Text fontSize="xs" color="gray.500">
                    0%
                  </Text>
                  <Text fontSize="sm" fontWeight="bold" color="white">
                    {minImportance}%
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    100%
                  </Text>
                </HStack>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>

        <Divider borderColor="gray.700" />

        {/* Cluster Filter */}
        <Accordion allowToggle>
          <AccordionItem border="none">
            <AccordionButton px={0} _hover={{ bg: 'transparent' }}>
              <Box flex="1" textAlign="left">
                <Text fontWeight="semibold" color="white" fontSize="sm">
                  Communities/Clusters
                  {selectedClusters.length > 0 && (
                    <Badge ml={2} colorScheme="green" fontSize="xs">
                      {selectedClusters.length}
                    </Badge>
                  )}
                </Text>
              </Box>
              <AccordionIcon color="white" />
            </AccordionButton>
            <AccordionPanel pb={4} px={0}>
              <VStack align="stretch" spacing={2}>
                <Text fontSize="xs" color="gray.400" mb={2}>
                  Filter by automatically detected communities
                </Text>
                <CheckboxGroup
                  value={selectedClusters.map(String)}
                  onChange={(values) => setSelectedClusters(values.map(Number))}
                >
                  <VStack align="stretch" spacing={2}>
                    {availableClusters.map(clusterId => (
                      <Checkbox
                        key={clusterId}
                        value={String(clusterId)}
                        colorScheme="green"
                        size="sm"
                      >
                        <HStack spacing={2}>
                          <Text fontSize="sm" color="gray.200">
                            Cluster {clusterId}
                          </Text>
                          <Badge size="xs" colorScheme="gray">
                            {clusterSizes[clusterId] || 0} nodes
                          </Badge>
                        </HStack>
                      </Checkbox>
                    ))}
                  </VStack>
                </CheckboxGroup>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </VStack>
    </Box>
  );
};

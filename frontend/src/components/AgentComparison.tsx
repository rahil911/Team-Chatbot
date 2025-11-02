import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Select,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  Badge,
  Divider,
  SimpleGrid,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';
import { config } from '../config';

interface AgentComparisonProps {
  onCompare: (agent1: string, agent2: string, comparisonData: ComparisonData) => void;
  onClose?: () => void;
}

export interface ComparisonData {
  agent1_id: string;
  agent2_id: string;
  agent1_node_count: number;
  agent2_node_count: number;
  shared_count: number;
  shared_nodes: string[];
  agent1_nodes: string[];
  agent2_nodes: string[];
}

const AGENTS = [
  { id: 'rahil', name: 'Rahil M. Harihar', color: '#7E57C2' },
  { id: 'mathew', name: 'Mathew Jerry Meleth', color: '#2196F3' },
  { id: 'shreyas', name: 'Shreyas B Subramanya', color: '#4CAF50' },
  { id: 'siddarth', name: 'Siddarth Bhave', color: '#FF9800' },
];

export const AgentComparison: React.FC<AgentComparisonProps> = ({ onCompare, onClose }) => {
  const [agent1, setAgent1] = useState<string>(AGENTS[0].id);
  const [agent2, setAgent2] = useState<string>(AGENTS[1].id);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const performComparison = async () => {
    if (agent1 === agent2) {
      alert('Please select two different agents to compare');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${config.apiEndpoint}/graph/compare/${agent1}/${agent2}`
      );
      const data = await response.json();
      setComparisonData(data);
      onCompare(agent1, agent2, data);
    } catch (error) {
      console.error('Comparison error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAgentName = (agentId: string) => {
    return AGENTS.find((a) => a.id === agentId)?.name || agentId;
  };

  const getAgentColor = (agentId: string) => {
    return AGENTS.find((a) => a.id === agentId)?.color || '#94A3B8';
  };

  return (
    <Box
      bg="gray.900"
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.700"
      p={4}
      w="400px"
      boxShadow="xl"
    >
      <HStack justifyContent="space-between" mb={4}>
        <Text fontSize="lg" fontWeight="bold" color="white">
          Compare Agents
        </Text>
        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose}>
            <CloseIcon boxSize={3} />
          </Button>
        )}
      </HStack>

      <VStack spacing={4} align="stretch">
        {/* Agent Selectors */}
        <VStack spacing={3} align="stretch">
          <Box>
            <Text fontSize="sm" color="gray.400" mb={2}>
              Agent 1
            </Text>
            <Select
              value={agent1}
              onChange={(e) => setAgent1(e.target.value)}
              bg="gray.800"
              borderColor="gray.600"
              color="white"
              size="sm"
            >
              {AGENTS.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
          </Box>

          <Box>
            <Text fontSize="sm" color="gray.400" mb={2}>
              Agent 2
            </Text>
            <Select
              value={agent2}
              onChange={(e) => setAgent2(e.target.value)}
              bg="gray.800"
              borderColor="gray.600"
              color="white"
              size="sm"
            >
              {AGENTS.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
          </Box>
        </VStack>

        {/* Compare Button */}
        <Button
          colorScheme="purple"
          onClick={performComparison}
          isLoading={isLoading}
          loadingText="Comparing..."
          isDisabled={agent1 === agent2}
        >
          Compare
        </Button>

        {/* Comparison Results */}
        {comparisonData && (
          <>
            <Divider borderColor="gray.700" />

            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" fontWeight="semibold" color="white">
                Comparison Results
              </Text>

              <SimpleGrid columns={2} spacing={3}>
                {/* Agent 1 Stats */}
                <Stat
                  bg="gray.800"
                  p={3}
                  borderRadius="md"
                  border="2px solid"
                  borderColor={getAgentColor(agent1)}
                >
                  <StatLabel fontSize="xs" color="gray.400">
                    {getAgentName(agent1).split(' ')[0]} Only
                  </StatLabel>
                  <StatNumber fontSize="2xl" color="white">
                    {comparisonData.agent1_node_count}
                  </StatNumber>
                  <Badge
                    mt={1}
                    size="sm"
                    style={{ backgroundColor: getAgentColor(agent1) }}
                  >
                    Unique
                  </Badge>
                </Stat>

                {/* Agent 2 Stats */}
                <Stat
                  bg="gray.800"
                  p={3}
                  borderRadius="md"
                  border="2px solid"
                  borderColor={getAgentColor(agent2)}
                >
                  <StatLabel fontSize="xs" color="gray.400">
                    {getAgentName(agent2).split(' ')[0]} Only
                  </StatLabel>
                  <StatNumber fontSize="2xl" color="white">
                    {comparisonData.agent2_node_count}
                  </StatNumber>
                  <Badge
                    mt={1}
                    size="sm"
                    style={{ backgroundColor: getAgentColor(agent2) }}
                  >
                    Unique
                  </Badge>
                </Stat>
              </SimpleGrid>

              {/* Shared Stats */}
              <Stat
                bg="gray.800"
                p={3}
                borderRadius="md"
                border="2px solid"
                borderColor="#10B981"
              >
                <StatLabel fontSize="xs" color="gray.400">
                  Shared Connections
                </StatLabel>
                <StatNumber fontSize="2xl" color="white">
                  {comparisonData.shared_count}
                </StatNumber>
                <Badge mt={1} colorScheme="green" size="sm">
                  Common
                </Badge>
              </Stat>

              {/* Shared Nodes List */}
              {comparisonData.shared_count > 0 && (
                <Box>
                  <Text fontSize="xs" color="gray.400" mb={2}>
                    Shared Nodes (Sample):
                  </Text>
                  <VStack align="stretch" spacing={1} maxH="150px" overflowY="auto">
                    {comparisonData.shared_nodes.slice(0, 5).map((nodeId) => (
                      <Box
                        key={nodeId}
                        bg="gray.800"
                        px={2}
                        py={1}
                        borderRadius="sm"
                        fontSize="xs"
                        color="gray.300"
                        fontFamily="mono"
                      >
                        {nodeId}
                      </Box>
                    ))}
                    {comparisonData.shared_count > 5 && (
                      <Text fontSize="xs" color="gray.500" textAlign="center">
                        +{comparisonData.shared_count - 5} more
                      </Text>
                    )}
                  </VStack>
                </Box>
              )}
            </VStack>
          </>
        )}
      </VStack>
    </Box>
  );
};

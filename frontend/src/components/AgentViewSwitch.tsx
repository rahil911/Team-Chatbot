import React from 'react';
import {
  HStack,
  Button,
  Box,
  Text,
  Badge,
  Tooltip,
} from '@chakra-ui/react';

export interface AgentView {
  id: string | 'all';
  name: string;
  color: string;
}

interface AgentViewSwitchProps {
  selectedAgent: string | 'all';
  onAgentChange: (agentId: string | 'all') => void;
  agentNodeCounts?: Record<string, number>;
}

const AGENTS: AgentView[] = [
  { id: 'all', name: 'All Agents', color: '#94A3B8' },
  { id: 'rahil', name: 'Rahil', color: '#7E57C2' },
  { id: 'mathew', name: 'Mathew', color: '#2196F3' },
  { id: 'shreyas', name: 'Shreyas', color: '#4CAF50' },
  { id: 'siddarth', name: 'Siddarth', color: '#FF9800' },
];

export const AgentViewSwitch: React.FC<AgentViewSwitchProps> = ({
  selectedAgent,
  onAgentChange,
  agentNodeCounts = {},
}) => {
  return (
    <HStack spacing={2} bg="gray.900" p={2} borderRadius="md" border="1px solid" borderColor="gray.700">
      {AGENTS.map((agent) => {
        const isSelected = selectedAgent === agent.id;
        const nodeCount = agentNodeCounts[agent.id];

        return (
          <Tooltip
            key={agent.id}
            label={nodeCount !== undefined ? `${nodeCount} nodes` : agent.name}
            placement="top"
            hasArrow
          >
            <Button
              size="sm"
              variant={isSelected ? 'solid' : 'ghost'}
              bg={isSelected ? agent.color : 'transparent'}
              color={isSelected ? 'white' : 'gray.300'}
              _hover={{
                bg: isSelected ? agent.color : 'gray.800',
                color: 'white',
              }}
              _active={{
                bg: agent.color,
              }}
              onClick={() => onAgentChange(agent.id)}
              leftIcon={
                <Box
                  w="8px"
                  h="8px"
                  borderRadius="full"
                  bg={agent.color}
                  opacity={isSelected ? 1 : 0.6}
                />
              }
              position="relative"
            >
              <Text fontSize="sm" fontWeight={isSelected ? 'bold' : 'normal'}>
                {agent.name}
              </Text>
              {nodeCount !== undefined && nodeCount > 0 && (
                <Badge
                  ml={2}
                  colorScheme={isSelected ? 'whiteAlpha' : 'gray'}
                  fontSize="xs"
                  variant={isSelected ? 'solid' : 'subtle'}
                >
                  {nodeCount}
                </Badge>
              )}
            </Button>
          </Tooltip>
        );
      })}
    </HStack>
  );
};

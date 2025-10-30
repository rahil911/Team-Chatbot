import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  Badge,
  Flex,
  Heading,
} from '@chakra-ui/react';
import type { AgentMessage } from '../types';

interface FloatingAgentPanelProps {
  isOpen: boolean;
  activeAgents: string[];
  agentMessages: AgentMessage;
}

const AGENTS = {
  mathew: {
    name: 'Mathew Jerry Meleth',
    title: 'Data Engineer',
    color: '#2196F3',
    initials: 'MJ',
    image: '/Mathew.jpeg',
  },
  rahil: {
    name: 'Rahil M. Harihar',
    title: 'AI Architect',
    color: '#7E57C2',
    initials: 'RH',
    image: '/Rahil.jpeg',
  },
  shreyas: {
    name: 'Shreyas B Subramanya',
    title: 'Product Manager',
    color: '#4CAF50',
    initials: 'SB',
    image: '/Shreyas.jpeg',
  },
  siddarth: {
    name: 'Siddarth Bhave',
    title: 'Software Engineer',
    color: '#FF9800',
    initials: 'SB',
    image: '/Siddarth.jpeg',
  },
} as const;

export const FloatingAgentPanel = ({ isOpen, activeAgents, agentMessages }: FloatingAgentPanelProps) => {
  return (
    <Box
      position="fixed"
      left={0}
      top="56px"
      bottom={0}
      w="280px"
      bg="rgba(7, 15, 31, 0.95)"
      backdropFilter="blur(12px)"
      borderRight="1px"
      borderColor="whiteAlpha.100"
      transform={isOpen ? 'translateX(0)' : 'translateX(-100%)'}
      transition="transform 0.3s ease"
      zIndex={50}
      overflow="auto"
      css={{
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(148, 163, 184, 0.3)',
          borderRadius: '3px',
        },
      }}
    >
      <Box p={4}>
        <Heading size="xs" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={4}>
          Team Members
        </Heading>
        
        <VStack spacing={3} align="stretch">
          {Object.entries(AGENTS).map(([agentId, agent]) => {
            const isActive = activeAgents.includes(agentId);
            const lastMessage = agentMessages[agentId];
            
            return (
              <Box
                key={agentId}
                p={3}
                rounded="lg"
                bg={isActive ? 'whiteAlpha.50' : 'transparent'}
                borderWidth="1px"
                borderColor={isActive ? `${agent.color}40` : 'whiteAlpha.100'}
                transition="all 0.2s"
                cursor="pointer"
                _hover={{
                  bg: 'whiteAlpha.100',
                  borderColor: `${agent.color}60`,
                }}
                boxShadow={isActive ? `0 0 20px ${agent.color}30` : 'none'}
              >
                <Flex align="start" gap={3}>
                  <Avatar
                    size="sm"
                    name={agent.name}
                    src={agent.image}
                    bg={`${agent.color}30`}
                    color={agent.color}
                    borderWidth="2px"
                    borderColor={agent.color}
                    getInitials={() => agent.initials}
                  />
                  
                  <Box flex={1} minW={0}>
                    <HStack justify="space-between" align="start" mb={1}>
                      <Text fontSize="sm" fontWeight="semibold" color="gray.100" noOfLines={1}>
                        {agent.name.split(' ')[0]}
                      </Text>
                      {isActive && (
                        <Box
                          w={2}
                          h={2}
                          rounded="full"
                          bg={agent.color}
                          animation="pulse 2s infinite"
                        />
                      )}
                    </HStack>
                    
                    <Text fontSize="xs" color="gray.500" mb={2}>
                      {agent.title}
                    </Text>
                    
                    {lastMessage && (
                      <Text fontSize="xs" color="gray.400" noOfLines={2} lineHeight="1.4">
                        "{lastMessage.slice(0, 60)}..."
                      </Text>
                    )}
                    
                    {isActive && (
                      <Badge
                        mt={2}
                        size="sm"
                        colorScheme="blue"
                        variant="subtle"
                        fontSize="10px"
                      >
                        Active Now
                      </Badge>
                    )}
                  </Box>
                </Flex>
              </Box>
            );
          })}
        </VStack>
      </Box>
    </Box>
  );
};


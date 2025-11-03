import { useState } from 'react';
import {
  Box,
  Flex,
  HStack,
  Text,
  Badge,
  Avatar,
  VStack,
  Button,
  ButtonGroup,
  Progress,
} from '@chakra-ui/react';
import { ChatView } from './ChatView';
import { KnowledgeGraphView } from './KnowledgeGraphView';
import { useWebSocket } from '../hooks/useWebSocket';
import { useGraphHighlight } from '../hooks/useGraphHighlight';
import type { ChatMode } from '../types';

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

export const Dashboard = () => {
  const [mode, setMode] = useState<ChatMode>('group');

  const { addHighlight, highlights } = useGraphHighlight();

  const {
    connected,
    messages,
    agentMessages,
    activeAgents,
    isProcessing,
    typingAgent,
    sendMessage,
    thinkTank,
  } = useWebSocket((highlightData: any) => {
    addHighlight(highlightData);
  });

  const handleSendMessage = (message: string) => {
    sendMessage(message, mode);
  };

  const handleSendVoice = (_audioBlob: Blob) => {
    alert('Voice input feature coming soon!');
  };

  const isThinkTankMode = mode === 'think_tank';
  const consensusPercent = thinkTank?.consensus ? Math.round(thinkTank.consensus.score * 100) : 0;

  return (
    <Flex direction="column" h="100vh" bg="gray.950">
      {/* Header with Agent Cards */}
      <Box
        bg="rgba(15, 23, 42, 0.8)"
        backdropFilter="blur(12px)"
        borderBottom="1px"
        borderColor="whiteAlpha.100"
        px={6}
        py={4}
      >
        <Flex justify="space-between" align="center" mb={3}>
          {/* Logo */}
          <HStack spacing={3}>
            <Box
              bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              w="40px"
              h="40px"
              rounded="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontWeight="bold"
              fontSize="lg"
              color="white"
            >
              AI
            </Box>
            <VStack align="start" spacing={0}>
              <Text fontSize="lg" fontWeight="bold" color="white">
                AI Team Intelligence
              </Text>
              <HStack spacing={2}>
                <Badge
                  colorScheme={connected ? 'green' : 'red'}
                  variant="subtle"
                  fontSize="9px"
                >
                  {connected ? 'CONNECTED' : 'DISCONNECTED'}
                </Badge>
              </HStack>
            </VStack>
          </HStack>

          {/* Mode Selector */}
          <ButtonGroup size="sm" isAttached variant="outline">
            <Button
              onClick={() => setMode('group')}
              colorScheme={mode === 'group' ? 'blue' : 'gray'}
              bg={mode === 'group' ? 'blue.600' : 'whiteAlpha.100'}
              _hover={{ bg: mode === 'group' ? 'blue.500' : 'whiteAlpha.200' }}
            >
              Group Chat
            </Button>
            {/* Orchestrator and Think Tank modes hidden (backend still functional) */}
          </ButtonGroup>

          {/* Agent Cards */}
          <HStack spacing={3}>
            {Object.entries(AGENTS).map(([agentId, agent]) => {
              const isActive = activeAgents.includes(agentId);
              return (
                <Flex
                  key={agentId}
                  align="center"
                  gap={2}
                  px={3}
                  py={2}
                  rounded="lg"
                  bg={isActive ? 'whiteAlpha.100' : 'whiteAlpha.50'}
                  borderWidth="1px"
                  borderColor={isActive ? agent.color : 'whiteAlpha.100'}
                  transition="all 0.3s"
                  boxShadow={isActive ? `0 0 20px ${agent.color}40` : 'none'}
                >
                  <Avatar
                    size="sm"
                    name={agent.name}
                    src={agent.image}
                    bg={agent.color}
                    color="white"
                  />
                  <VStack spacing={0} align="start">
                    <Text fontSize="xs" fontWeight="semibold" color="white">
                      {agent.name.split(' ')[0]}
                    </Text>
                    <Text fontSize="9px" color="gray.400">
                      {agent.title}
                    </Text>
                  </VStack>
                  <Box
                    w="2"
                    h="2"
                    rounded="full"
                    bg={isActive ? agent.color : 'gray.600'}
                    transition="all 0.3s"
                  />
                </Flex>
              );
            })}
          </HStack>
        </Flex>

        {/* Think Tank Mode Stats */}
        {isThinkTankMode && thinkTank && thinkTank.currentRound > 0 && (
          <Flex gap={4} mt={3}>
            <Box flex={1} bg="whiteAlpha.50" rounded="md" p={3} borderWidth="1px" borderColor="whiteAlpha.200">
              <HStack justify="space-between" mb={2}>
                <Text fontSize="xs" fontWeight="semibold" color="gray.400">
                  CONSENSUS
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color={consensusPercent >= 85 ? 'green.400' : 'orange.400'}>
                  {consensusPercent}%
                </Text>
              </HStack>
              <Progress
                value={consensusPercent}
                size="sm"
                colorScheme={consensusPercent >= 85 ? 'green' : 'orange'}
                rounded="full"
                hasStripe
                isAnimated={consensusPercent < 85}
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {consensusPercent >= 85 ? '✓ Consensus reached' : `Need ${85 - consensusPercent}% more`}
              </Text>
            </Box>

            <Box flex={1} bg="whiteAlpha.50" rounded="md" p={3} borderWidth="1px" borderColor="whiteAlpha.200">
              <HStack justify="space-between" mb={2}>
                <Text fontSize="xs" fontWeight="semibold" color="gray.400">
                  DISCUSSION ROUND
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="blue.400">
                  {thinkTank.currentRound}/{thinkTank.maxRounds}
                </Text>
              </HStack>
              <Progress
                value={(thinkTank.currentRound / thinkTank.maxRounds) * 100}
                size="sm"
                colorScheme="blue"
                rounded="full"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {thinkTank.agentsResponded} of 4 agents responded
              </Text>
            </Box>

            {thinkTank.citations.length > 0 && (
              <Box flex={1} bg="whiteAlpha.50" rounded="md" p={3} borderWidth="1px" borderColor="whiteAlpha.200">
                <Text fontSize="xs" fontWeight="semibold" color="gray.400" mb={1}>
                  EVIDENCE
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="purple.400">
                  {thinkTank.citations.length}
                </Text>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Knowledge graph citations
                </Text>
              </Box>
            )}
          </Flex>
        )}
      </Box>

      {/* Split View: Chat | Knowledge Graph */}
      <Flex flex={1} overflow="hidden">
        {/* Left: Chat Interface */}
        <Box
          w="50%"
          h="full"
          borderRight="1px"
          borderColor="whiteAlpha.100"
          overflow="hidden"
        >
          <ChatView
            messages={messages}
            agentMessages={agentMessages}
            activeAgents={activeAgents}
            isProcessing={isProcessing}
            typingAgent={typingAgent}
            onSendMessage={handleSendMessage}
            onSendVoice={handleSendVoice}
          />
        </Box>

        {/* Right: Knowledge Graph */}
        <Box w="50%" h="full" overflow="hidden">
          <KnowledgeGraphView highlights={highlights} />
        </Box>
      </Flex>
    </Flex>
  );
};


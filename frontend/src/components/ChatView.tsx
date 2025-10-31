import { useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  Flex,
  Textarea,
  IconButton,
  Button,
  ButtonGroup,
  Heading,
  Badge,
} from '@chakra-ui/react';
import { ChatIcon, ArrowUpIcon } from '@chakra-ui/icons';
import { MessageFormatter } from './MessageFormatter';
import type { ChatMode, Message, AgentMessage } from '../types';
import { useState } from 'react';

interface ChatViewProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  messages: Message[];
  agentMessages: AgentMessage;
  activeAgents: string[];
  isProcessing: boolean;
  typingAgent: string | null;
  onSendMessage: (message: string) => void;
  onSendVoice: (audioBlob: Blob) => void;
}

const AGENTS = {
  mathew: { name: 'Mathew Jerry Meleth', color: '#2196F3', initials: 'MJ', image: '/Mathew.jpeg' },
  rahil: { name: 'Rahil M. Harihar', color: '#7E57C2', initials: 'RH', image: '/Rahil.jpeg' },
  shreyas: { name: 'Shreyas B Subramanya', color: '#4CAF50', initials: 'SB', image: '/Shreyas.jpeg' },
  siddarth: { name: 'Siddarth Bhave', color: '#FF9800', initials: 'SB', image: '/Siddarth.jpeg' },
} as const;

export const ChatView = ({
  mode,
  onModeChange,
  messages,
  isProcessing,
  typingAgent,
  onSendMessage,
}: ChatViewProps) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Flex direction="column" h="full" bg="gray.900">
      {/* Header */}
      <Box px={6} py={3} borderBottom="1px" borderColor="whiteAlpha.100" bg="rgba(15, 23, 42, 0.6)">
        <HStack spacing={2}>
          <ChatIcon color="brand.blue" />
          <Text fontSize="sm" fontWeight="bold" color="white">
            Team Chat
          </Text>
          <Badge colorScheme="blue" variant="subtle" fontSize="9px" ml={2}>
            Group Mode
          </Badge>
        </HStack>
      </Box>

      {/* Messages */}
      <VStack
        flex={1}
        overflow="auto"
        spacing={4}
        p={6}
        align="stretch"
        css={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(148, 163, 184, 0.3)',
            borderRadius: '4px',
          },
        }}
      >
        {messages.length === 0 ? (
          <Flex direction="column" align="center" justify="center" h="full" color="gray.500">
            <ChatIcon boxSize={10} mb={3} />
            <Text fontSize="sm" fontWeight="medium">
              Start the conversation
            </Text>
            <Text fontSize="xs">Ask a question and watch the team respond in real time.</Text>
          </Flex>
        ) : (
          messages.map((msg, i) => (
            <Box key={`${msg.timestamp}-${i}`}>
              {msg.type === 'user' ? (
                <Flex justify="flex-end">
                  <Box maxW="75%">
                    <Box bg="brand.blue" color="white" px={4} py={2.5} rounded="xl" roundedTopRight="md">
                      <Text fontSize="sm" lineHeight="1.6">
                        {msg.content}
                      </Text>
                    </Box>
                    <Text fontSize="xs" color="gray.500" mt={1.5} textAlign="right">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </Box>
                </Flex>
              ) : (
                <HStack align="start" spacing={2.5}>
                  <Avatar
                    size="sm"
                    name={msg.agent_id ? AGENTS[msg.agent_id as keyof typeof AGENTS]?.name : 'Agent'}
                    src={msg.agent_id ? AGENTS[msg.agent_id as keyof typeof AGENTS]?.image : undefined}
                    bg={msg.agent_id ? `${AGENTS[msg.agent_id as keyof typeof AGENTS]?.color}30` : 'gray.700'}
                    color={msg.agent_id ? AGENTS[msg.agent_id as keyof typeof AGENTS]?.color : 'gray.400'}
                    getInitials={() => msg.agent_id ? AGENTS[msg.agent_id as keyof typeof AGENTS]?.initials : '?'}
                  />
                  <Box flex={1}>
                    <HStack mb={1.5}>
                      <Text fontSize="xs" fontWeight="semibold" color="gray.100">
                        {msg.agent_id ? AGENTS[msg.agent_id as keyof typeof AGENTS]?.name : 'Agent'}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </HStack>
                    <Box
                      bg="gray.850"
                      borderWidth="1px"
                      borderColor="whiteAlpha.100"
                      borderLeftWidth="3px"
                      borderLeftColor={msg.agent_id ? AGENTS[msg.agent_id as keyof typeof AGENTS]?.color : 'gray.500'}
                      px={4}
                      py={2.5}
                      rounded="xl"
                      roundedTopLeft="md"
                    >
                      <Text fontSize="sm" color="gray.300" lineHeight="1.6">
                        <MessageFormatter content={msg.content} />
                      </Text>
                    </Box>
                  </Box>
                </HStack>
              )}
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </VStack>

      {/* Input Area */}
      <Box px={6} py={4} borderTop="1px" borderColor="whiteAlpha.100" bg="gray.900">
        <HStack spacing={2}>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your question here... (Shift+Enter for new line)"
            size="sm"
            resize="none"
            rows={1}
            maxH="120px"
            bg="gray.850"
            borderColor="whiteAlpha.200"
            _focus={{
              borderColor: 'brand.blue',
              bg: 'gray.900',
            }}
          />
          <IconButton
            aria-label="Send message"
            icon={<ArrowUpIcon />}
            colorScheme="blue"
            isDisabled={!input.trim() || isProcessing}
            onClick={handleSend}
          />
        </HStack>
        {typingAgent && (
          <Flex align="center" gap={2} mt={2}>
            <Avatar
              size="xs"
              name={AGENTS[typingAgent as keyof typeof AGENTS]?.name || typingAgent}
              bg={AGENTS[typingAgent as keyof typeof AGENTS]?.color || 'gray.500'}
              color="white"
              src={AGENTS[typingAgent as keyof typeof AGENTS]?.image}
            />
            <Text fontSize="xs" color="brand.blue">
              {AGENTS[typingAgent as keyof typeof AGENTS]?.name.split(' ')[0] || typingAgent} is typing
            </Text>
            <Box
              as="span"
              sx={{
                '@keyframes ellipsis': {
                  '0%, 20%': { content: '"."' },
                  '40%': { content: '".."' },
                  '60%, 100%': { content: '"..."' },
                },
                '&::after': {
                  content: '"..."',
                  animation: 'ellipsis 1.5s infinite',
                },
              }}
            />
          </Flex>
        )}
      </Box>
    </Flex>
  );
};


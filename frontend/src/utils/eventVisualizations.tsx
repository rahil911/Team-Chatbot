/**
 * Event Visualization Configurations
 *
 * Defines how each event type should be rendered with beautiful UI
 * Includes colors, gradients, emojis, and custom render functions
 */

import {
  Box,
  HStack,
  VStack,
  Text,
  Avatar,
  Tag,
  Progress,
  Badge,
} from '@chakra-ui/react';

export interface EventVisualization {
  icon?: string; // emoji fallback
  useAvatar?: boolean;
  avatarSrc?: string;
  avatarName?: string;
  color: string;
  bgGradient: string;
  renderDetails: (metadata: any) => React.ReactNode;
  getIcon?: (metadata: any) => React.ReactNode;
}

// Helper: Get intent emoji
const getIntentEmoji = (intent: string): string => {
  const emojiMap: Record<string, string> = {
    'greeting': '👋',
    'team_activation': '👥',
    'expertise_match': '🎯',
    'explicit_mention': '📌',
  };
  return emojiMap[intent] || '🔍';
};

// Helper: Format agent name
const formatAgentName = (agentId: string): string => {
  const nameMap: Record<string, string> = {
    'rahil': 'Rahil M. Harihar',
    'mathew': 'Mathew Jerry Meleth',
    'shreyas': 'Shreyas B Subramanya',
    'siddarth': 'Siddarth Bhave',
  };
  return nameMap[agentId] || agentId.charAt(0).toUpperCase() + agentId.slice(1);
};

// Helper: Get agent photo path
const getAgentPhoto = (agentId: string): string => {
  const photoMap: Record<string, string> = {
    'rahil': '/Rahil.jpeg',
    'mathew': '/Mathew.jpeg',
    'shreyas': '/Shreyas.jpeg',
    'siddarth': '/Siddarth.jpeg',
  };
  return photoMap[agentId] || '';
};

export const EVENT_VISUALIZATIONS: Record<string, EventVisualization> = {
  routing: {
    icon: '🤖',
    color: 'purple.400',
    bgGradient: 'linear(to-r, purple.900, purple.800)',
    getIcon: (_metadata) => (
      <Avatar
        size="full"
        name="AI Router"
        bg="purple.600"
        icon={<Text fontSize="2xl">🤖</Text>}
      />
    ),
    renderDetails: (metadata) => (
      <VStack align="stretch" spacing={2}>
        {/* Routing Model */}
        {metadata.routing_model && (
          <HStack spacing={2}>
            <Text fontSize="2xs" color="gray.500">Model:</Text>
            <Tag colorScheme="cyan" size="sm" fontFamily="mono">
              🤖 {metadata.routing_model.toUpperCase()}
            </Tag>
          </HStack>
        )}

        {/* Intent Badge */}
        {metadata.intent && (
          <HStack spacing={2}>
            <Text fontSize="2xs" color="gray.500">Intent:</Text>
            <Tag colorScheme="purple" size="sm">
              {getIntentEmoji(metadata.intent)} {metadata.intent?.replace('_', ' ').toUpperCase()}
            </Tag>
          </HStack>
        )}

        {/* Selected Agents */}
        {metadata.agents && metadata.agents.length > 0 && (
          <VStack align="stretch" spacing={1}>
            <Text fontSize="2xs" color="gray.500">Agents:</Text>
            <HStack spacing={1} flexWrap="wrap">
              {metadata.agents.map((agentId: string) => (
                <HStack key={agentId} bg="whiteAlpha.100" px={2} py={1} rounded="sm">
                  <Avatar name={formatAgentName(agentId)} size="2xs" />
                  <Text fontSize="xs" fontWeight="medium">{formatAgentName(agentId)}</Text>
                </HStack>
              ))}
            </HStack>
          </VStack>
        )}

        {/* Reasoning */}
        {metadata.reasoning && (
          <Box bg="whiteAlpha.50" p={2} rounded="sm" borderLeft="2px solid" borderColor="purple.400">
            <Text fontSize="xs" color="white" lineHeight="1.4">{metadata.reasoning}</Text>
          </Box>
        )}

        {/* Confidence */}
        {metadata.confidence !== undefined && (
          <HStack spacing={2} align="center">
            <Text fontSize="2xs" color="gray.500">Confidence:</Text>
            <Progress
              value={metadata.confidence * 100}
              colorScheme={metadata.confidence > 0.8 ? "green" : metadata.confidence > 0.5 ? "blue" : "yellow"}
              hasStripe
              isAnimated
              borderRadius="full"
              height="6px"
              flex={1}
            />
            <Text fontSize="2xs" color="gray.400">
              {(metadata.confidence * 100).toFixed(0)}%
            </Text>
          </HStack>
        )}

        {/* Query Preview */}
        {metadata.query_preview && (
          <Text fontSize="xs" color="gray.300" fontStyle="italic" noOfLines={2}>
            "{metadata.query_preview}"
          </Text>
        )}
      </VStack>
    ),
  },

  agent: {
    icon: '📨',
    color: 'blue.400',
    bgGradient: 'linear(to-r, blue.900, blue.800)',
    getIcon: (metadata) => (
      <Avatar
        size="full"
        name={metadata.agent_id ? formatAgentName(metadata.agent_id) : 'Agent'}
        src={metadata.agent_id ? getAgentPhoto(metadata.agent_id) : undefined}
      />
    ),
    renderDetails: (metadata) => (
      <VStack align="stretch" spacing={2}>
        {/* Agent Info */}
        {metadata.agent_id && (
          <HStack spacing={2}>
            <Avatar name={formatAgentName(metadata.agent_id)} size="sm" />
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" fontWeight="bold">{formatAgentName(metadata.agent_id)}</Text>
              <Text fontSize="2xs" color="gray.500">is responding...</Text>
            </VStack>
          </HStack>
        )}

        {/* Response Preview */}
        {metadata.response_preview && (
          <Box bg="whiteAlpha.50" p={2} rounded="sm" borderLeft="2px solid" borderColor="blue.400">
            <Text fontSize="xs" color="white" lineHeight="1.4" noOfLines={3}>
              {metadata.response_preview}
            </Text>
          </Box>
        )}

        {/* Queue Info */}
        {metadata.queue_remaining && metadata.queue_remaining.length > 0 && (
          <HStack spacing={2}>
            <Text fontSize="2xs" color="gray.500">Queue:</Text>
            <HStack spacing={1}>
              {metadata.queue_remaining.map((id: string) => (
                <Avatar key={id} name={formatAgentName(id)} size="2xs" />
              ))}
            </HStack>
            <Text fontSize="2xs" color="gray.400">({metadata.queue_remaining.length})</Text>
          </HStack>
        )}
      </VStack>
    ),
  },

  ai_model: {
    icon: '🧠',
    color: 'purple.300',
    bgGradient: 'linear(to-r, purple.800, pink.900)',
    getIcon: (metadata) => (
      <Avatar
        size="full"
        name={metadata.model || "AI Model"}
        bg="purple.700"
        icon={<Text fontSize="2xl">🧠</Text>}
      />
    ),
    renderDetails: (metadata) => (
      <VStack align="stretch" spacing={2}>
        {/* Model Info */}
        {metadata.model && (
          <HStack spacing={2} align="center">
            <Text fontSize="sm" fontWeight="bold">{metadata.model.toUpperCase()}</Text>
            {metadata.thinking && (
              <Badge colorScheme="purple" fontSize="2xs">Deep Thinking</Badge>
            )}
          </HStack>
        )}

        {/* Status */}
        <HStack spacing={2}>
          {metadata.thinking !== undefined && (
            <Tag colorScheme={metadata.thinking ? "purple" : "green"} size="sm">
              {metadata.thinking ? '🧠 Thinking...' : '✅ Complete'}
            </Tag>
          )}
          {metadata.response_length && (
            <Text fontSize="2xs" color="gray.500">
              {metadata.response_length} chars
            </Text>
          )}
        </HStack>

        {/* Status Text */}
        {metadata.model && (
          <Text fontSize="2xs" color="gray.500">
            {metadata.thinking
              ? 'Engaging extended reasoning mode...'
              : 'Generating response...'}
          </Text>
        )}
      </VStack>
    ),
  },

  processing: {
    icon: '⚙️',
    color: 'gray.400',
    bgGradient: 'linear(to-r, gray.800, gray.700)',
    getIcon: (_metadata) => (
      <Avatar
        size="full"
        name="System"
        bg="gray.600"
        icon={<Text fontSize="2xl">⚙️</Text>}
      />
    ),
    renderDetails: (metadata) => (
      <VStack align="stretch" spacing={2}>
        {/* Total Responses */}
        {metadata.total_responses && (
          <HStack spacing={2}>
            <Text fontSize="2xs" color="gray.500">Responses:</Text>
            <Text fontSize="sm" fontWeight="bold">{metadata.total_responses}</Text>
            {metadata.total_agents && (
              <Text fontSize="2xs" color="gray.400">from {metadata.total_agents} agents</Text>
            )}
          </HStack>
        )}

        {/* Agent IDs */}
        {metadata.agent_ids && metadata.agent_ids.length > 0 && (
          <HStack spacing={2}>
            <Text fontSize="2xs" color="gray.500">Agents:</Text>
            <HStack spacing={1}>
              {metadata.agent_ids.map((agentId: string) => (
                <Avatar key={agentId} name={formatAgentName(agentId)} size="2xs" />
              ))}
            </HStack>
          </HStack>
        )}

        {/* Mode */}
        {metadata.mode && (
          <Tag colorScheme="blue" size="sm">{metadata.mode.toUpperCase()} Mode</Tag>
        )}
      </VStack>
    ),
  },

  error: {
    icon: '❌',
    color: 'red.400',
    bgGradient: 'linear(to-r, red.900, red.800)',
    getIcon: (_metadata) => (
      <Avatar
        size="full"
        name="Error"
        bg="red.600"
        icon={<Text fontSize="2xl">⚠️</Text>}
      />
    ),
    renderDetails: (metadata) => (
      <VStack align="stretch" spacing={2}>
        {/* Error Message */}
        {metadata.error && (
          <Box bg="red.900" p={2} rounded="sm" borderLeft="2px solid" borderColor="red.400">
            <Text fontSize="xs" color="red.100" fontWeight="bold">
              {metadata.error}
            </Text>
          </Box>
        )}

        {/* Context */}
        {metadata.context && (
          <Text fontSize="xs" color="gray.300" noOfLines={2}>
            {metadata.context}
          </Text>
        )}

        {/* Affected Agent */}
        {metadata.affected_agent && (
          <HStack spacing={2}>
            <Text fontSize="2xs" color="gray.500">Agent:</Text>
            <Avatar name={formatAgentName(metadata.affected_agent)} size="2xs" />
            <Text fontSize="xs">{formatAgentName(metadata.affected_agent)}</Text>
          </HStack>
        )}
      </VStack>
    ),
  },
};

// Get visualization for a specific event category
export const getEventVisualization = (category: string): EventVisualization => {
  return EVENT_VISUALIZATIONS[category] || EVENT_VISUALIZATIONS.processing;
};

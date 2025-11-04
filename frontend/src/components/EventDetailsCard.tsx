/**
 * EventDetailsCard Component
 *
 * Beautiful, engaging visualization of event details
 * Replaces ugly JSON dumps with user-friendly cards
 */

import { motion } from 'framer-motion';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  HStack,
  VStack,
  Text,
  CloseButton,
  Badge,
} from '@chakra-ui/react';
import type { BackendLog } from '../hooks/useWebSocket';
import { getEventVisualization } from '../utils/eventVisualizations';

const MotionCard = motion(Card);

interface EventDetailsCardProps {
  event: BackendLog;
  onClose: () => void;
}

// Format timestamp to readable time
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const EventDetailsCard = ({ event, onClose }: EventDetailsCardProps) => {
  const visualization = getEventVisualization(event.category);

  // Get color scheme based on level
  const getLevelColor = (level: string): string => {
    const colorMap: Record<string, string> = {
      info: 'blue',
      success: 'green',
      warning: 'yellow',
      error: 'red',
      debug: 'gray',
    };
    return colorMap[level] || 'gray';
  };

  return (
    <Box position="relative">
      {/* Connection indicator arrow pointing up */}
      <Box
        position="absolute"
        top="-10px"
        left="50%"
        transform="translateX(-50%)"
        width="0"
        height="0"
        borderLeft="10px solid transparent"
        borderRight="10px solid transparent"
        borderBottom={`10px solid ${visualization.color}`}
        zIndex={1}
      />

      <MotionCard
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        bgGradient={visualization.bgGradient}
        borderWidth="2px"
        borderColor={visualization.color}
        borderLeftWidth="6px"  // Thick left border for connection
        borderLeftColor={visualization.color}
        shadow="2xl"
        p={0}
        overflow="hidden"
        position="relative"
      >
      {/* Header */}
      <CardHeader py={2} px={3}>
        <HStack justify="space-between" align="center">
          <HStack spacing={2} flex={1}>
            {/* Icon */}
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Text fontSize="xl">{visualization.icon}</Text>
            </motion.div>

            {/* Title and Metadata */}
            <VStack align="start" spacing={0.5} flex={1}>
              <Text fontSize="sm" fontWeight="bold" color="white" noOfLines={1}>
                {event.message}
              </Text>
              <HStack spacing={1.5}>
                <Badge colorScheme={getLevelColor(event.level)} fontSize="2xs">
                  {event.level.toUpperCase()}
                </Badge>
                <Badge colorScheme="purple" fontSize="2xs" variant="outline">
                  {event.category}
                </Badge>
                <Text fontSize="2xs" color="gray.500" fontFamily="mono">
                  {formatTime(event.timestamp)}
                </Text>
              </HStack>
            </VStack>
          </HStack>

          {/* Close Button */}
          <CloseButton
            size="xs"
            onClick={onClose}
            color="gray.400"
            _hover={{ color: 'white', bg: 'whiteAlpha.200' }}
          />
        </HStack>
      </CardHeader>

      {/* Body */}
      <CardBody py={2} px={3}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {visualization.renderDetails(event.metadata || {})}
        </motion.div>
      </CardBody>
    </MotionCard>
    </Box>
  );
};

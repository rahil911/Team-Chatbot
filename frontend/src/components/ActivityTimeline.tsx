import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  HStack,
  VStack,
  Text,
  IconButton,
  Badge,
  Flex,
  Spinner,
  Collapse,
  useDisclosure,
  Tooltip,
} from '@chakra-ui/react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  CloseIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@chakra-ui/icons';
import type { BackendLog } from '../hooks/useWebSocket';
import { EventDetailsCard } from './EventDetailsCard';
import { getEventVisualization } from '../utils/eventVisualizations';

// Framer Motion wrapper for Chakra components
const MotionBox = motion(Box);
const MotionFlex = motion(Flex);
const MotionVStack = motion(VStack);

interface ActivityTimelineProps {
  logs: BackendLog[];
  onClear: () => void;
}

// Smooth scroll helper
const smoothScrollTo = (container: HTMLDivElement | null, left: number) => {
  if (!container) return;
  container.scrollTo({
    left,
    behavior: 'smooth',
  });
};

export const ActivityTimeline = ({ logs, onClear }: ActivityTimelineProps) => {
  const [selectedEvent, setSelectedEvent] = useState<BackendLog | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { isOpen: isExpanded, onToggle } = useDisclosure({ defaultIsOpen: true });

  // Filter out infrastructure logs (connection, ping/pong, register_session)
  const aiLogs = logs.filter(log => {
    // Filter out connection category
    if (log.category === 'connection') return false;

    // Filter out ping/pong messages
    if (log.message?.includes('Ping sent') || log.message?.includes('Pong received')) return false;

    // Filter out register_session messages
    if (log.message?.includes('register_session') || log.message?.includes('Session registered')) return false;

    return true;
  });

  // Auto-scroll to latest event
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [aiLogs, autoScroll]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const newScrollLeft = scrollContainerRef.current.scrollLeft - 200;
      smoothScrollTo(scrollContainerRef.current, newScrollLeft);
      setAutoScroll(false);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const newScrollLeft = container.scrollLeft + 200;
      smoothScrollTo(container, newScrollLeft);

      // Check if scrolled to end
      if (newScrollLeft + container.clientWidth >= container.scrollWidth - 10) {
        setAutoScroll(true);
      }
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const renderEventMarker = (log: BackendLog, index: number) => {
    const visualization = getEventVisualization(log.category);
    const isThinking = log.metadata?.thinking === true;
    const isSelected = selectedEvent === log;

    return (
      <MotionVStack
        key={index}
        spacing={1}
        minW="120px"
        cursor="pointer"
        onClick={() => setSelectedEvent(isSelected ? null : log)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1,
          y: isSelected ? -10 : 0,  // Lift up when selected
          scale: isSelected ? 1.15 : 1  // Scale up when selected
        }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        {/* Event marker */}
        <MotionFlex
          w="56px"
          h="56px"
          rounded="full"
          bgGradient={isSelected
            ? `linear(to-r, ${visualization.color}, ${visualization.color}DD)`
            : visualization.bgGradient
          }
          borderWidth={isSelected ? "4px" : "3px"}
          borderColor={isSelected ? visualization.color : 'whiteAlpha.200'}
          align="center"
          justify="center"
          fontSize="24px"
          position="relative"
          boxShadow={isSelected ? `0 0 30px ${visualization.color}` : 'md'}
          animate={isThinking ? {
            scale: [1, 1.1, 1]
          } : isSelected ? {
            borderColor: [
              visualization.color,
              `${visualization.color}88`,
              visualization.color
            ]
          } : {}}
          transition={{
            repeat: isThinking ? Infinity : isSelected ? Infinity : 0,
            duration: isThinking ? 1.5 : 2
          }}
        >
          {isThinking ? (
            <Spinner size="md" color={visualization.color} thickness="3px" />
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 + index * 0.05, type: 'spring' }}
              style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {visualization.getIcon ? visualization.getIcon(log.metadata || {}) : <Text>{visualization.icon}</Text>}
            </motion.div>
          )}
          {log.level === 'success' && !isThinking && (
            <MotionBox
              position="absolute"
              bottom="-4px"
              right="-4px"
              bg="green.500"
              rounded="full"
              p="4px"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 + index * 0.05, type: 'spring' }}
            >
              <CheckCircleIcon w={4} h={4} color="white" />
            </MotionBox>
          )}
        </MotionFlex>

        {/* Time label */}
        <VStack spacing={0}>
          <Text fontSize="xs" color="gray.500" fontFamily="mono">
            {formatTime(log.timestamp)}
          </Text>
          <Badge size="xs" colorScheme={log.level === 'success' ? 'green' : log.level === 'error' ? 'red' : 'blue'} fontSize="9px">
            {log.category}
          </Badge>
        </VStack>

        {/* Event name preview with tooltip */}
        <Tooltip
          label={log.message}
          placement="top"
          hasArrow
          bg="gray.700"
          color="white"
          fontSize="xs"
          maxW="300px"
          openDelay={300}
        >
          <Text
            fontSize="2xs"
            color="gray.400"
            textAlign="center"
            maxW="120px"
            noOfLines={2}
            fontWeight="medium"
            cursor="help"
            _hover={{ color: "gray.300" }}
          >
            {log.message}
          </Text>
        </Tooltip>
      </MotionVStack>
    );
  };

  // If no logs and collapsed, just show floating button
  // Don't return null - we want to keep the floating button available
  if (aiLogs.length === 0 && !isExpanded) {
    return (
      <AnimatePresence>
        <MotionBox
          position="fixed"
          bottom="20px"
          right="20px"
          zIndex={1000}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <IconButton
              aria-label="Show timeline"
              icon={<ChevronUpIcon boxSize={6} />}
              onClick={onToggle}
              colorScheme="purple"
              size="lg"
              isRound
              boxShadow="2xl"
              _hover={{ transform: 'scale(1.1)' }}
              transition="all 0.2s"
            />
          </motion.div>
          <Badge
            position="absolute"
            top="-8px"
            right="-8px"
            colorScheme="gray"
            rounded="full"
            fontSize="xs"
            px={2}
          >
            0
          </Badge>
        </MotionBox>
      </AnimatePresence>
    );
  }

  // If no logs but expanded, show empty state
  if (aiLogs.length === 0) return null;

  return (
    <Box
      borderTop="1px"
      borderColor="whiteAlpha.100"
      bg="gray.900"
    >
      {/* Header */}
      <HStack px={4} py={2} borderBottom={isExpanded ? "1px" : "none"} borderColor="whiteAlpha.100" justify="space-between">
        <HStack spacing={2}>
          <Text fontSize="xs" fontWeight="bold" color="white">
            Activity Timeline
          </Text>
          <Badge colorScheme="purple" fontSize="2xs">
            {aiLogs.length} events
          </Badge>
        </HStack>

        <HStack spacing={2}>
          <Badge
            colorScheme={autoScroll ? 'green' : 'gray'}
            fontSize="2xs"
            cursor="pointer"
            onClick={() => setAutoScroll(!autoScroll)}
          >
            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
          </Badge>
          <IconButton
            aria-label="Scroll left"
            icon={<ChevronLeftIcon />}
            size="xs"
            variant="ghost"
            onClick={scrollLeft}
          />
          <IconButton
            aria-label="Scroll right"
            icon={<ChevronRightIcon />}
            size="xs"
            variant="ghost"
            onClick={scrollRight}
          />
          <IconButton
            aria-label="Clear timeline"
            icon={<CloseIcon />}
            size="xs"
            variant="ghost"
            onClick={onClear}
          />
          <IconButton
            aria-label={isExpanded ? "Collapse timeline" : "Expand timeline"}
            icon={isExpanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
            size="xs"
            variant="ghost"
            onClick={onToggle}
            colorScheme={isExpanded ? "gray" : "purple"}
          />
        </HStack>
      </HStack>

      <Collapse in={isExpanded} animateOpacity>
        {/* Timeline track */}
        <Box
          ref={scrollContainerRef}
          overflowX="auto"
          overflowY="hidden"
          py={4}
          px={4}
          css={{
            '&::-webkit-scrollbar': {
              height: '6px',
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
          <HStack spacing={4} align="start" minH="120px">
            {/* Starting line */}
            <Box h="48px" w="2px" bg="whiteAlpha.200" alignSelf="start" mt="24px" />

            {aiLogs.map((log, index) => (
              <>
                {renderEventMarker(log, index)}
                {/* Connecting line */}
                {index < aiLogs.length - 1 && (
                  <Box h="2px" w="40px" bg="whiteAlpha.200" alignSelf="center" mt="-40px" />
                )}
              </>
            ))}

            {/* Ending line */}
            <Box h="48px" w="2px" bg="whiteAlpha.200" alignSelf="start" mt="24px" />
          </HStack>
        </Box>

        {/* Event details panel */}
        <AnimatePresence>
          {selectedEvent && (
            <Box p={4} bg="transparent">
              <EventDetailsCard
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
              />
            </Box>
          )}
        </AnimatePresence>
      </Collapse>

      {/* Floating Action Button - Appears when timeline is collapsed */}
      <AnimatePresence>
        {!isExpanded && aiLogs.length > 0 && (
          <MotionBox
            position="fixed"
            bottom="20px"
            right="20px"
            zIndex={1000}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <IconButton
                aria-label="Show timeline"
                icon={<ChevronUpIcon boxSize={6} />}
                onClick={onToggle}
                colorScheme="purple"
                size="lg"
                isRound
                boxShadow="2xl"
                _hover={{ transform: 'scale(1.1)' }}
                transition="all 0.2s"
              />
            </motion.div>
            <Badge
              position="absolute"
              top="-8px"
              right="-8px"
              colorScheme="red"
              rounded="full"
              fontSize="xs"
              px={2}
            >
              {aiLogs.length}
            </Badge>
          </MotionBox>
        )}
      </AnimatePresence>
    </Box>
  );
};

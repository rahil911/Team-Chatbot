import { useState, useRef, useEffect, useMemo } from 'react';
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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Progress,
  CircularProgress,
  CircularProgressLabel,
  Switch,
  FormControl,
  FormLabel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepTitle,
  StepDescription,
  StepSeparator,
  Button,
} from '@chakra-ui/react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  CloseIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  SmallCloseIcon,
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

const CATEGORY_COLORS: Record<string, string> = {
  processing: 'orange',
  routing: 'purple',
  knowledge_graph: 'cyan',
  agent: 'pink',
  model: 'blue',
  ai_model: 'blue',
  think_tank: 'teal',
  mention: 'yellow',
  research: 'green',
  error: 'red',
};

const prettyCategory = (category: string) =>
  category
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const noiseMatchers = [/heartbeat/i, /ping/i, /status check/i, /keepalive/i, /poll/i];

const extractNodeLabels = (metadata: unknown): string[] => {
  if (!metadata || typeof metadata !== 'object') return [];
  const record = metadata as Record<string, unknown>;

  const collectFromValue = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.flatMap(item => collectFromValue(item));
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return [String(value)];
    }
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      const candidate = obj.label || obj.name || obj.title || obj.id || obj.key;
      if (candidate) {
        return [String(candidate)];
      }
      if (obj.path && Array.isArray(obj.path)) {
        return collectFromValue(obj.path);
      }
    }
    return [];
  };

  const candidateKeys = [
    'nodes',
    'node_ids',
    'nodeIds',
    'nodeNames',
    'highlighted_nodes',
    'highlights',
    'focus_nodes',
    'path',
    'visited_nodes',
  ];

  const collected = candidateKeys.flatMap(key => collectFromValue(record[key]));

  return Array.from(new Set(collected)).filter(Boolean);
};

export const ActivityTimeline = ({ logs, onClear }: ActivityTimelineProps) => {
  const [selectedEvent, setSelectedEvent] = useState<BackendLog | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hideVerbose, setHideVerbose] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { isOpen: isExpanded, onToggle } = useDisclosure({ defaultIsOpen: true });

  const aiLogs = useMemo(() => logs.filter(log => log.category !== 'connection'), [logs]);

  const categoryCounts = useMemo(() => {
    return aiLogs.reduce<Record<string, number>>((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {});
  }, [aiLogs]);

  const allCategories = useMemo(() => Object.keys(categoryCounts), [categoryCounts]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => allCategories);

  useEffect(() => {
    setSelectedCategories(prev => {
      const filteredPrev = prev.filter(cat => allCategories.includes(cat));
      const missing = allCategories.filter(cat => !filteredPrev.includes(cat));
      if (missing.length === 0 && filteredPrev.length === prev.length) {
        return prev;
      }
      return [...filteredPrev, ...missing];
    });
  }, [allCategories]);

  const visibleLogs = useMemo(() => {
    return aiLogs.filter(log => {
      if (!selectedCategories.includes(log.category)) return false;
      if (!hideVerbose) return true;
      if (log.level === 'debug') return false;
      const message = log.message.toLowerCase();
      if (noiseMatchers.some(pattern => pattern.test(message))) return false;
      return true;
    });
  }, [aiLogs, hideVerbose, selectedCategories]);

  useEffect(() => {
    if (selectedEvent && !visibleLogs.includes(selectedEvent)) {
      setSelectedEvent(null);
    }
  }, [visibleLogs, selectedEvent]);

  const knowledgeEvents = useMemo(
    () => visibleLogs.filter(log => log.category === 'knowledge_graph'),
    [visibleLogs]
  );

  const knowledgeNodes = useMemo(() => {
    return Array.from(
      new Set(
        knowledgeEvents.flatMap(event => extractNodeLabels(event.metadata)).filter(Boolean)
      )
    );
  }, [knowledgeEvents]);

  const averageKnowledgeLatency = useMemo(() => {
    if (knowledgeEvents.length === 0) return 0;
    const total = knowledgeEvents.reduce((sum, log) => sum + (log.duration_ms || 0), 0);
    return Math.round(total / knowledgeEvents.length);
  }, [knowledgeEvents]);

  const stageConfig = useMemo(
    () => [
      {
        id: 'processing',
        label: 'Signal Intake',
        description: 'Capturing the user prompt and preparing context',
        categories: ['processing'],
      },
      {
        id: 'routing',
        label: 'Routing',
        description: 'Selecting agents, strategies, and pathways',
        categories: ['routing', 'think_tank'],
      },
      {
        id: 'knowledge',
        label: 'Knowledge Graph',
        description: 'Querying and lighting up knowledge nodes',
        categories: ['knowledge_graph'],
      },
      {
        id: 'model',
        label: 'Model Reasoning',
        description: 'LLM and AI model processing',
        categories: ['model', 'ai_model'],
      },
      {
        id: 'delivery',
        label: 'Response Delivery',
        description: 'Synthesizing and delivering the answer',
        categories: ['agent', 'mention'],
      },
    ],
    []
  );

  const stageSnapshots = useMemo(() => {
    return stageConfig.map(stage => {
      const stageLogs = visibleLogs.filter(log => stage.categories.includes(log.category));
      const latest = stageLogs[stageLogs.length - 1] ?? null;
      const hasError = stageLogs.some(log => log.level === 'error');
      const isComplete = stageLogs.some(log => log.level === 'success');

      const status: 'idle' | 'active' | 'complete' | 'error' = stageLogs.length === 0
        ? 'idle'
        : hasError
          ? 'error'
          : isComplete
            ? 'complete'
            : 'active';

      return {
        ...stage,
        logs: stageLogs,
        latest,
        status,
      };
    });
  }, [stageConfig, visibleLogs]);

  const completedCount = useMemo(
    () => stageSnapshots.filter(stage => stage.status === 'complete').length,
    [stageSnapshots]
  );

  const processProgress = stageSnapshots.length
    ? Math.round((completedCount / stageSnapshots.length) * 100)
    : 0;

  const activeStageIndex = useMemo(() => {
    const activeIndex = stageSnapshots.findIndex(stage => stage.status === 'active');
    if (activeIndex >= 0) {
      return activeIndex;
    }
    let lastComplete = -1;
    stageSnapshots.forEach((stage, index) => {
      if (stage.status === 'complete') {
        lastComplete = index;
      }
    });
    if (lastComplete >= 0) {
      return lastComplete;
    }
    return 0;
  }, [stageSnapshots]);

  useEffect(() => {
    if (autoScroll && activeTab === 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
    }
  }, [visibleLogs, autoScroll, activeTab]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const newScrollLeft = scrollContainerRef.current.scrollLeft - 220;
      smoothScrollTo(scrollContainerRef.current, newScrollLeft);
      setAutoScroll(false);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const newScrollLeft = container.scrollLeft + 220;
      smoothScrollTo(container, newScrollLeft);

      if (newScrollLeft + container.clientWidth >= container.scrollWidth - 10) {
        setAutoScroll(true);
      }
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const renderEventMarker = (log: BackendLog, index: number) => {
    const visualization = getEventVisualization(log.category);
    const isThinking = log.metadata?.thinking === true;
    const isSelected = selectedEvent === log;

    return (
      <MotionVStack
        key={`${log.timestamp}-${index}`}
        spacing={1}
        minW="112px"
        cursor="pointer"
        onClick={() => setSelectedEvent(isSelected ? null : log)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{
          opacity: 1,
          y: isSelected ? -12 : 0,
          scale: isSelected ? 1.12 : 1,
        }}
        transition={{ duration: 0.3, delay: index * 0.03 }}
      >
        <MotionFlex
          w="56px"
          h="56px"
          rounded="full"
          bgGradient={isSelected
            ? `linear(to-r, ${visualization.color}, ${visualization.color}DD)`
            : visualization.bgGradient}
          borderWidth={isSelected ? '4px' : '3px'}
          borderColor={isSelected ? visualization.color : 'whiteAlpha.200'}
          align="center"
          justify="center"
          fontSize="24px"
          position="relative"
          boxShadow={isSelected ? `0 0 30px ${visualization.color}` : 'md'}
          animate={isThinking
            ? {
                scale: [1, 1.1, 1],
              }
            : isSelected
              ? {
                  borderColor: [
                    visualization.color,
                    `${visualization.color}88`,
                    visualization.color,
                  ],
                }
              : {}}
          transition={{
            repeat: isThinking ? Infinity : isSelected ? Infinity : 0,
            duration: isThinking ? 1.5 : 2,
          }}
        >
          {isThinking ? (
            <Spinner size="md" color={visualization.color} thickness="3px" />
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15 + index * 0.03, type: 'spring' }}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {visualization.getIcon
                ? visualization.getIcon(log.metadata || {})
                : <Text>{visualization.icon}</Text>}
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
              transition={{ delay: 0.3 + index * 0.03, type: 'spring' }}
            >
              <CheckCircleIcon w={4} h={4} color="white" />
            </MotionBox>
          )}
        </MotionFlex>

        <VStack spacing={0} maxW="100%">
          <Text fontSize="xs" color="gray.500" fontFamily="mono" noOfLines={1}>
            {formatTime(log.timestamp)}
          </Text>
          <Badge
            size="xs"
            colorScheme={CATEGORY_COLORS[log.category] || 'gray'}
            fontSize="9px"
          >
            {prettyCategory(log.category)}
          </Badge>
        </VStack>

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
            maxW="112px"
            noOfLines={2}
            fontWeight="medium"
            cursor="help"
            _hover={{ color: 'gray.300' }}
          >
            {log.message}
          </Text>
        </Tooltip>
      </MotionVStack>
    );
  };

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
              aria-label="Show observability"
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

  if (aiLogs.length === 0) return null;

  return (
    <Box borderTop="1px" borderColor="whiteAlpha.100" bg="gray.900">
      <Flex
        px={4}
        py={3}
        borderBottom={isExpanded ? '1px' : 'none'}
        borderColor="whiteAlpha.100"
        align="center"
        justify="space-between"
      >
        <VStack align="start" spacing={1}>
          <HStack spacing={3} align="center">
            <Text fontSize="sm" fontWeight="bold" color="white">
              Observability Control Room
            </Text>
            <Badge colorScheme="purple" fontSize="2xs" px={2} py={0.5} rounded="full">
              {visibleLogs.length}/{aiLogs.length} visible signals
            </Badge>
            {knowledgeEvents.length > 0 && (
              <Tooltip label="Knowledge graph lookups in this conversation" placement="top">
                <Badge colorScheme="cyan" fontSize="2xs" px={2} py={0.5} rounded="full">
                  {knowledgeEvents.length} graph pulses
                </Badge>
              </Tooltip>
            )}
          </HStack>
          <Text fontSize="xs" color="gray.400">
            Triage routing, reasoning, and knowledge graph activity without the noise.
          </Text>
        </VStack>

        <HStack spacing={3} align="center">
          <FormControl display="flex" alignItems="center" gap={2} w="auto">
            <FormLabel htmlFor="hide-verbose" mb="0" fontSize="xs" color="gray.300">
              Hide noise
            </FormLabel>
            <Switch
              id="hide-verbose"
              size="sm"
              colorScheme="purple"
              isChecked={hideVerbose}
              onChange={event => setHideVerbose(event.target.checked)}
            />
          </FormControl>

          <FormControl display="flex" alignItems="center" gap={2} w="auto">
            <FormLabel htmlFor="auto-scroll" mb="0" fontSize="xs" color="gray.300">
              Auto-scroll
            </FormLabel>
            <Switch
              id="auto-scroll"
              size="sm"
              colorScheme="purple"
              isChecked={autoScroll}
              onChange={event => setAutoScroll(event.target.checked)}
            />
          </FormControl>

          {activeTab === 0 && (
            <HStack spacing={1}>
              <Tooltip label="Scroll left" placement="top">
                <IconButton
                  aria-label="Scroll left"
                  icon={<ChevronLeftIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={scrollLeft}
                />
              </Tooltip>
              <Tooltip label="Scroll right" placement="top">
                <IconButton
                  aria-label="Scroll right"
                  icon={<ChevronRightIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={scrollRight}
                />
              </Tooltip>
            </HStack>
          )}

          <Tooltip label="Clear observability signals" placement="top">
            <IconButton
              aria-label="Clear timeline"
              icon={<CloseIcon />}
              size="sm"
              variant="ghost"
              onClick={onClear}
            />
          </Tooltip>

          <Tooltip
            label={isExpanded ? 'Collapse observability panel' : 'Expand observability panel'}
            placement="top"
          >
            <IconButton
              aria-label={isExpanded ? 'Collapse observability panel' : 'Expand observability panel'}
              icon={isExpanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
              size="sm"
              variant="ghost"
              onClick={onToggle}
              colorScheme={isExpanded ? 'gray' : 'purple'}
            />
          </Tooltip>
        </HStack>
      </Flex>

      <Collapse in={isExpanded} animateOpacity>
        <VStack align="stretch" spacing={0}>
          <Wrap spacing={2} px={4} py={3}>
            {allCategories.map(category => {
              const isActive = selectedCategories.includes(category);
              const colorScheme = CATEGORY_COLORS[category] || 'gray';
              return (
                <WrapItem key={category}>
                  <Tooltip
                    label={isActive ? 'Click to temporarily mute this channel' : 'Click to surface this channel'}
                    placement="top"
                  >
                    <Tag
                      size="lg"
                      variant={isActive ? 'solid' : 'subtle'}
                      colorScheme={colorScheme}
                      cursor="pointer"
                      onClick={() => {
                        setSelectedCategories(prev => {
                          if (isActive) {
                            return prev.filter(cat => cat !== category);
                          }
                          return [...prev, category];
                        });
                      }}
                    >
                      <HStack spacing={2}>
                        <TagLabel fontWeight="semibold">{prettyCategory(category)}</TagLabel>
                        <Badge
                          variant={isActive ? 'subtle' : 'solid'}
                          colorScheme="blackAlpha"
                          fontSize="2xs"
                          rounded="full"
                          px={2}
                        >
                          {categoryCounts[category] ?? 0}
                        </Badge>
                        {!isActive && <SmallCloseIcon boxSize={3} color="gray.400" />}
                      </HStack>
                    </Tag>
                  </Tooltip>
                </WrapItem>
              );
            })}
            {selectedCategories.length === 0 && (
              <WrapItem>
                <Button
                  size="sm"
                  variant="ghost"
                  colorScheme="purple"
                  onClick={() => setSelectedCategories(allCategories)}
                >
                  Restore channels
                </Button>
              </WrapItem>
            )}
          </Wrap>

          <Divider borderColor="whiteAlpha.100" />

          <Tabs
            index={activeTab}
            onChange={setActiveTab}
            variant="enclosed-colored"
            colorScheme="purple"
            isLazy
          >
            <TabList px={4} pt={3}>
              <Tab fontWeight="semibold">Signal Stream</Tab>
              <Tab fontWeight="semibold">Process Map</Tab>
              <Tab fontWeight="semibold">Knowledge Pulse</Tab>
            </TabList>

            <TabPanels>
              <TabPanel px={4} pb={6}>
                {visibleLogs.length === 0 ? (
                  <VStack spacing={4} py={10} textAlign="center">
                    <Text fontSize="md" fontWeight="semibold" color="white">
                      The console is quiet.
                    </Text>
                    <Text fontSize="sm" color="gray.400">
                      Your current noise filters are hiding every signal. Bring channels back when you
                      want a deeper dive.
                    </Text>
                    <Button
                      size="sm"
                      colorScheme="purple"
                      onClick={() => {
                        setHideVerbose(false);
                        setSelectedCategories(allCategories);
                      }}
                    >
                      Show all activity
                    </Button>
                  </VStack>
                ) : (
                  <Box
                    ref={scrollContainerRef}
                    overflowX="auto"
                    overflowY="hidden"
                    py={4}
                    px={2}
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
                    <HStack spacing={6} align="start" minH="140px" position="relative">
                      <Box
                        position="absolute"
                        top="40%"
                        left={0}
                        right={0}
                        height="2px"
                        bgGradient="linear(to-r, whiteAlpha.200, whiteAlpha.50, whiteAlpha.200)"
                        zIndex={0}
                      />

                      {visibleLogs.map((log, index) => (
                        <Box key={`${log.timestamp}-${index}-wrapper`} position="relative" zIndex={1}>
                          {renderEventMarker(log, index)}
                        </Box>
                      ))}
                    </HStack>
                  </Box>
                )}

                <AnimatePresence>
                  {selectedEvent && (
                    <Box p={4} bg="transparent">
                      <EventDetailsCard event={selectedEvent} onClose={() => setSelectedEvent(null)} />
                    </Box>
                  )}
                </AnimatePresence>
              </TabPanel>

              <TabPanel px={4} pb={6}>
                <VStack align="stretch" spacing={4}>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <Stat bg="whiteAlpha.50" p={4} rounded="lg" border="1px" borderColor="whiteAlpha.200">
                      <StatLabel color="gray.300">Pipeline completion</StatLabel>
                      <StatNumber color="white">{processProgress}%</StatNumber>
                      <StatHelpText color="gray.400">
                        {completedCount} of {stageSnapshots.length} stages have wrapped
                      </StatHelpText>
                      <Progress
                        value={processProgress}
                        colorScheme="purple"
                        size="sm"
                        mt={3}
                        rounded="full"
                      />
                    </Stat>
                    <Stat bg="whiteAlpha.50" p={4} rounded="lg" border="1px" borderColor="whiteAlpha.200">
                      <StatLabel color="gray.300">Active channels</StatLabel>
                      <StatNumber color="white">{selectedCategories.length}</StatNumber>
                      <StatHelpText color="gray.400">
                        {selectedCategories.length === allCategories.length
                          ? 'Every channel is visible'
                          : 'Muted channels are tucked away'}
                      </StatHelpText>
                    </Stat>
                    <Stat bg="whiteAlpha.50" p={4} rounded="lg" border="1px" borderColor="whiteAlpha.200">
                      <StatLabel color="gray.300">Knowledge sync</StatLabel>
                      <HStack align="center" spacing={4} mt={2}>
                        <CircularProgress
                          value={knowledgeEvents.length === 0 ? 0 : (knowledgeEvents.length / visibleLogs.length) * 100}
                          color="cyan.300"
                          trackColor="whiteAlpha.200"
                          size="64px"
                          thickness="10px"
                        >
                          <CircularProgressLabel color="white" fontSize="sm">
                            {knowledgeEvents.length}
                          </CircularProgressLabel>
                        </CircularProgress>
                        <VStack align="start" spacing={1}>
                          <Text fontSize="lg" color="white">
                            {knowledgeEvents.length} pulses
                          </Text>
                          <Text fontSize="xs" color="gray.400">
                            {knowledgeNodes.length} unique nodes highlighted
                          </Text>
                          <Text fontSize="xs" color="gray.400">
                            Avg latency {averageKnowledgeLatency || '—'} ms
                          </Text>
                        </VStack>
                      </HStack>
                    </Stat>
                  </SimpleGrid>

                  <Box bg="whiteAlpha.50" p={4} rounded="lg" border="1px" borderColor="whiteAlpha.200">
                    <Stepper index={activeStageIndex} size="md" colorScheme="purple">
                      {stageSnapshots.map((stage, index) => (
                        <Step key={stage.id}>
                          <StepIndicator
                            bg={
                              stage.status === 'complete'
                                ? 'purple.500'
                                : stage.status === 'error'
                                  ? 'red.500'
                                  : stage.status === 'active'
                                    ? 'cyan.400'
                                    : 'gray.600'
                            }
                            borderColor="transparent"
                            color="white"
                          >
                            <StepStatus
                              complete={<CheckCircleIcon />}
                              incomplete={<Text fontSize="sm">{index + 1}</Text>}
                              active={<Text fontSize="sm">{index + 1}</Text>}
                            />
                          </StepIndicator>

                          <Box flexShrink={0} minW={{ base: '160px', md: '200px' }}>
                            <StepTitle color="white" fontWeight="semibold">
                              {stage.label}
                            </StepTitle>
                            <StepDescription color="gray.300" fontSize="xs">
                              {stage.description}
                            </StepDescription>
                            <HStack spacing={2} mt={2} align="center">
                              <Badge
                                colorScheme={
                                  stage.status === 'complete'
                                    ? 'purple'
                                    : stage.status === 'error'
                                      ? 'red'
                                      : stage.status === 'active'
                                        ? 'cyan'
                                        : 'gray'
                                }
                              >
                                {stage.status === 'complete'
                                  ? 'Complete'
                                  : stage.status === 'error'
                                    ? 'Attention'
                                    : stage.status === 'active'
                                      ? 'In flight'
                                      : 'Waiting'}
                              </Badge>
                              <Badge variant="outline" colorScheme="gray">
                                {stage.logs.length} events
                              </Badge>
                            </HStack>
                            {stage.latest && (
                              <Tooltip label={stage.latest.message} placement="top">
                                <Text fontSize="xs" color="gray.400" mt={2} noOfLines={2}>
                                  Latest · {stage.latest.message}
                                </Text>
                              </Tooltip>
                            )}
                          </Box>
                          <StepSeparator />
                        </Step>
                      ))}
                    </Stepper>
                  </Box>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {stageSnapshots.map(stage => (
                      <Box
                        key={`${stage.id}-panel`}
                        p={4}
                        rounded="lg"
                        border="1px"
                        borderColor="whiteAlpha.200"
                        bg="whiteAlpha.50"
                      >
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="semibold" color="white">
                              {stage.label}
                            </Text>
                            <Text fontSize="sm" color="gray.300">
                              {stage.description}
                            </Text>
                          </VStack>
                          <Badge
                            colorScheme={
                              stage.status === 'complete'
                                ? 'purple'
                                : stage.status === 'error'
                                  ? 'red'
                                  : stage.status === 'active'
                                    ? 'cyan'
                                    : 'gray'
                            }
                          >
                            {stage.status === 'complete'
                              ? 'Complete'
                              : stage.status === 'error'
                                ? 'Attention'
                                : stage.status === 'active'
                                  ? 'In flight'
                                  : 'Waiting'}
                          </Badge>
                        </HStack>
                        <Divider my={3} borderColor="whiteAlpha.200" />
                        <VStack align="stretch" spacing={2}>
                          {stage.logs.slice(-3).map(log => (
                            <Flex
                              key={`${log.timestamp}-${log.category}`}
                              align="center"
                              justify="space-between"
                              p={2}
                              rounded="md"
                              bg="blackAlpha.300"
                              _hover={{ bg: 'blackAlpha.400', cursor: 'pointer' }}
                              onClick={() => {
                                setSelectedEvent(log);
                                setActiveTab(0);
                              }}
                            >
                              <Text fontSize="xs" color="gray.200" noOfLines={1} pr={4}>
                                {log.message}
                              </Text>
                              <Badge colorScheme={CATEGORY_COLORS[log.category] || 'gray'} fontSize="2xs">
                                {formatTime(log.timestamp)}
                              </Badge>
                            </Flex>
                          ))}
                          {stage.logs.length === 0 && (
                            <Text fontSize="xs" color="gray.500">
                              No signals captured yet.
                            </Text>
                          )}
                        </VStack>
                      </Box>
                    ))}
                  </SimpleGrid>
                </VStack>
              </TabPanel>

              <TabPanel px={4} pb={6}>
                <VStack align="stretch" spacing={4}>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <Stat bg="whiteAlpha.50" p={4} rounded="lg" border="1px" borderColor="whiteAlpha.200">
                      <StatLabel color="gray.300">Graph pulses</StatLabel>
                      <StatNumber color="white">{knowledgeEvents.length}</StatNumber>
                      <StatHelpText color="gray.400">
                        Avg latency {averageKnowledgeLatency || '—'} ms
                      </StatHelpText>
                    </Stat>
                    <Stat bg="whiteAlpha.50" p={4} rounded="lg" border="1px" borderColor="whiteAlpha.200">
                      <StatLabel color="gray.300">Unique nodes</StatLabel>
                      <StatNumber color="white">{knowledgeNodes.length}</StatNumber>
                      <StatHelpText color="gray.400">
                        Highlights from this conversation
                      </StatHelpText>
                    </Stat>
                    <Stat bg="whiteAlpha.50" p={4} rounded="lg" border="1px" borderColor="whiteAlpha.200">
                      <StatLabel color="gray.300">Knowledge coverage</StatLabel>
                      <StatNumber color="white">
                        {visibleLogs.length === 0
                          ? '0%'
                          : `${Math.round((knowledgeEvents.length / visibleLogs.length) * 100)}%`}
                      </StatNumber>
                      <StatHelpText color="gray.400">
                        Share of signals touching the graph
                      </StatHelpText>
                    </Stat>
                  </SimpleGrid>

                  <Box>
                    <Text fontSize="sm" color="gray.300" fontWeight="semibold" mb={2}>
                      Nodes lighting up
                    </Text>
                    {knowledgeNodes.length === 0 ? (
                      <Text fontSize="sm" color="gray.500">
                        No knowledge graph activity captured yet. When it happens, you will see the
                        nodes glow here.
                      </Text>
                    ) : (
                      <Wrap spacing={2}>
                        {knowledgeNodes.map(node => (
                          <WrapItem key={node}>
                            <Tag size="lg" variant="subtle" colorScheme="cyan" px={3} py={2} rounded="full">
                              <TagLabel fontWeight="medium">{node}</TagLabel>
                            </Tag>
                          </WrapItem>
                        ))}
                      </Wrap>
                    )}
                  </Box>

                  <Accordion allowMultiple>
                    {knowledgeEvents.map(event => {
                      const nodes = extractNodeLabels(event.metadata);
                      const query = event.metadata?.query || event.message;
                      const dataset = event.metadata?.dataset || event.metadata?.graph;
                      return (
                        <AccordionItem key={`${event.timestamp}-knowledge`} border="none">
                          <AccordionButton
                            _expanded={{ bg: 'whiteAlpha.100' }}
                            px={4}
                            py={3}
                            rounded="md"
                          >
                            <HStack flex="1" textAlign="left" spacing={3} align="center">
                              <Badge colorScheme="cyan">Pulse</Badge>
                              <VStack align="start" spacing={0}>
                                <Text fontSize="sm" fontWeight="semibold" color="white" noOfLines={1}>
                                  {query}
                                </Text>
                                <Text fontSize="xs" color="gray.400">
                                  {dataset ? `Graph: ${dataset}` : 'Knowledge graph query'}
                                </Text>
                              </VStack>
                              <Badge variant="outline" colorScheme="gray">
                                {formatTime(event.timestamp)}
                              </Badge>
                            </HStack>
                            <AccordionIcon />
                          </AccordionButton>
                          <AccordionPanel px={4} pb={4}>
                            <VStack align="stretch" spacing={3}>
                              <Text fontSize="sm" color="gray.300" fontWeight="medium">
                                Nodes touched
                              </Text>
                              {nodes.length === 0 ? (
                                <Text fontSize="xs" color="gray.500">
                                  Metadata did not specify node details.
                                </Text>
                              ) : (
                                <Wrap spacing={2}>
                                  {nodes.map(node => (
                                    <WrapItem key={`${event.timestamp}-${node}`}>
                                      <Tag size="md" variant="subtle" colorScheme="cyan" px={2} py={1} rounded="full">
                                        <TagLabel fontWeight="medium">{node}</TagLabel>
                                      </Tag>
                                    </WrapItem>
                                  ))}
                                </Wrap>
                              )}
                              {Array.isArray(event.metadata?.path) && event.metadata.path.length > 0 && (
                                <Box bg="blackAlpha.300" p={3} rounded="md">
                                  <Text fontSize="xs" color="gray.400">
                                    Path
                                  </Text>
                                  <Text fontSize="sm" color="white" mt={1}>
                                    {event.metadata.path.map((segment: unknown) => String(segment)).join(' → ')}
                                  </Text>
                                </Box>
                              )}
                              <HStack justify="space-between" align="center">
                                <Text fontSize="xs" color="gray.500">
                                  Duration {event.duration_ms ? `${event.duration_ms} ms` : '—'}
                                </Text>
                                <Button
                                  size="xs"
                                  colorScheme="purple"
                                  variant="outline"
                                  rightIcon={<ChevronRightIcon />}
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setActiveTab(0);
                                    if (!isExpanded) {
                                      onToggle();
                                    }
                                  }}
                                >
                                  Jump to signal
                                </Button>
                              </HStack>
                            </VStack>
                          </AccordionPanel>
                        </AccordionItem>
                      );
                    })}
                    {knowledgeEvents.length === 0 && (
                      <AccordionItem border="none">
                        <AccordionButton px={4} py={3} rounded="md" _hover={{ bg: 'whiteAlpha.100' }}>
                          <Text fontSize="sm" color="gray.500" flex="1" textAlign="left">
                            No knowledge graph signals yet.
                          </Text>
                        </AccordionButton>
                      </AccordionItem>
                    )}
                  </Accordion>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Collapse>

      <AnimatePresence>
        {!isExpanded && visibleLogs.length > 0 && (
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
                aria-label="Show observability"
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
              {visibleLogs.length}
            </Badge>
          </MotionBox>
        )}
      </AnimatePresence>
    </Box>
  );
};

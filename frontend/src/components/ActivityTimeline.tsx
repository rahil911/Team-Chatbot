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
  Collapse,
  useDisclosure,
  Tooltip,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Wrap,
  WrapItem,
  Tag,
  Circle,
  Progress,
  Avatar,
  Stack,
  Switch,
  Menu,
  MenuButton,
  MenuList,
  MenuOptionGroup,
  MenuItemOption,
  Button,
  ButtonGroup,
  Grid,
  GridItem,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  CloseIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TimeIcon,
  RepeatIcon,
  SearchIcon,
  ViewIcon,
  SmallAddIcon,
  StarIcon,
} from '@chakra-ui/icons';
import type { BackendLog } from '../hooks/useWebSocket';
import { EventDetailsCard } from './EventDetailsCard';
import { getEventVisualization } from '../utils/eventVisualizations';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

interface ActivityTimelineProps {
  logs: BackendLog[];
  onClear: () => void;
}

type ProcessStage = {
  id: string;
  label: string;
  description: string;
  icon: typeof TimeIcon;
  categories: BackendLog['category'][];
  keywords?: string[];
};

const STAGES: ProcessStage[] = [
  {
    id: 'ingest',
    label: 'Signal Ingest',
    description: 'Capturing the user intent and warming up models',
    icon: TimeIcon,
    categories: ['processing', 'model'],
    keywords: ['ingest', 'transcribe', 'warm'],
  },
  {
    id: 'routing',
    label: 'Strategy & Routing',
    description: 'Choosing which specialists or tools to wake up',
    icon: RepeatIcon,
    categories: ['routing', 'think_tank'],
    keywords: ['route', 'planner', 'dispatch'],
  },
  {
    id: 'knowledge',
    label: 'Knowledge Graph Pulse',
    description: 'Querying the graph and lighting up relevant nodes',
    icon: SearchIcon,
    categories: ['knowledge_graph', 'research'],
    keywords: ['graph', 'vector', 'node'],
  },
  {
    id: 'agents',
    label: 'Agent Collaboration',
    description: 'Experts reasoning, debating and synthesizing',
    icon: ViewIcon,
    categories: ['agent', 'ai_model', 'think_tank'],
    keywords: ['agent', 'analysis', 'panel'],
  },
  {
    id: 'delivery',
    label: 'Response Delivery',
    description: 'Composing, polishing and shipping the answer',
    icon: StarIcon,
    categories: ['model', 'mention'],
    keywords: ['deliver', 'final', 'respond'],
  },
];

const defaultMutedCategories: BackendLog['category'][] = ['connection'];

const smoothScrollTo = (container: HTMLDivElement | null, top: number) => {
  if (!container) return;
  container.scrollTo({
    top,
    behavior: 'smooth',
  });
};

const isStageMatch = (log: BackendLog, stage: ProcessStage) => {
  if (stage.categories.includes(log.category)) {
    return true;
  }

  if (stage.keywords) {
    const message = log.message?.toLowerCase?.() ?? '';
    return stage.keywords.some(keyword => message.includes(keyword));
  }

  return false;
};

export const ActivityTimeline = ({ logs, onClear }: ActivityTimelineProps) => {
  const [selectedEvent, setSelectedEvent] = useState<BackendLog | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [mutedCategories, setMutedCategories] = useState<BackendLog['category'][]>(defaultMutedCategories);
  const { isOpen: isExpanded, onToggle } = useDisclosure({ defaultIsOpen: true });

  const eventStreamRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const availableLogs = useMemo(
    () => logs.filter(log => log.category !== 'connection'),
    [logs]
  );

  const filteredLogs = useMemo(
    () =>
      availableLogs.filter(log => !mutedCategories.includes(log.category)),
    [availableLogs, mutedCategories]
  );

  const knowledgeEvents = useMemo(
    () =>
      filteredLogs.filter(
        log =>
          log.category === 'knowledge_graph' ||
          log.metadata?.graphNodes?.length ||
          log.metadata?.highlightNodes?.length
      ),
    [filteredLogs]
  );

  const knowledgeEventSet = useMemo(() => new Set(knowledgeEvents), [knowledgeEvents]);

  const uniqueKnowledgeNodes = useMemo(() => {
    const nodes = new Set<string>();
    knowledgeEvents.forEach(log => {
      const candidates = log.metadata?.graphNodes ?? log.metadata?.highlightNodes ?? [];
      if (Array.isArray(candidates)) {
        candidates.forEach((node: string) => nodes.add(node));
      } else if (typeof candidates === 'string') {
        nodes.add(candidates);
      }
    });
    return Array.from(nodes);
  }, [knowledgeEvents]);

  const agentBuckets = useMemo(() => {
    const bucketMap = new Map<
      string,
      { key: string; label: string; color: string; logs: BackendLog[] }
    >();

    filteredLogs.forEach(log => {
      const visualization = getEventVisualization(log.category);
      const rawLabel =
        log.metadata?.agentName ||
        log.metadata?.agent ||
        log.metadata?.agent_id ||
        log.metadata?.speaker ||
        (log.category === 'knowledge_graph' ? 'Knowledge Engine' : undefined) ||
        'System';
      const key = String(rawLabel);
      const existing = bucketMap.get(key);
      const color = log.metadata?.color || visualization.color;

      if (existing) {
        existing.logs.push(log);
      } else {
        bucketMap.set(key, {
          key,
          label: key,
          color,
          logs: [log],
        });
      }
    });

    return Array.from(bucketMap.values()).sort((a, b) => b.logs.length - a.logs.length);
  }, [filteredLogs]);

  const processStageStats = useMemo(() => {
    return STAGES.map(stage => {
      const touches = filteredLogs.filter(log => isStageMatch(log, stage));
      return {
        ...stage,
        touches,
      };
    });
  }, [filteredLogs]);

  const latestStageIndex = useMemo(() => {
    let index = -1;
    filteredLogs.forEach(log => {
      const stageIndex = STAGES.findIndex(stage => isStageMatch(log, stage));
      if (stageIndex > index) {
        index = stageIndex;
      }
    });
    return index < 0 ? 0 : index;
  }, [filteredLogs]);

  const categoryOptions = useMemo(() => {
    const categories = new Set<BackendLog['category']>();
    availableLogs.forEach(log => categories.add(log.category));
    return Array.from(categories);
  }, [availableLogs]);

  const overviewPalette = useColorModeValue('whiteAlpha.700', 'whiteAlpha.300');

  useEffect(() => {
    if (autoFollow && eventStreamRef.current) {
      eventStreamRef.current.scrollTop = eventStreamRef.current.scrollHeight;
    }
  }, [filteredLogs, autoFollow]);

  useEffect(() => {
    if (autoFollow && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [filteredLogs, autoFollow]);

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  const renderEventStreamItem = (log: BackendLog, index: number) => {
    const visualization = getEventVisualization(log.category);
    const isSelected = selectedEvent === log;
    const isKnowledge = knowledgeEventSet.has(log);

    return (
      <MotionBox
        key={`${log.timestamp}-${index}`}
        p={4}
        borderWidth="1px"
        borderColor={isSelected ? visualization.color : 'whiteAlpha.100'}
        bg={isKnowledge ? 'rgba(128, 90, 213, 0.18)' : 'whiteAlpha.50'}
        rounded="xl"
        position="relative"
        cursor="pointer"
        onClick={() => setSelectedEvent(isSelected ? null : log)}
        whileHover={{ y: -2, borderColor: visualization.color }}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <HStack spacing={4} align="flex-start">
          <MotionFlex
            w="48px"
            h="48px"
            rounded="full"
            align="center"
            justify="center"
            bgGradient={visualization.bgGradient}
            borderWidth="3px"
            borderColor={isSelected ? visualization.color : 'whiteAlpha.200'}
            animate={isKnowledge ? { rotate: [0, 360] } : undefined}
            transition={{ repeat: isKnowledge ? Infinity : 0, duration: 12, ease: 'linear' }}
          >
            {visualization.getIcon ? (
              visualization.getIcon(log.metadata || {})
            ) : (
              <Text fontSize="lg">{visualization.icon}</Text>
            )}
          </MotionFlex>

          <VStack align="start" spacing={1} flex={1} minW={0}>
            <HStack spacing={2} align="center">
              <Badge colorScheme={isKnowledge ? 'purple' : 'blue'} fontSize="xs">
                {log.category.replace('_', ' ')}
              </Badge>
              {log.duration_ms ? (
                <Badge colorScheme="gray" fontSize="2xs">
                  {log.duration_ms} ms
                </Badge>
              ) : null}
              <Text fontSize="xs" color="gray.400">
                {formatTime(log.timestamp)}
              </Text>
            </HStack>
            <Text fontSize="sm" color="white" fontWeight="semibold" noOfLines={2}>
              {log.message}
            </Text>
            {log.metadata?.graphNodes ? (
              <Wrap spacing={1} pt={1} maxW="full">
                {(Array.isArray(log.metadata.graphNodes)
                  ? log.metadata.graphNodes
                  : [log.metadata.graphNodes]
                ).slice(0, 6).map((node: string, nodeIndex: number) => (
                  <WrapItem key={`${node}-${nodeIndex}`}>
                    <Tag colorScheme="purple" size="sm" variant="subtle">
                      {node}
                    </Tag>
                  </WrapItem>
                ))}
              </Wrap>
            ) : null}
          </VStack>
        </HStack>

        {log.level === 'success' && (
          <CheckCircleIcon
            position="absolute"
            top="-10px"
            right="-10px"
            color={visualization.color}
            boxSize={5}
          />
        )}
      </MotionBox>
    );
  };

  const recentEventsPeek = filteredLogs.slice(-3);

  if (availableLogs.length === 0 && !isExpanded) {
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
              _hover={{ transform: 'scale(1.05)' }}
            />
          </motion.div>
        </MotionBox>
      </AnimatePresence>
    );
  }

  if (availableLogs.length === 0) {
    return null;
  }

  return (
    <Box borderTop="1px" borderColor="whiteAlpha.100" bg="gray.900">
      <HStack
        px={4}
        py={3}
        borderBottom="1px"
        borderColor="whiteAlpha.100"
        justify="space-between"
        align="start"
      >
        <VStack align="start" spacing={1} maxW="70%">
          <Text fontSize="sm" fontWeight="bold" color="white">
            Observability Mission Control
          </Text>
          <HStack spacing={2} flexWrap="wrap">
            <Badge colorScheme="purple" fontSize="2xs">
              {filteredLogs.length} live signals
            </Badge>
            <Badge colorScheme="cyan" fontSize="2xs">
              {knowledgeEvents.length} graph touches
            </Badge>
            <Badge colorScheme="pink" fontSize="2xs">
              {uniqueKnowledgeNodes.length} unique nodes lit up
            </Badge>
          </HStack>
        </VStack>

        <HStack spacing={2} align="center">
          <HStack spacing={1} align="center">
            <Text fontSize="xs" color="gray.400">
              Auto-follow
            </Text>
            <Switch
              size="sm"
              colorScheme="purple"
              isChecked={autoFollow}
              onChange={() => setAutoFollow(prev => !prev)}
            />
          </HStack>

          <Menu closeOnSelect={false}>
            <MenuButton as={Button} size="sm" variant="ghost" leftIcon={<ViewIcon />}>
              Signals
            </MenuButton>
            <MenuList bg="gray.800" borderColor="whiteAlpha.200">
              <MenuOptionGroup
                title="Mute noise"
                type="checkbox"
                value={mutedCategories}
                onChange={value => setMutedCategories(value as BackendLog['category'][])}
              >
                {categoryOptions.map(category => (
                  <MenuItemOption key={category} value={category}>
                    {category.replace('_', ' ')}
                  </MenuItemOption>
                ))}
              </MenuOptionGroup>
            </MenuList>
          </Menu>

          <Tooltip label="Clear panel" hasArrow>
            <IconButton
              aria-label="Clear timeline"
              icon={<CloseIcon boxSize={3} />}
              size="sm"
              variant="ghost"
              onClick={onClear}
            />
          </Tooltip>

          <Tooltip label={isExpanded ? 'Collapse' : 'Expand'} hasArrow>
            <IconButton
              aria-label="Toggle observability"
              icon={isExpanded ? <ChevronDownIcon /> : <ChevronUpIcon />}
              size="sm"
              variant="ghost"
              onClick={onToggle}
              colorScheme={isExpanded ? 'gray' : 'purple'}
            />
          </Tooltip>
        </HStack>
      </HStack>

      <Collapse in={isExpanded} animateOpacity>
        <Tabs
          index={activeTab}
          onChange={setActiveTab}
          colorScheme="purple"
          variant="soft-rounded"
          px={4}
          pt={3}
        >
          <TabList overflowX="auto" pb={2} ref={scrollContainerRef}>
            <Tab fontSize="sm">Overview</Tab>
            <Tab fontSize="sm">Flow Map</Tab>
            <Tab fontSize="sm">Agent Lanes</Tab>
            <Tab fontSize="sm">Event Stream</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4} px={1}>
                <Stat bg="whiteAlpha.50" p={4} rounded="xl" borderWidth="1px" borderColor="whiteAlpha.100">
                  <StatLabel color={overviewPalette}>Total Signals</StatLabel>
                  <StatNumber color="white">{filteredLogs.length}</StatNumber>
                  <StatHelpText color="gray.400">Since last prompt</StatHelpText>
                </Stat>

                <Stat bg="whiteAlpha.50" p={4} rounded="xl" borderWidth="1px" borderColor="whiteAlpha.100">
                  <StatLabel color={overviewPalette}>Knowledge Graph</StatLabel>
                  <StatNumber color="white">{knowledgeEvents.length}</StatNumber>
                  <StatHelpText color="purple.200">
                    {uniqueKnowledgeNodes.length} nodes highlighted
                  </StatHelpText>
                </Stat>

                <Stat bg="whiteAlpha.50" p={4} rounded="xl" borderWidth="1px" borderColor="whiteAlpha.100">
                  <StatLabel color={overviewPalette}>Agents Active</StatLabel>
                  <StatNumber color="white">{agentBuckets.length}</StatNumber>
                  <StatHelpText color="cyan.200">Across all roles</StatHelpText>
                </Stat>

                <Stat bg="whiteAlpha.50" p={4} rounded="xl" borderWidth="1px" borderColor="whiteAlpha.100">
                  <StatLabel color={overviewPalette}>Latest Stage</StatLabel>
                  <StatNumber color="white">{STAGES[latestStageIndex]?.label ?? '—'}</StatNumber>
                  <StatHelpText color="gray.400">{STAGES[latestStageIndex]?.description}</StatHelpText>
                </Stat>
              </SimpleGrid>

              <Divider my={6} borderColor="whiteAlpha.100" />

              <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6} alignItems="stretch">
                <GridItem>
                  <Text fontSize="xs" color="gray.400" textTransform="uppercase" mb={3}>
                    Knowledge Graph Highlights
                  </Text>
                  {uniqueKnowledgeNodes.length > 0 ? (
                    <Wrap spacing={2} maxH="120px" overflowY="auto">
                      {uniqueKnowledgeNodes.map(node => (
                        <WrapItem key={node}>
                          <Tag size="lg" colorScheme="purple" variant="subtle">
                            <SmallAddIcon mr={1} />
                            {node}
                          </Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  ) : (
                    <Text fontSize="sm" color="gray.500">
                      No graph queries yet for this turn. The panel will light up as soon as the knowledge engine wakes up.
                    </Text>
                  )}
                </GridItem>

                <GridItem>
                  <Text fontSize="xs" color="gray.400" textTransform="uppercase" mb={3}>
                    Quick Pulse
                  </Text>
                  <VStack align="stretch" spacing={3}>
                    {processStageStats.map(stage => (
                      <Box key={stage.id} p={3} rounded="lg" bg="whiteAlpha.50" borderWidth="1px" borderColor="whiteAlpha.100">
                        <HStack justify="space-between" align="center">
                          <Text fontSize="sm" color="white" fontWeight="medium">
                            {stage.label}
                          </Text>
                          <Badge colorScheme={stage.touches.length > 0 ? 'purple' : 'gray'}>
                            {stage.touches.length}
                          </Badge>
                        </HStack>
                        <Progress
                          mt={2}
                          size="sm"
                          colorScheme={stage.touches.length > 0 ? 'purple' : 'gray'}
                          value={Math.min(stage.touches.length * 20, 100)}
                          bg="whiteAlpha.100"
                          rounded="full"
                        />
                      </Box>
                    ))}
                  </VStack>
                </GridItem>
              </Grid>

              <Divider my={6} borderColor="whiteAlpha.100" />

              <Text fontSize="xs" color="gray.400" textTransform="uppercase" mb={3}>
                Recent Signals
              </Text>
              <Stack spacing={3}>
                {recentEventsPeek.map((log, index) => (
                  <HStack key={`${log.timestamp}-peek-${index}`} spacing={3} align="center">
                    <Circle size="10px" bg={getEventVisualization(log.category).color} />
                    <Text fontSize="xs" color="gray.300" noOfLines={1}>
                      {formatTime(log.timestamp)} · {log.message}
                    </Text>
                  </HStack>
                ))}
                {recentEventsPeek.length === 0 ? (
                  <Text fontSize="sm" color="gray.500">
                    All quiet on the control deck. Send a prompt to watch the pipeline activate.
                  </Text>
                ) : null}
              </Stack>
            </TabPanel>

            <TabPanel px={0}>
              <VStack align="stretch" spacing={5}>
                <Text fontSize="xs" color="gray.400" textTransform="uppercase">
                  Process Visualiser
                </Text>
                <Flex direction={{ base: 'column', xl: 'row' }} align="stretch" gap={6}>
                  <VStack flex={1} spacing={4} align="stretch">
                    {processStageStats.map((stage, index) => {
                      const Icon = stage.icon;
                      const isActive = index === latestStageIndex;
                      const hasActivity = stage.touches.length > 0;
                      const visualization = getEventVisualization(stage.categories[0] ?? 'processing');

                      return (
                        <MotionBox
                          key={stage.id}
                          p={4}
                          rounded="xl"
                          borderWidth="1px"
                          borderColor={isActive ? visualization.color : 'whiteAlpha.100'}
                          bg={hasActivity ? 'whiteAlpha.100' : 'transparent'}
                          whileHover={{ scale: 1.01 }}
                        >
                          <HStack spacing={4} align="flex-start">
                            <Circle size="44px" bg={visualization.bgGradient} color="white">
                              <Icon />
                            </Circle>
                            <VStack align="start" spacing={1} flex={1}>
                              <HStack justify="space-between" w="full">
                                <Text fontSize="md" fontWeight="semibold" color="white">
                                  {stage.label}
                                </Text>
                                <Badge colorScheme={hasActivity ? 'purple' : 'gray'}>{stage.touches.length} ping(s)</Badge>
                              </HStack>
                              <Text fontSize="sm" color="gray.400">
                                {stage.description}
                              </Text>
                              {stage.touches.slice(0, 2).map((touch, touchIndex) => (
                                <Text key={`${stage.id}-touch-${touchIndex}`} fontSize="xs" color="gray.500" noOfLines={2}>
                                  {formatTime(touch.timestamp)} · {touch.message}
                                </Text>
                              ))}
                              {stage.touches.length > 2 ? (
                                <Text fontSize="xs" color="purple.200">
                                  +{stage.touches.length - 2} more events
                                </Text>
                              ) : null}
                            </VStack>
                          </HStack>
                        </MotionBox>
                      );
                    })}
                  </VStack>

                  <VStack flex={{ base: 1, xl: 0.8 }} spacing={4} align="stretch">
                    <Text fontSize="xs" color="gray.400" textTransform="uppercase">
                      Orbital View
                    </Text>
                    <Box position="relative" rounded="3xl" bg="blackAlpha.400" p={6} overflow="hidden">
                      <Box
                        position="absolute"
                        top="-40px"
                        right="-40px"
                        w="180px"
                        h="180px"
                        bgGradient="radial(circle, rgba(168, 85, 247, 0.3), transparent)"
                        filter="blur(20px)"
                      />
                      <VStack spacing={6}>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
                          style={{ width: '220px', height: '220px', position: 'relative' }}
                        >
                          {processStageStats.map((stage, index) => {
                            const angle = (index / processStageStats.length) * Math.PI * 2;
                            const radius = 95;
                            const x = Math.cos(angle) * radius;
                            const y = Math.sin(angle) * radius;
                            const visualization = getEventVisualization(stage.categories[0] ?? 'processing');

                            return (
                              <motion.div
                                key={`orbit-${stage.id}`}
                                style={{
                                  position: 'absolute',
                                  left: '50%',
                                  top: '50%',
                                  transform: `translate(${x}px, ${y}px)`
                                }}
                                animate={{ scale: stage.touches.length > 0 ? [1, 1.1, 1] : 1 }}
                                transition={{ repeat: stage.touches.length > 0 ? Infinity : 0, duration: 3 }}
                              >
                                <Tooltip
                                  label={`${stage.label}: ${stage.touches.length} touch(es)`}
                                  hasArrow
                                  bg="gray.800"
                                >
                                  <Circle size="60px" bg={visualization.bgGradient} shadow="xl">
                                    <Text fontSize="xs" color="white" textAlign="center">
                                      {stage.touches.length}
                                      <br />
                                      {stage.label.split(' ')[0]}
                                    </Text>
                                  </Circle>
                                </Tooltip>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                        <Text fontSize="sm" color="gray.400" textAlign="center" px={4}>
                          A heliocentric peek at which subsystems are glowing. Hover a planet to see how busy it is.
                        </Text>
                      </VStack>
                    </Box>
                  </VStack>
                </Flex>
              </VStack>
            </TabPanel>

            <TabPanel px={0}>
              <VStack align="stretch" spacing={4}>
                <Text fontSize="xs" color="gray.400" textTransform="uppercase">
                  Agent & Tool Lanes
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
                  {agentBuckets.map(bucket => (
                    <MotionBox
                      key={bucket.key}
                      p={4}
                      rounded="xl"
                      borderWidth="1px"
                      borderColor="whiteAlpha.100"
                      bg="whiteAlpha.50"
                      whileHover={{ translateY: -4 }}
                    >
                      <HStack spacing={3} align="center">
                        <Avatar name={bucket.label} size="sm" bg={bucket.color} color="white" />
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontSize="sm" fontWeight="semibold" color="white">
                            {bucket.label}
                          </Text>
                          <Text fontSize="xs" color="gray.400">
                            {bucket.logs.length} handoff(s)
                          </Text>
                        </VStack>
                        <Badge colorScheme="purple" fontSize="2xs">
                          {filteredLogs.length > 0
                            ? Math.round((bucket.logs.length / filteredLogs.length) * 100)
                            : 0}
                          %
                        </Badge>
                      </HStack>
                      <Box position="relative" mt={4} h="10px" bg="whiteAlpha.100" rounded="full">
                        <Box
                          position="absolute"
                          left={0}
                          top={0}
                          bottom={0}
                          width={`${filteredLogs.length > 0
                            ? Math.min((bucket.logs.length / filteredLogs.length) * 100, 100)
                            : 0}%`}
                          bgGradient={`linear(to-r, ${bucket.color}, rgba(255,255,255,0.2))`}
                          rounded="full"
                        />
                      </Box>
                      <HStack mt={4} spacing={2} justify="space-between">
                        {bucket.logs.slice(0, 5).map((log, index) => {
                          const visualization = getEventVisualization(log.category);
                          return (
                            <Tooltip
                              key={`${bucket.key}-event-${index}`}
                              label={`${formatTime(log.timestamp)} · ${log.message}`}
                              hasArrow
                              bg="gray.800"
                            >
                              <motion.div
                                animate={{ y: [0, -4, 0] }}
                                transition={{ repeat: Infinity, duration: 2 + index }}
                              >
                                <Circle size="36px" bg={visualization.bgGradient} color="white" shadow="lg">
                                  {visualization.icon}
                                </Circle>
                              </motion.div>
                            </Tooltip>
                          );
                        })}
                        {bucket.logs.length > 5 ? (
                          <Badge colorScheme="gray" fontSize="2xs">
                            +{bucket.logs.length - 5}
                          </Badge>
                        ) : null}
                      </HStack>
                    </MotionBox>
                  ))}
                </SimpleGrid>
                {agentBuckets.length === 0 ? (
                  <Text fontSize="sm" color="gray.500">
                    No agents or tools activated just yet.
                  </Text>
                ) : null}
              </VStack>
            </TabPanel>

            <TabPanel px={0}>
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between">
                  <Text fontSize="xs" color="gray.400" textTransform="uppercase">
                    Live Event Stream
                  </Text>
                  <ButtonGroup variant="ghost" size="sm" spacing={1}>
                    <Tooltip label="Scroll backward" hasArrow>
                      <IconButton
                        aria-label="Scroll left"
                        icon={<ChevronLeftIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (eventStreamRef.current) {
                            const newScrollTop = eventStreamRef.current.scrollTop - 180;
                            smoothScrollTo(eventStreamRef.current, newScrollTop);
                            setAutoFollow(false);
                          }
                        }}
                      />
                    </Tooltip>
                    <Tooltip label="Scroll forward" hasArrow>
                      <IconButton
                        aria-label="Scroll right"
                        icon={<ChevronRightIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (eventStreamRef.current) {
                            const container = eventStreamRef.current;
                            const newScrollTop = container.scrollTop + 180;
                            smoothScrollTo(container, newScrollTop);
                            if (newScrollTop + container.clientHeight >= container.scrollHeight - 10) {
                              setAutoFollow(true);
                            }
                          }
                        }}
                      />
                    </Tooltip>
                  </ButtonGroup>
                </HStack>

                <Box
                  ref={eventStreamRef}
                  maxH="320px"
                  overflowY="auto"
                  pr={2}
                  css={{
                    '&::-webkit-scrollbar': {
                      width: '6px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'rgba(148, 163, 184, 0.3)',
                      borderRadius: '4px',
                    },
                  }}
                >
                  <VStack spacing={3} align="stretch">
                    {filteredLogs.map((log, index) => renderEventStreamItem(log, index))}
                    {filteredLogs.length === 0 ? (
                      <MotionBox
                        p={6}
                        borderWidth="1px"
                        borderColor="whiteAlpha.100"
                        rounded="xl"
                        textAlign="center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Text fontSize="sm" color="gray.400">
                          All muted. Adjust your signal filters to bring events back.
                        </Text>
                      </MotionBox>
                    ) : null}
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <AnimatePresence>
          {selectedEvent && (
            <MotionBox
              p={4}
              bg="transparent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <EventDetailsCard event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            </MotionBox>
          )}
        </AnimatePresence>
      </Collapse>

      {!isExpanded ? (
        <Box px={4} py={3} borderTop="1px" borderColor="whiteAlpha.100" bg="blackAlpha.400">
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Text fontSize="xs" color="gray.400">
                Last signal snapshot
              </Text>
              {recentEventsPeek.length > 0 ? (
                <Text fontSize="sm" color="white" noOfLines={1}>
                  {recentEventsPeek[recentEventsPeek.length - 1].message}
                </Text>
              ) : (
                <Text fontSize="sm" color="gray.500">
                  Waiting for activity...
                </Text>
              )}
            </VStack>
            <Button colorScheme="purple" size="sm" variant="outline" onClick={onToggle}>
              Open console
            </Button>
          </HStack>
        </Box>
      ) : null}

      <AnimatePresence>
        {!isExpanded && availableLogs.length > 0 && (
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
                _hover={{ transform: 'scale(1.05)' }}
              />
            </motion.div>
            <Badge
              position="absolute"
              top="-8px"
              right="-8px"
              colorScheme="purple"
              rounded="full"
              fontSize="xs"
              px={2}
            >
              {filteredLogs.length}
            </Badge>
          </MotionBox>
        )}
      </AnimatePresence>
    </Box>
  );
};

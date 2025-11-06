import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  HStack,
  VStack,
  Text,
  IconButton,
  Badge,
  Flex,
  Switch,
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
  Wrap,
  WrapItem,
  Tag,
  Divider,
  Tooltip,
  Button,
  useDisclosure,
  Icon,
  useToken,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon, SmallCloseIcon } from '@chakra-ui/icons';
import { ArrowPathIcon, SparklesIcon, CircleStackIcon, CpuChipIcon, UserGroupIcon, BeakerIcon } from '@heroicons/react/24/outline';
import type { BackendLog } from '../hooks/useWebSocket';
import { EventDetailsCard } from './EventDetailsCard';
import { getEventVisualization } from '../utils/eventVisualizations';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

interface ActivityTimelineProps {
  logs: BackendLog[];
  onClear: () => void;
}

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const formatDuration = (duration?: number) => {
  if (!duration && duration !== 0) return null;
  if (duration < 1000) return `${duration} ms`;
  return `${(duration / 1000).toFixed(2)} s`;
};

const STAGES = [
  {
    id: 'processing',
    label: 'Signal Intake',
    description: 'Parsing the user prompt & setting up context',
    icon: ArrowPathIcon,
    color: 'blue.400',
  },
  {
    id: 'routing',
    label: 'Routing Brain',
    description: 'Deciding who should respond and why',
    icon: SparklesIcon,
    color: 'purple.400',
  },
  {
    id: 'knowledge_graph',
    label: 'Graph Pulse',
    description: 'Querying the knowledge mesh & lighting nodes',
    icon: CircleStackIcon,
    color: 'pink.400',
  },
  {
    id: 'model',
    label: 'Model Spin-up',
    description: 'Spawning external models & tools',
    icon: CpuChipIcon,
    color: 'cyan.400',
  },
  {
    id: 'agent',
    label: 'Agent Voices',
    description: 'Agents drafting and refining replies',
    icon: UserGroupIcon,
    color: 'green.400',
  },
  {
    id: 'think_tank',
    label: 'Think Tank',
    description: 'Consensus rounds & deliberation',
    icon: BeakerIcon,
    color: 'orange.400',
  },
];

export const ActivityTimeline = ({ logs, onClear }: ActivityTimelineProps) => {
  const { isOpen: isExpanded, onToggle } = useDisclosure({ defaultIsOpen: false });
  const [showNoise, setShowNoise] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BackendLog | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const glowColor = useToken('colors', 'purple.500');
  const stageColorValues = useToken('colors', STAGES.map((stage) => stage.color as any));

  const filteredLogs = useMemo(
    () => logs.filter((log) => log.category !== 'connection'),
    [logs],
  );

  const cleanLogs = useMemo(() => {
    if (showNoise) return filteredLogs;
    return filteredLogs.filter((log) => log.level !== 'debug');
  }, [filteredLogs, showNoise]);

  const suppressedCount = filteredLogs.length - cleanLogs.length;
  const latestLog = cleanLogs[cleanLogs.length - 1];

  const stageData = useMemo(() =>
    STAGES.map((stage, index) => {
      const stageLogs = cleanLogs.filter((log) => log.category === stage.id);
      const mostRecent = stageLogs[stageLogs.length - 1];
      return {
        ...stage,
        colorValue: stageColorValues[index] ?? '',
        count: stageLogs.length,
        lastMessage: mostRecent?.message,
        lastDuration: mostRecent?.duration_ms,
        metadata: mostRecent?.metadata,
        isActive: mostRecent && mostRecent === latestLog,
      };
    }),
  [cleanLogs, latestLog, stageColorValues]);

  const knowledgeLogs = useMemo(
    () => cleanLogs.filter((log) => log.category === 'knowledge_graph'),
    [cleanLogs],
  );

  const knowledgeNodes = useMemo(() => {
    const nodes = knowledgeLogs.flatMap((log) => {
      if (Array.isArray(log.metadata?.nodes)) return log.metadata.nodes;
      if (log.metadata?.node) return [log.metadata.node];
      return [];
    });
    return Array.from(new Set(nodes)).map(String);
  }, [knowledgeLogs]);

  const knowledgeEdges = useMemo(() => {
    const edges = knowledgeLogs.flatMap((log) => {
      if (!log.metadata?.edges) return [];
      if (Array.isArray(log.metadata.edges)) {
        return log.metadata.edges.map((edge: any) => {
          if (typeof edge === 'string') return edge;
          const source = edge.source ?? edge.from ?? 'unknown';
          const target = edge.target ?? edge.to ?? 'unknown';
          return `${source} → ${target}`;
        });
      }
      return [];
    });
    return Array.from(new Set(edges));
  }, [knowledgeLogs]);

  const knowledgeQueries = useMemo(
    () =>
      knowledgeLogs
        .slice(-6)
        .reverse()
        .map((log) => ({
          id: `${log.timestamp}`,
          label: log.metadata?.query || log.metadata?.operation || log.message,
          nodes: ((log.metadata?.nodes as string[] | undefined) || []).slice(0, 4).map(String),
          duration: formatDuration(log.duration_ms),
          timestamp: formatTime(log.timestamp),
        })),
    [knowledgeLogs],
  );

  const activeAgents = useMemo(() => {
    const agents = new Set<string>();
    cleanLogs.forEach((log) => {
      if (log.metadata?.agent_id) agents.add(log.metadata.agent_id);
      if (Array.isArray(log.metadata?.agents)) {
        log.metadata.agents.forEach((agent: string) => agents.add(agent));
      }
    });
    return Array.from(agents);
  }, [cleanLogs]);

  const renderStageCard = (stage: (typeof stageData)[number]) => {
    const haloColor = stage.colorValue || 'rgba(255,255,255,0.15)';
    const chipBg = stage.colorValue ? `${stage.colorValue}33` : 'rgba(255,255,255,0.08)';
    return (
      <MotionBox
      key={stage.id}
      whileHover={{ translateY: -4, boxShadow: `0 10px 30px ${haloColor}` }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      bgGradient="linear(to-br, gray.900, gray.800)"
      borderWidth="1px"
      borderColor={stage.isActive ? `${stage.color}` : 'whiteAlpha.100'}
      borderLeftWidth="6px"
      borderLeftColor={stage.color}
      rounded="xl"
      p={4}
      w={{ base: '100%', lg: '240px' }}
      position="relative"
    >
      {stage.isActive && (
        <MotionBox
          position="absolute"
          top="-6px"
          right="12px"
          w="10px"
          h="10px"
          rounded="full"
          bg={stage.color}
          animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.4, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}
      <HStack spacing={3} align="start">
        <Flex
          w="42px"
          h="42px"
          rounded="full"
          align="center"
          justify="center"
          bg={chipBg}
        >
          <Icon as={stage.icon} boxSize={5} color={stage.color} />
        </Flex>
        <VStack align="start" spacing={1} flex={1}>
          <HStack spacing={2} align="center">
            <Text fontSize="sm" fontWeight="bold" color="white">
              {stage.label}
            </Text>
            {stage.count > 0 && (
              <Badge colorScheme="purple" fontSize="2xs">
                {stage.count}
              </Badge>
            )}
          </HStack>
          <Text fontSize="xs" color="gray.400" noOfLines={2}>
            {stage.description}
          </Text>
          {stage.lastMessage && (
            <Tooltip label={stage.lastMessage} hasArrow placement="top">
              <Text fontSize="2xs" color="gray.500" noOfLines={2}>
                {stage.lastMessage}
              </Text>
            </Tooltip>
          )}
          {stage.lastDuration && (
            <Text fontSize="2xs" color="gray.500" fontFamily="mono">
              {formatDuration(stage.lastDuration)}
            </Text>
          )}
        </VStack>
      </HStack>
      </MotionBox>
    );
  };

  const renderOrbit = () => (
    <Box
      position="relative"
      w="120px"
      h="120px"
      mx="auto"
      mb={4}
    >
      <MotionBox
        position="absolute"
        inset="0"
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        rounded="full"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      />
      <MotionBox
        position="absolute"
        inset="16px"
        borderWidth="1px"
        borderColor="pink.400"
        rounded="full"
        animate={{ rotate: -360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      />
      <MotionBox
        position="absolute"
        top="-6px"
        left="50%"
        w="14px"
        h="14px"
        bg="pink.400"
        rounded="full"
        animate={{
          rotate: 360,
          translateX: [0, 35, 70, 35, 0],
        }}
        transform="translateX(-50%)"
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        boxShadow="0 0 12px rgba(236, 72, 153, 0.6)"
      />
      <MotionBox
        position="absolute"
        bottom="-8px"
        left="50%"
        w="16px"
        h="16px"
        bg="purple.400"
        rounded="full"
        animate={{
          rotate: -360,
          translateX: [0, -40, -70, -40, 0],
        }}
        transform="translateX(-50%)"
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        boxShadow="0 0 12px rgba(168, 85, 247, 0.6)"
      />
      <Flex
        position="absolute"
        inset="32px"
        bgGradient="linear(to-br, gray.900, gray.800)"
        rounded="full"
        align="center"
        justify="center"
        boxShadow={`0 0 30px ${glowColor}33`}
      >
        <VStack spacing={0}>
          <Text fontSize="xs" fontWeight="bold" color="white">
            Knowledge
          </Text>
          <Text fontSize="2xs" color="gray.400">
            {knowledgeNodes.length} nodes
          </Text>
        </VStack>
      </Flex>
    </Box>
  );

  const renderStreamEvent = (log: BackendLog) => {
    const visualization = getEventVisualization(log.category);
    const isSelected = selectedEvent?.timestamp === log.timestamp && selectedEvent?.message === log.message;
    return (
      <MotionFlex
        key={`${log.timestamp}-${log.message}`}
        direction="column"
        bgGradient="linear(to-r, rgba(17, 25, 40, 0.8), rgba(17, 25, 40, 0.6))"
        borderWidth="1px"
        borderColor={isSelected ? visualization.color : 'whiteAlpha.100'}
        borderLeftWidth="4px"
        borderLeftColor={visualization.color}
        rounded="lg"
        p={3}
        gap={2}
        whileHover={{ scale: 1.01 }}
        onClick={() => setSelectedEvent(isSelected ? null : log)}
        cursor="pointer"
      >
        <HStack justify="space-between" align="start">
          <HStack spacing={2}>
            <Box fontSize="lg">{visualization.icon}</Box>
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" color="white" noOfLines={2}>
                {log.message}
              </Text>
              <HStack spacing={2}>
                <Badge colorScheme="purple" fontSize="2xs">
                  {log.category}
                </Badge>
                <Badge colorScheme={log.level === 'error' ? 'red' : log.level === 'success' ? 'green' : 'blue'} fontSize="2xs">
                  {log.level.toUpperCase()}
                </Badge>
              </HStack>
            </VStack>
          </HStack>
          <VStack spacing={0} align="end">
            <Text fontSize="2xs" color="gray.500" fontFamily="mono">
              {formatTime(log.timestamp)}
            </Text>
            {log.duration_ms && (
              <Text fontSize="2xs" color="gray.500" fontFamily="mono">
                {formatDuration(log.duration_ms)}
              </Text>
            )}
          </VStack>
        </HStack>
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <Wrap spacing={1}>
            {Object.entries(log.metadata)
              .slice(0, 4)
              .map(([key, value]) => (
                <WrapItem key={key}>
                  <Tag colorScheme="whiteAlpha" fontSize="2xs">
                    <Text as="span" color="gray.400" mr={1}>
                      {key}:
                    </Text>
                    <Text as="span" color="gray.100">
                      {Array.isArray(value)
                        ? value.slice(0, 3).join(', ')
                        : typeof value === 'object'
                        ? JSON.stringify(value).slice(0, 40)
                        : String(value)}
                    </Text>
                  </Tag>
                </WrapItem>
              ))}
          </Wrap>
        )}
      </MotionFlex>
    );
  };

  if (cleanLogs.length === 0) {
    return (
      <AnimatePresence>
        {!isExpanded && (
          <MotionBox
            position="fixed"
            bottom="24px"
            right="24px"
            bgGradient="linear(to-r, rgba(76, 29, 149, 0.9), rgba(147, 51, 234, 0.8))"
            color="white"
            px={4}
            py={3}
            rounded="full"
            boxShadow="0 15px 40px rgba(126, 58, 242, 0.4)"
            display="flex"
            alignItems="center"
            gap={2}
            cursor="pointer"
            onClick={onToggle}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <SparklesIcon width={18} />
            <Text fontSize="sm" fontWeight="semibold">
              Observability
            </Text>
            <Badge colorScheme="blackAlpha" fontSize="2xs">
              idle
            </Badge>
            <ChevronUpIcon />
          </MotionBox>
        )}
      </AnimatePresence>
    );
  }

  return (
    <Box position="relative" zIndex={10}>
      <AnimatePresence initial={false}>
        {!isExpanded && (
          <MotionBox
            position="fixed"
            bottom="24px"
            right="24px"
            bgGradient="linear(to-r, rgba(15, 23, 42, 0.95), rgba(17, 24, 39, 0.95))"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            rounded="2xl"
            px={4}
            py={3}
            shadow="xl"
            display="flex"
            gap={3}
            alignItems="center"
            cursor="pointer"
            onClick={onToggle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Flex
              w="44px"
              h="44px"
              rounded="full"
              align="center"
              justify="center"
              bg="purple.600"
              color="white"
              fontWeight="bold"
            >
              AI
            </Flex>
            <VStack spacing={0} align="start">
              <HStack spacing={2}>
                <Text fontSize="sm" fontWeight="bold" color="white">
                  Observability Deck
                </Text>
                <Badge colorScheme="purple" fontSize="2xs">
                  {cleanLogs.length}
                </Badge>
              </HStack>
              {latestLog && (
                <Text fontSize="xs" color="gray.400" noOfLines={1} maxW="220px">
                  {latestLog.message}
                </Text>
              )}
              {suppressedCount > 0 && (
                <Text fontSize="2xs" color="gray.500">
                  {suppressedCount} debug events tucked away
                </Text>
              )}
            </VStack>
            <ChevronUpIcon color="purple.300" />
          </MotionBox>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpanded && (
          <MotionBox
            borderTop="1px"
            borderColor="whiteAlpha.100"
            bg="rgba(15, 23, 42, 0.96)"
            backdropFilter="blur(12px)"
            px={{ base: 4, md: 6 }}
            py={4}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            shadow="2xl"
          >
            <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={3}>
              <VStack align="start" spacing={1}>
                <HStack spacing={2}>
                  <Text fontSize="sm" fontWeight="bold" color="white">
                    Mission Control · Observability
                  </Text>
                  <Badge colorScheme="purple" fontSize="2xs">
                    {cleanLogs.length} events
                  </Badge>
                </HStack>
                <HStack spacing={2}>
                  <Text fontSize="xs" color="gray.400">
                    Last signal · {latestLog ? formatTime(latestLog.timestamp) : '—'}
                  </Text>
                  {suppressedCount > 0 && (
                    <Badge colorScheme="gray" fontSize="2xs">
                      {suppressedCount} muted
                    </Badge>
                  )}
                </HStack>
              </VStack>
              <HStack spacing={3}>
                <HStack spacing={2}>
                  <Switch size="sm" isChecked={!showNoise} onChange={() => setShowNoise((prev) => !prev)} colorScheme="purple" />
                  <Text fontSize="xs" color="gray.400">
                    Hide debug chatter
                  </Text>
                </HStack>
                <Button size="xs" variant="ghost" leftIcon={<SmallCloseIcon />} onClick={onClear}>
                  Clear signals
                </Button>
                <IconButton aria-label="Collapse" icon={<ChevronDownIcon />} size="sm" variant="ghost" onClick={onToggle} />
              </HStack>
            </Flex>

            <Tabs
              variant="soft-rounded"
              colorScheme="purple"
              mt={4}
              index={activeTab}
              onChange={setActiveTab}
            >
              <TabList overflowX="auto" pb={1}>
                <Tab fontSize="sm">Signal Flow</Tab>
                <Tab fontSize="sm">Knowledge Ops</Tab>
                <Tab fontSize="sm">Event Stream</Tab>
              </TabList>
              <TabPanels mt={4}>
                <TabPanel px={0}>
                  <VStack align="stretch" spacing={6}>
                    <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                      <Box
                        bgGradient="linear(to-br, rgba(37, 99, 235, 0.16), rgba(59, 130, 246, 0.08))"
                        borderWidth="1px"
                        borderColor="rgba(59, 130, 246, 0.35)"
                        rounded="xl"
                        p={4}
                      >
                        <Stat>
                          <StatLabel color="gray.400">Active Agents</StatLabel>
                          <StatNumber color="white">{activeAgents.length || '—'}</StatNumber>
                          <StatHelpText color="gray.500">Unique voices responding this session</StatHelpText>
                        </Stat>
                      </Box>
                      <Box
                        bgGradient="linear(to-br, rgba(168, 85, 247, 0.16), rgba(192, 132, 252, 0.08))"
                        borderWidth="1px"
                        borderColor="rgba(168, 85, 247, 0.35)"
                        rounded="xl"
                        p={4}
                      >
                        <Stat>
                          <StatLabel color="gray.400">Knowledge Pulses</StatLabel>
                          <StatNumber color="white">{knowledgeLogs.length || '—'}</StatNumber>
                          <StatHelpText color="gray.500">Graph lookups during this exchange</StatHelpText>
                        </Stat>
                      </Box>
                      <Box
                        bgGradient="linear(to-br, rgba(34, 197, 94, 0.16), rgba(74, 222, 128, 0.08))"
                        borderWidth="1px"
                        borderColor="rgba(34, 197, 94, 0.35)"
                        rounded="xl"
                        p={4}
                      >
                        <Stat>
                          <StatLabel color="gray.400">Response Cadence</StatLabel>
                          <StatNumber color="white">{cleanLogs.filter((log) => log.category === 'agent').length || '—'}</StatNumber>
                          <StatHelpText color="gray.500">Agent hand-offs captured</StatHelpText>
                        </Stat>
                      </Box>
                    </SimpleGrid>

                    <Box display={{ base: 'none', xl: 'block' }}>
                      <Flex align="center" gap={4}>
                        {stageData.map((stage, index) => (
                          <Flex key={stage.id} align="center" gap={4}>
                            {renderStageCard(stage)}
                            {index < stageData.length - 1 && (
                              <Box position="relative" w="80px" h="2px" bg="whiteAlpha.200" overflow="hidden">
                                <MotionBox
                                  position="absolute"
                                  top="-4px"
                                  left="-10px"
                                  w="18px"
                                  h="18px"
                                  bg={stageData[index + 1].colorValue || stageData[index + 1].color}
                                  rounded="full"
                                  animate={{ x: [0, 80] }}
                                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 }}
                                  boxShadow={`0 0 12px ${stageData[index + 1].colorValue || stageData[index + 1].color}`}
                                />
                              </Box>
                            )}
                          </Flex>
                        ))}
                      </Flex>
                    </Box>

                    <Box display={{ base: 'block', xl: 'none' }}>
                      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                        {stageData.map(renderStageCard)}
                      </SimpleGrid>
                    </Box>
                  </VStack>
                </TabPanel>
                <TabPanel px={0}>
                  <VStack align="stretch" spacing={5}>
                    <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
                      <Box flex="1" bg="rgba(30, 41, 59, 0.8)" rounded="xl" borderWidth="1px" borderColor="rgba(236, 72, 153, 0.35)" p={4}>
                        <Text fontSize="sm" fontWeight="bold" color="white" mb={3}>
                          Graph Pulse Visualizer
                        </Text>
                        {renderOrbit()}
                        <Text fontSize="xs" color="gray.400" textAlign="center">
                          Watching {knowledgeNodes.length} nodes & {knowledgeEdges.length} relationships ignite
                        </Text>
                      </Box>
                      <Box flex="1" bg="rgba(17, 24, 39, 0.9)" rounded="xl" borderWidth="1px" borderColor="whiteAlpha.100" p={4}>
                        <Text fontSize="sm" fontWeight="bold" color="white" mb={3}>
                          Highlighted Nodes
                        </Text>
                        {knowledgeNodes.length === 0 ? (
                          <Text fontSize="xs" color="gray.500">
                            No knowledge graph calls yet – once the team taps the graph you'll see the illuminated nodes here.
                          </Text>
                        ) : (
                          <Wrap spacing={2}>
                            {knowledgeNodes.slice(0, 30).map((node) => (
                              <WrapItem key={node}>
                                <Tag size="md" variant="subtle" colorScheme="pink">
                                  {node}
                                </Tag>
                              </WrapItem>
                            ))}
                          </Wrap>
                        )}
                      </Box>
                    </Flex>

                    <Box bg="rgba(15, 23, 42, 0.92)" rounded="xl" borderWidth="1px" borderColor="whiteAlpha.100" p={4}>
                      <HStack justify="space-between" mb={3}>
                        <Text fontSize="sm" fontWeight="bold" color="white">
                          Recent Knowledge Operations
                        </Text>
                        <Badge colorScheme="purple" fontSize="2xs">
                          {knowledgeLogs.length} total
                        </Badge>
                      </HStack>
                      {knowledgeQueries.length === 0 ? (
                        <Text fontSize="xs" color="gray.500">
                          Waiting for the first knowledge graph query. Ask something that requires team memory!
                        </Text>
                      ) : (
                        <VStack align="stretch" spacing={3}>
                          {knowledgeQueries.map((query) => (
                            <MotionBox
                              key={query.id}
                              bgGradient="linear(to-r, rgba(88, 28, 135, 0.4), rgba(236, 72, 153, 0.2))"
                              borderWidth="1px"
                              borderColor="rgba(236, 72, 153, 0.35)"
                              rounded="lg"
                              p={3}
                              whileHover={{ scale: 1.01 }}
                            >
                              <HStack justify="space-between" align="start">
                                <VStack align="start" spacing={1}>
                                  <Text fontSize="sm" color="white" noOfLines={2}>
                                    {query.label}
                                  </Text>
                                  <Wrap spacing={2}>
                                    {query.nodes.map((node: string) => (
                                      <WrapItem key={node}>
                                        <Tag size="sm" colorScheme="pink" variant="solid">
                                          {node}
                                        </Tag>
                                      </WrapItem>
                                    ))}
                                  </Wrap>
                                </VStack>
                                <VStack spacing={0} align="end">
                                  <Text fontSize="2xs" color="gray.400">
                                    {query.timestamp}
                                  </Text>
                                  {query.duration && (
                                    <Text fontSize="2xs" color="gray.500" fontFamily="mono">
                                      {query.duration}
                                    </Text>
                                  )}
                                </VStack>
                              </HStack>
                            </MotionBox>
                          ))}
                        </VStack>
                      )}
                    </Box>

                    {knowledgeEdges.length > 0 && (
                      <Box bg="rgba(17, 24, 39, 0.9)" rounded="xl" borderWidth="1px" borderColor="whiteAlpha.100" p={4}>
                        <Text fontSize="sm" fontWeight="bold" color="white" mb={2}>
                          Relationships Traversed
                        </Text>
                        <Wrap spacing={2}>
                          {knowledgeEdges.slice(0, 40).map((edge) => (
                            <WrapItem key={edge}>
                              <Tag size="sm" variant="outline" colorScheme="purple">
                                {edge}
                              </Tag>
                            </WrapItem>
                          ))}
                        </Wrap>
                      </Box>
                    )}
                  </VStack>
                </TabPanel>
                <TabPanel px={0}>
                  <VStack align="stretch" spacing={4}>
                    <HStack spacing={3}>
                      <Badge colorScheme="purple" fontSize="2xs">
                        Live Stream
                      </Badge>
                      <Divider borderColor="whiteAlpha.200" />
                    </HStack>
                    <VStack align="stretch" spacing={3} maxH="240px" overflowY="auto"
                      css={{
                        '&::-webkit-scrollbar': {
                          width: '6px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: 'rgba(148, 163, 184, 0.3)',
                          borderRadius: '3px',
                        },
                      }}
                    >
                      {cleanLogs
                        .slice()
                        .reverse()
                        .map((log) => renderStreamEvent(log))}
                    </VStack>
                    {selectedEvent && (
                      <Box pt={2}>
                        <EventDetailsCard event={selectedEvent} onClose={() => setSelectedEvent(null)} />
                      </Box>
                    )}
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </MotionBox>
        )}
      </AnimatePresence>
    </Box>
  );
};

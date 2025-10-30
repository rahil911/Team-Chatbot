import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { KnowledgeGraphView } from './KnowledgeGraphView';
import { ChatView } from './ChatView';
import type { ChatMode, Message, AgentMessage } from '../types';

interface MainContentProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  messages: Message[];
  agentMessages: AgentMessage;
  activeAgents: string[];
  isProcessing: boolean;
  typingAgent: string | null;
  onSendMessage: (message: string) => void;
  onSendVoice: (audioBlob: Blob) => void;
  highlights: any;
}

export const MainContent = ({
  mode,
  onModeChange,
  messages,
  agentMessages,
  activeAgents,
  isProcessing,
  typingAgent,
  onSendMessage,
  onSendVoice,
  highlights,
}: MainContentProps) => {
  return (
    <Box h="full" bg="gray.925">
      <Tabs variant="line" colorScheme="blue" h="full" display="flex" flexDirection="column">
        <TabList
          px={6}
          borderBottom="1px"
          borderColor="whiteAlpha.100"
          bg="rgba(15, 23, 42, 0.6)"
        >
          <Tab>Knowledge Graph</Tab>
          <Tab>Chat Interface</Tab>
        </TabList>

        <TabPanels flex={1} overflow="hidden">
          <TabPanel p={0} h="full">
            <KnowledgeGraphView highlights={highlights} />
          </TabPanel>

          <TabPanel p={0} h="full">
            <ChatView
              mode={mode}
              onModeChange={onModeChange}
              messages={messages}
              agentMessages={agentMessages}
              activeAgents={activeAgents}
              isProcessing={isProcessing}
              typingAgent={typingAgent}
              onSendMessage={onSendMessage}
              onSendVoice={onSendVoice}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};


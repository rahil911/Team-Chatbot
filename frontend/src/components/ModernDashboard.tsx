import { useState } from 'react';
import { ChatPanel } from './ChatPanel';
import { KnowledgeGraphView } from './KnowledgeGraphView';
import { useWebSocket } from '../hooks/useWebSocket';
import { useGraphHighlight } from '../hooks/useGraphHighlight';
import type { ChatMode } from '../types';

export const ModernDashboard = () => {
  const [mode, setMode] = useState<ChatMode>('group');

  const { addHighlight, highlights } = useGraphHighlight();

  const {
    messages,
    agentMessages,
    activeAgents,
    isProcessing,
    sendMessage,
    thinkTank
  } = useWebSocket((highlightData: any) => {
    addHighlight(highlightData);
  });

  const handleSendMessage = (message: string) => {
    sendMessage(message, mode);
  };

  const handleSendVoice = (_audioBlob: Blob) => {
    alert('Voice input feature coming soon!');
  };

  return (
    <div className="flex h-screen bg-surface-950">
      {/* Left: Chat Panel */}
      <div className="w-1/2 h-full border-r border-white/6">
        <ChatPanel
          mode={mode}
          onModeChange={setMode}
          messages={messages}
          agentMessages={agentMessages}
          activeAgents={activeAgents}
          isProcessing={isProcessing}
          onSendMessage={handleSendMessage}
          onSendVoice={handleSendVoice}
          thinkTank={thinkTank}
        />
      </div>

      {/* Right: Knowledge Graph */}
      <div className="w-1/2 h-full">
        <KnowledgeGraphView highlights={highlights} />
      </div>
    </div>
  );
};

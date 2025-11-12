import { useState } from 'react';
import { ChatPanel } from './ChatPanel';
import { KnowledgeGraphView } from './KnowledgeGraphView';
import { useWebSocket } from '../hooks/useWebSocket';
import { useGraphHighlight } from '../hooks/useGraphHighlight';
import type { ChatMode } from '../types';
import type { ModelType } from './ModelSelector';

export const ModernDashboard = () => {
  const [mode, setMode] = useState<ChatMode>('group');
  const [model, setModel] = useState<ModelType>('gpt-4o');  // Default to GPT-4o (stable)

  const { addHighlight, highlights } = useGraphHighlight();

  const {
    messages,
    agentMessages,
    activeAgents,
    isProcessing,
    sendMessage,
    setModel: setWsModel,
    thinkTank
  } = useWebSocket((highlightData: any) => {
    addHighlight(highlightData);
  });

  const handleSendMessage = (message: string) => {
    sendMessage(message, mode);
  };

  const handleModelChange = (newModel: ModelType) => {
    setModel(newModel);
    setWsModel(newModel); // Send model change to WebSocket
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
          model={model}
          onModelChange={handleModelChange}
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

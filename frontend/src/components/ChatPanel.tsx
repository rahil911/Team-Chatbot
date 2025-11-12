import { useState, useRef, useEffect, useMemo } from 'react';
import { Tab } from '@headlessui/react';
import { ChatBubbleLeftRightIcon, UserGroupIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { AgentCard } from './AgentCard';
import { VoiceInput } from './VoiceInput';
import { TextInput } from './TextInput';
import { ModeSelector } from './ModeSelector';
import { ModelSelector, type ModelType } from './ModelSelector';
import { MessageFormatter } from './MessageFormatter';
import { ConsensusMeter } from './ConsensusMeter';
import { RoundIndicator } from './RoundIndicator';
import { EvidenceSidebar } from './EvidenceSidebar';
import { CitationHighlight } from './CitationHighlight';
import type { ChatMode, Message, AgentMessage, Citation, ConsensusData } from '../types';
import { token } from '../theme';
import type { AgentKey } from '../theme';

interface ThinkTankState {
  citations: Citation[];
  consensus: ConsensusData | null;
  currentRound: number;
  maxRounds: number;
  roundStatus: 'active' | 'complete' | 'waiting';
  agentsResponded: number;
  summary: string;
}

interface ChatPanelProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  model: ModelType;
  onModelChange: (model: ModelType) => void;
  messages: Message[];
  agentMessages: AgentMessage;
  activeAgents: string[];
  isProcessing: boolean;
  onSendMessage: (message: string) => void;
  onSendVoice: (audioBlob: Blob) => void;
  thinkTank?: ThinkTankState;
}

const AGENTS = {
  mathew: {
    name: 'Mathew Jerry Meleth',
    title: 'Data Engineer',
    color: token.agents.mathew
  },
  rahil: {
    name: 'Rahil M. Harihar',
    title: 'Product Lead',
    color: token.agents.rahil
  },
  shreyas: {
    name: 'Shreyas B Subramanya',
    title: 'Product Manager',
    color: token.agents.shreyas
  },
  siddarth: {
    name: 'Siddarth Bhave',
    title: 'Software Engineer',
    color: token.agents.siddarth
  }
} as const;

const TABS = [
  {
    key: 'conversation',
    label: 'Conversation',
    Icon: ChatBubbleLeftRightIcon
  },
  {
    key: 'agents',
    label: 'Agent Profiles',
    Icon: UserGroupIcon
  },
  {
    key: 'highlights',
    label: 'Highlights',
    Icon: SparklesIcon
  }
] as const;

export const ChatPanel = ({
  mode,
  onModeChange,
  model,
  onModelChange,
  messages,
  agentMessages,
  activeAgents,
  isProcessing,
  onSendMessage,
  onSendVoice,
  thinkTank
}: ChatPanelProps) => {
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isThinkTankMode = mode === 'think_tank';
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const agentStatus = useMemo(() => {
    return Object.entries(AGENTS).map(([agentId, agent]) => {
      const isActive = activeAgents.includes(agentId);
      const lastMessage = agentMessages[agentId];
      const status = isActive
        ? 'Responding now'
        : lastMessage
          ? 'Ready with insights'
          : 'Standing by';
      return {
        agentId,
        agent,
        status,
        lastMessage,
      };
    });
  }, [activeAgents, agentMessages]);

  const recentAgentMessages = useMemo(() => {
    return messages
      .filter((msg) => msg.type === 'agent')
      .slice(-8)
      .reverse();
  }, [messages]);

  const handleTextInput = (message: string) => {
    onSendMessage(message);
  };
  
  const handleVoiceInput = (audioBlob: Blob) => {
    onSendVoice(audioBlob);
  };
  
  const getAgentInitials = (agentId?: string) => {
    if (!agentId) return '?';
    const name = AGENTS[agentId as keyof typeof AGENTS]?.name;
    if (!name) return '?';
    return name.split(' ').map(part => part[0]).slice(0, 2).join('');
  };
  
  return (
    <div className="relative flex h-full flex-col bg-surface-925/70 backdrop-blur-xl">
      <div className="relative border-b border-white/5 bg-surface-900/70 px-6 pb-5 pt-6 shadow-panel">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/6 to-transparent" />
        <div className="relative z-10 space-y-4">
          {/* Model Selector at the top */}
          <div className="flex items-center gap-3">
            <ModelSelector
              value={model}
              onChange={onModelChange}
              className="flex-1 max-w-xs"
            />
            <div className="flex-1" />
          </div>

          <ModeSelector mode={mode} onChange={onModeChange} />

          {/* Think Tank Mode: Show ConsensusMeter and RoundIndicator */}
          {isThinkTankMode && thinkTank && thinkTank.currentRound > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <ConsensusMeter
                consensus={thinkTank.consensus?.score || 0}
                threshold={0.85}
                round={thinkTank.currentRound}
              />
              <RoundIndicator
                currentRound={thinkTank.currentRound}
                maxRounds={thinkTank.maxRounds}
                agentsResponded={thinkTank.agentsResponded}
                totalAgents={4}
                status={thinkTank.roundStatus}
              />
            </div>
          ) : null}

          {/* Standard Mode or Think Tank without active rounds: Show Agent Cards */}
          {!isThinkTankMode || !thinkTank || thinkTank.currentRound === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {agentStatus.map(({ agentId, agent }) => {
              const isActive = activeAgents.includes(agentId);
              const key = agentId as AgentKey;
              return (
            <div
              key={agentId}
                  className="rounded-xl border bg-surface-900/60 px-3 py-3 text-sm text-text-secondary transition-all hover:bg-surface-900/80"
                  style={{
                    borderColor: isActive ? token.agentAlpha(key, 0.5) : 'rgba(148, 163, 184, 0.15)',
                    boxShadow: isActive ? `0 0 20px ${token.agentAlpha(key, 0.2)}` : undefined,
                  }}
            >
                  <div className="flex items-center gap-2">
                <div
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border text-xs font-semibold"
                      style={{
                        borderColor: agent.color,
                        background: token.agentAlpha(key, 0.2),
                        color: agent.color,
                      }}
                >
                  {getAgentInitials(agentId)}
                </div>
                <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-text-primary">{agent.name.split(' ')[0]}</p>
                      <p className="truncate text-[10px] text-text-tertiary">{agent.title}</p>
                </div>
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{
                        background: isActive ? agent.color : 'rgba(148, 163, 184, 0.3)',
                      }}
                />
              </div>
            </div>
              );
            })}
          </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Tab.Group>
          <Tab.List className="flex gap-1 border-b border-white/5 px-6 pt-4">
            {TABS.map(({ key, label, Icon }) => (
              <Tab key={key} className="focus:outline-none">
                {({ selected }) => (
                  <div className="relative pb-3">
                    <div
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        selected
                          ? 'text-text-primary'
                          : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-900/40'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </div>
                    {selected && (
                      <div 
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                        style={{ background: token.gradients.aurora }}
                      />
                    )}
                  </div>
                )}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="flex-1 overflow-hidden px-6 pb-6 pt-4">
            {/* Conversation */}
            <Tab.Panel className="flex h-full flex-col gap-4" key="conversation">
              <div className="flex-1 overflow-y-auto rounded-2xl border border-white/5 bg-surface-900/40 p-6 shadow-inner shadow-black/10">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-text-tertiary">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 text-accent-blue">
                    <ChatBubbleLeftRightIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Start the conversation</p>
                    <p className="text-xs text-text-tertiary">Ask a question and watch the team respond in real time.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pr-1">
                  {messages.map((msg, i) => (
                    <div
                      key={`${msg.timestamp}-${i}`}
                      className={`flex ${
                        msg.type === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.type === 'user' ? (
                        <div className="max-w-[75%]">
                          <div className="rounded-2xl rounded-tr-md bg-accent-blue px-4 py-2.5">
                            <p className="text-sm leading-relaxed text-white">{msg.content}</p>
                          </div>
                          <p className="mt-1.5 text-right text-[11px] text-text-tertiary">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ) : (
                        <div className="flex max-w-[85%] gap-2.5">
                          <div className="flex-shrink-0">
                            {(() => {
                              const agentKey = msg.agent_id as AgentKey | undefined;
                              const agentColor = agentKey ? AGENTS[agentKey].color : token.text.tertiary;
                              const avatarBackground = agentKey ? token.agentAlpha(agentKey, 0.2) : 'rgba(148, 163, 184, 0.15)';
                              return (
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-semibold"
                              style={{ borderColor: agentColor, background: avatarBackground, color: agentColor }}
                            >
                              {getAgentInitials(msg.agent_id)}
                            </div>
                              );
                            })()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2 mb-1.5">
                              <span className="text-xs font-semibold text-text-primary">
                                {msg.agent_id ? AGENTS[msg.agent_id as keyof typeof AGENTS]?.name : 'Agent'}
                              </span>
                              <span className="text-[11px] text-text-tertiary">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {(() => {
                              const agentKey = msg.agent_id as AgentKey | undefined;
                              const borderColor = agentKey ? AGENTS[agentKey].color : 'rgba(148, 163, 184, 0.35)';
                              return (
                            <div
                                  className="rounded-2xl rounded-tl-md border border-white/5 bg-surface-900/60 px-4 py-2.5 text-sm leading-relaxed text-text-secondary"
                                  style={{
                                    borderLeftColor: borderColor,
                                    borderLeftWidth: '3px',
                                  }}
                            >
                              {isThinkTankMode ? (
                                <CitationHighlight text={msg.content} />
                              ) : (
                                <MessageFormatter content={msg.content} />
                              )}
                            </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
              <div className="rounded-2xl border border-white/5 bg-surface-900/50 p-4">
              {showVoiceInput ? (
                <div className="space-y-3">
                  <VoiceInput onVoiceInput={handleVoiceInput} />
                  <button
                    onClick={() => setShowVoiceInput(false)}
                    className="text-xs text-text-tertiary transition-colors hover:text-text-secondary"
                  >
                    Switch to text input
                  </button>
                </div>
              ) : (
                <TextInput
                  onSend={handleTextInput}
                  onVoiceClick={() => setShowVoiceInput(true)}
                  disabled={isProcessing}
                />
              )}
              {isProcessing && (
                <p className="mt-2.5 text-xs text-accent-blue">
                  The team is drafting their response…
                </p>
              )}
            </div>
            </Tab.Panel>

          {/* Agents */}
            <Tab.Panel className="h-full overflow-y-auto" key="agents">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
              {Object.entries(AGENTS).map(([agentId, agent]) => (
                <AgentCard
                  key={agentId}
                  agentId={agentId}
                  agentName={agent.name}
                  agentTitle={agent.title}
                  isActive={activeAgents.includes(agentId)}
                  message={agentMessages[agentId] || ''}
                />
              ))}
            </div>
            </Tab.Panel>

          {/* Highlights or Evidence (Think Tank) */}
            <Tab.Panel className="h-full overflow-hidden" key="highlights-evidence">
            {isThinkTankMode && thinkTank ? (
              <EvidenceSidebar
                citations={thinkTank.citations}
                agentMap={AGENTS}
              />
            ) : (
            <div className="h-full overflow-y-auto space-y-3">
              {recentAgentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-surface-900/40 p-12 text-center text-sm text-text-tertiary">
                  <SparklesIcon className="h-8 w-8 text-accent-purple" />
                  <div>
                    <p className="text-sm font-medium text-text-secondary">No highlights yet</p>
                    <p className="text-xs">Ask a question to see which skills and nodes light up.</p>
                  </div>
                </div>
              ) : (
                recentAgentMessages.map((msg) => (
                  <div
                    key={`${msg.timestamp}-${msg.agent_id}`}
                    className="rounded-2xl border border-white/5 bg-surface-900/40 p-4"
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs font-semibold text-text-primary">
                          {msg.agent_id ? AGENTS[msg.agent_id as keyof typeof AGENTS]?.name : 'Agent response'}
                        </p>
                        <p className="text-[11px] text-text-tertiary">
                          {new Date(msg.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {msg.agent_id && (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: token.agentAlpha(msg.agent_id as AgentKey, 0.15),
                            color: AGENTS[msg.agent_id as keyof typeof AGENTS]?.color
                          }}
                        >
                          Spotlight
                        </span>
                      )}
                    </div>
                    <div className="text-sm leading-relaxed text-text-secondary">
                      <MessageFormatter content={msg.content} maxLines={6} />
                    </div>
                  </div>
                ))
              )}
            </div>
            )}
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

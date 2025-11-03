import { useState, useEffect, useCallback, useRef } from 'react';
import type { Message, ChatMode, Citation, ConsensusData, ThinkTankSystemMessage } from '../types';
import { config } from '../config';

const WS_URL = config.wsUrl;

export const useWebSocket = (onHighlight?: (highlightData: any) => void) => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [typingAgent, setTypingAgent] = useState<string | null>(null);

  // Think Tank mode specific state
  const [thinkTankCitations, setThinkTankCitations] = useState<Citation[]>([]);
  const [thinkTankConsensus, setThinkTankConsensus] = useState<ConsensusData | null>(null);
  const [thinkTankCurrentRound, setThinkTankCurrentRound] = useState<number>(0);
  const [thinkTankMaxRounds, setThinkTankMaxRounds] = useState<number>(5);
  const [thinkTankRoundStatus, setThinkTankRoundStatus] = useState<'active' | 'complete' | 'waiting'>('waiting');
  const [thinkTankAgentsResponded, setThinkTankAgentsResponded] = useState<number>(0);
  const [thinkTankSummary, setThinkTankSummary] = useState<string>('');

  const wsRef = useRef<WebSocket | null>(null);
  const streamingMessagesRef = useRef<Record<string, string>>({});
  const thinkTankSummaryRef = useRef<string>('');

  // PRODUCTION-READY: Persistent browser session ID (shared across tabs)
  const getBrowserSessionId = (): string => {
    let sessionId = localStorage.getItem('browser_session_id');
    if (!sessionId) {
      // Generate new session ID for this browser
      sessionId = `browser_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('browser_session_id', sessionId);
      console.log('🆔 Created new browser session ID:', sessionId);
    }
    return sessionId;
  };

  // WebSocket connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      // SINGLETON PATTERN: Prevent duplicate connections
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('⚠️ WebSocket already connected, skipping duplicate connection');
        return;
      }

      // Force close any existing connection before creating new one
      if (wsRef.current) {
        try {
          console.log('🔌 Closing existing WebSocket before creating new one');
          wsRef.current.onclose = null; // Prevent reconnect
          wsRef.current.close();
        } catch (e) {
          console.error('Error closing existing WebSocket:', e);
        }
      }

      try {
        const browserSessionId = getBrowserSessionId();
        console.log('🔌 Creating new WebSocket connection with browser_session_id:', browserSessionId);
        ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('✅ WebSocket connected');
          setConnected(true);

          // SEND BROWSER SESSION ID immediately after connection
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'register_session',
              browser_session_id: browserSessionId
            }));
            console.log('📤 Sent browser_session_id to backend');
          }
        };
        
        ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          setConnected(false);
          wsRef.current = null;
          
          // Auto-reconnect after 3 seconds
          reconnectTimeout = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connect();
          }, 3000);
        };
        
        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setConnected(false);
      }
    };
    
    // Initial connection with small delay
    const initTimeout = setTimeout(connect, 100);
    
    return () => {
      clearTimeout(initTimeout);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null; // Prevent reconnect on unmount
        ws.close();
      }
    };
  }, []);
  
  const handleWebSocketMessage = useCallback((data: any) => {
    const { type } = data;
    
    switch (type) {
      case 'connected':
        console.log('WebSocket connected:', data);
        break;
        
      case 'processing':
        setIsProcessing(true);
        break;
        
      case 'agent_typing':
        // Show "[Agent] is typing..."
        setTypingAgent(data.agent_id);
        setActiveAgents(prev => [...new Set([...prev, data.agent_id])]);
        break;
        
      case 'agent_start':
        // Agent started responding
        setTypingAgent(null);
        streamingMessagesRef.current[data.agent_id] = '';
        setActiveAgents(prev => [...new Set([...prev, data.agent_id])]);
        break;
        
      case 'agent_chunk':
        // Stream chunk by chunk
        const agentId = data.agent_id;
        const chunk = data.chunk;
        streamingMessagesRef.current[agentId] = (streamingMessagesRef.current[agentId] || '') + chunk;

        // Update the message in real-time
        setMessages(prev => {
          // Find existing streaming message from this agent (more reliable than timestamp matching)
          const existing = prev.findIndex(m => m.agent_id === agentId && m.streaming === true);
          const newMsg: Message = {
            type: 'agent',
            content: streamingMessagesRef.current[agentId],
            timestamp: data.timestamp || Date.now(),
            agent_id: agentId,
            streaming: true
          };

          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newMsg;
            return updated;
          } else {
            return [...prev, newMsg];
          }
        });
        break;
        
      case 'agent_complete':
        // Agent finished
        setTypingAgent(null);
        setActiveAgents(prev => prev.filter(id => id !== data.agent_id));
        
        // Mark message as complete
        setMessages(prev => prev.map(m => 
          m.agent_id === data.agent_id && m.streaming 
            ? { ...m, streaming: false, content: data.full_response }
            : m
        ));
        
        // Handle highlights
        if (data.highlights && onHighlight) {
          onHighlight(data.highlights);
        }
        
        delete streamingMessagesRef.current[data.agent_id];
        break;
        
      case 'all_complete':
        setIsProcessing(false);
        setTypingAgent(null);
        setActiveAgents([]);
        break;
        
      case 'error':
        console.error('WebSocket error:', data.message);
        setMessages(prev => [...prev, {
          type: 'agent',
          content: `Error: ${data.message}`,
          timestamp: Date.now()
        }]);
        setIsProcessing(false);
        setTypingAgent(null);
        break;
        
      case 'keepalive':
        // Heartbeat - no action needed
        break;

      // Think Tank Mode messages
      case 'think_tank_system':
        handleThinkTankSystemMessage(data);
        break;

      case 'think_tank_summary':
        // Final summary chunk
        handleThinkTankSummary(data);
        break;

      case 'response_complete':
        // Think Tank mode completion
        if (data.final_summary) {
          setIsProcessing(false);
          setTypingAgent(null);
          setActiveAgents([]);
        }
        break;
    }
  }, [onHighlight]);

  const handleThinkTankSystemMessage = useCallback((data: ThinkTankSystemMessage & any) => {
    switch (data.type) {
      case 'round_start':
        setThinkTankCurrentRound(data.round || 0);
        setThinkTankMaxRounds(data.max_rounds || 5);
        setThinkTankRoundStatus('active');
        setThinkTankAgentsResponded(0);
        console.log(`🔄 [Think Tank] Round ${data.round}/${data.max_rounds} started`);
        break;

      case 'citations':
        if (data.citations && data.agent_id) {
          const newCitations: Citation[] = data.citations.map((cit: any) => ({
            ...cit,
            agent_id: data.agent_id
          }));
          setThinkTankCitations(prev => [...prev, ...newCitations]);
          console.log(`📝 [Think Tank] ${newCitations.length} citations from ${data.agent_id}`);
        }
        break;

      case 'consensus_update':
        const consensusData: ConsensusData = {
          score: data.consensus || 0,
          round: thinkTankCurrentRound,
          timestamp: Date.now()
        };
        setThinkTankConsensus(consensusData);
        console.log(`🎯 [Think Tank] Consensus: ${Math.round(data.consensus * 100)}%`);
        break;

      case 'round_complete':
        setThinkTankRoundStatus('complete');
        setThinkTankAgentsResponded(data.agents_responded || 0);
        console.log(`✅ [Think Tank] Round ${thinkTankCurrentRound} complete`);
        break;

      case 'summary_start':
        setThinkTankRoundStatus('waiting');
        thinkTankSummaryRef.current = '';
        setThinkTankSummary('');
        console.log(`📝 [Think Tank] Final summary starting...`);
        break;
    }
  }, [thinkTankCurrentRound]);
  const handleThinkTankSummary = useCallback((data: any) => {
    const chunk = data.chunk || '';
    thinkTankSummaryRef.current += chunk;
    setThinkTankSummary(thinkTankSummaryRef.current);

    // Also add to messages as a special "rahil" summary message
    setMessages(prev => {
      const existing = prev.findIndex(m => m.agent_id === 'rahil_summary');
      const newMsg: Message = {
        type: 'agent',
        content: thinkTankSummaryRef.current,
        timestamp: Date.now(),
        agent_id: 'rahil_summary',  // FIX: Changed from 'rahil' to 'rahil_summary' to match the findIndex
        streaming: true
      };

      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newMsg;
        return updated;
      } else {
        return [...prev, newMsg];
      }
    });
  }, []);
  
  const sendMessage = useCallback((message: string, mode: ChatMode) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    setIsProcessing(true);
    setAgentMessages({});
    setActiveAgents([]);
    streamingMessagesRef.current = {};

    // Reset Think Tank state when starting new discussion
    if (mode === 'think_tank') {
      setThinkTankCitations([]);
      setThinkTankConsensus(null);
      setThinkTankCurrentRound(0);
      setThinkTankMaxRounds(5);
      setThinkTankRoundStatus('waiting');
      setThinkTankAgentsResponded(0);
      setThinkTankSummary('');
      thinkTankSummaryRef.current = '';
    }

    // Add user message
    setMessages(prev => [...prev, {
      type: 'user',
      content: message,
      timestamp: Date.now()
    }]);

    // Send via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'chat',
      message,
      mode
    }));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setAgentMessages({});
    // Reset Think Tank state
    setThinkTankCitations([]);
    setThinkTankConsensus(null);
    setThinkTankCurrentRound(0);
    setThinkTankMaxRounds(5);
    setThinkTankRoundStatus('waiting');
    setThinkTankAgentsResponded(0);
    setThinkTankSummary('');
    thinkTankSummaryRef.current = '';
  }, []);

  return {
    connected,
    messages,
    agentMessages,
    activeAgents,
    isProcessing,
    typingAgent,
    sendMessage,
    clearMessages,
    // Think Tank state
    thinkTank: {
      citations: thinkTankCitations,
      consensus: thinkTankConsensus,
      currentRound: thinkTankCurrentRound,
      maxRounds: thinkTankMaxRounds,
      roundStatus: thinkTankRoundStatus,
      agentsResponded: thinkTankAgentsResponded,
      summary: thinkTankSummary,
    }
  };
};

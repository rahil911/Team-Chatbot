import { useState, useEffect, useCallback, useRef } from 'react';
import type { Message, ChatMode } from '../types';
import { config } from '../config';

const WS_URL = config.wsUrl;

export const useWebSocket = (onHighlight?: (highlightData: any) => void) => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [typingAgent, setTypingAgent] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamingMessagesRef = useRef<Record<string, string>>({});
  
  // WebSocket connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const connect = () => {
      try {
        ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('✅ WebSocket connected');
          setConnected(true);
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
          const existing = prev.findIndex(m => m.agent_id === agentId && m.timestamp === data.timestamp);
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
    }
  }, [onHighlight]);
  
  const sendMessage = useCallback((message: string, mode: ChatMode) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }
    
    setIsProcessing(true);
    setAgentMessages({});
    setActiveAgents([]);
    streamingMessagesRef.current = {};
    
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
  }, []);
  
  return {
    connected,
    messages,
    agentMessages,
    activeAgents,
    isProcessing,
    typingAgent,
    sendMessage,
    clearMessages
  };
};

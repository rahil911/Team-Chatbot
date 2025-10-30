// TypeScript type definitions for the AI Team Dashboard

export interface Agent {
  name: string;
  title: string;
  color: string;
  voice: string;
}

export interface AgentMap {
  [key: string]: Agent;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  person: string;
  color: string;
  properties?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  relationship: string;
}

export interface CytoscapeElement {
  data: GraphNode | GraphEdge;
  classes?: string;
}

export interface HighlightNode {
  id: string;
  color: string;
  intensity: number;
  pulse: boolean;
  agent: string;
}

export interface HighlightEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
}

export interface HighlightData {
  nodes: HighlightNode[];
  edges: HighlightEdge[];
  agent_id: string;
  agent_color: string;
}

export interface Message {
  type: 'user' | 'agent';
  agent_id?: string;
  content: string;
  timestamp: number;
  streaming?: boolean;
}

export interface AgentMessage {
  [agentId: string]: string;
}

export type ChatMode = 'group' | 'orchestrator';

export interface WebSocketMessage {
  type: string;
  agent_id?: string;
  agent_name?: string;
  chunk?: string;
  full_response?: string;
  highlights?: HighlightData;
  message?: string;
  text?: string;
  audio?: string;
  [key: string]: any;
}


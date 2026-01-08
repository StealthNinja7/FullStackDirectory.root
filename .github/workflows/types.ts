types.ts
export interface NodeStatus {
  id: string;
  load: number;
  status: 'HEALTHY' | 'STRESSED' | 'OFFLINE';
}

export interface SystemStatus {
  online: boolean;
  powerLevel: number;
  temperature: number;
  activeModules: string[];
  nodeCount: number;
  nodes: NodeStatus[];
  cacheHitRate: number;
  dbLatency: number;
  requestsPerSecond: number;
}

export interface CoreResponse {
  message: string;
  protocolType: 'NEUTRAL' | 'CELEBRATION' | 'ALERT' | 'INFRASTRUCTURE';
  timestamp: string;
  recommendation?: string;
}

export enum ProtocolStatus {
  READY = 'READY',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  STRESS_TEST = 'STRESS_TEST'
}
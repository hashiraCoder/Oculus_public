export interface LivenessDTO {
  alive: boolean;
}

export interface HealthDTO {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
  env: string;
}

export interface ReadinessDTO {
  ready: boolean;
  database: 'connected' | 'disconnected' | 'unknown';
  redis: 'connected' | 'degraded' | 'disconnected' | 'unknown';
  queues: 'ready' | 'unavailable' | 'unknown';
}

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';

export interface SystemInfoViewModel {
  status: HealthStatus;
  version: string;
  uptimeSeconds: number;
  uptimeFormatted: string;
  environment: string;
  lastChecked: Date;
}

export interface ServiceHealthViewModel {
  name: string;
  status: HealthStatus;
  details: string;
  lastChecked: Date;
}

export interface PlatformReadinessViewModel {
  isReady: boolean;
  database: ServiceHealthViewModel;
  redis: ServiceHealthViewModel;
  queues: ServiceHealthViewModel;
  lastChecked: Date;
}

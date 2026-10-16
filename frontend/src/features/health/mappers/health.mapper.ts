import type { HealthStatus } from '../types/health.types';
import type { SystemInfoViewModel, PlatformReadinessViewModel } from '../types/health.types';
import type { HealthDTO, ReadinessDTO } from '../dto/health.dto';

export const healthMapper = {
  mapStatus(rawStatus: string): HealthStatus {
    switch (rawStatus.toLowerCase()) {
      case 'connected':
      case 'ready':
      case 'ok':
        return 'HEALTHY';
      case 'degraded':
        return 'DEGRADED';
      case 'disconnected':
      case 'unavailable':
        return 'UNHEALTHY';
      default:
        return 'UNKNOWN';
    }
  },

  toSystemInfo(dto: HealthDTO): SystemInfoViewModel {
    const days = Math.floor(dto.uptime / 86400);
    const hours = Math.floor((dto.uptime % 86400) / 3600);
    const minutes = Math.floor((dto.uptime % 3600) / 60);
    
    let uptimeFormatted = '';
    if (days > 0) uptimeFormatted += `${days}d `;
    if (hours > 0) uptimeFormatted += `${hours}h `;
    uptimeFormatted += `${minutes}m`;

    return {
      status: this.mapStatus(dto.status),
      version: dto.version || 'unknown',
      uptimeSeconds: dto.uptime,
      uptimeFormatted: uptimeFormatted.trim() || 'Just started',
      environment: dto.env || 'unknown',
      lastChecked: new Date()
    };
  },

  toPlatformReadiness(dto: ReadinessDTO): PlatformReadinessViewModel {
    return {
      isReady: dto.ready,
      database: {
        name: 'PostgreSQL Database',
        status: this.mapStatus(dto.database),
        details: dto.database === 'connected' ? 'Connected and querying successfully' : 'Unable to connect to database pool',
        lastChecked: new Date()
      },
      redis: {
        name: 'Redis Cache & PubSub',
        status: this.mapStatus(dto.redis),
        details: dto.redis === 'connected' ? 'PONG received' : (dto.redis === 'degraded' ? 'Degraded performance' : 'Disconnected'),
        lastChecked: new Date()
      },
      queues: {
        name: 'BullMQ Job Workers',
        status: this.mapStatus(dto.queues),
        details: dto.queues === 'ready' ? 'Worker queues active' : 'Workers unavailable',
        lastChecked: new Date()
      },
      lastChecked: new Date()
    };
  }
};

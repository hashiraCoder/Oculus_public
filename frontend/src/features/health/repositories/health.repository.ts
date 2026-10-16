import { healthApi } from '../api/healthApi';
import { healthMapper } from '../mappers/health.mapper';
import type { SystemInfoViewModel, PlatformReadinessViewModel } from '../types/health.types';
import axios from 'axios';

export const healthRepository = {
  checkLiveness: async (): Promise<boolean> => {
    try {
      const dto = await healthApi.getLiveness();
      if (typeof dto !== 'object' || dto === null) return false;
      return dto.alive === true;
    } catch {
      return false;
    }
  },

  getSystemInfo: async (): Promise<SystemInfoViewModel> => {
    const dto = await healthApi.getHealth();
    return healthMapper.toSystemInfo(dto);
  },

  getReadiness: async (): Promise<PlatformReadinessViewModel> => {
    try {
      const dto = await healthApi.getReadiness();
      return healthMapper.toPlatformReadiness(dto);
    } catch (error) {
      // Intercept 503 errors if they contain valid JSON structural payloads
      if (axios.isAxiosError(error) && error.response?.status === 503 && error.response.data) {
        const payload = error.response.data;
        if ('ready' in payload && ('database' in payload || 'redis' in payload)) {
          return healthMapper.toPlatformReadiness(payload as any);
        }
      }
      throw error;
    }
  }
};

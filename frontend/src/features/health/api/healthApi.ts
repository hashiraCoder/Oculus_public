import platformClient from '@/lib/platformClient';
import type { LivenessDTO, HealthDTO, ReadinessDTO } from '../dto/health.dto';

export const healthApi = {
  getLiveness: async (): Promise<LivenessDTO> => {
    const res = await platformClient.get('/liveness');
    return res.data;
  },

  getHealth: async (): Promise<HealthDTO> => {
    const res = await platformClient.get('/health');
    return res.data;
  },

  getReadiness: async (): Promise<ReadinessDTO> => {
    // Axios throws on 503, but the repo layer will intercept it
    const res = await platformClient.get('/readiness');
    return res.data;
  }
};

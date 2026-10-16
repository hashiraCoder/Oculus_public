import { useQuery } from '@tanstack/react-query';
import { healthRepository } from '../repositories/health.repository';
import { healthKeys } from '../api/health.keys';
import { AxiosError } from 'axios';

// Smart retry config avoiding unnecessary retries for 401/404
const retryPolicy = (failureCount: number, error: unknown) => {
  if (error instanceof AxiosError) {
    if (error.response?.status === 401 || error.response?.status === 404) return false;
  }
  return failureCount < 3;
};

export const useLiveness = () => {
  return useQuery({
    queryKey: healthKeys.liveness(),
    queryFn: healthRepository.checkLiveness,
    refetchInterval: 10 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 5 * 1000,
    retry: retryPolicy,
  });
};

export const useReadiness = () => {
  return useQuery({
    queryKey: healthKeys.readiness(),
    queryFn: healthRepository.getReadiness,
    refetchInterval: 15 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 10 * 1000,
    retry: retryPolicy,
  });
};

export const useSystemInfo = () => {
  return useQuery({
    queryKey: healthKeys.systemInfo(),
    queryFn: healthRepository.getSystemInfo,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 30 * 1000,
    retry: retryPolicy,
  });
};

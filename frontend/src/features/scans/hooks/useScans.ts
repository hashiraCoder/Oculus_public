import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { scanRepository } from '../repositories/scan.repository';
import { scanKeys } from '../api/scan.keys';
import { scanApi } from '../api/scanApi';

export const useScanHistory = (repositoryId: string | null) => {
  return useInfiniteQuery({
    queryKey: scanKeys.list(repositoryId || ''),
    queryFn: ({ pageParam }) => scanRepository.listScans(repositoryId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!repositoryId,
  });
};

export const useScanDetails = (scanId: string | null) => {
  return useQuery({
    queryKey: scanKeys.detail(scanId || ''),
    queryFn: () => scanRepository.getScanDetails(scanId!),
    enabled: !!scanId,
    refetchInterval: (query) => {
      const scan = query.state.data;
      if (scan && !scan.isCompleted) {
        return 2000;
      }
      return false;
    }
  });
};

export const useScanTimeline = (scanId: string | null) => {
  return useQuery({
    queryKey: scanKeys.timeline(scanId || ''),
    queryFn: () => scanRepository.getScanTimeline(scanId!),
    enabled: !!scanId,
    refetchInterval: 3000,
  });
};

export const useScanLogs = (scanId: string | null) => {
  return useQuery({
    queryKey: scanKeys.logs(scanId || ''),
    queryFn: () => scanRepository.getScanLogs(scanId!),
    enabled: !!scanId,
    refetchInterval: 3000,
  });
};

// Re-export the existing vulnerabilities hook (we will keep it in findings, but import it here if needed)
import axiosInstance from '@/lib/axios';

export const useScanVulnerabilities = (scanId: string) => {
  return useInfiniteQuery({
    queryKey: scanKeys.findings(scanId),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.append('cursor', pageParam as string);
      params.append('limit', '50');
      const { data } = await axiosInstance.get(`/pagination/vulnerabilities/${scanId}?${params.toString()}`);
      return data.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!scanId,
  });
};

export const useScanGateStatus = (scanId: string | null) => {
  return useQuery({
    queryKey: scanKeys.gate(scanId || ''),
    queryFn: () => scanApi.getScanGateStatus(scanId!),
    enabled: !!scanId,
    // Only useful once a scan has finished; stale data is fine after 30s
    staleTime: 30_000,
  });
};

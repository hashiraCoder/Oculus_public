import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scanRepository } from '../repositories/scan.repository';
import { scanKeys } from '../api/scan.keys';
import { scanApi, type TriggerScanRequest } from '../api/scanApi';
import { repositoryKeys } from '@/features/repositories/api/repository.keys';
import { toast } from 'sonner';

export const useTriggerScan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: TriggerScanRequest) => scanApi.triggerScan(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: scanKeys.list(variables.repositoryId) });
      queryClient.invalidateQueries({ queryKey: repositoryKeys.lists() });
      toast.success('Scan queued successfully.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to trigger scan.');
    }
  });
};

export const useCancelScan = (scanId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => scanRepository.cancelScan(scanId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: scanKeys.detail(scanId) });
      const previousScan = queryClient.getQueryData(scanKeys.detail(scanId));

      // Optimistically update to Cancelling
      if (previousScan) {
        queryClient.setQueryData(scanKeys.detail(scanId), {
          ...(previousScan as any),
          status: 'CANCELLING',
          cancelRequested: true
        });
      }
      return { previousScan };
    },
    onError: (err: any, _, context) => {
      if (context?.previousScan) {
        queryClient.setQueryData(scanKeys.detail(scanId), context.previousScan);
      }
      const status = err?.response?.status;
      if (status === 409) {
        toast.error('Cannot cancel a completed scan.');
      } else {
        toast.error('Failed to cancel scan.');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scanKeys.detail(scanId) });
    }
  });
};

export const useRetryScan = (scanId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => scanRepository.retryScan(scanId),
    onSuccess: () => {
      toast.success('Scan retry queued.');
      queryClient.invalidateQueries({ queryKey: scanKeys.detail(scanId) });
      queryClient.invalidateQueries({ queryKey: scanKeys.timeline(scanId) });
      queryClient.invalidateQueries({ queryKey: scanKeys.logs(scanId) });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to retry scan.');
    }
  });
};

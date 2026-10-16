import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { findingRepository } from '../repositories/finding.repository';
import { findingKeys } from '../api/finding.keys';
import { findingApi } from '../api/findingApi';
import type { FindingFilters, FindingStatus, FindingRowViewModel } from '../types/finding.types';
import { toast } from 'sonner';

export const useInfiniteFindings = (workspaceId: string | undefined, filters: FindingFilters) => {
  return useInfiniteQuery({
    queryKey: findingKeys.list(workspaceId || '', filters),
    queryFn: ({ pageParam }) => findingRepository.listWorkspaceFindings(workspaceId!, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!workspaceId,
  });
};

export const useFindingAudit = (workspaceId: string | undefined, findingId: string | undefined) => {
  return useQuery({
    queryKey: findingKeys.audit(workspaceId || '', findingId || ''),
    queryFn: () => findingRepository.getAuditHistory(workspaceId!, findingId!),
    enabled: !!workspaceId && !!findingId,
  });
};

export const useUpdateFindingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      workspaceId, 
      findingId, 
      status, 
      comment 
    }: { 
      workspaceId: string; 
      findingId: string; 
      status: FindingStatus; 
      comment?: string 
    }) => findingRepository.updateStatus(workspaceId, findingId, status, comment),
    onMutate: async ({ findingId, status }) => {
      // Optimistic update for the finding lists
      await queryClient.cancelQueries({ queryKey: findingKeys.lists() });

      const previousQueries = queryClient.getQueriesData({ queryKey: findingKeys.lists() });

      queryClient.setQueriesData({ queryKey: findingKeys.lists() }, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            items: page.items.map((finding: FindingRowViewModel) => 
              finding.id === findingId ? { ...finding, status } : finding
            )
          }))
        };
      });

      return { previousQueries };
    },
    onError: (err: any, _, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(err?.response?.data?.message || 'Failed to update finding status');
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: findingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: findingKeys.audit(variables.workspaceId, variables.findingId) });
    }
  });
};

export const useBulkUpdateFindingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      workspaceId, 
      findingIds, 
      status, 
      comment 
    }: { 
      workspaceId: string; 
      findingIds: string[]; 
      status: FindingStatus; 
      comment?: string 
    }) => findingRepository.bulkUpdateStatus(workspaceId, findingIds, status, comment),
    onSuccess: () => {
      toast.success('Bulk triage successful');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to bulk update findings');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: findingKeys.lists() });
    }
  });
};

export const useFingerprintHistory = (workspaceId: string | undefined, fingerprint: string | undefined) => {
  return useQuery({
    queryKey: findingKeys.history(workspaceId || '', fingerprint || ''),
    queryFn: () => findingApi.getFingerprintHistory(workspaceId!, fingerprint!),
    enabled: !!workspaceId && !!fingerprint,
    staleTime: 60_000, // fingerprint history doesn't change often
  });
};

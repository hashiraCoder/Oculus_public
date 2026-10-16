import { useMutation } from '@tanstack/react-query';
import { exportApi } from '../api/exportApi';
import { useState, useRef } from 'react';
import { toast } from 'sonner';

type ExportFormat = 'json' | 'csv' | 'sarif';

export const useExportFindings = () => {
  const [status, setStatus] = useState<'idle' | 'generating' | 'downloading'>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ workspaceId, format }: { workspaceId: string, format: ExportFormat }) => {
      abortControllerRef.current = new AbortController();
      setStatus('generating');
      
      // Simulate preparing state briefly for UX (in real enterprise this might be a longer async polling process)
      await new Promise(resolve => setTimeout(resolve, 800));
      setStatus('downloading');
      
      await exportApi.exportFindings(workspaceId, format, abortControllerRef.current.signal);
    },
    onSuccess: () => {
      toast.success('Export downloaded successfully');
    },
    onError: (error: any) => {
      if (error.name === 'CanceledError' || error.message?.includes('canceled')) {
        toast.info('Export cancelled');
      } else {
        toast.error('Failed to export findings');
      }
    },
    onSettled: () => {
      setStatus('idle');
      abortControllerRef.current = null;
    },
    retry: false // Never retry downloads
  });

  const cancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return {
    ...mutation,
    status,
    cancel
  };
};

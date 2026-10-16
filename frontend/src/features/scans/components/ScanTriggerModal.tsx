import React, { useState } from 'react';
import { Shield, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRepositories } from '@/features/repositories/hooks/useRepositories';
import { useTriggerScan } from '../hooks/useScanMutations';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import type { Repository } from '@/types/common.types';

interface ScanTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRepoId?: string;
}

export const ScanTriggerModal: React.FC<ScanTriggerModalProps> = ({
  isOpen,
  onClose,
  defaultRepoId,
}) => {
  const activeWorkspaceId = useWorkspaceStore((state: any) => state.activeWorkspaceId);
  const { data: repoData } = useRepositories(activeWorkspaceId);
  const repositories: Repository[] = repoData?.pages.flatMap((page) => page?.items ?? []) ?? [];
  
  const [selectedRepoId, setSelectedRepoId] = useState<string>(defaultRepoId || '');
  const [branch, setBranch] = useState<string>('main');
  const triggerScanMutation = useTriggerScan();

  const firstRepoId = repositories[0]?.id;

  React.useEffect(() => {
    if (defaultRepoId) {
      setSelectedRepoId(defaultRepoId);
    } else if (firstRepoId && !selectedRepoId) {
      setSelectedRepoId(firstRepoId);
    }
  }, [defaultRepoId, firstRepoId, selectedRepoId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepoId) return;

    triggerScanMutation.mutate(
      {
        repositoryId: selectedRepoId,
        branch: branch.trim() || 'main',
        triggerSource: 'MANUAL_DASHBOARD',
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-root/80 backdrop-blur-xs animate-fade-in select-none">
      <div 
        className="w-full max-w-md bg-bg-surface border border-border-normal rounded-xl shadow-modal overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-bg-surface">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-base" />
            <h3 className="font-semibold text-sm text-text-primary">Trigger Security Scan</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Target Repository
              </label>
              <select
                value={selectedRepoId}
                onChange={(e) => setSelectedRepoId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-base border border-border-normal rounded-md text-xs text-text-primary focus:border-primary-base focus:outline-none transition-colors"
                required
              >
                {repositories.length === 0 ? (
                  <option value="">No repositories available</option>
                ) : (
                  repositories.map((repo: Repository) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.full_name || repo.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Branch / Ref
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full px-3 py-2 bg-bg-base border border-border-normal rounded-md text-xs text-text-primary focus:border-primary-base focus:outline-none transition-colors"
              />
            </div>

            <div className="p-3 rounded-md bg-bg-base border border-border-subtle space-y-2">
              <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider block">
                Enabled Security Engines
              </span>
              <div className="space-y-1.5 text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-base" />
                  <span>SAST Static Analysis (Semgrep Engine)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-base" />
                  <span>Secret & Token Leak Scanner</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-base" />
                  <span>Dependency Vulnerability Audit</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-subtle bg-bg-surface-alt">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              size="sm" 
              isLoading={triggerScanMutation.isPending}
              disabled={!selectedRepoId || repositories.length === 0}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Scan</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, GitBranch, Shield, Loader2, 
  RotateCw, Play, LayoutGrid, List
} from 'lucide-react';
import { useRepositories } from '../hooks/useRepositories';
import { useScanHistory } from '@/features/scans/hooks/useScans';
import { useTriggerScan } from '@/features/scans/hooks/useScanMutations';
import { useSyncGithub } from '@/features/github/hooks/useGithub';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Drawer } from '@/components/ui/drawer';
import { ScanStatusChip } from '@/components/security/ScanStatusChip';

export const RepositoriesPage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const searchTerm = searchParams.get('q') || '';
  const selectedRepoId = searchParams.get('repoId');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [scanningRepoId, setScanningRepoId] = useState<string | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useRepositories(workspaceId || '');
  const { mutate: syncGithub, isPending: isSyncing } = useSyncGithub();
  const { mutateAsync: triggerScan, isPending: isTriggeringScan } = useTriggerScan();

  const allRepositories = data?.pages.flatMap((page) => page?.items ?? []) ?? [];
  const selectedRepo = allRepositories.find(r => r.id === selectedRepoId);
  const { data: selectedRepoScans } = useScanHistory(selectedRepoId);
  const recentScans = selectedRepoScans?.pages.flatMap((page) => page?.items ?? []).slice(0, 5) ?? [];

  const filteredRepositories = allRepositories
    .filter((repo) => (repo.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                      (repo.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (b.current_risk_score || 0) - (a.current_risk_score || 0));

  const handleSearch = (q: string) => {
    setSearchParams(prev => {
      if (q) prev.set('q', q);
      else prev.delete('q');
      return prev;
    });
  };

  const handleSelect = (id: string | null) => {
    setSearchParams(prev => {
      if (id) prev.set('repoId', id);
      else prev.delete('repoId');
      return prev;
    });
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    if (score >= 40) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-[1400px] mx-auto animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Monitored Repositories</h1>
          <p className="text-xs text-text-secondary mt-0.5">Continuous security scanning across synchronized GitHub repositories</p>
        </div>
        <Button
          onClick={() => {
            if (workspaceId) syncGithub({ workspaceId, installationId: null });
          }}
          disabled={isSyncing}
          variant="secondary"
          size="sm"
        >
          {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
          <span>{isSyncing ? 'Syncing...' : 'Sync GitHub'}</span>
        </Button>
      </div>

      {/* Filter and View Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary h-3.5 w-3.5" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-bg-surface border border-border-normal rounded-md text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary-base focus:outline-none transition-colors"
          />
        </div>
        
        <div className="flex items-center border border-border-normal rounded-md bg-bg-surface p-0.5">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1 rounded text-xs transition-colors ${viewMode === 'table' ? 'bg-bg-surface-hover text-text-primary font-semibold' : 'text-text-tertiary hover:text-text-primary'}`}
            title="Table View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1 rounded text-xs transition-colors ${viewMode === 'grid' ? 'bg-bg-surface-hover text-text-primary font-semibold' : 'text-text-tertiary hover:text-text-primary'}`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Repository Listing */}
      {filteredRepositories.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No repositories found"
          description={searchTerm ? "No repositories match your search query." : "Connect your GitHub account or sync repositories to begin."}
          primaryAction={{ label: "Connect GitHub", onClick: () => navigate(`/w/${workspaceId}/settings`) }}
        />
      ) : viewMode === 'table' ? (
        <div className="rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border-normal bg-bg-surface-alt text-text-tertiary uppercase text-[10.5px] tracking-wider font-semibold">
                <th className="py-2.5 px-4">Repository</th>
                <th className="py-2.5 px-4">Language</th>
                <th className="py-2.5 px-4">Risk Score</th>
                <th className="py-2.5 px-4">Findings</th>
                <th className="py-2.5 px-4">Last Scanned</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredRepositories.map((repo) => {
                const score = repo.current_risk_score ?? 85;
                return (
                  <tr 
                    key={repo.id}
                    onClick={() => handleSelect(repo.id)}
                    className="hover:bg-bg-surface-hover/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 font-semibold text-text-primary">
                        <GitBranch className="w-3.5 h-3.5 text-text-tertiary" />
                        <span>{repo.name}</span>
                        {repo.is_private && (
                          <span className="text-[9.5px] font-semibold px-1 py-0.2 rounded bg-bg-base border border-border-subtle text-text-tertiary">
                            Private
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-text-tertiary font-mono truncate max-w-[280px]">
                        {repo.full_name || repo.url}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-bg-surface-alt border border-border-subtle text-[10.5px] font-medium text-text-secondary">
                        {repo.primary_language || 'TypeScript'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${getRiskColor(score)}`}>
                        {score} / 100
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {repo.critical_findings ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-risk-critical-alpha text-risk-critical border border-risk-critical-border">
                            {repo.critical_findings} crit
                          </span>
                        ) : null}
                        <span className="text-text-secondary font-medium">
                          {repo.total_findings || 0} open
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-text-tertiary text-[11px]">
                      {repo.last_scan_date ? new Date(repo.last_scan_date).toLocaleDateString() : 'Never'}
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelect(repo.id)}
                        >
                          Details
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          disabled={isTriggeringScan}
                          isLoading={isTriggeringScan && scanningRepoId === repo.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              setScanningRepoId(repo.id);
                              const result = await triggerScan({
                                repositoryId: repo.id,
                                branch: repo.default_branch || 'main',
                                triggerSource: 'MANUAL_REPOSITORIES'
                              });
                              if (result?.scanId) {
                                navigate(`/w/${workspaceId}/scans/${result.scanId}`);
                              }
                            } catch {
                              // error handled by mutation toast
                            } finally {
                              setScanningRepoId(null);
                            }
                          }}
                        >
                          <Play className="w-3 h-3" />
                          <span>Scan</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {hasNextPage && (
            <div className="p-3 border-t border-border-subtle flex justify-center bg-bg-surface-alt">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                isLoading={isFetchingNextPage}
              >
                Load More Repositories
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredRepositories.map((repo) => {
            const score = repo.current_risk_score ?? 85;
            return (
              <Card 
                key={repo.id}
                className="p-4 cursor-pointer hover:border-border-normal transition-colors flex flex-col justify-between"
                onClick={() => handleSelect(repo.id)}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-text-primary truncate flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                        <span className="truncate">{repo.name}</span>
                      </div>
                      <p className="text-[10.5px] text-text-tertiary font-mono truncate mt-0.5">
                        {repo.full_name || repo.url}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10.5px] border shrink-0 ${getRiskColor(score)}`}>
                      {score}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-4 text-[11px] text-text-secondary">
                    <span className="px-1.5 py-0.5 rounded bg-bg-surface-alt border border-border-subtle text-[10px]">
                      {repo.primary_language || 'TypeScript'}
                    </span>
                    <span>•</span>
                    <span>{repo.total_findings || 0} findings</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border-subtle text-[10.5px] text-text-tertiary">
                  <span>Last scanned {repo.last_scan_date ? new Date(repo.last_scan_date).toLocaleDateString() : 'Never'}</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-2 text-[11px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(repo.id);
                    }}
                  >
                    View
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Repository Detail Slide-Over Drawer */}
      <Drawer
        isOpen={!!selectedRepoId}
        onClose={() => handleSelect(null)}
        title={selectedRepo?.name || 'Repository Telemetry'}
        description={selectedRepo?.full_name || selectedRepo?.url}
        size="lg"
      >
        {selectedRepo ? (
          <div className="space-y-5 p-1">
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center">
                <span className="text-[10.5px] text-text-tertiary block mb-1">Risk Score</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {selectedRepo.current_risk_score ?? 85}
                </span>
              </Card>
              <Card className="p-3 text-center">
                <span className="text-[10.5px] text-text-tertiary block mb-1">Critical</span>
                <span className="text-xl font-bold font-mono text-risk-critical">
                  {selectedRepo.critical_findings || 0}
                </span>
              </Card>
              <Card className="p-3 text-center">
                <span className="text-[10.5px] text-text-tertiary block mb-1">Total Issues</span>
                <span className="text-xl font-bold font-mono text-text-primary">
                  {selectedRepo.total_findings || 0}
                </span>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                size="sm"
                onClick={async () => {
                  const result = await triggerScan({
                    repositoryId: selectedRepo.id,
                    branch: selectedRepo.default_branch || 'main',
                    triggerSource: 'MANUAL_REPOSITORIES'
                  });
                  if (result?.scanId) {
                    navigate(`/w/${workspaceId}/scans/${result.scanId}`);
                  }
                }}
                disabled={isTriggeringScan}
                isLoading={isTriggeringScan}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Immediate Scan</span>
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                className="flex-1" 
                onClick={() => navigate(`/w/${workspaceId}/findings?repoId=${selectedRepo.id}`)}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>View Findings</span>
              </Button>
            </div>

            {/* Recent Scans for Repo */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                Scan History
              </h3>
              {recentScans.length > 0 ? (
                <div className="space-y-2">
                  {recentScans.map((scan) => (
                    <button
                      key={scan.id}
                      type="button"
                      onClick={() => navigate(`/w/${workspaceId}/scans/${scan.id}`)}
                      className="w-full flex items-center justify-between rounded-md border border-border-subtle p-2.5 text-left hover:bg-bg-surface-hover transition-colors"
                    >
                      <div>
                        <span className="font-mono text-xs font-semibold text-text-primary">
                          {scan.commitHash ? scan.commitHash.substring(0, 7) : 'main'}
                        </span>
                        <div className="text-[10px] text-text-tertiary mt-0.5">
                          {scan.startedAt ? new Date(scan.startedAt).toLocaleString() : 'Queued'}
                        </div>
                      </div>
                      <ScanStatusChip status={scan.status} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-text-tertiary border border-dashed border-border-subtle rounded-md">
                  No scan runs found for this repository.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <Skeleton className="h-48 w-full" />
          </div>
        )}
      </Drawer>
    </div>
  );
};

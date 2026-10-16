import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useScanHistory } from '../hooks/useScans';
import { useRecentScans } from '@/features/analytics/hooks/useAnalytics';
import { useRepositories } from '@/features/repositories/hooks/useRepositories';
import { 
  GitBranch, Clock, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScanStatusChip } from '@/components/security/ScanStatusChip';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ScanTriggerModal } from '../components/ScanTriggerModal';

export const ScansPage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const repoId = searchParams.get('repoId');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  const { data: repositoriesData } = useRepositories(workspaceId || '');
  const repositories = repositoriesData?.pages.flatMap((page) => page?.items ?? []) ?? [];

  // If repoId is provided, query repo scan history; otherwise query workspace-wide recent scans
  const { data: repoScansData, isLoading: loadingRepoScans } = useScanHistory(repoId);
  const { data: workspaceScans, isLoading: loadingWorkspaceScans } = useRecentScans(workspaceId);

  const isLoading = repoId ? loadingRepoScans : loadingWorkspaceScans;

  let scansList: any[] = [];
  if (repoId) {
    scansList = repoScansData?.pages.flatMap((page) => page?.items ?? []) ?? [];
  } else if (workspaceScans) {
    scansList = workspaceScans.map((s: any) => ({
      id: s.id,
      repositoryId: s.repository_id || s.repositoryId,
      repoName: s.repo_name || s.repository?.name || 'Repository',
      commitHash: s.commit_hash || s.commitHash || 'main',
      status: s.status,
      durationMs: s.duration_ms || s.durationMs,
      totalFindings: s.total_findings || s.totalFindings || 0,
      startedAt: s.started_at || s.created_at || s.startedAt,
      triggeredBy: s.triggered_by || 'CI Pipeline',
    }));
  }

  const filteredScans = scansList.filter((scan) => {
    if (statusFilter === 'ALL') return true;
    const normStatus = (scan.status || '').toUpperCase();
    if (statusFilter === 'COMPLETED') return normStatus === 'PASSED' || normStatus === 'COMPLETED';
    if (statusFilter === 'ANALYZING') return ['SCANNING', 'ANALYZING', 'ACQUIRING_SOURCE'].includes(normStatus);
    if (statusFilter === 'FAILED') return normStatus === 'FAILED' || normStatus === 'CANCELLED';
    if (statusFilter === 'QUEUED') return normStatus === 'QUEUED';
    return true;
  });

  const handleRepoChange = (selectedId: string) => {
    setSearchParams((prev) => {
      if (selectedId) prev.set('repoId', selectedId);
      else prev.delete('repoId');
      return prev;
    });
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Security Pipeline Scans</h1>
          <p className="text-xs text-text-secondary mt-0.5">Continuous SAST, secret leak, and dependency audit execution logs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="default" 
            size="sm"
            onClick={() => setIsScanModalOpen(true)}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run New Scan</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-surface border border-border-subtle p-2.5 rounded-lg">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {['ALL', 'COMPLETED', 'ANALYZING', 'FAILED', 'QUEUED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                statusFilter === tab 
                  ? 'bg-bg-surface-hover text-text-primary border border-border-normal' 
                  : 'text-text-tertiary hover:text-text-primary border border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Repository Dropdown Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-tertiary font-semibold uppercase tracking-wider whitespace-nowrap">
            Repo:
          </span>
          <select
            value={repoId || ''}
            onChange={(e) => handleRepoChange(e.target.value)}
            className="px-2.5 py-1 bg-bg-base border border-border-normal rounded text-xs text-text-primary focus:border-primary-base focus:outline-none transition-colors"
          >
            <option value="">All Monitored Repositories</option>
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scans Table */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded" />
            ))}
          </div>
        ) : filteredScans.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No Scans Found"
            description="No scan execution records match your active filter."
            primaryAction={{ label: "Run Scan", onClick: () => setIsScanModalOpen(true) }}
          />
        ) : (
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border-normal bg-bg-surface-alt text-text-tertiary uppercase text-[10.5px] tracking-wider font-semibold">
                <th className="py-2.5 px-4">Repository / Ref</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Trigger Source</th>
                <th className="py-2.5 px-4">Duration</th>
                <th className="py-2.5 px-4">Findings</th>
                <th className="py-2.5 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredScans.map((scan) => {
                const dateStr = scan.startedAt;
                const dateObj = dateStr ? new Date(dateStr) : null;
                const formattedDate = dateObj && !isNaN(dateObj.getTime()) 
                  ? dateObj.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Pending';

                return (
                  <tr
                    key={scan.id}
                    onClick={() => navigate(`/w/${workspaceId}/scans/${scan.id}`)}
                    className="hover:bg-bg-surface-hover/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 font-semibold text-text-primary">
                        <GitBranch className="w-3.5 h-3.5 text-text-tertiary" />
                        <span>{scan.repoName || 'Repository'}</span>
                      </div>
                      <div className="font-mono text-[10.5px] text-text-tertiary mt-0.5">
                        {scan.commitHash ? `commit ${scan.commitHash.substring(0, 7)}` : 'main'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <ScanStatusChip status={scan.status} />
                    </td>

                    <td className="py-3 px-4 text-text-secondary text-[11px]">
                      {scan.triggeredBy || 'GitHub Webhook'}
                    </td>

                    <td className="py-3 px-4 font-mono text-text-secondary">
                      {scan.durationMs ? `${(scan.durationMs / 1000).toFixed(1)}s` : '—'}
                    </td>

                    <td className="py-3 px-4">
                      {scan.totalFindings > 0 ? (
                        <span className="font-semibold text-risk-high">
                          {scan.totalFindings} detected
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium">
                          0 findings
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-text-tertiary text-[11px]">
                      {formattedDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Scan Modal */}
      <ScanTriggerModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        defaultRepoId={repoId || undefined}
      />
    </div>
  );
};

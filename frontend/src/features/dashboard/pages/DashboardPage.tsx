import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Shield, AlertOctagon, GitBranch, AlertTriangle, AlertCircle, XOctagon, 
  RotateCw, ArrowRight, Clock
} from 'lucide-react';
import { 
  useSecurityPosture, 
  useRiskTrend, 
  useFindingDistribution, 
  useRecentScans 
} from '../../analytics/hooks/useAnalytics';
import { analyticsKeys } from '../../analytics/api/analytics.keys';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useSyncGithub } from '@/features/github/hooks/useGithub';
import { ScanStatusChip } from '@/components/security/ScanStatusChip';
import { SeverityBadge } from '@/components/security/SeverityBadge';
import { getSocket } from '@/socket/socketClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ScanTriggerModal } from '@/features/scans/components/ScanTriggerModal';

const SOCKET_EVENTS = {
  DASHBOARD_SUMMARY_UPDATED: 'dashboard.summary.updated',
  GITHUB_SYNC_COMPLETED: 'github_sync_completed'
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const activeWorkspaceId = useWorkspaceStore((state: any) => state.activeWorkspaceId);
  const queryClient = useQueryClient();
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  const { data: posture, isLoading: loadingPosture } = useSecurityPosture(activeWorkspaceId);
  const { data: riskTrend, isLoading: loadingTrend } = useRiskTrend(activeWorkspaceId);
  const { data: findings, isLoading: loadingFindings } = useFindingDistribution(activeWorkspaceId);
  const { data: scanHistory, isLoading: loadingScans } = useRecentScans(activeWorkspaceId);

  const syncGithubMutation = useSyncGithub();

  useEffect(() => {
    if (!activeWorkspaceId) return;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.workspace(activeWorkspaceId) });
    };

    const activeSocket = getSocket();
    if (activeSocket) {
      activeSocket.on(SOCKET_EVENTS.DASHBOARD_SUMMARY_UPDATED, handleUpdate);
      activeSocket.on(SOCKET_EVENTS.GITHUB_SYNC_COMPLETED, handleUpdate);
      return () => {
        activeSocket.off(SOCKET_EVENTS.DASHBOARD_SUMMARY_UPDATED, handleUpdate);
        activeSocket.off(SOCKET_EVENTS.GITHUB_SYNC_COMPLETED, handleUpdate);
      };
    }
  }, [activeWorkspaceId, queryClient]);

  if (!activeWorkspaceId) {
    return (
      <EmptyState
        title="No Workspace Selected"
        description="Please select or create a workspace to view the dashboard."
        className="h-full"
      />
    );
  }

  const handleSyncGithub = () => {
    syncGithubMutation.mutate({
      workspaceId: activeWorkspaceId,
      installationId: null,
    });
  };

  const score = posture?.score ?? 78;
  const grade = posture?.grade ?? 'B';
  const openCount = posture?.openCount ?? 0;
  const criticalCount = posture?.criticalCount ?? 0;
  const coverage = posture?.coverage ?? 0;
  const blockedPRs = posture?.blockedPRs ?? 0;

  // Calculate high findings from findings distribution or fallback
  const highCount = findings?.reduce((acc: number, f: any) => acc + (f.count || 0), 0) || 0;

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header with real Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Security Operations Overview</h1>
          <p className="text-xs text-text-secondary mt-0.5">Real-time threat detection, repository risk grades, and continuous pipeline checks</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleSyncGithub}
            isLoading={syncGithubMutation.isPending}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Sync GitHub</span>
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => setIsScanModalOpen(true)}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Scan Repository</span>
          </Button>
        </div>
      </div>

      {/* Top Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Posture & Grade */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-text-secondary">
            <span>Security Posture</span>
            <span className="px-1.5 py-0.2 rounded text-[10.5px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              Grade {grade}
            </span>
          </div>
          <div className="flex items-center gap-2.5 mt-2">
            {loadingPosture ? (
              <Skeleton className="w-9 h-9 rounded-md" />
            ) : (
              <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-base flex items-center justify-center shrink-0">
                {score}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-text-primary truncate">
                {score > 80 ? 'Low Risk' : score > 50 ? 'Moderate' : 'High Risk'}
              </div>
              <div className="text-[10px] text-text-tertiary truncate">Across {coverage} repos</div>
            </div>
          </div>
        </Card>

        {/* Card 2: Critical Findings */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-text-secondary">
            <span>Critical Findings</span>
            <AlertCircle className="w-3.5 h-3.5 text-risk-critical" />
          </div>
          <div className="mt-2">
            {loadingPosture ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-risk-critical">{criticalCount}</span>
                <span className="text-[10.5px] font-semibold text-risk-critical">Urgent</span>
              </div>
            )}
          </div>
        </Card>

        {/* Card 3: High Severity */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-text-secondary">
            <span>High Severity</span>
            <AlertTriangle className="w-3.5 h-3.5 text-risk-high" />
          </div>
          <div className="mt-2">
            {loadingPosture ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-risk-high">{highCount > 0 ? highCount : (openCount > 0 ? Math.min(openCount, 4) : 0)}</span>
                <span className="text-[10.5px] font-semibold text-text-tertiary">Active</span>
              </div>
            )}
          </div>
        </Card>

        {/* Card 4: Total Open Issues */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-text-secondary">
            <span>Total Open Issues</span>
            <AlertOctagon className="w-3.5 h-3.5 text-text-tertiary" />
          </div>
          <div className="mt-2">
            {loadingPosture ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-text-primary">{openCount}</span>
                <span className="text-[10.5px] font-semibold text-emerald-400">Tracked</span>
              </div>
            )}
          </div>
        </Card>

        {/* Card 5: Monitored Repositories */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-text-secondary">
            <span>Monitored Repos</span>
            <GitBranch className="w-3.5 h-3.5 text-text-tertiary" />
          </div>
          <div className="mt-2">
            {loadingPosture ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-text-primary">{coverage}</span>
                <span className="text-[10.5px] font-semibold text-emerald-400">100% active</span>
              </div>
            )}
          </div>
        </Card>

        {/* Card 6: Blocked PRs */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11.5px] font-medium text-text-secondary">
            <span>Blocked PRs</span>
            <XOctagon className="w-3.5 h-3.5 text-text-tertiary" />
          </div>
          <div className="mt-2">
            {loadingPosture ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-text-primary">{blockedPRs}</span>
                <span className="text-[10.5px] font-semibold text-text-tertiary">CI Gates</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 2-Column: Risk Trend Chart + Severity Distribution Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Security Risk Posture Trend</CardTitle>
              <CardDescription>Historical risk score over the past 30 days (Lower is safer)</CardDescription>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-bg-surface-hover text-text-tertiary border border-border-base">
              Last 30 Days
            </span>
          </CardHeader>
          <CardContent className="pt-2">
            {loadingTrend ? (
              <Skeleton className="h-[180px] w-full rounded" />
            ) : riskTrend?.length ? (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={riskTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="oculusTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      stroke="#475569" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickMargin={6}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      stroke="#475569" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickCount={4} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#13161F', 
                        border: '1px solid #242A3D', 
                        borderRadius: '6px', 
                        fontSize: '11px',
                        color: '#F8FAFC',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      name="Risk Score" 
                      stroke="#10B981" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#oculusTrendGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-xs text-text-tertiary">
                No trend data available for this workspace.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Severity Distribution Breakdown */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle>Findings by Severity</CardTitle>
            <CardDescription>Active unmitigated vulnerabilities</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-risk-critical">Critical</span>
                <span className="font-mono font-bold text-text-primary">{criticalCount}</span>
              </div>
              <div className="h-1.5 w-full bg-bg-surface-hover rounded-full overflow-hidden">
                <div 
                  className="h-full bg-risk-critical rounded-full transition-all duration-300"
                  style={{ width: `${openCount > 0 ? (criticalCount / openCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-risk-high">High</span>
                <span className="font-mono font-bold text-text-primary">{highCount}</span>
              </div>
              <div className="h-1.5 w-full bg-bg-surface-hover rounded-full overflow-hidden">
                <div 
                  className="h-full bg-risk-high rounded-full transition-all duration-300"
                  style={{ width: `${openCount > 0 ? (highCount / openCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-risk-medium">Medium</span>
                <span className="font-mono font-bold text-text-primary">
                  {Math.max(0, openCount - criticalCount - highCount)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-bg-surface-hover rounded-full overflow-hidden">
                <div 
                  className="h-full bg-risk-medium rounded-full transition-all duration-300"
                  style={{ width: `${openCount > 0 ? (Math.max(0, openCount - criticalCount - highCount) / openCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-emerald-400">Low / Info</span>
                <span className="font-mono font-bold text-text-primary">0</span>
              </div>
              <div className="h-1.5 w-full bg-bg-surface-hover rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '0%' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom 2-Column: Recent Scans + Top Vulnerabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Pipeline Scans Table */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-text-tertiary" />
              <CardTitle>Recent Pipeline Scans</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(`/w/${activeWorkspaceId}/scans`)}
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <div className="overflow-x-auto flex-1">
            {loadingScans ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            ) : scanHistory?.length ? (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-normal bg-bg-surface-alt text-text-tertiary uppercase text-[10.5px] tracking-wider font-semibold">
                    <th className="py-2.5 px-4">Repository</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {scanHistory.slice(0, 4).map((scan: any) => (
                    <tr 
                      key={scan.id} 
                      onClick={() => navigate(`/w/${activeWorkspaceId}/scans/${scan.id}`)}
                      className="hover:bg-bg-surface-hover/80 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-text-primary truncate max-w-[220px]">
                          {scan.repo_name || scan.repository?.name || 'Repository'}
                        </div>
                        <div className="font-mono text-[10.5px] text-text-tertiary truncate">
                          {scan.commit_hash ? `commit ${scan.commit_hash.slice(0, 7)}` : 'main'}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <ScanStatusChip status={scan.status} />
                      </td>
                      <td className="py-2.5 px-4 font-mono text-text-secondary">
                        {scan.duration_ms ? `${(scan.duration_ms / 1000).toFixed(1)}s` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-xs text-text-tertiary">
                No recent scan activity. Run a scan to evaluate repository security.
              </div>
            )}
          </div>
        </Card>

        {/* Requires Immediate Triage / Findings Card */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-risk-critical" />
              <CardTitle>Requires Immediate Triage</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(`/w/${activeWorkspaceId}/findings`)}
            >
              <span>Explorer</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <div className="p-4 space-y-2.5 flex-1">
            {loadingFindings ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-md" />
                ))}
              </div>
            ) : findings?.length ? (
              findings.slice(0, 3).map((f: any, index: number) => (
                <div 
                  key={index}
                  onClick={() => navigate(`/w/${activeWorkspaceId}/findings`)}
                  className="p-3 bg-bg-surface-alt border border-border-subtle rounded-md hover:border-border-normal transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <SeverityBadge severity={index === 0 ? 'CRITICAL' : 'HIGH'} size="sm" />
                    <span className="font-mono text-[10.5px] text-text-tertiary">
                      {f.count || 1} open
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-text-primary mt-1.5 truncate">
                    {f.ruleName || 'Security Policy Violation'}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-text-tertiary">
                No open critical vulnerabilities detected. Workspace is clean!
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Reusable Scan Trigger Modal */}
      <ScanTriggerModal 
        isOpen={isScanModalOpen} 
        onClose={() => setIsScanModalOpen(false)} 
      />
    </div>
  );
};

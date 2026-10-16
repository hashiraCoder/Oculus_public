import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRepositories, useRepositoryRiskTrend } from '../hooks/useRepositories';
import { useScanHistory, useScanVulnerabilities } from '@/features/scans/hooks/useScans';
import { useTriggerScan } from '@/features/scans/hooks/useScanMutations';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  ShieldAlert, GitBranch, Activity, Clock, FileCode, Play, ArrowLeft
} from 'lucide-react';
import { RiskGradeBadge } from '@/components/security/RiskGradeBadge';
import { SeverityBadge } from '@/components/security/SeverityBadge';
import { ScanStatusChip } from '@/components/security/ScanStatusChip';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const RepositoryDetailPage = () => {
  const { workspaceId, repoId } = useParams<{ workspaceId: string; repoId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'scans' | 'findings' | 'risk'>('overview');

  const { data: repositoriesData } = useRepositories(workspaceId || '');
  const { data: trendData } = useRepositoryRiskTrend(workspaceId || '', repoId || '');
  const { data: scansData } = useScanHistory(repoId || '');
  const triggerScanMutation = useTriggerScan();

  const repository = repositoriesData?.pages.flatMap((page) => page?.items ?? []).find((item) => item.id === repoId);
  
  const latestScan = scansData?.pages[0]?.items?.[0];
  const { data: findingsData } = useScanVulnerabilities(latestScan?.id || '');

  const scans = scansData?.pages.flatMap((page) => page?.items ?? []) ?? [];
  const findings = findingsData?.pages.flatMap((page) => page?.items ?? []) ?? [];
  const totalFindings = scans.reduce((sum, s: any) => sum + (s.totalFindings || 0), 0);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/w/${workspaceId}/repositories`)}
          className="gap-1.5 text-text-tertiary hover:text-text-primary"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Repositories</span>
        </Button>
      </div>

      {/* Header Card */}
      <Card className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-bg-surface-hover border border-border-normal flex items-center justify-center shrink-0">
            <GitBranch className="w-6 h-6 text-primary-base" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-text-primary">
                {repository?.name || 'Repository'}
              </h1>
              <span className="text-[10px] font-semibold text-text-tertiary px-1.5 py-0.2 rounded bg-bg-surface-alt border border-border-subtle">
                {repository?.is_private ? 'Private' : 'Public'}
              </span>
            </div>
            <p className="text-xs text-text-tertiary font-mono mt-0.5">{repository?.full_name || repository?.url}</p>
            <div className="flex items-center gap-4 text-xs text-text-secondary mt-2">
              <span className="flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" /> {repository?.default_branch || 'main'}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5 text-risk-high" /> {totalFindings} Total Findings</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-border-subtle">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">{repository?.current_risk_score || 85}</span>
              <RiskGradeBadge grade={repository?.current_risk_grade || 'B'} size="sm" />
            </div>
            <span className="text-[10.5px] text-text-tertiary">Security Posture</span>
          </div>

          <Button 
            size="sm"
            onClick={async () => {
              if (repoId) {
                const result = await triggerScanMutation.mutateAsync({ repositoryId: repoId });
                navigate(`/w/${workspaceId}/scans/${result.scanId}`);
              }
            }}
            isLoading={triggerScanMutation.isPending}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Scan</span>
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border-subtle">
        {(['overview', 'scans', 'findings', 'risk'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 px-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              activeTab === tab 
                ? 'border-primary-base text-primary-base' 
                : 'border-transparent text-text-tertiary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Security Score', value: `${repository?.current_risk_score || 85} / 100`, icon: Activity, color: 'text-emerald-400' },
              { label: 'Open Findings', value: String(totalFindings), icon: ShieldAlert, color: 'text-risk-high' },
              { label: 'Total Scans', value: scans.length.toString(), icon: Clock, color: 'text-cyan-400' },
              { label: 'Default Branch', value: repository?.default_branch || 'main', icon: GitBranch, color: 'text-text-secondary' },
            ].map((stat, i) => (
              <Card key={i} className="p-3.5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[11px] text-text-tertiary">{stat.label}</span>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <span className="text-xl font-bold font-mono text-text-primary">{stat.value}</span>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Security Posture History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRepoScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={10} domain={[0, 100]} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#13161F', border: '1px solid #242A3D', borderRadius: '6px', fontSize: '11px', color: '#F8FAFC' }} />
                    <Area type="monotone" dataKey="score" stroke="#10B981" fillOpacity={1} fill="url(#colorRepoScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'scans' && (
        <Card className="overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border-normal bg-bg-surface-alt text-text-tertiary uppercase text-[10.5px] tracking-wider font-semibold">
                <th className="py-2.5 px-4">Commit / Ref</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Findings</th>
                <th className="py-2.5 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {scans.map((scan) => (
                <tr 
                  key={scan.id} 
                  className="hover:bg-bg-surface-hover/80 cursor-pointer transition-colors" 
                  onClick={() => navigate(`/w/${workspaceId}/scans/${scan.id}`)}
                >
                  <td className="py-3 px-4 font-mono font-semibold text-text-primary">
                    {scan.commitHash?.substring(0, 7) || 'main'}
                  </td>
                  <td className="py-3 px-4">
                    <ScanStatusChip status={scan.status} />
                  </td>
                  <td className="py-3 px-4 text-text-secondary font-mono">
                    {scan.totalFindings || 0}
                  </td>
                  <td className="py-3 px-4 text-text-tertiary text-[11px]">
                    {scan.startedAt ? new Date(scan.startedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'findings' && (
        <Card className="overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border-normal bg-bg-surface-alt text-text-tertiary uppercase text-[10.5px] tracking-wider font-semibold">
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4">Rule Violation</th>
                <th className="py-2.5 px-4">File Path</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {findings.map((finding) => (
                <tr key={finding.id} className="hover:bg-bg-surface-hover/80 transition-colors">
                  <td className="py-3 px-4">
                    <SeverityBadge severity={finding.severity} size="sm" />
                  </td>
                  <td className="py-3 px-4 font-medium text-text-primary">
                    {finding.rule_type}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-text-secondary flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                    <span>{finding.file_path}</span>
                  </td>
                  <td className="py-3 px-4 text-text-tertiary uppercase text-[10px] font-semibold">
                    {finding.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === 'risk' && (
        <Card className="p-5">
          <CardTitle className="mb-4">Historical Risk Score Trajectory</CardTitle>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} domain={[0, 100]} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#13161F', border: '1px solid #242A3D', borderRadius: '6px', fontSize: '11px', color: '#F8FAFC' }} />
                <Line type="monotone" dataKey="score" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
};

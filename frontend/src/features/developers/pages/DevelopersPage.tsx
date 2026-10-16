import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { Users, Activity, ShieldAlert } from 'lucide-react';
import { developersApi } from '../api/developersApi';
import { developerKeys } from '../api/developer.keys';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Drawer } from '@/components/ui/drawer';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { ColumnDef } from '@tanstack/react-table';

export function DevelopersPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDevId = searchParams.get('devId');

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: developerKeys.leaderboard(workspaceId!),
    queryFn: () => developersApi.getLeaderboard(workspaceId!),
    enabled: !!workspaceId
  });

  const totalDevs = leaderboard?.length || 0;
  const totalRiskIntroduced = leaderboard?.reduce((acc: number, dev: any) => acc + (dev.risk_introduced || 0), 0) || 0;
  const totalRiskFixed = leaderboard?.reduce((acc: number, dev: any) => acc + (dev.risk_fixed || 0), 0) || 0;

  const hasAnyRiskIntroduced = leaderboard?.some((dev: any) => dev.risk_introduced > 0);

  const topRiskDevelopers = leaderboard
    ?.filter((dev: any) => dev.risk_introduced > 0)
    .sort((a: any, b: any) => b.risk_introduced - a.risk_introduced)
    .slice(0, 10) || [];

  const maxRiskIntroduced = topRiskDevelopers.length > 0 
    ? Math.max(...topRiskDevelopers.map((d: any) => d.risk_introduced))
    : 0;

  const selectedDev = leaderboard?.find((d: any) => d.github_username === selectedDevId);

  const handleSelect = (id: string | null) => {
    setSearchParams(prev => {
      if (id) prev.set('devId', id);
      else prev.delete('devId');
      return prev;
    });
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'github_username',
      header: 'Developer',
      cell: ({ row }) => {
        const initials = row.original.github_username?.substring(0, 2).toUpperCase() || '??';
        return (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-bg-surface-hover flex items-center justify-center text-xs font-bold text-text-primary border border-border-subtle">
              {initials}
            </div>
            <span className="font-medium text-text-primary">{row.original.github_username}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'total_prs',
      header: 'PRs',
      cell: ({ row }) => <span className="text-text-secondary">{row.original.total_prs}</span>
    },
    {
      accessorKey: 'risk_introduced',
      header: 'Risks Introduced',
      cell: ({ row }) => <span className="text-risk-critical font-medium">{row.original.risk_introduced}</span>
    },
    {
      accessorKey: 'risk_fixed',
      header: 'Risks Fixed',
      cell: ({ row }) => <span className="text-risk-low font-medium">{row.original.risk_fixed}</span>
    },
    {
      accessorKey: 'security_score',
      header: 'Security Score',
      cell: ({ row }) => {
        if (row.original.total_prs === 0) {
          return <span className="text-xs text-text-tertiary italic">Not enough data</span>;
        }
        
        const score = row.original.security_score;
        const scoreColor = score >= 80 ? 'bg-risk-low' : score >= 50 ? 'bg-risk-medium' : 'bg-risk-critical';
        return (
          <div className="flex items-center space-x-3 w-[150px]">
            <div className="w-full bg-bg-surface-hover rounded-full h-2 border border-border-subtle overflow-hidden">
              <div
                className={`${scoreColor} h-2 rounded-full transition-all duration-500`}
                style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
              />
            </div>
            <span className="text-xs text-text-secondary w-8 text-right">{score}%</span>
          </div>
        );
      }
    }
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto text-text-primary space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text-primary m-0">Developer Scorecards</h2>
        <p className="text-text-secondary mt-1 text-sm">Monitor developer security performance and training needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <span className="text-sm font-medium text-text-secondary">Total Developers</span>
          {isLoading ? <Skeleton className="h-12 w-full mt-2" /> : (
            <>
              <p className="text-3xl font-bold text-text-primary mt-2">{totalDevs}</p>
              <p className="text-xs text-text-tertiary mt-1">{totalDevs === 1 ? 'Active developer' : 'Active developers'}</p>
            </>
          )}
        </Card>
        <Card className="p-6">
          <span className="text-sm font-medium text-text-secondary">Total Risk Introduced</span>
          {isLoading ? <Skeleton className="h-12 w-full mt-2" /> : (
            <>
              <p className="text-3xl font-bold text-risk-critical mt-2">{totalRiskIntroduced}</p>
              <p className="text-xs text-text-tertiary mt-1">{totalRiskIntroduced === 1 ? 'Risk introduced' : 'Risks introduced'}</p>
            </>
          )}
        </Card>
        <Card className="p-6">
          <span className="text-sm font-medium text-text-secondary">Total Risk Fixed</span>
          {isLoading ? <Skeleton className="h-12 w-full mt-2" /> : (
            <>
              <p className="text-3xl font-bold text-risk-low mt-2">{totalRiskFixed}</p>
              <p className="text-xs text-text-tertiary mt-1">{totalRiskFixed === 1 ? 'Risk fixed' : 'Risks fixed'}</p>
            </>
          )}
        </Card>
      </div>

      {!isLoading && (!leaderboard || leaderboard.length === 0) ? (
        <EmptyState
          icon={Users}
          title="No developer data available"
          description="Developer analytics will populate once GitHub repositories are scanned and PRs are analyzed."
          className="border border-dashed border-border-base rounded-xl py-20"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable 
                  columns={columns} 
                  data={leaderboard || []} 
                  isLoading={isLoading} 
                  onRowClick={(row: any) => handleSelect(row.github_username)}
                  className="border-0 rounded-none border-t border-border-subtle"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Risk Introducers</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4 pt-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !hasAnyRiskIntroduced ? (
                <EmptyState
                  icon={ShieldAlert}
                  title="No risk introduced yet"
                  description="No security findings have been attributed to developers yet."
                  className="py-12 border border-dashed border-border-subtle rounded-lg"
                />
              ) : (
                <div className="space-y-5 pt-2">
                  {topRiskDevelopers.map((dev: any, idx: number) => {
                    const widthPct = Math.max(2, (dev.risk_introduced / maxRiskIntroduced) * 100);
                    return (
                      <div key={dev.github_username} className="space-y-2">
                        <div className="flex justify-between text-sm items-end">
                          <div className="flex items-center gap-2 text-text-primary">
                            <span className="text-text-tertiary text-xs w-4">{idx + 1}.</span>
                            <span className="font-medium truncate max-w-[150px]">{dev.github_username}</span>
                          </div>
                          <span className="text-risk-critical font-bold text-xs">{dev.risk_introduced}</span>
                        </div>
                        <div className="w-full bg-bg-surface-hover rounded-full h-1.5 overflow-hidden ml-6" style={{ width: 'calc(100% - 24px)' }}>
                          <div 
                            className="bg-risk-critical h-1.5 rounded-full" 
                            style={{ width: `${widthPct}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Developer Detail Drawer */}
      <Drawer
        isOpen={!!selectedDevId}
        onClose={() => handleSelect(null)}
        title={selectedDev?.github_username || 'Developer Profile'}
        description="Security performance and training recommendations"
        size="md"
      >
        {selectedDev ? (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-bg-surface-hover flex items-center justify-center text-xl font-bold text-text-primary border border-border-base">
                {selectedDev.github_username?.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-text-primary">{selectedDev.github_username}</h3>
                <p className="text-sm text-text-secondary">GitHub Contributor</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <span className="text-xs text-text-tertiary block mb-1">Security Score</span>
                {selectedDev.total_prs === 0 ? (
                  <span className="text-sm font-medium text-text-tertiary italic">Not enough data</span>
                ) : (
                  <span className="text-2xl font-bold text-text-primary">{selectedDev.security_score}%</span>
                )}
              </Card>
              <Card className="p-4">
                <span className="text-xs text-text-tertiary block mb-1">Total PRs Analyzed</span>
                <span className="text-2xl font-bold text-text-primary">{selectedDev.total_prs}</span>
              </Card>
              <Card className="p-4">
                <span className="text-xs text-text-tertiary block mb-1">Risks Introduced</span>
                <span className="text-2xl font-bold text-risk-critical">{selectedDev.risk_introduced}</span>
              </Card>
              <Card className="p-4">
                <span className="text-xs text-text-tertiary block mb-1">Risks Fixed</span>
                <span className="text-2xl font-bold text-risk-low">{selectedDev.risk_fixed}</span>
              </Card>
            </div>

            <div>
              <h4 className="font-medium text-text-primary mb-3">Activity Timeline</h4>
              <EmptyState 
                icon={Activity}
                title="No recent security activity" 
                description="This developer has not interacted with any findings recently."
                className="py-10 border border-dashed border-border-base rounded-xl"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

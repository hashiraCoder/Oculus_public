import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Activity, CheckCircle2, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { notificationsApi } from '@/features/notifications/api/notificationsApi';

export function ActivityPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['workspace-activity', workspaceId],
    queryFn: () => notificationsApi.getNotifications(workspaceId!),
    enabled: !!workspaceId,
  });

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5 animate-fade-in text-text-primary">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Workspace Audit Stream</h1>
        <p className="text-xs text-text-secondary mt-0.5">Real-time chronological activity, scan events, and webhook deliveries</p>
      </div>

      <Card>
        <CardHeader className="border-b border-border-subtle pb-3">
          <CardTitle className="text-xs uppercase tracking-wider text-text-tertiary">
            Event Log
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4 px-0">
          {isLoading ? (
            <p className="p-6 text-xs text-text-tertiary">Loading workspace activity...</p>
          ) : events.length === 0 ? (
            <p className="p-6 text-xs text-text-tertiary text-center">No activity recorded yet in this workspace.</p>
          ) : (
            <div className="divide-y divide-border-subtle">
              {events.map((event: any) => {
                const rawType = (event.event_type || event.notification_type || 'EVENT').toLowerCase();
                
                let payload: any = {};
                if (event.payload) {
                  try {
                    payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
                  } catch {
                    payload = {};
                  }
                }

                const { 
                  repoId, 
                  repoName, 
                  scanId, 
                  status, 
                  riskScore, 
                  criticalCount = 0, 
                  highCount = 0 
                } = payload;

                const displayRepoName = repoName || 'Repository';

                const isCompleted = rawType === 'oculus.scan.completed';
                const isStarted = rawType === 'oculus.scan.started';
                const isFailed = status === 'FAILED' || rawType === 'oculus.scan.failed';
                const hasCriticals = criticalCount > 0;
                const hasHighs = highCount > 0;

                let Icon = Activity;
                let iconColor = 'text-cyan-400';
                let bgColor = 'bg-cyan-500/10 border-cyan-500/25';

                if (isCompleted) {
                  if (hasCriticals) {
                    Icon = ShieldAlert;
                    iconColor = 'text-rose-400';
                    bgColor = 'bg-rose-500/10 border-rose-500/25';
                  } else if (hasHighs) {
                    Icon = ShieldAlert;
                    iconColor = 'text-amber-400';
                    bgColor = 'bg-amber-500/10 border-amber-500/25';
                  } else {
                    Icon = CheckCircle2;
                    iconColor = 'text-emerald-400';
                    bgColor = 'bg-emerald-500/10 border-emerald-500/25';
                  }
                } else if (isFailed) {
                  Icon = ShieldAlert;
                  iconColor = 'text-rose-400';
                  bgColor = 'bg-rose-500/10 border-rose-500/25';
                }

                const title = isCompleted ? 'Scan Completed' : isStarted ? 'Scan Started' : isFailed ? 'Scan Failed' : rawType.replaceAll('.', ' ');

                return (
                  <div key={event.id} className="relative flex gap-3.5 p-4 hover:bg-bg-surface-hover/50 transition-colors group">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center border shrink-0 mt-0.5 ${bgColor}`}>
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-text-primary text-xs flex items-center gap-2">
                          <span className="capitalize">{title}</span>
                          {repoId && (
                            <>
                              <span className="text-border-normal">•</span>
                              <Link to={`/w/${workspaceId}/repositories?repoId=${repoId}`} className="text-text-secondary hover:text-text-primary transition-colors font-mono truncate max-w-[200px]">
                                {displayRepoName}
                              </Link>
                            </>
                          )}
                        </h3>
                        <span className="text-[11px] text-text-tertiary font-mono shrink-0">
                          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {/* Metric Badges */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
                        {isCompleted && hasCriticals ? (
                          <span className="bg-risk-critical-alpha text-risk-critical border border-risk-critical-border px-1.5 py-0.2 rounded font-semibold">
                            {criticalCount} Critical
                          </span>
                        ) : null}
                        
                        {isCompleted && hasHighs ? (
                          <span className="bg-risk-high-alpha text-risk-high border border-risk-high-border px-1.5 py-0.2 rounded font-semibold">
                            {highCount} High
                          </span>
                        ) : null}
                        
                        {isCompleted && !hasCriticals && !hasHighs && (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.2 rounded font-semibold">
                            Clean Pass
                          </span>
                        )}
                        
                        {riskScore !== undefined && (
                          <span className="text-[10.5px] text-text-tertiary font-mono bg-bg-base border border-border-subtle px-1.5 py-0.2 rounded">
                            Score: {riskScore}/100
                          </span>
                        )}
                        
                        {scanId && (
                           <Link to={`/w/${workspaceId}/scans/${scanId}`} className="text-[11px] font-semibold text-primary-base hover:underline ml-auto">
                             Inspect Telemetry &rarr;
                           </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

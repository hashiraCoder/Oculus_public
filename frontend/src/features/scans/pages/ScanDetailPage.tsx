import { Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScanDetails, useScanTimeline, useScanLogs, useScanVulnerabilities, useScanGateStatus } from '../hooks/useScans';
import { useCancelScan, useRetryScan } from '../hooks/useScanMutations';
import { ScanTimeline } from '../components/ScanTimeline';
import { TerminalOutput } from '../components/TerminalOutput';
import { SeverityBadge } from '@/components/security/SeverityBadge';
import { ScanStatusChip } from '@/components/security/ScanStatusChip';
import { 
  ShieldAlert, Clock, GitCommit, XCircle, RefreshCw, 
  ShieldCheck, ArrowLeft 
} from 'lucide-react';
import { useScanSocket } from '../hooks/useScanSocket';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const ScanDetailPage = () => {
  const { workspaceId, scanId } = useParams<{ workspaceId: string; scanId: string }>();
  const navigate = useNavigate();
  
  // Attach real-time sockets
  useScanSocket(workspaceId!, scanId!);

  const { data: scan, isLoading: isScanLoading, isError: isScanError } = useScanDetails(scanId!);
  const { data: timeline, isLoading: isTimelineLoading } = useScanTimeline(scanId!);
  const { data: logs, isLoading: isLogsLoading } = useScanLogs(scanId!);
  const {
    data: findingsData,
    isLoading: isFindingsLoading,
    isError: isFindingsError,
    refetch: refetchFindings,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useScanVulnerabilities(scanId!);
  
  const { mutate: cancelScan, isPending: isCancelling } = useCancelScan(scanId!);
  const { mutate: retryScan, isPending: isRetrying } = useRetryScan(scanId!);
  const { data: gateStatus } = useScanGateStatus(scan?.isCompleted ? scanId! : null);

  if (isScanError) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center h-[50vh] text-center">
        <ShieldAlert className="w-12 h-12 text-risk-critical mb-3" />
        <h2 className="text-lg font-bold text-text-primary">Scan Execution Not Found</h2>
        <p className="text-xs text-text-secondary mt-1 mb-4">The requested scan ID does not exist or you lack workspace permission.</p>
        <Button size="sm" onClick={() => navigate(`/w/${workspaceId}/scans`)}>
          Return to Scans
        </Button>
      </div>
    );
  }

  if (isScanLoading || !scan) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto space-y-4">
        <Skeleton className="h-20 rounded-lg w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg lg:col-span-2" />
        </div>
      </div>
    );
  }

  const findings = findingsData?.pages.flatMap((p) => p?.items ?? []) ?? [];

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5 animate-fade-in text-text-primary">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/w/${workspaceId}/scans`)}
          className="gap-1 text-text-tertiary hover:text-text-primary"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Scans History</span>
        </Button>
      </div>

      {/* Header Card */}
      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold text-text-primary">Scan Telemetry & Analysis</h1>
            <ScanStatusChip status={scan.status} />
            {scan.cancelRequested && !scan.isCompleted && (
              <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                Cancelling...
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-text-tertiary mt-2">
            <span className="flex items-center gap-1 font-mono font-semibold text-text-secondary">
              <GitCommit className="w-3.5 h-3.5" /> {scan.commitHash ? scan.commitHash.substring(0, 7) : 'main'}
            </span>
            <span>•</span>
            <span>Triggered via {scan.triggeredBy || 'CI Pipeline'}</span>
            <span>•</span>
            <span>{scan.startedAt ? new Date(scan.startedAt).toLocaleString() : 'Pending start'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!scan.isCompleted && (
            <Button 
              variant="destructive"
              size="sm"
              onClick={() => cancelScan()}
              disabled={isCancelling || scan.cancelRequested}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Scan</span>
            </Button>
          )}
          {(scan.isFailed || scan.isError || scan.status === 'CANCELLED') && (
            <Button 
              variant="default"
              size="sm"
              onClick={() => retryScan()}
              isLoading={isRetrying}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Scan</span>
            </Button>
          )}
        </div>
      </Card>

      {/* Execution Error Banner */}
      {scan.errorMessage && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-3 text-rose-400 animate-slide-up">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h3 className="font-semibold">Execution Engine Error</h3>
            <p className="mt-0.5 font-mono text-[11px] opacity-90">{scan.errorMessage}</p>
          </div>
        </div>
      )}

      {/* 2-Column: Left Telemetry / Pipeline | Right Console & Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Pipeline Progress Stepper */}
          <Card className="p-4">
            <CardTitle className="mb-3 text-xs uppercase tracking-wider text-text-tertiary">
              Pipeline Execution Stages
            </CardTitle>
            {isTimelineLoading ? (
              <Skeleton className="h-36 rounded w-full" />
            ) : timeline?.length === 0 ? (
              <div className="text-xs text-text-tertiary text-center py-4">Waiting for pipeline stages...</div>
            ) : (
              <ScanTimeline timeline={timeline || []} />
            )}
          </Card>
          
          {/* Duration Card */}
          <Card className="p-3.5">
            <div className="flex justify-between items-start mb-1 text-xs text-text-tertiary">
              <span>Total Duration</span>
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="text-xl font-bold font-mono text-text-primary">
              {scan.durationSeconds !== null ? `${scan.durationSeconds}s` : '—'}
            </span>
          </Card>

          {/* CI Gate Status Card */}
          {gateStatus && (
            <Card className="p-3.5">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-text-tertiary uppercase font-semibold">CI Security Gate</span>
                {gateStatus.gate.status === 'PASSED' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <span className={`text-base font-bold font-mono ${
                gateStatus.gate.status === 'PASSED' ? 'text-emerald-400' :
                gateStatus.gate.status === 'FAILED' ? 'text-rose-400' :
                'text-text-tertiary'
              }`}>
                {gateStatus.gate.status}
              </span>
              <p className="text-[11px] text-text-secondary mt-1">{gateStatus.gate.reason}</p>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Terminal Console */}
          <TerminalOutput logs={logs || []} isLoading={isLogsLoading} />

          {/* Discovered Findings Table */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2.5 flex flex-row items-center justify-between border-b border-border-subtle bg-bg-surface-alt">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-risk-high" />
                <CardTitle>Discovered Vulnerabilities ({scan.totalFindings})</CardTitle>
              </div>
            </CardHeader>
            
            {isFindingsLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10 rounded w-full" />
                <Skeleton className="h-10 rounded w-full" />
              </div>
            ) : isFindingsError ? (
              <div className="p-8 text-center text-xs text-text-tertiary">
                <p>Unable to retrieve scan findings.</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => refetchFindings()}>
                  Retry
                </Button>
              </div>
            ) : findings.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-tertiary">
                {scan.isCompleted ? '✓ Clean execution. No vulnerabilities detected.' : 'Scan is running, findings will appear here.'}
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-normal bg-bg-surface text-text-tertiary uppercase text-[10.5px] tracking-wider font-semibold">
                    <th className="py-2.5 px-3.5">Severity</th>
                    <th className="py-2.5 px-3.5">Rule Violation</th>
                    <th className="py-2.5 px-3.5">Engine</th>
                    <th className="py-2.5 px-3.5">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {findings.map((f: any) => (
                    <Fragment key={f.id}>
                      <tr className="hover:bg-bg-surface-hover/80 transition-colors">
                        <td className="py-2.5 px-3.5">
                          <SeverityBadge severity={f.severity} size="sm" />
                        </td>
                        <td className="py-2.5 px-3.5 font-medium text-text-primary">
                          {f.rule_type}
                        </td>
                        <td className="py-2.5 px-3.5 text-text-tertiary text-[11px]">
                          {f.engine || 'Semgrep'}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-[11px] text-text-secondary">
                          {f.file_path}{f.line_number ? `:${f.line_number}` : ''}
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
            {hasNextPage && (
              <div className="p-3 border-t border-border-subtle text-center bg-bg-surface-alt">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  isLoading={isFetchingNextPage}
                >
                  Load More Findings
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

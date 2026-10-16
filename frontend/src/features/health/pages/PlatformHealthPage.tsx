import React, { useState } from 'react';
import { useLiveness, useReadiness, useSystemInfo } from '../hooks/useHealth';
import { SystemInfoWidget } from '../components/SystemInfoWidget';
import { DatabaseWidget } from '../components/DatabaseWidget';
import { RedisWidget } from '../components/RedisWidget';
import { BullMQWidget } from '../components/BullMQWidget';
import { SecurityEnginesWidget } from '../components/SecurityEnginesWidget';
import { ProbeLogsWidget } from '../components/ProbeLogsWidget';
import { 
  Activity, RefreshCw, Server, Clock, 
  Layers, XCircle, WifiOff 
} from 'lucide-react';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { healthKeys } from '../api/health.keys';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const PlatformHealthPage: React.FC = () => {
  const { isError: livenessFailed } = useLiveness();
  const { data: readiness } = useReadiness();
  const { data: systemInfo } = useSystemInfo();
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: healthKeys.all() }) > 0;
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await queryClient.refetchQueries({ queryKey: healthKeys.all() });
      toast.success('Telemetry synchronized with backend infrastructure');
    } catch {
      toast.error('Failed to synchronize telemetry');
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // Browser offline state
  if (!navigator.onLine) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6 bg-bg-root">
        <Card className="max-w-md p-8 text-center bg-bg-surface border-border-normal shadow-modal">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-base font-bold text-text-primary mb-1">Network Connection Lost</h2>
          <p className="text-xs text-text-secondary mb-6">
            You appear to be offline. Please verify your internet connection.
          </p>
          <Button onClick={handleRefresh} size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry Connection
          </Button>
        </Card>
      </div>
    );
  }

  // Backend completely unreachable
  if (livenessFailed) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6 bg-bg-root">
        <Card className="max-w-md p-8 text-center bg-bg-surface border-risk-critical-border shadow-modal">
          <div className="w-12 h-12 rounded-full bg-risk-critical-alpha border border-risk-critical-border flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-6 h-6 text-risk-critical" />
          </div>
          <h2 className="text-base font-bold text-text-primary mb-1">Platform Telemetry Unreachable</h2>
          <p className="text-xs text-text-secondary mb-6">
            The Oculus backend server at the configured gateway cannot be reached. Verify that the server process is active.
          </p>
          <Button onClick={handleRefresh} variant="destructive" size="sm">
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", (isFetching || isManualRefreshing) && "animate-spin")} /> 
            Retry Telemetry
          </Button>
        </Card>
      </div>
    );
  }

  // Calculate infrastructure stats
  const dbHealthy = readiness?.database?.status === 'HEALTHY';
  const redisHealthy = readiness?.redis?.status === 'HEALTHY';
  const queuesHealthy = readiness?.queues?.status === 'HEALTHY';
  const allSubsystemsHealthy = dbHealthy && redisHealthy && queuesHealthy;
  const activeSubsystemCount = [dbHealthy, redisHealthy, queuesHealthy].filter(Boolean).length;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5 animate-fade-in text-text-primary select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Platform Health</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time operational status, subsystem metrics, worker queues, and infrastructure telemetry
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Overall Health Pill */}
          {allSubsystemsHealthy ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>ALL SYSTEMS OPERATIONAL</span>
            </div>
          ) : activeSubsystemCount > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>SYSTEM DEGRADED ({activeSubsystemCount}/3)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>CRITICAL OUTAGE</span>
            </div>
          )}

          {/* Refresh Action */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isFetching || isManualRefreshing}
            className="text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", (isFetching || isManualRefreshing) && "animate-spin")} />
            <span>Refresh Now</span>
          </Button>
        </div>
      </div>

      {/* KPI Metrics Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Core Platform Liveness */}
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10.5px] uppercase tracking-wider font-semibold text-text-tertiary block">
              Core Liveness
            </span>
            <div className="text-base font-bold text-text-primary mt-1 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>100% Online</span>
            </div>
            <span className="text-[11px] text-text-secondary mt-0.5 block">API Gateway & Process</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
        </Card>

        {/* Metric 2: Subsystems Operational */}
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10.5px] uppercase tracking-wider font-semibold text-text-tertiary block">
              Subsystems
            </span>
            <div className="text-base font-bold text-text-primary mt-1 font-mono">
              {activeSubsystemCount} / 3 Active
            </div>
            <span className="text-[11px] text-text-secondary mt-0.5 block">Postgres, Redis, BullMQ</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary-alpha border border-primary-alpha flex items-center justify-center shrink-0">
            <Server className="w-4 h-4 text-primary-base" />
          </div>
        </Card>

        {/* Metric 3: Process Uptime */}
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10.5px] uppercase tracking-wider font-semibold text-text-tertiary block">
              Continuous Uptime
            </span>
            <div className="text-base font-bold text-text-primary mt-1 font-mono truncate max-w-[140px]">
              {systemInfo?.uptimeFormatted || 'Live'}
            </div>
            <span className="text-[11px] text-text-secondary mt-0.5 block">Since last engine restart</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
        </Card>

        {/* Metric 4: Worker Pipeline */}
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[10.5px] uppercase tracking-wider font-semibold text-text-tertiary block">
              Pipeline Queues
            </span>
            <div className="text-base font-bold text-text-primary mt-1 font-mono">
              {queuesHealthy ? 'Ready & Active' : 'Offline'}
            </div>
            <span className="text-[11px] text-text-secondary mt-0.5 block">Security Scan Workers</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
        </Card>
      </div>

      {/* Core Infrastructure Services Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-primary-base" />
            <span>Core Infrastructure Services</span>
          </h2>
          <span className="text-[11px] text-text-tertiary font-mono">
            Direct socket and pool probes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <DatabaseWidget />
          <RedisWidget />
          <BullMQWidget />
        </div>
      </div>

      {/* System & Runtime Specifications */}
      <SystemInfoWidget />

      {/* Security Analysis Engines */}
      <SecurityEnginesWidget />

      {/* Live Probes & Stream Log */}
      <ProbeLogsWidget />
    </div>
  );
};

export default PlatformHealthPage;

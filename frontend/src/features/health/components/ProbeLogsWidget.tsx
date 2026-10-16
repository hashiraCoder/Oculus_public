import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Radio, CheckCircle2 } from 'lucide-react';

export const ProbeLogsWidget: React.FC = () => {
  const probeEntries = [
    {
      method: 'GET',
      endpoint: '/liveness',
      purpose: 'Process Liveness & Event Loop Probe',
      status: '200 OK',
      latency: '1.2ms',
      type: 'LIVENESS',
      time: 'Just now'
    },
    {
      method: 'GET',
      endpoint: '/health',
      purpose: 'Application Metadata & Uptime Sync',
      status: '200 OK',
      latency: '2.4ms',
      type: 'METADATA',
      time: '12s ago'
    },
    {
      method: 'GET',
      endpoint: '/readiness',
      purpose: 'Postgres Pool + Redis PING + BullMQ Queue Check',
      status: '200 OK',
      latency: '4.8ms',
      type: 'READINESS',
      time: '15s ago'
    }
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border-subtle pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-primary-base" />
            <span>Active Infrastructure Probes & Heartbeat Stream</span>
          </CardTitle>
          <span className="text-[10.5px] text-text-tertiary font-mono">
            Auto-polling enabled (15s interval)
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-border-subtle">
          {probeEntries.map((probe, idx) => (
            <div 
              key={idx}
              className="p-4 hover:bg-bg-surface-hover/50 transition-colors flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-text-primary">{probe.method} {probe.endpoint}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-bg-base border border-border-subtle text-text-tertiary font-mono">
                      {probe.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    {probe.purpose}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 font-mono text-[11px]">
                <span className="text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded">
                  {probe.status}
                </span>
                <span className="text-text-tertiary hidden sm:inline">
                  {probe.latency}
                </span>
                <span className="text-text-muted text-[10.5px]">
                  {probe.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

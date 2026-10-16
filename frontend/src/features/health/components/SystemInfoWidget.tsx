import React from 'react';
import { useSystemInfo } from '../hooks/useHealth';
import { Server, Activity, Clock, Terminal, Globe, Cpu } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const SystemInfoWidget: React.FC = () => {
  const { data: info, isLoading, isError } = useSystemInfo();

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-6 w-40 bg-bg-surface-hover rounded mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-16 bg-bg-surface-hover rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (isError || !info) {
    return (
      <Card className="p-6 text-center text-risk-critical text-xs">
        Failed to load System & Runtime Specifications
      </Card>
    );
  }

  const specItems = [
    {
      icon: Activity,
      label: 'Core Version',
      value: `v${info.version}`,
      subtext: 'Oculus Security Core'
    },
    {
      icon: Terminal,
      label: 'Environment',
      value: info.environment,
      subtext: 'Cloud Deployment',
      highlight: true
    },
    {
      icon: Clock,
      label: 'Process Uptime',
      value: info.uptimeFormatted,
      subtext: 'Continuous runtime'
    },
    {
      icon: Cpu,
      label: 'Runtime Architecture',
      value: 'Node.js (ESM)',
      subtext: 'V8 Engine Cluster'
    },
    {
      icon: Globe,
      label: 'API Gateway',
      value: '/api/v1 (REST)',
      subtext: 'Socket.IO Enabled'
    },
    {
      icon: Server,
      label: 'Telemetry Pulse',
      value: '15s Active',
      subtext: 'Real-time Heartbeat'
    }
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border-subtle pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-primary-base" />
            <span>System & Runtime Specifications</span>
          </CardTitle>
          <span className="text-[11px] text-text-tertiary font-mono">
            Synchronized {formatDistanceToNow(info.lastChecked, { addSuffix: true })}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {specItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx} 
                className="p-3.5 rounded-lg bg-bg-base border border-border-subtle hover:border-border-normal transition-colors flex flex-col justify-between"
              >
                <div className="flex items-center gap-1.5 text-text-tertiary mb-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[10.5px] uppercase tracking-wider font-semibold truncate">{item.label}</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-text-primary capitalize truncate font-mono">
                    {item.value}
                  </div>
                  <div className="text-[10px] text-text-tertiary mt-0.5 truncate">
                    {item.subtext}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

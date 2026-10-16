import React from 'react';
import type { HealthStatus } from '../types/health.types';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricItem {
  label: string;
  value: string;
}

interface Props {
  title: string;
  subtitle?: string;
  status: HealthStatus;
  details: string;
  lastChecked: Date;
  icon?: React.ReactNode;
  metrics?: MetricItem[];
  latency?: string;
}

export const HealthCard: React.FC<Props> = ({ 
  title, 
  subtitle,
  status, 
  details, 
  lastChecked, 
  icon,
  metrics,
  latency = '< 5ms'
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'HEALTHY':
        return { 
          color: 'text-emerald-400', 
          bg: 'bg-emerald-500/10', 
          border: 'border-emerald-500/25', 
          dot: 'bg-emerald-500',
          label: 'OPERATIONAL',
          Icon: CheckCircle2 
        };
      case 'DEGRADED':
        return { 
          color: 'text-amber-400', 
          bg: 'bg-amber-500/10', 
          border: 'border-amber-500/25', 
          dot: 'bg-amber-500',
          label: 'DEGRADED',
          Icon: AlertTriangle 
        };
      case 'UNHEALTHY':
        return { 
          color: 'text-rose-400', 
          bg: 'bg-rose-500/10', 
          border: 'border-rose-500/25', 
          dot: 'bg-rose-500',
          label: 'DISCONNECTED',
          Icon: XCircle 
        };
      default:
        return { 
          color: 'text-text-tertiary', 
          bg: 'bg-bg-base', 
          border: 'border-border-subtle', 
          dot: 'bg-text-tertiary',
          label: 'UNKNOWN',
          Icon: HelpCircle 
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Card className="p-5 flex flex-col justify-between hover:border-border-normal transition-all duration-150">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-bg-surface-hover border border-border-subtle flex items-center justify-center shrink-0">
              {icon || <Activity className="w-4 h-4 text-text-secondary" />}
            </div>
            <div>
              <h3 className="font-semibold text-text-primary text-sm leading-tight">{title}</h3>
              {subtitle && <p className="text-[11px] text-text-tertiary mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wider uppercase shrink-0",
            config.bg,
            config.border,
            config.color
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", config.dot, status === 'HEALTHY' && "animate-pulse")} />
            <span>{config.label}</span>
          </div>
        </div>

        {/* Description / Status Details */}
        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          {details}
        </p>

        {/* Metrics Grid */}
        {metrics && metrics.length > 0 && (
          <div className="space-y-1.5 p-3 rounded-md bg-bg-base border border-border-subtle mb-4">
            {metrics.map((m, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary text-[11px]">{m.label}</span>
                <span className="font-mono text-text-primary text-[11.5px]">{m.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Telemetry */}
      <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-text-tertiary font-mono">
        <span className="flex items-center gap-1">
          <span className="text-text-muted">Latency:</span>
          <span className="text-text-secondary">{latency}</span>
        </span>
        <span className="text-[10.5px]">
          {formatDistanceToNow(lastChecked, { addSuffix: true })}
        </span>
      </div>
    </Card>
  );
};

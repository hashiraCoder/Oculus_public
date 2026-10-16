import React from 'react';
import { useReadiness } from '../hooks/useHealth';
import { HealthCard } from './HealthCard';
import { Layers } from 'lucide-react';
import type { HealthStatus } from '../types/health.types';
import { Card } from '@/components/ui/card';

export const BullMQWidget: React.FC = () => {
  const { data: readiness, isLoading, isError } = useReadiness();

  if (isLoading) {
    return (
      <Card className="p-5 h-[240px] animate-pulse flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-9 w-32 bg-bg-surface-hover rounded" />
            <div className="h-5 w-20 bg-bg-surface-hover rounded-full" />
          </div>
          <div className="h-8 bg-bg-surface-hover rounded" />
          <div className="h-16 bg-bg-surface-hover rounded" />
        </div>
        <div className="h-4 w-full bg-bg-surface-hover rounded" />
      </Card>
    );
  }

  const queuesData = isError || !readiness ? {
    name: 'BullMQ Job Workers',
    status: 'UNKNOWN' as HealthStatus,
    details: 'Unable to verify background worker queues.',
    lastChecked: new Date()
  } : readiness.queues;

  const isHealthy = queuesData.status === 'HEALTHY';

  return (
    <HealthCard 
      title={queuesData.name}
      subtitle="Distributed Background Workers"
      status={queuesData.status}
      details={isHealthy ? 'Asynchronous worker pools active. Dispatching repository scans and webhook deliveries.' : queuesData.details}
      lastChecked={queuesData.lastChecked}
      latency="< 4.5ms"
      metrics={[
        { label: 'Worker Pipeline', value: isHealthy ? 'Ready (Idle/Processing)' : 'Unavailable' },
        { label: 'Job Dispatcher', value: 'Redis Stream Engine' },
        { label: 'Task Execution', value: 'Non-blocking Async' }
      ]}
      icon={<Layers className="w-4 h-4 text-cyan-400" />}
    />
  );
};

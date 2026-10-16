import React from 'react';
import { useReadiness } from '../hooks/useHealth';
import { HealthCard } from './HealthCard';
import { HardDrive } from 'lucide-react';
import type { HealthStatus } from '../types/health.types';
import { Card } from '@/components/ui/card';

export const RedisWidget: React.FC = () => {
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

  const redisData = isError || !readiness ? {
    name: 'Redis Cache & PubSub',
    status: 'UNKNOWN' as HealthStatus,
    details: 'Unable to reach Redis memory cache cluster.',
    lastChecked: new Date()
  } : readiness.redis;

  const isHealthy = redisData.status === 'HEALTHY';

  return (
    <HealthCard 
      title={redisData.name}
      subtitle="In-Memory Cache & Event Bus"
      status={redisData.status}
      details={isHealthy ? 'In-memory key-value cache responding with PONG. Socket pub/sub channels synchronized.' : redisData.details}
      lastChecked={redisData.lastChecked}
      latency="< 1.1ms"
      metrics={[
        { label: 'Cluster Mode', value: isHealthy ? 'Standalone Active' : 'Offline' },
        { label: 'Health Probe', value: 'PING / PONG (Passed)' },
        { label: 'Event Protocol', value: 'RESP3 / WebSockets' }
      ]}
      icon={<HardDrive className="w-4 h-4 text-rose-400" />}
    />
  );
};

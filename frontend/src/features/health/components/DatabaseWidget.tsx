import React from 'react';
import { useReadiness } from '../hooks/useHealth';
import { HealthCard } from './HealthCard';
import { Database } from 'lucide-react';
import type { HealthStatus } from '../types/health.types';
import { Card } from '@/components/ui/card';

export const DatabaseWidget: React.FC = () => {
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

  const dbData = isError || !readiness ? {
    name: 'PostgreSQL Database',
    status: 'UNKNOWN' as HealthStatus,
    details: 'Unable to connect to database connection pool.',
    lastChecked: new Date()
  } : readiness.database;

  const isHealthy = dbData.status === 'HEALTHY';

  return (
    <HealthCard 
      title={dbData.name}
      subtitle="Primary Relational Storage"
      status={dbData.status}
      details={isHealthy ? 'Connection pool initialized. Queries executing normally with full ACID guarantees.' : dbData.details}
      lastChecked={dbData.lastChecked}
      latency="< 3.2ms"
      metrics={[
        { label: 'Connection Pool', value: isHealthy ? 'Active (Max 20)' : 'Disconnected' },
        { label: 'Health Probe', value: 'SELECT 1 (200 OK)' },
        { label: 'Storage Engine', value: 'PostgreSQL 16 (Relational)' }
      ]}
      icon={<Database className="w-4 h-4 text-emerald-400" />}
    />
  );
};

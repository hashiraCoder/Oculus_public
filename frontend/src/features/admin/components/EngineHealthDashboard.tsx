import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '../api/adminApi';
import type { EngineHealth } from '../types';

export const EngineHealthDashboard: React.FC = () => {
  const [health, setHealth] = useState<EngineHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await adminApi.getHealth();
        setHealth(data);
      } catch (err) {
        console.error('Failed to fetch health', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading Engine Health...</div>;
  if (!health) return <div>Error loading health</div>;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 border-b border-border-subtle/50 mb-4">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          Engine Health
          <Badge variant={health.status === 'HEALTHY' ? 'primary' : health.status === 'CRITICAL' ? 'critical' : 'high'}>
            {health.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-bg-base/40 p-4 rounded-lg border border-border-subtle">
            <p className="text-xs text-text-tertiary">Active Workers</p>
            <p className="text-2xl font-bold">{health.metrics.activeWorkers}</p>
          </div>
          <div className="bg-bg-base/40 p-4 rounded-lg border border-border-subtle">
            <p className="text-xs text-text-tertiary">Active Scans</p>
            <p className="text-2xl font-bold">{health.metrics.activeScans}</p>
          </div>
          <div className="bg-bg-base/40 p-4 rounded-lg border border-border-subtle">
            <p className="text-xs text-text-tertiary">Queue Backlog</p>
            <p className="text-2xl font-bold">{health.metrics.queuePending}</p>
          </div>
          <div className="bg-bg-base/40 p-4 rounded-lg border border-border-subtle">
            <p className="text-xs text-text-tertiary">Critical Alerts</p>
            <p className="text-2xl font-bold text-red-500">{health.metrics.criticalAlerts}</p>
          </div>
        </div>

        {health.metrics.degradedReasons.length > 0 && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <h4 className="text-sm font-bold text-red-500 mb-2">Degraded Reasons:</h4>
            <ul className="list-disc list-inside text-sm text-text-secondary">
              {health.metrics.degradedReasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

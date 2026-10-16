import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApi } from '../api/adminApi';
import type { EngineAlert } from '../types';

export const AlertsViewer: React.FC = () => {
  const [alerts, setAlerts] = useState<EngineAlert[]>([]);

  const fetchAlerts = async () => {
    try {
      const data = await adminApi.getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const resolveAlert = async (id: string) => {
    try {
      await adminApi.resolveAlert(id, 'Resolved via Admin UI');
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 border-b border-border-subtle/50 mb-4">
        <CardTitle className="text-base font-medium">Active Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-text-tertiary">No active alerts.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-red-500">{alert.alert_type}</h4>
                  <p className="text-xs text-text-secondary mt-1">{alert.message}</p>
                  <p className="text-xs text-text-tertiary mt-2">{new Date(alert.created_at).toLocaleString()}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => resolveAlert(alert.id)}>
                  Resolve
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '../api/adminApi';
import type { WorkerLease } from '../types';

export const WorkerObservatory: React.FC = () => {
  const [workers, setWorkers] = useState<WorkerLease[]>([]);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const data = await adminApi.getWorkers();
        setWorkers(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWorkers();
    const interval = setInterval(fetchWorkers, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 border-b border-border-subtle/50 mb-4">
        <CardTitle className="text-base font-medium">Worker Observatory</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-tertiary uppercase bg-bg-surface border-b border-border-subtle">
              <tr>
                <th className="px-4 py-3">Worker ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Jobs / Limit</th>
                <th className="px-4 py-3">Heartbeat</th>
              </tr>
            </thead>
            <tbody>
              {workers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-text-tertiary">No workers online</td>
                </tr>
              ) : (
                workers.map(worker => (
                  <tr key={worker.worker_id} className="border-b border-border-subtle">
                    <td className="px-4 py-3 font-medium text-text-primary">{worker.worker_id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${worker.status === 'DEAD' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                        {worker.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{worker.active_jobs} / {worker.concurrency_limit}</td>
                    <td className="px-4 py-3">{new Date(worker.last_heartbeat_at).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

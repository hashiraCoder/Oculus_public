import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '../api/adminApi';
import type { QueueStatus } from '../types';

export const QueueMonitor: React.FC = () => {
  const [queue, setQueue] = useState<QueueStatus | null>(null);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const data = await adminApi.getQueues();
        setQueue(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!queue) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 border-b border-border-subtle/50 mb-4">
        <CardTitle className="text-base font-medium">Queue Monitor (BullMQ)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-4 mb-4">
          {Object.entries(queue.counts).map(([key, val]) => (
            <div key={key} className="bg-bg-base/40 p-4 rounded-lg border border-border-subtle text-center">
              <p className="text-xs text-text-tertiary capitalize">{key}</p>
              <p className="text-2xl font-bold">{val as number}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

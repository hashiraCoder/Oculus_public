import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '../api/adminApi';
import type { AdminScan, ScanStageTelemetry } from '../types';

export const ScansViewer: React.FC = () => {
  const [scans, setScans] = useState<AdminScan[]>([]);
  const [selectedScan, setSelectedScan] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<ScanStageTelemetry[]>([]);

  useEffect(() => {
    adminApi.getScans({ limit: 10 }).then(setScans).catch(console.error);
  }, []);

  const loadTelemetry = async (scanId: string) => {
    if (selectedScan === scanId) {
      setSelectedScan(null);
      setTelemetry([]);
      return;
    }
    setSelectedScan(scanId);
    try {
      const data = await adminApi.getScanTelemetry(scanId);
      setTelemetry(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 border-b border-border-subtle/50 mb-4">
        <CardTitle className="text-base font-medium">Recent Global Scans</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-tertiary uppercase bg-bg-surface border-b border-border-subtle">
              <tr>
                <th className="px-4 py-3">Scan ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Duration (ms)</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scans.map(scan => (
                <React.Fragment key={scan.id}>
                  <tr className="border-b border-border-subtle hover:bg-bg-base/40">
                    <td className="px-4 py-3 font-mono text-xs">{scan.id.split('-')[0]}...</td>
                    <td className="px-4 py-3">{scan.status}</td>
                    <td className="px-4 py-3">{scan.duration_ms || '-'}</td>
                    <td className="px-4 py-3">
                      <button className="text-primary-base hover:underline text-xs" onClick={() => loadTelemetry(scan.id)}>
                        {selectedScan === scan.id ? 'Hide Telemetry' : 'View Telemetry'}
                      </button>
                    </td>
                  </tr>
                  {selectedScan === scan.id && (
                    <tr>
                      <td colSpan={4} className="p-4 bg-bg-surface">
                        <h4 className="font-bold text-xs mb-2">Stage Telemetry:</h4>
                        {telemetry.length === 0 ? <p className="text-xs text-text-tertiary">No telemetry data</p> : (
                          <div className="space-y-2">
                            {telemetry.map((t, i) => (
                              <div key={i} className="flex justify-between border-l-2 border-primary-base pl-2 text-xs">
                                <span>{t.stage_name} {t.engine_id ? `(${t.engine_id})` : ''}</span>
                                <span className="font-mono">{t.duration_ms}ms | {t.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

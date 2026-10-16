import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '../api/adminApi';
import type { PromotionGateResult, PromotionGate } from '../types';

const STATUS_COLORS: Record<string, string> = {
  PASS: 'text-success',
  FAIL: 'text-critical',
  INSUFFICIENT_DATA: 'text-warning',
};

const STATUS_BADGE: Record<string, 'primary' | 'critical' | 'medium' | 'info'> = {
  PASS: 'primary',
  FAIL: 'critical',
  INSUFFICIENT_DATA: 'medium',
};

const OVERALL_COLORS: Record<string, string> = {
  READY_TO_PROMOTE: 'border-success bg-success/10 text-success',
  NOT_READY: 'border-critical bg-critical/10 text-critical',
  INSUFFICIENT_DATA: 'border-warning bg-warning/10 text-warning',
};

const OVERALL_LABEL: Record<string, string> = {
  READY_TO_PROMOTE: '✓ Ready to Promote',
  NOT_READY: '✗ Not Ready',
  INSUFFICIENT_DATA: '⚠ Insufficient Data',
};

function GateRow({ name: _name, gate }: { name: string; gate: PromotionGate }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-border last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-text-primary">{gate.label}</p>
        <p className="text-xs text-text-secondary mt-0.5">{gate.description}</p>
      </div>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        {gate.value !== null && (
          <span className={`text-sm font-mono font-semibold ${STATUS_COLORS[gate.status] ?? ''}`}>
            {gate.value}{typeof gate.value === 'number' && gate.label.includes('%') ? '%' : ''}
          </span>
        )}
        <Badge variant={STATUS_BADGE[gate.status] ?? 'info'} className="text-xs">
          {gate.status.replace('_', ' ')}
        </Badge>
      </div>
    </div>
  );
}

export const PromotionGatePanel: React.FC = () => {
  const [data, setData] = useState<PromotionGateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    adminApi.getPromotionGate()
      .then(setData)
      .catch(err => setError(err.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">NEXT Engine Promotion Gate</CardTitle>
        <p className="text-xs text-text-secondary mt-0.5">
          All gates must pass before NEXT engine can be promoted to production.
        </p>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-text-secondary">Loading promotion status...</p>}
        {error && <p className="text-sm text-critical">{error}</p>}
        {data && (
          <div className="space-y-4">
            {/* Overall banner */}
            <div className={`rounded-lg border px-4 py-3 font-semibold text-sm ${OVERALL_COLORS[data.overallStatus]}`}>
              {OVERALL_LABEL[data.overallStatus]}
              {data.summary.promotionCommand && (
                <p className="text-xs font-mono mt-1 opacity-80">{data.summary.promotionCommand}</p>
              )}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Shadow Scans', value: data.summary.totalShadowScans },
                { label: 'Auth Findings', value: data.summary.totalAuthoritativeFindings },
                { label: 'Regressions', value: data.summary.totalMissingInNext },
                { label: 'New Findings', value: data.summary.totalNewInNext },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-md bg-surface-secondary p-3 text-center">
                  <p className="text-lg font-bold text-text-primary">{value.toLocaleString()}</p>
                  <p className="text-xs text-text-secondary">{label}</p>
                </div>
              ))}
            </div>

            {/* Gate breakdown */}
            <div className="rounded-md border border-border px-4">
              {Object.entries(data.gates).map(([name, gate]) => (
                <GateRow key={name} name={name} gate={gate} />
              ))}
            </div>

            <button
              onClick={load}
              className="text-xs text-text-secondary hover:text-text-primary underline"
            >
              Refresh
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

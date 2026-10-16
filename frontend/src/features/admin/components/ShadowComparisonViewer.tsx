import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '../api/adminApi';
import type { ShadowResult } from '../types';

const POLL_INTERVAL = 30_000;

function MismatchBadge({ count, label }: { count: number; label: string }) {
  if (count === 0) return <span className="text-text-secondary text-xs">0</span>;
  return (
    <Badge variant={count > 0 ? 'critical' : 'default'} className="text-xs">
      {count} {label}
    </Badge>
  );
}

export const ShadowComparisonViewer: React.FC = () => {
  const [results, setResults] = useState<ShadowResult[]>([]);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    adminApi.getShadowResults({ limit: 30 })
      .then(({ data, total }) => { setResults(data); setTotal(total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const toggleExpand = (id: string) => setExpanded(prev => prev === id ? null : id);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Shadow Comparison Results</CardTitle>
        <span className="text-xs text-text-secondary">{total} mismatch(es) total</span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-text-secondary">Loading...</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-text-secondary">No mismatches detected. NEXT engine is in agreement with V2. ✓</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-secondary border-b border-border">
                  <th className="py-2 pr-4">Scan ID</th>
                  <th className="py-2 pr-4">Auth Engine</th>
                  <th className="py-2 pr-4">Shadow Engine</th>
                  <th className="py-2 pr-4">Auth Findings</th>
                  <th className="py-2 pr-4">Shadow Findings</th>
                  <th className="py-2 pr-4">Regressions</th>
                  <th className="py-2 pr-4">New</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <React.Fragment key={r.id}>
                    <tr
                      className="border-b border-border hover:bg-surface-secondary cursor-pointer"
                      onClick={() => toggleExpand(r.id)}
                    >
                      <td className="py-2 pr-4 font-mono text-xs">{r.scan_id.slice(0, 8)}…</td>
                      <td className="py-2 pr-4">{r.authoritative_engine}</td>
                      <td className="py-2 pr-4">{r.shadow_engine}</td>
                      <td className="py-2 pr-4">{r.authoritative_finding_count}</td>
                      <td className="py-2 pr-4">{r.shadow_finding_count}</td>
                      <td className="py-2 pr-4">
                        <MismatchBadge count={r.missing_in_shadow} label="missing" />
                      </td>
                      <td className="py-2 pr-4">
                        <MismatchBadge count={r.new_in_shadow} label="new" />
                      </td>
                      <td className="py-2 text-text-secondary text-xs">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                    </tr>
                    {expanded === r.id && r.comparison_data && (
                      <tr className="bg-surface-secondary">
                        <td colSpan={8} className="py-3 px-4">
                          <div className="space-y-2 text-xs font-mono">
                            {r.comparison_data.missingInShadowFingerprints.length > 0 && (
                              <div>
                                <p className="text-critical font-semibold mb-1">Missing in NEXT (regressions):</p>
                                {r.comparison_data.missingInShadowFingerprints.slice(0, 10).map(fp => (
                                  <p key={fp} className="text-text-secondary">{fp}</p>
                                ))}
                              </div>
                            )}
                            {r.comparison_data.newInShadowFingerprints.length > 0 && (
                              <div>
                                <p className="text-warning font-semibold mb-1">New in NEXT (not in V2):</p>
                                {r.comparison_data.newInShadowFingerprints.slice(0, 10).map(fp => (
                                  <p key={fp} className="text-text-secondary">{fp}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

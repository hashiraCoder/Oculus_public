import React, { useMemo } from 'react';
import { useFindingDistribution } from '../hooks/useAnalytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  workspaceId: string;
}

export const DistributionWidget: React.FC<Props> = ({ workspaceId }) => {
  const { data: distribution, isLoading, isError } = useFindingDistribution(workspaceId);

  const memoizedChart = useMemo(() => {
    if (!distribution || distribution.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-text-tertiary h-64 text-sm">
          No findings available
        </div>
      );
    }
    return (
      <div className="h-64 mt-4">
        <table className="sr-only">
          <caption>Finding Distribution by Rule</caption>
          <thead><tr><th>Rule</th><th>Count</th></tr></thead>
          <tbody>
            {distribution.map(d => <tr key={d.ruleName}><td>{d.ruleName}</td><td>{d.count}</td></tr>)}
          </tbody>
        </table>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="ruleName" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} 
              itemStyle={{ color: '#e2e8f0' }}
              cursor={{ fill: '#334155', opacity: 0.4 }}
            />
            <Bar dataKey="count" name="Open Findings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }, [distribution]);

  if (isLoading) {
    return (
      <div className="bg-bg-surface p-6 rounded-lg border border-border-base h-full">
        <div className="h-4 w-40 bg-bg-surface-hover animate-pulse rounded mb-4" />
        <div className="h-64 bg-bg-surface-hover animate-pulse rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-bg-surface p-6 rounded-lg border border-border-base h-full flex items-center justify-center text-risk-critical text-sm">
        Failed to load distribution
      </div>
    );
  }

  return (
    <div className="bg-bg-surface p-6 rounded-lg border border-border-base h-full">
      <h3 className="text-sm font-medium text-text-primary">Finding Distribution</h3>
      {memoizedChart}
    </div>
  );
};

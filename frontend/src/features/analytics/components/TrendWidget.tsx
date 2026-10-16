import React, { useMemo } from 'react';
import { useRiskTrend } from '../hooks/useAnalytics';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield } from 'lucide-react';

interface Props {
  workspaceId: string;
}

export const TrendWidget: React.FC<Props> = ({ workspaceId }) => {
  const { data: trend, isLoading, isError } = useRiskTrend(workspaceId);

  const memoizedChart = useMemo(() => {
    if (!trend || trend.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary h-64">
           <Shield size={32} className="mb-2 opacity-20" />
           <p className="text-sm">No trend data available</p>
        </div>
      );
    }
    return (
      <div className="h-64 mt-4 relative">
        <table className="sr-only">
          <caption>Risk trend over time</caption>
          <thead>
            <tr><th>Date</th><th>Score</th></tr>
          </thead>
          <tbody>
            {trend.map(t => <tr key={t.date}><td>{t.date}</td><td>{t.score}</td></tr>)}
          </tbody>
        </table>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} 
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Area type="monotone" dataKey="score" name="Security Score" stroke="#6366f1" fillOpacity={1} fill="url(#colorRisk)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }, [trend]);

  if (isLoading) {
    return (
      <div className="bg-bg-surface p-6 rounded-lg border border-border-base h-full">
        <div className="h-4 w-32 bg-bg-surface-hover animate-pulse rounded mb-4" />
        <div className="h-64 bg-bg-surface-hover animate-pulse rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-bg-surface p-6 rounded-lg border border-border-base h-full flex items-center justify-center text-risk-critical">
        Failed to load trend data
      </div>
    );
  }

  return (
    <div className="bg-bg-surface p-6 rounded-lg border border-border-base h-full">
      <h3 className="text-sm font-medium text-text-primary">Security Trend (Last 30 Days)</h3>
      {memoizedChart}
    </div>
  );
};

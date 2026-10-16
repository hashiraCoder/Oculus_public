import React, { useMemo } from 'react';
import { useRepositoryRanking } from '../hooks/useAnalytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface Props {
  workspaceId: string;
}

export const RepositoryRankingWidget: React.FC<Props> = ({ workspaceId }) => {
  const { data: ranking, isLoading, isError } = useRepositoryRanking(workspaceId);

  const memoizedChart = useMemo(() => {
    if (!ranking || (ranking.mostVulnerable.length === 0 && ranking.mostSecure.length === 0)) {
      return (
        <div className="flex-1 flex items-center justify-center text-text-tertiary h-64 text-sm">
          No repositories analyzed yet
        </div>
      );
    }
    
    // Combine, deduplicate, and sort descending
    const allReposMap = new Map();
    ranking.mostVulnerable.forEach(repo => allReposMap.set(repo.id, repo));
    ranking.mostSecure.forEach(repo => allReposMap.set(repo.id, repo));
    
    const combinedRanking = Array.from(allReposMap.values())
      .sort((a, b) => b.score - a.score); // Highest risk first

    const getBarColor = (score: number) => {
      if (score > 70) return '#f43f5e'; // rose-500
      if (score >= 40) return '#f59e0b'; // amber-500
      return '#10b981'; // emerald-500
    };

    return (
      <div className="mt-4 h-[24rem] overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={combinedRanking} 
            layout="vertical" 
            margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
            barCategoryGap={10}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" horizontal={false} />
            <XAxis 
              type="number" 
              stroke="var(--color-text-tertiary)" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              domain={[0, Math.max(100, ...combinedRanking.map(r => r.score))]}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              stroke="var(--color-text-secondary)" 
              fontSize={12} 
              width={120} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip 
              cursor={{ fill: 'var(--color-bg-surface-hover)', opacity: 0.8 }} 
              contentStyle={{ 
                backgroundColor: 'var(--color-bg-surface)', 
                borderColor: 'var(--color-border-base)', 
                borderRadius: '8px',
                color: 'var(--color-text-primary)'
              }}
              formatter={(value: any) => [
                <span key="score" className={value > 70 ? 'text-rose-500' : value >= 40 ? 'text-amber-500' : 'text-emerald-500'}>
                  {value} ({value > 70 ? 'High Risk' : value >= 40 ? 'Medium Risk' : 'Secure'})
                </span>,
                'Risk Score'
              ]}
            />
            <Bar 
              dataKey="score" 
              name="Risk Score" 
              radius={[0, 4, 4, 0]} 
              minPointSize={5}
            >
              {combinedRanking.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }, [ranking]);

  if (isLoading) {
    return (
      <div className="bg-bg-surface p-6 rounded-lg border border-border-base h-full">
        <div className="h-4 w-48 bg-bg-surface-hover animate-pulse rounded mb-4" />
        <div className="h-96 bg-bg-surface-hover animate-pulse rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-bg-surface p-6 rounded-lg border border-border-base h-full flex items-center justify-center text-risk-critical text-sm">
        Failed to load repository rankings
      </div>
    );
  }

  return (
    <div className="bg-bg-surface p-6 rounded-lg border border-border-base h-full">
      <h3 className="text-sm font-medium text-text-primary">Repository Risk Leaderboard</h3>
      {memoizedChart}
    </div>
  );
};

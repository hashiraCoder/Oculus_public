import React from 'react';
import { useDeveloperLeaderboard } from '../hooks/useAnalytics';
import { Shield } from 'lucide-react';

interface Props {
  workspaceId: string;
}

export const LeaderboardWidget: React.FC<Props> = ({ workspaceId }) => {
  const { data: leaderboard, isLoading, isError } = useDeveloperLeaderboard(workspaceId);

  if (isLoading) {
    return (
      <div className="bg-bg-surface rounded-lg border border-border-base overflow-hidden">
        <div className="p-4 border-b border-border-base">
          <div className="h-4 w-40 bg-bg-surface-hover animate-pulse rounded" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-bg-surface-hover animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-bg-surface p-6 rounded-lg border border-border-base flex items-center justify-center text-risk-critical text-sm">
        Failed to load developer leaderboard
      </div>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="bg-bg-surface p-6 rounded-lg border border-border-base flex flex-col items-center justify-center text-text-tertiary min-h-[200px]">
        <Shield size={32} className="mb-2 opacity-20" />
        <p className="text-sm">No leaderboard data available</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-surface rounded-lg border border-border-base overflow-hidden">
      <div className="p-4 border-b border-border-base bg-bg-surface/50">
        <h3 className="text-sm font-medium text-text-primary">Developer Security Leaderboard</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-text-primary">
          <thead className="text-xs text-text-tertiary uppercase bg-bg-root border-b border-border-base">
            <tr>
              <th scope="col" className="px-6 py-3">Developer</th>
              <th scope="col" className="px-6 py-3">Risk Introduced</th>
              <th scope="col" className="px-6 py-3">Risk Fixed</th>
              <th scope="col" className="px-6 py-3">Total PRs</th>
              <th scope="col" className="px-6 py-3">Security Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((dev, i) => (
              <tr key={i} className="border-b border-border-subtle hover:bg-bg-surface-hover transition-colors">
                <td className="px-6 py-4 font-medium">{dev.username}</td>
                <td className="px-6 py-4 text-risk-critical">{dev.riskIntroduced}</td>
                <td className="px-6 py-4 text-risk-low">{dev.riskFixed}</td>
                <td className="px-6 py-4 text-text-secondary">{dev.prs}</td>
                <td className="px-6 py-4">
                  <div className="w-full bg-bg-root rounded-full h-2">
                    <div
                      className="bg-primary-base h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(100, dev.score))}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React from 'react';
import { useWorkspaceSummary } from '../hooks/useAnalytics';

interface Props {
  workspaceId: string;
}

export const SummaryWidget: React.FC<Props> = ({ workspaceId }) => {
  const { data: summary, isLoading, isError } = useWorkspaceSummary(workspaceId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-bg-surface p-6 rounded-lg border border-border-base">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="flex flex-col space-y-2">
            <div className="h-3 w-16 bg-bg-surface-hover animate-pulse rounded" />
            <div className="h-6 w-12 bg-bg-surface-hover animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="bg-bg-surface p-6 rounded-lg border border-border-base text-risk-critical flex items-center justify-center h-32">
        <p className="text-sm font-medium">Failed to load workspace summary</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-bg-surface p-6 rounded-lg border border-border-base">
      <div className="flex flex-col">
        <span className="text-text-tertiary text-xs">Total Repositories</span>
        <span className="text-2xl font-semibold text-text-primary">{summary.repos}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-text-tertiary text-xs">Open Findings</span>
        <span className="text-2xl font-semibold text-text-primary">{summary.findings.total}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-text-tertiary text-xs">Critical</span>
        <span className="text-2xl font-semibold text-risk-critical">{summary.findings.critical}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-text-tertiary text-xs">High</span>
        <span className="text-2xl font-semibold text-risk-high">{summary.findings.high}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-text-tertiary text-xs">Active Scans</span>
        <span className="text-2xl font-semibold text-text-primary">{summary.activeScans}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-text-tertiary text-xs">Total Scans</span>
        <span className="text-2xl font-semibold text-text-primary">{summary.scans}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-text-tertiary text-xs">Total Developers</span>
        <span className="text-2xl font-semibold text-text-primary">{summary.developers}</span>
      </div>
    </div>
  );
};

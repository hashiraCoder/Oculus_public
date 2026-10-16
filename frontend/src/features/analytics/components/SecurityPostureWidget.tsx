import React from 'react';
import { useSecurityPosture } from '../hooks/useAnalytics';

interface Props {
  workspaceId: string;
}

export const SecurityPostureWidget: React.FC<Props> = ({ workspaceId }) => {
  const { data: posture, isLoading, isError } = useSecurityPosture(workspaceId);

  if (isLoading) {
    return (
      <div className="bg-bg-surface p-6 rounded-lg border border-border-base flex flex-col items-center justify-center h-full min-h-[160px]">
        <div className="h-4 w-24 bg-bg-surface-hover animate-pulse rounded mb-4" />
        <div className="h-16 w-16 bg-bg-surface-hover animate-pulse rounded" />
      </div>
    );
  }

  if (isError || !posture) {
    return (
      <div className="bg-bg-surface p-6 rounded-lg border border-border-base flex flex-col items-center justify-center h-full min-h-[160px] text-risk-critical">
        <p className="text-sm font-medium">Failed to load posture</p>
      </div>
    );
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-risk-low';
      case 'B': return 'text-risk-medium';
      case 'C': return 'text-risk-high';
      case 'D':
      case 'F': return 'text-risk-critical';
      default: return 'text-text-primary';
    }
  };

  return (
    <div className="bg-bg-surface p-6 rounded-lg border border-border-base flex flex-col items-center justify-center h-full min-h-[160px]">
      <span className="text-sm text-text-tertiary uppercase tracking-wider font-medium">Security Grade</span>
      <span className={`text-6xl font-bold mt-2 ${getGradeColor(posture.grade)}`}>{posture.grade}</span>
      <span className="text-xs text-text-tertiary mt-4">Security Score: {posture.score}</span>
    </div>
  );
};

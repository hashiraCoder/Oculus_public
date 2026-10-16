import React from 'react';
import type { Severity } from '@/types/common.types';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
  className?: string;
}

const severityConfig: Record<Severity, string> = {
  CRITICAL: 'bg-risk-critical-alpha text-risk-critical border-risk-critical-border',
  HIGH: 'bg-risk-high-alpha text-risk-high border-risk-high-border',
  MEDIUM: 'bg-risk-medium-alpha text-risk-medium border-risk-medium-border',
  LOW: 'bg-risk-low-alpha text-risk-low border-risk-low-border',
};

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md', className = '' }) => {
  const classes = severityConfig[severity] || severityConfig.LOW;
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  
  return (
    <span className={`inline-flex items-center justify-center font-bold border rounded tracking-wider ${classes} ${sizeClasses} ${className}`}>
      {severity}
    </span>
  );
};

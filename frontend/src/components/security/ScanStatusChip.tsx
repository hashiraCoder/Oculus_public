import React from 'react';
import type { ScanStatus } from '@/types/common.types';

interface ScanStatusChipProps {
  status: ScanStatus | string;
  className?: string;
}

export const ScanStatusChip: React.FC<ScanStatusChipProps> = ({ status, className = '' }) => {
  const normalized = status.toUpperCase();

  if (normalized === 'PASSED' || normalized === 'COMPLETED') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 ${className}`}>
        <span>✓</span>
        <span>Completed</span>
      </span>
    );
  }

  if (['SCANNING', 'ANALYZING', 'ACQUIRING_SOURCE', 'DISPATCHED', 'PERSISTING'].includes(normalized)) {
    const label = normalized === 'ACQUIRING_SOURCE' ? 'Cloning' : normalized === 'PERSISTING' ? 'Saving' : 'Analyzing';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>{label}</span>
      </span>
    );
  }

  if (normalized === 'FAILED' || normalized === 'ERROR') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25 ${className}`}>
        <span>✕</span>
        <span>Failed</span>
      </span>
    );
  }

  if (normalized === 'CANCELLED' || normalized === 'TIMEOUT') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-bg-surface-hover text-text-tertiary border border-border-base ${className}`}>
        <span>—</span>
        <span>{normalized === 'TIMEOUT' ? 'Timed Out' : 'Cancelled'}</span>
      </span>
    );
  }

  // QUEUED / default
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-bg-surface-hover text-text-secondary border border-border-base ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
      <span>Queued</span>
    </span>
  );
};

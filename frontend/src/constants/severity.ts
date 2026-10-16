import type { Severity, FindingStatus, ScanStatus, RiskGrade } from '../types/common.types';

export const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: 'var(--color-risk-critical)',
  HIGH: 'var(--color-risk-high)',
  MEDIUM: 'var(--color-risk-medium)',
  LOW: 'var(--color-risk-low)'
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4
};

export const RISK_GRADE_COLORS: Record<RiskGrade, string> = {
  A: 'var(--color-grade-a)',
  B: 'var(--color-grade-b)',
  C: 'var(--color-grade-c)',
  D: 'var(--color-grade-d)',
  F: 'var(--color-grade-f)'
};

export const SCAN_STATUS_COLORS: Record<ScanStatus, string> = {
  QUEUED: 'var(--color-text-secondary)',
  DISPATCHED: 'var(--color-risk-info)',
  ACQUIRING_SOURCE: 'var(--color-risk-info)',
  SCANNING: 'var(--color-primary-base)',
  ANALYZING: 'var(--color-risk-info)',
  PERSISTING: 'var(--color-risk-info)',
  PASSED: 'var(--color-grade-a)',
  FAILED: 'var(--color-risk-critical)',
  COMPLETED: 'var(--color-grade-a)',
  CANCELLED: 'var(--color-text-secondary)',
  TIMEOUT: 'var(--color-risk-high)'
};

export const FINDING_STATUS_COLORS: Record<FindingStatus, string> = {
  OPEN: 'var(--color-risk-critical)',
  CONFIRMED: 'var(--color-risk-high)',
  FIXED: 'var(--color-grade-a)',
  FALSE_POSITIVE: 'var(--color-text-secondary)',
  IGNORED: 'var(--color-text-secondary)'
};

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type FindingStatus = 'OPEN' | 'CONFIRMED' | 'FIXED' | 'FALSE_POSITIVE' | 'IGNORED';

export interface FindingFilters {
  repositoryId?: string;
  severity?: FindingSeverity;
  status?: FindingStatus;
  rule?: string;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  // Extensible for future attributes like branch, prNumber, etc.
}

export interface FindingRowViewModel {
  id: string;
  ruleType: string;
  engine: string | null;
  severity: FindingSeverity;
  filePath: string;
  lineNumber: number;
  snippet: string | null;
  confidenceScore: number | null;
  introducedBy: string | null;
  fingerprint: string;
  status: FindingStatus;
  createdAt: string;
  repositoryName: string;
  repositoryId: string;
}

export interface AuditLogViewModel {
  id: string;
  oldStatus: string;
  newStatus: string;
  comment: string | null;
  createdAt: string;
  changedBy: string | null; // e.g. Email or "System"
}

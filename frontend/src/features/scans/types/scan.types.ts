export interface ScanCardViewModel {
  id: string;
  repositoryId: string;
  commitHash: string;
  status: string;
  conclusion: string | null;       // 'PASS' | 'FAIL' | 'CANCELLED' | 'ERROR' | null
  startedAt: string | null;
  totalFiles: number;
  totalFindings: number;
  isCompleted: boolean;
  isFailed: boolean;
  isError: boolean;                // true when conclusion='ERROR' (scan engine failure)
  statusColor: string;
}

export interface ScanDetailViewModel extends ScanCardViewModel {
  triggeredBy: string;
  durationSeconds: number | null;
  errorMessage: string | null;
  cancelRequested: boolean;
  branch: string | null;
  prNumber: number | null;
}

export interface TimelineItemViewModel {
  id: string;
  type: string;
  payload: any;
  time: string;
}

export interface TerminalLineViewModel {
  id: string;
  level: string;
  text: string;
  time: string;
}

export interface ScanSummaryViewModel {
  lastScanId: string;
  riskScore: number;
  duration: string;
  status: string;
}

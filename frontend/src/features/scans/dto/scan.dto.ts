export interface ScanSummaryDTO {
  id: string;
  repository_id: string;
  pr_number: number | null;
  commit_hash: string | null;
  status: string;
  conclusion?: string | null;
  started_at: string | null;
  finished_at: string | null;
  total_files: number;
  total_findings: number;
  error_message?: string | null;
  branch?: string | null;
}

export interface ScanDetailDTO extends ScanSummaryDTO {
  triggered_by: string;
  github_delivery_id: string | null;
  head_sha: string | null;
  duration_ms: number | null;
  error_message: string | null;
  cancel_requested: boolean;
  branch: string | null;
}

export interface ScanTimelineDTO {
  id: string;
  event_type: string;
  payload: any;
  timestamp: string;
}

export interface ScanLogDTO {
  id: string;
  level: string;
  message: string;
  timestamp: string;
}

export interface ScanGateStatusDTO {
  execution: {
    status: string;
    conclusion: string | null;
  };
  gate: {
    status: 'PENDING' | 'PASSED' | 'FAILED';
    reason: string;
  };
}

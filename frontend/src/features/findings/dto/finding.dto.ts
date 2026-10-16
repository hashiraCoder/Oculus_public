export interface FindingSummaryDTO {
  id: string;
  rule_type: string;
  engine: string | null;
  severity: string;
  file_path: string;
  line_number: number;
  snippet: string | null;
  confidence_score: number | null;
  introduced_by: string | null;
  fingerprint: string;
  status: string;
  created_at: string;
  repo_name: string;
  repo_id: string;
  severity_rank: number;
}

export interface FindingAuditDTO {
  id: string;
  old_status: string;
  new_status: string;
  comment: string | null;
  created_at: string;
  changed_by_email: string | null;
}

export interface BulkUpdateFindingStatusDTO {
  findingIds: string[];
  status: string;
  comment?: string;
}

export interface UpdateFindingStatusDTO {
  status: string;
  comment?: string;
}

export interface FindingsPaginatedResponse {
  items: FindingSummaryDTO[];
  nextCursor: string | null;
}

export interface FingerprintHistoryDTO {
  scan_id: string;
  scan_status: string;
  commit_hash: string | null;
  started_at: string | null;
  finished_at: string | null;
  status: string; // finding status in that scan
}

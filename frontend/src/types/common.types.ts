export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type FindingStatus = 'OPEN' | 'CONFIRMED' | 'FIXED' | 'FALSE_POSITIVE' | 'IGNORED';
export type ScanStatus =
  | 'QUEUED'
  | 'DISPATCHED'         // Job picked up by BullMQ worker
  | 'ACQUIRING_SOURCE'   // Downloading tarball from GitHub
  | 'SCANNING'           // Legacy value — kept for backward compat
  | 'ANALYZING'          // Engines running
  | 'PERSISTING'         // Writing results to database
  | 'PASSED'             // Legacy terminal state
  | 'FAILED'             // Terminal state — findings found
  | 'COMPLETED'          // New terminal state (replaces PASSED for successful + clean)
  | 'CANCELLED'          // User-requested cancellation
  | 'TIMEOUT';           // ResourceGovernor exceeded time limit
export type ScanConclusion = 'PASS' | 'FAIL' | 'CANCELLED' | 'ERROR';
export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Scan {
  id: string;
  repository_id: string;
  pr_number: number | null;
  commit_hash: string;
  status: ScanStatus;
  conclusion: ScanConclusion | null;  // null while scan is in-progress
  triggered_by: string;
  head_sha: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  total_files: number;
  total_findings: number;
  error_message: string | null;
}

export interface User {
  id: string;
  email: string;
  global_role: string;
  is_verified: boolean;
  token_version: number;
  last_login: string;
}

export interface Workspace {
  id: string;
  name: string;
  type: string;
  github_installation_id: string;
  github_account_login: string;
}

export interface Repository {
  id: string;
  workspace_id: string;
  github_repo_id: string;
  name: string;
  full_name: string;
  owner: string;
  is_private: boolean;
  default_branch: string;
  current_risk_score: number;
  current_risk_grade: RiskGrade;
  current_risk_level: RiskLevel;
  url?: string;
  primary_language?: string;
  total_findings?: number;
  critical_findings?: number;
  last_scan_date?: string;
}


export interface Finding {
  id: string;
  scan_id: string;
  rule_type: string;
  severity: Severity;
  file_path: string;
  line_number: number;
  fingerprint: string;
  confidence_score: number;
  status: FindingStatus;
  first_detected_at: string;
  last_detected_at: string;
  number_of_occurrences: number;
}

export interface VulnerabilityAudit {
  id: string;
  vulnerability_id: string;
  old_status: FindingStatus;
  new_status: FindingStatus;
  comment: string;
  changed_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  workspace_id: string;
  event_type: string;
  notification_type: string;
  severity: Severity;
  priority: string;
  payload: any;
  read_at: string | null;
  created_at: string;
}

export interface DashboardSnapshot {
  id: string;
  workspace_id: string;
  timestamp: string;
  total_vulnerabilities: number;
  critical_vulnerabilities: number;
  high_vulnerabilities: number;
  medium_vulnerabilities: number;
  low_vulnerabilities: number;
  average_risk_score: number;
  repositories_scanned: number;
  active_developers: number;
}

export interface RiskSnapshot {
  id: string;
  repository_id: string;
  timestamp: string;
  risk_score: number;
  risk_grade: RiskGrade;
  risk_level: RiskLevel;
  critical_issues: number;
  high_issues: number;
}

export interface DeveloperIdentity {
  id: string;
  workspace_id: string;
  name: string;
  email: string;
  github_username: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

export interface DeveloperMetrics {
  id: string;
  developer_id: string;
  repository_id: string;
  commits_analyzed: number;
  vulnerabilities_introduced: number;
  vulnerabilities_fixed: number;
  risk_score_impact: number;
  last_calculated_at: string;
}

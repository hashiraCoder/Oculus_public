export interface EngineHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  metrics: {
    activeWorkers: number;
    activeScans: number;
    queuePending: number;
    criticalAlerts: number;
    degradedReasons: string[];
  };
  timestamp: string;
}

export interface WorkerLease {
  worker_id: string;
  hostname: string;
  pid: number;
  status: 'IDLE' | 'BUSY' | 'DEAD';
  concurrency_limit: number;
  active_jobs: number;
  started_at: string;
  last_heartbeat_at: string;
  metadata: {
    activeScanIds: string[];
    freemem: number;
    loadavg: number[];
  };
}

export interface QueueStatus {
  counts: {
    wait: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
  };
  waitingPreview: any[];
}

export interface AdminScan {
  id: string;
  repository_id: string;
  status: string;
  conclusion: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
}

export interface ScanStageTelemetry {
  stage_name: string;
  engine_id: string | null;
  engine_version: string | null;
  status: string;
  duration_ms: number;
  memory_used_mb: number | null;
  files_processed: number | null;
  metadata: any;
  created_at: string;
}

export interface EngineAlert {
  id: string;
  alert_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  context: any;
  created_at: string;
}

export interface ShadowResult {
  id: string;
  scan_id: string;
  authoritative_engine: string;
  shadow_engine: string;
  authoritative_finding_count: number;
  shadow_finding_count: number;
  missing_in_shadow: number;
  new_in_shadow: number;
  comparison_data: {
    missingInShadowFingerprints: string[];
    newInShadowFingerprints: string[];
  } | null;
  created_at: string;
}

export interface PromotionGate {
  status: 'PASS' | 'FAIL' | 'INSUFFICIENT_DATA';
  label: string;
  value: number | null;
  threshold: number;
  description: string;
}

export interface PromotionGateResult {
  overallStatus: 'READY_TO_PROMOTE' | 'NOT_READY' | 'INSUFFICIENT_DATA';
  gates: {
    minimum_scans: PromotionGate;
    regression_rate: PromotionGate;
    new_finding_rate: PromotionGate;
    performance_delta: PromotionGate;
  };
  summary: {
    totalShadowScans: number;
    totalAuthoritativeFindings: number;
    totalMissingInNext: number;
    totalNewInNext: number;
    promotionCommand: string | null;
  };
}

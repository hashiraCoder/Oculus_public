export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface SecurityPostureViewModel {
  grade: RiskGrade;
  score: number;
  trend: string;
  criticalCount: number;
  openCount: number;
  blockedPRs: number;
  coverage: number;
  lastScanDate: Date | null;
  complianceRatio: number;
  secretExposure: string;
}

export interface WorkspaceSummaryViewModel {
  repos: number;
  scans: number;
  activeScans: number;
  findings: {
    total: number;
    critical: number;
    high: number;
  };
  developers: number;
}

export interface RiskTrendPointViewModel {
  date: string; // Keep as string for chart axis
  score: number;
}

export interface FindingDistributionViewModel {
  ruleName: string;
  count: number;
}

export interface RepositoryRiskViewModel {
  id: string;
  name: string;
  score: number;
  grade: string;
}

export interface RepositoryRankingViewModel {
  mostVulnerable: RepositoryRiskViewModel[];
  mostSecure: RepositoryRiskViewModel[];
}

export interface DeveloperScoreViewModel {
  username: string;
  riskIntroduced: number;
  riskFixed: number;
  prs: number;
  score: number;
}

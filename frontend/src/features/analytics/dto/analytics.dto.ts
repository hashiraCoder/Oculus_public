export interface SecurityPostureDTO {
  securityGrade: string;
  riskScore: number;
  trend: string;
  criticalIssues: number;
  openFindings: number;
  blockedPRs: number;
  repositoryCoverage: number;
  repositoriesProtected: number;
  lastScan: string | null;
  averageFixTime: string;
  compliancePercentage: number;
  secretExposure: string;
}

export interface WorkspaceSummaryDTO {
  totalRepositories: number;
  totalScans: number;
  activeScans: number;
  openFindings: number;
  criticalFindings: number;
  highFindings: number;
  averageScanDuration: number;
  totalDevelopers: number;
}

export interface RiskTrendDTO {
  date: string;
  averageRisk: number;
}

export interface FindingDistributionDTO {
  rule: string;
  count: number;
}

export interface RepositoryRiskDTO {
  id: string;
  name: string;
  current_risk_score: number | null;
  current_risk_grade: string | null;
}

export interface RepositoryRankingDTO {
  mostVulnerable: RepositoryRiskDTO[];
  mostSecure: RepositoryRiskDTO[];
}

export interface DeveloperLeaderboardDTO {
  github_username: string;
  risk_introduced: number;
  risk_fixed: number;
  total_prs: number;
  security_score: number;
}

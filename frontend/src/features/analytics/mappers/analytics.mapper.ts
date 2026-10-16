import type { 
  SecurityPostureDTO, 
  WorkspaceSummaryDTO, 
  RiskTrendDTO, 
  FindingDistributionDTO, 
  RepositoryRiskDTO, 
  RepositoryRankingDTO, 
  DeveloperLeaderboardDTO 
} from '../dto/analytics.dto';

import type {
  SecurityPostureViewModel,
  WorkspaceSummaryViewModel,
  RiskTrendPointViewModel,
  FindingDistributionViewModel,
  RepositoryRiskViewModel,
  RepositoryRankingViewModel,
  DeveloperScoreViewModel
} from '../types/analytics.types';

export const analyticsMapper = {
  toSecurityPosture(dto: SecurityPostureDTO): SecurityPostureViewModel {
    const normalizedGrade = ['A', 'B', 'C', 'D', 'F'].includes(dto.securityGrade || '')
      ? (dto.securityGrade as SecurityPostureViewModel['grade'])
      : 'F';

    return {
      grade: normalizedGrade,
      score: dto.riskScore || 0,
      trend: dto.trend || 'stable',
      criticalCount: dto.criticalIssues || 0,
      openCount: dto.openFindings || 0,
      blockedPRs: dto.blockedPRs || 0,
      coverage: dto.repositoryCoverage || 0,
      lastScanDate: dto.lastScan ? new Date(dto.lastScan) : null,
      complianceRatio: dto.compliancePercentage || 0,
      secretExposure: dto.secretExposure || 'LOW'
    };
  },

  toWorkspaceSummary(dto: WorkspaceSummaryDTO): WorkspaceSummaryViewModel {
    return {
      repos: dto.totalRepositories || 0,
      scans: dto.totalScans || 0,
      activeScans: dto.activeScans || 0,
      findings: {
        total: dto.openFindings || 0,
        critical: dto.criticalFindings || 0,
        high: dto.highFindings || 0,
      },
      developers: dto.totalDevelopers || 0
    };
  },

  toRiskTrend(dtos: RiskTrendDTO[]): RiskTrendPointViewModel[] {
    return dtos.map(dto => ({
      date: new Date(dto.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: dto.averageRisk || 0
    }));
  },

  toFindingDistribution(dtos: FindingDistributionDTO[]): FindingDistributionViewModel[] {
    return dtos.map(dto => ({
      ruleName: dto.rule,
      count: dto.count
    }));
  },

  toRepositoryRisk(dto: RepositoryRiskDTO): RepositoryRiskViewModel {
    return {
      id: dto.id,
      name: dto.name,
      score: dto.current_risk_score || 0,
      grade: dto.current_risk_grade || 'N/A'
    };
  },

  toRepositoryRanking(dto: RepositoryRankingDTO): RepositoryRankingViewModel {
    return {
      mostVulnerable: (dto.mostVulnerable || []).map(this.toRepositoryRisk),
      mostSecure: (dto.mostSecure || []).map(this.toRepositoryRisk)
    };
  },

  toDeveloperScore(dto: DeveloperLeaderboardDTO): DeveloperScoreViewModel {
    return {
      username: dto.github_username,
      riskIntroduced: dto.risk_introduced || 0,
      riskFixed: dto.risk_fixed || 0,
      prs: dto.total_prs || 0,
      score: dto.security_score || 0
    };
  }
};

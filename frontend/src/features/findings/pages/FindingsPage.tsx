import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useInfiniteFindings } from '../hooks/useFindings';
import { useFindingsSocket } from '../hooks/useFindingsSocket';
import { useWorkspaceSummary } from '@/features/analytics/hooks/useAnalytics';
import { FindingsTable } from '../components/FindingsTable';
import { FindingDetailPanel } from '../components/FindingDetailPanel';
import { ScanTriggerModal } from '@/features/scans/components/ScanTriggerModal';
import { useQuery } from '@tanstack/react-query';
import { repositoryApi } from '@/features/repositories/api/repositoryApi';
import { repositoryKeys } from '@/features/repositories/api/repository.keys';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Download, Play, Shield } from 'lucide-react';
import { toast } from 'sonner';
import type { FindingFilters, FindingRowViewModel, FindingSeverity, FindingStatus } from '../types/finding.types';
import { cn } from '@/lib/utils';

export const FindingsPage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected filters from URL or default
  const [selectedSeverity, setSelectedSeverity] = useState<string>(searchParams.get('severity') || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'ALL');
  const [selectedRepoId, setSelectedRepoId] = useState<string>(searchParams.get('repositoryId') || '');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('keyword') || searchParams.get('rule') || '');
  
  const [selectedFinding, setSelectedFinding] = useState<FindingRowViewModel | null>(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  // Attach real-time sockets
  useFindingsSocket(workspaceId!);

  // Fetch summary counts for pills
  const { data: summary } = useWorkspaceSummary(workspaceId);

  // Repositories for dropdown
  const { data: repositories = [] } = useQuery({
    queryKey: repositoryKeys.dropdown(workspaceId!),
    queryFn: async () => {
      const res = await repositoryApi.listRepositories(workspaceId!);
      return res.items || [];
    },
    enabled: !!workspaceId
  });

  // Construct query filters
  const filters: FindingFilters = useMemo(() => ({
    repositoryId: selectedRepoId || undefined,
    severity: selectedSeverity !== 'ALL' ? (selectedSeverity as FindingSeverity) : undefined,
    status: selectedStatus !== 'ALL' ? (selectedStatus as FindingStatus) : undefined,
    keyword: searchQuery.trim() || undefined,
    rule: searchQuery.trim() || undefined,
  }), [selectedRepoId, selectedSeverity, selectedStatus, searchQuery]);

  const {
    data: findingsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteFindings(workspaceId, filters);

  const flattenedFindings = useMemo(() => {
    return findingsData?.pages.flatMap((page) => page?.items ?? []) ?? [];
  }, [findingsData]);

  // Update URL params when filters change
  const updateFilters = (newSev?: string, newStat?: string, newRepo?: string, newSearch?: string) => {
    const sev = newSev !== undefined ? newSev : selectedSeverity;
    const stat = newStat !== undefined ? newStat : selectedStatus;
    const repo = newRepo !== undefined ? newRepo : selectedRepoId;
    const search = newSearch !== undefined ? newSearch : searchQuery;

    if (newSev !== undefined) setSelectedSeverity(newSev);
    if (newStat !== undefined) setSelectedStatus(newStat);
    if (newRepo !== undefined) setSelectedRepoId(newRepo);
    if (newSearch !== undefined) setSearchQuery(newSearch);

    const params = new URLSearchParams(searchParams);
    if (sev && sev !== 'ALL') params.set('severity', sev);
    else params.delete('severity');

    if (stat && stat !== 'ALL') params.set('status', stat);
    else params.delete('status');

    if (repo) params.set('repositoryId', repo);
    else params.delete('repositoryId');

    if (search.trim()) {
      params.set('keyword', search.trim());
      params.set('rule', search.trim());
    } else {
      params.delete('keyword');
      params.delete('rule');
    }

    setSearchParams(params, { replace: true });
  };

  const handleExportCSV = () => {
    if (flattenedFindings.length === 0) {
      toast.info('No findings available to export');
      return;
    }

    const headers = ['ID', 'Severity', 'Rule', 'Repository', 'FilePath', 'LineNumber', 'Engine', 'Status', 'DetectedAt'];
    const rows = flattenedFindings.map(f => [
      f.id,
      f.severity,
      `"${(f.ruleType || '').replace(/"/g, '""')}"`,
      `"${(f.repositoryName || '').replace(/"/g, '""')}"`,
      `"${(f.filePath || '').replace(/"/g, '""')}"`,
      f.lineNumber,
      `"${(f.engine || 'AST Semgrep').replace(/"/g, '""')}"`,
      f.status,
      f.createdAt || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `oculus-findings-${workspaceId}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${flattenedFindings.length} findings to CSV`);
  };

  if (!workspaceId) {
    return <div className="p-8 text-center text-risk-critical">Workspace ID is required</div>;
  }

  if (isError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-text-primary bg-bg-root">
        <Shield size={48} className="text-risk-critical mb-4" />
        <h2 className="text-xl font-bold mb-2">Error loading findings</h2>
        <p className="text-text-secondary text-sm">Unable to retrieve security findings for this workspace.</p>
      </div>
    );
  }

  // Calculate severity counts
  const critCount = summary?.findings?.critical ?? flattenedFindings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = summary?.findings?.high ?? flattenedFindings.filter(f => f.severity === 'HIGH').length;
  const medCount = flattenedFindings.filter(f => f.severity === 'MEDIUM').length;
  const lowCount = flattenedFindings.filter(f => f.severity === 'LOW').length;

  return (
    <div className="p-6 h-full flex flex-col space-y-4 animate-fade-in text-text-primary overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Findings Explorer</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Granular security findings across static analysis, secret detection, and dependency audits
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button 
            size="sm" 
            onClick={() => setIsScanModalOpen(true)}
            className="text-xs"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Trigger Scan</span>
          </Button>
        </div>
      </div>

      {/* Top Filter Bar Card matching the approved prototype */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg p-3 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Filter by rule, path, or fingerprint..."
              value={searchQuery}
              onChange={(e) => updateFilters(undefined, undefined, undefined, e.target.value)}
              className="w-full sm:w-64 bg-bg-base border border-border-normal rounded-md px-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary-base focus:outline-none transition-colors"
            />

            {/* Severity Pill Segmented Control */}
            <div className="flex items-center gap-1 bg-bg-base p-1 rounded-md border border-border-normal text-xs overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => updateFilters('ALL')}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap",
                  selectedSeverity === 'ALL'
                    ? "bg-bg-surface text-text-primary border border-border-strong shadow-xs"
                    : "text-text-tertiary hover:text-text-primary"
                )}
              >
                All
              </button>

              <button
                type="button"
                onClick={() => updateFilters('CRITICAL')}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap",
                  selectedSeverity === 'CRITICAL'
                    ? "bg-risk-critical-alpha text-risk-critical border border-risk-critical-border"
                    : "text-text-tertiary hover:text-risk-critical"
                )}
              >
                <span>Critical</span>
                <span className="opacity-80">({critCount})</span>
              </button>

              <button
                type="button"
                onClick={() => updateFilters('HIGH')}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap",
                  selectedSeverity === 'HIGH'
                    ? "bg-risk-high-alpha text-risk-high border border-risk-high-border"
                    : "text-text-tertiary hover:text-risk-high"
                )}
              >
                <span>High</span>
                <span className="opacity-80">({highCount})</span>
              </button>

              <button
                type="button"
                onClick={() => updateFilters('MEDIUM')}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap",
                  selectedSeverity === 'MEDIUM'
                    ? "bg-risk-medium-alpha text-risk-medium border border-risk-medium-border"
                    : "text-text-tertiary hover:text-risk-medium"
                )}
              >
                <span>Medium</span>
                <span className="opacity-80">({medCount})</span>
              </button>

              <button
                type="button"
                onClick={() => updateFilters('LOW')}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap",
                  selectedSeverity === 'LOW'
                    ? "bg-risk-low-alpha text-risk-low border border-risk-low-border"
                    : "text-text-tertiary hover:text-risk-low"
                )}
              >
                <span>Low</span>
                <span className="opacity-80">({lowCount})</span>
              </button>
            </div>

            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => updateFilters(undefined, e.target.value)}
              className="w-full sm:w-auto bg-bg-base border border-border-normal rounded-md px-3 py-1.5 text-xs text-text-primary focus:border-primary-base focus:outline-none transition-colors cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Status: Open</option>
              <option value="CONFIRMED">Status: Confirmed</option>
              <option value="FIXED">Status: Fixed</option>
              <option value="FALSE_POSITIVE">Status: False Positive</option>
            </select>

            {/* Repository Dropdown */}
            <select
              value={selectedRepoId}
              onChange={(e) => updateFilters(undefined, undefined, e.target.value)}
              className="w-full sm:w-auto bg-bg-base border border-border-normal rounded-md px-3 py-1.5 text-xs text-text-primary focus:border-primary-base focus:outline-none transition-colors cursor-pointer max-w-full sm:max-w-[200px]"
            >
              <option value="">All Repositories</option>
              {repositories.map(repo => (
                <option key={repo.id} value={repo.id}>{repo.name}</option>
              ))}
            </select>
          </div>

          {/* Right Counter */}
          <div className="text-[11.5px] text-text-tertiary font-mono shrink-0 self-end lg:self-center">
            Showing <span className="font-bold text-text-primary">{flattenedFindings.length}</span> findings
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
        <FindingsTable
          findings={flattenedFindings}
          selectedId={selectedFinding?.id}
          onSelect={setSelectedFinding}
          hasMore={!!hasNextPage}
          onLoadMore={fetchNextPage}
          isLoading={isLoading || isFetchingNextPage}
        />
      </div>

      {/* Slide-over Drawer for Finding Details */}
      <Drawer
        isOpen={!!selectedFinding}
        onClose={() => setSelectedFinding(null)}
        title="Finding Details"
        description={selectedFinding?.ruleType || "Triage and activity history"}
        size="lg"
      >
        {selectedFinding && (
          <FindingDetailPanel
            finding={selectedFinding}
            workspaceId={workspaceId}
            onClose={() => setSelectedFinding(null)}
          />
        )}
      </Drawer>

      {/* Trigger Scan Modal */}
      <ScanTriggerModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        defaultRepoId={selectedRepoId || undefined}
      />
    </div>
  );
};

export default FindingsPage;

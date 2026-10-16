import React, { useRef, useEffect, useState } from 'react';
import type { FindingRowViewModel, FindingStatus } from '../types/finding.types';
import { SeverityBadge } from '@/components/security/SeverityBadge';
import { formatDistanceToNow } from 'date-fns';
import { Shield, CheckSquare, Square, X } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { useBulkUpdateFindingStatus } from '../hooks/useFindings';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/stores/authStore';

interface FindingsTableProps {
  findings: FindingRowViewModel[];
  selectedId?: string;
  onSelect: (f: FindingRowViewModel) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
}

export const FindingsTable: React.FC<FindingsTableProps> = ({
  findings,
  selectedId,
  onSelect,
  hasMore,
  onLoadMore,
  isLoading
}) => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const parentRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const { user } = useAuthStore();
  const isReadOnly = user?.role === 'viewer';

  const { mutate: bulkUpdate, isPending: isBulkUpdating } = useBulkUpdateFindingStatus();

  const rowVirtualizer = useVirtualizer({
    count: hasMore ? findings.length + 1 : findings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 54,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    if (
      lastItem.index >= findings.length - 1 &&
      hasMore &&
      !isLoading
    ) {
      onLoadMore();
    }
  }, [hasMore, onLoadMore, findings.length, isLoading, virtualItems]);

  const toggleSelectAll = () => {
    if (selectedIds.size === findings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(findings.map(f => f.id)));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkStatus = (status: FindingStatus) => {
    if (!workspaceId || isReadOnly) return;
    bulkUpdate({ workspaceId, findingIds: Array.from(selectedIds), status }, {
      onSuccess: () => setSelectedIds(new Set())
    });
  };

  if (findings.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-tertiary bg-bg-surface p-12">
        <Shield className="w-10 h-10 mb-3 text-text-muted opacity-40" />
        <p className="text-sm font-semibold text-text-primary">No findings match your filters</p>
        <p className="text-xs text-text-secondary mt-1">Try adjusting severity, status, or search keywords</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-bg-surface overflow-x-auto overflow-y-hidden flex flex-col h-full relative select-none">
      <div className="min-w-[880px] flex-1 flex flex-col h-full">
        {/* Table Header matching approved prototype */}
        <div className="grid grid-cols-[36px_90px_minmax(220px,2fr)_minmax(120px,1fr)_minmax(160px,1.2fr)_110px_100px_85px] gap-3 px-4 py-2.5 border-b border-border-subtle text-[11px] font-semibold text-text-tertiary uppercase tracking-wider bg-bg-surface-alt sticky top-0 z-10 items-center shrink-0">
          <div onClick={toggleSelectAll} className="cursor-pointer text-text-tertiary hover:text-text-primary flex items-center">
            {selectedIds.size > 0 && selectedIds.size === findings.length ? (
              <CheckSquare className="w-3.5 h-3.5 text-primary-base" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
          </div>
          <div>Severity</div>
          <div>Finding / Rule</div>
          <div>Repository</div>
          <div>File & Line</div>
          <div>Engine</div>
          <div>Status</div>
          <div>Detected</div>
        </div>

        {/* Floating Action Bar for Bulk Triage */}
        {selectedIds.size > 0 && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 bg-bg-surface border border-border-strong rounded-lg px-4 py-2 shadow-modal flex items-center gap-3 animate-slide-up">
            <span className="font-semibold text-xs text-text-primary">
              {selectedIds.size} selected
            </span>
            <div className="h-3.5 w-px bg-border-normal" />
            {!isReadOnly ? (
              <div className="flex gap-1.5">
                <button 
                  disabled={isBulkUpdating} 
                  onClick={() => handleBulkStatus('CONFIRMED')} 
                  className="px-2 py-1 text-xs font-semibold rounded bg-risk-high-alpha text-risk-high hover:bg-risk-high hover:text-white transition-colors"
                >
                  Confirm
                </button>
                <button 
                  disabled={isBulkUpdating} 
                  onClick={() => handleBulkStatus('FALSE_POSITIVE')} 
                  className="px-2 py-1 text-xs font-semibold rounded bg-bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
                >
                  False Positive
                </button>
                <button 
                  disabled={isBulkUpdating} 
                  onClick={() => handleBulkStatus('FIXED')} 
                  className="px-2 py-1 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors"
                >
                  Mark Fixed
                </button>
              </div>
            ) : (
              <span className="text-xs text-text-tertiary italic">Read-only mode</span>
            )}
            <div className="h-3.5 w-px bg-border-normal" />
            <button onClick={() => setSelectedIds(new Set())} className="text-text-tertiary hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Virtualized Body */}
        <div ref={parentRef} className="flex-1 overflow-y-auto bg-bg-surface divide-y divide-border-subtle">
          {isLoading && findings.length === 0 ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="animate-pulse bg-bg-surface-hover h-11 rounded w-full border border-border-subtle" />
              ))}
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const isLoaderRow = virtualRow.index > findings.length - 1;
                const finding = findings[virtualRow.index];

                if (isLoaderRow) {
                  return (
                    <div
                      key={virtualRow.index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="flex items-center px-4 border-b border-border-subtle bg-bg-surface"
                    >
                      <div className="h-4 w-16 bg-bg-surface-hover animate-pulse rounded mr-3" />
                      <div className="h-3.5 w-60 bg-bg-surface-hover animate-pulse rounded" />
                    </div>
                  );
                }

                const isSelected = selectedId === finding.id;
                const isChecked = selectedIds.has(finding.id);

                return (
                  <div
                    key={finding.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => onSelect(finding)}
                    className={cn(
                      "grid grid-cols-[36px_90px_minmax(220px,2fr)_minmax(120px,1fr)_minmax(160px,1.2fr)_110px_100px_85px] gap-3 px-4 py-2 border-b border-border-subtle cursor-pointer items-center transition-colors text-xs",
                      isSelected ? "bg-bg-surface-hover/90 border-l-2 border-l-primary-base" : "hover:bg-bg-surface-hover/50",
                      isChecked && "bg-primary-alpha/5"
                    )}
                  >
                    <div onClick={(e) => toggleSelect(finding.id, e)} className="cursor-pointer text-text-tertiary hover:text-primary-base flex items-center">
                      {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-primary-base" /> : <Square className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <SeverityBadge severity={finding.severity as any} size="sm" />
                    </div>
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-text-primary truncate">{finding.ruleType}</div>
                      <div className="text-[10.5px] text-text-muted font-mono truncate mt-0.5">
                        {finding.fingerprint || finding.ruleType}
                      </div>
                    </div>
                    <div className="text-text-primary truncate font-medium">
                      {finding.repositoryName}
                    </div>
                    <div className="text-[11px] text-sky-400 font-mono truncate">
                      {finding.filePath}:{finding.lineNumber}
                    </div>
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-medium bg-bg-surface-hover text-text-secondary border border-border-subtle truncate max-w-full">
                        {finding.engine || 'AST Semgrep'}
                      </span>
                    </div>
                    <div>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border",
                        finding.status === 'OPEN' ? "bg-risk-critical-alpha text-risk-critical border-risk-critical-border" :
                        finding.status === 'CONFIRMED' ? "bg-risk-high-alpha text-risk-high border-risk-high-border" :
                        finding.status === 'FIXED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" :
                        "bg-bg-surface-hover text-text-tertiary border-border-subtle"
                      )}>
                        {finding.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-tertiary truncate">
                      {finding.createdAt ? formatDistanceToNow(new Date(finding.createdAt), { addSuffix: true }) : '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

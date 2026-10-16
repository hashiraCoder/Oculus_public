import React, { useState } from 'react';
import type { FindingStatus, FindingRowViewModel } from '../types/finding.types';
import { useUpdateFindingStatus, useFindingAudit, useFingerprintHistory } from '../hooks/useFindings';
import { SeverityBadge } from '@/components/security/SeverityBadge';
import { 
  ChevronDown, ChevronRight, Activity, GitCommit, FileCode, 
  ShieldAlert, Check, Copy, CheckCheck, Layers, Terminal, 
  Clock, Shield, Cpu, ArrowRight, CornerDownRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FindingDetailPanelProps {
  finding: FindingRowViewModel;
  workspaceId: string;
  onClose: () => void;
}

type TabType = 'overview' | 'metadata' | 'audit' | 'history' | 'all';

export const FindingDetailPanel: React.FC<FindingDetailPanelProps> = ({ finding, workspaceId }) => {
  const [status, setStatus] = useState<FindingStatus>(finding.status);
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  
  const { user } = useAuthStore();
  const isReadOnly = user?.role === 'viewer';

  const { mutate: updateStatus, isPending } = useUpdateFindingStatus();
  const { data: auditLogs = [], isLoading: isAuditLoading } = useFindingAudit(workspaceId, finding.id);
  const { data: fingerprintHistory = [], isLoading: isHistoryLoading } = useFingerprintHistory(workspaceId, finding.fingerprint);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    metadata: true,
    audit: true,
    scanHistory: true,
  });

  const toggleSection = (sec: string) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const expandAll = () => {
    setExpandedSections({ metadata: true, audit: true, scanHistory: true });
  };

  const collapseAll = () => {
    setExpandedSections({ metadata: false, audit: false, scanHistory: false });
  };

  const handleStatusChange = (newStatus?: FindingStatus) => {
    if (isReadOnly) return;
    const targetStatus = newStatus || status;
    updateStatus({ workspaceId, findingId: finding.id, status: targetStatus, comment }, {
      onSuccess: () => {
        setComment('');
        toast.success(`Finding marked as ${targetStatus.replace('_', ' ')}`);
      },
      onError: (err: any) => {
        toast.error(err?.message || 'Failed to update finding status');
      }
    });
  };

  const copyToClipboard = (text: string, type: 'fingerprint' | 'path' | 'snippet') => {
    navigator.clipboard.writeText(text);
    if (type === 'fingerprint') {
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
      toast.success('SHA-256 fingerprint copied to clipboard');
    } else if (type === 'path') {
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
      toast.success('File path copied');
    } else if (type === 'snippet') {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
      toast.success('Code snippet copied');
    }
  };

  const tabs: { id: TabType; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'overview', label: 'Overview & Code', icon: Terminal },
    { id: 'metadata', label: 'Metadata', icon: Cpu },
    { id: 'audit', label: 'Audit Trail', icon: Activity, badge: auditLogs.length },
    { id: 'history', label: 'Scan History', icon: GitCommit, badge: fingerprintHistory.length },
    { id: 'all', label: 'All Sections', icon: Layers },
  ];

  /* ─────────────────────────────────────────────────────────────────────────────
     RENDER: Triage Box Component
  ───────────────────────────────────────────────────────────────────────────── */
  const renderTriageBox = () => {
    if (isReadOnly) {
      return (
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/25 rounded-lg flex items-center gap-2 text-cyan-400">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Viewer role: Triage actions are disabled.</span>
        </div>
      );
    }

    return (
      <div className="p-3.5 bg-bg-surface border border-border-subtle rounded-lg space-y-3 shadow-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-primary-base" />
            <span className="font-semibold text-text-primary text-[11.5px] uppercase tracking-wider">
              Triage Status
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-text-tertiary">Current:</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wider",
              finding.status === 'OPEN' ? "bg-risk-critical-alpha text-risk-critical border-risk-critical-border" :
              finding.status === 'CONFIRMED' ? "bg-risk-high-alpha text-risk-high border-risk-high-border" :
              finding.status === 'FIXED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" :
              "bg-bg-surface-hover text-text-tertiary border-border-subtle"
            )}>
              {finding.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button
            type="button"
            size="sm"
            variant={status === 'CONFIRMED' ? 'default' : 'outline'}
            className={cn(
              "text-[11px] w-full flex items-center justify-center gap-1.5 h-8 font-medium transition-all cursor-pointer",
              status === 'CONFIRMED' && "bg-risk-high hover:bg-risk-high/90 text-white shadow-xs"
            )}
            onClick={() => {
              setStatus('CONFIRMED');
              handleStatusChange('CONFIRMED');
            }}
            disabled={isPending}
          >
            <Check className="w-3 h-3" />
            <span>Confirm</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={status === 'FALSE_POSITIVE' ? 'default' : 'outline'}
            className={cn(
              "text-[11px] w-full flex items-center justify-center gap-1.5 h-8 font-medium transition-all cursor-pointer",
              status === 'FALSE_POSITIVE' && "bg-text-tertiary text-white shadow-xs"
            )}
            onClick={() => {
              setStatus('FALSE_POSITIVE');
              handleStatusChange('FALSE_POSITIVE');
            }}
            disabled={isPending}
          >
            <span>False Pos</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={status === 'FIXED' ? 'default' : 'outline'}
            className={cn(
              "text-[11px] w-full flex items-center justify-center gap-1.5 h-8 font-medium transition-all cursor-pointer",
              status === 'FIXED' && "bg-emerald-500 hover:bg-emerald-600 text-black shadow-xs"
            )}
            onClick={() => {
              setStatus('FIXED');
              handleStatusChange('FIXED');
            }}
            disabled={isPending}
          >
            <Check className="w-3 h-3" />
            <span>Mark Fixed</span>
          </Button>
        </div>

        <div className="space-y-1.5">
          <textarea
            placeholder="Add optional triage reason / comment (e.g. 'Sanitized upstream in gateway')..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="w-full bg-bg-base border border-border-normal rounded-md p-2.5 text-xs text-text-primary h-16 resize-none focus:border-primary-base focus:outline-none transition-colors placeholder:text-text-tertiary font-sans"
          />
          {comment.trim() && (
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-[10.5px] h-6 px-2.5"
                onClick={() => handleStatusChange()}
                disabled={isPending}
              >
                Save Comment with Status
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────────
     RENDER: Code Snippet Card
  ───────────────────────────────────────────────────────────────────────────── */
  const renderCodeSnippet = () => {
    if (!finding.snippet) return null;

    return (
      <div className="border border-border-subtle rounded-lg overflow-hidden bg-bg-root shadow-surface">
        <div className="px-3.5 py-2 border-b border-border-subtle bg-bg-surface flex items-center justify-between text-[11px] font-semibold text-text-secondary">
          <div className="flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-risk-critical" />
            <span>Vulnerable Code Line {finding.lineNumber}</span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(finding.snippet || '', 'snippet')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover transition-colors cursor-pointer"
            title="Copy code snippet"
          >
            {copiedSnippet ? <CheckCheck className="w-3 h-3 text-primary-base" /> : <Copy className="w-3 h-3" />}
            <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="p-3.5 overflow-x-auto max-h-64 overflow-y-auto text-[11px] font-mono leading-5 text-text-secondary bg-bg-root whitespace-pre-wrap break-all sm:break-words border-l-3 border-l-risk-critical select-text">
          {finding.snippet}
        </pre>
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────────
     RENDER: Metadata Section Card
  ───────────────────────────────────────────────────────────────────────────── */
  const renderMetadataContent = () => (
    <div className="p-3.5 space-y-3.5 bg-bg-surface-alt rounded-lg border border-border-subtle text-xs shadow-surface">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1">
            <Cpu className="w-3 h-3 text-primary-base" />
            Deterministic Fingerprint (SHA-256)
          </span>
          <button
            type="button"
            onClick={() => copyToClipboard(finding.fingerprint, 'fingerprint')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover transition-colors cursor-pointer"
            title="Copy SHA-256 fingerprint"
          >
            {copiedFingerprint ? <CheckCheck className="w-3 h-3 text-primary-base" /> : <Copy className="w-3 h-3" />}
            <span>{copiedFingerprint ? 'Copied' : 'Copy Hash'}</span>
          </button>
        </div>
        <div className="font-mono bg-bg-base px-3 py-2 rounded-md text-[10.5px] text-text-secondary border border-border-subtle break-all select-all leading-relaxed">
          {finding.fingerprint}
        </div>
        <p className="text-[10px] text-text-tertiary mt-1">
          Stable deduplication key generated across commits regardless of line shifts.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border-subtle text-xs">
        <div className="p-2.5 rounded bg-bg-base border border-border-subtle space-y-1">
          <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider block">Security Engine</span>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-text-primary text-xs">{finding.engine || 'AST Semgrep'}</span>
            <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-bg-surface border border-border-subtle text-primary-base">v2.0</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-bg-base border border-border-subtle space-y-1">
          <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider block">Target Repository</span>
          <span className="font-semibold text-text-primary truncate block text-xs" title={finding.repositoryName}>
            {finding.repositoryName}
          </span>
        </div>

        <div className="p-2.5 rounded bg-bg-base border border-border-subtle space-y-1">
          <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider block">Detection Confidence</span>
          <span className="font-semibold text-emerald-400 text-xs">
            {finding.confidenceScore !== null ? `${finding.confidenceScore}% (Verified)` : 'High (Rule Match)'}
          </span>
        </div>

        <div className="p-2.5 rounded bg-bg-base border border-border-subtle space-y-1">
          <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider block">First Detected</span>
          <span className="font-semibold text-text-primary text-xs">
            {finding.createdAt ? formatDistanceToNow(new Date(finding.createdAt), { addSuffix: true }) : 'Current Scan'}
          </span>
        </div>
      </div>
    </div>
  );

  /* ─────────────────────────────────────────────────────────────────────────────
     RENDER: Audit Trail Content
  ───────────────────────────────────────────────────────────────────────────── */
  const renderAuditContent = () => (
    <div className="p-3.5 bg-bg-surface-alt rounded-lg border border-border-subtle space-y-3 shadow-surface">
      {isAuditLoading ? (
        <div className="space-y-2 py-2">
          <div className="h-4 bg-bg-surface-hover rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-bg-surface-hover rounded w-1/2 animate-pulse" />
        </div>
      ) : auditLogs && auditLogs.length > 0 ? (
        <div className="space-y-3 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-border-normal">
          {auditLogs.map((audit) => (
            <div key={audit.id} className="relative pl-6 text-xs">
              <div className="absolute w-2 h-2 rounded-full bg-primary-base left-[5px] top-1.5 ring-2 ring-bg-surface-alt" />
              <div className="flex flex-wrap items-center justify-between gap-1">
                <div className="text-text-secondary">
                  Status changed to <span className="font-semibold text-text-primary uppercase tracking-wider text-[11px]">{audit.newStatus}</span>
                </div>
                <div className="text-[10px] text-text-tertiary">
                  {formatDistanceToNow(new Date(audit.createdAt), { addSuffix: true })}
                </div>
              </div>
              <div className="text-[10.5px] text-text-tertiary mt-0.5">
                Updated by <span className="font-medium text-text-secondary">{audit.changedBy || 'Security Engineer'}</span>
              </div>
              {audit.comment && (
                <div className="mt-1.5 p-2 bg-bg-base rounded text-text-secondary text-[11px] border border-border-subtle italic flex items-start gap-1.5">
                  <CornerDownRight className="w-3 h-3 text-text-tertiary shrink-0 mt-0.5" />
                  <span>"{audit.comment}"</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[11.5px] text-text-tertiary text-center py-4 space-y-1">
          <Activity className="w-6 h-6 mx-auto text-text-muted opacity-40 mb-1" />
          <p className="font-medium text-text-secondary">No status transitions recorded</p>
          <p className="text-[10.5px]">This finding is in its initial state without manual triage changes.</p>
        </div>
      )}
    </div>
  );

  /* ─────────────────────────────────────────────────────────────────────────────
     RENDER: Scan History Content
  ───────────────────────────────────────────────────────────────────────────── */
  const renderHistoryContent = () => (
    <div className="p-3.5 bg-bg-surface-alt rounded-lg border border-border-subtle space-y-2.5 shadow-surface">
      {isHistoryLoading ? (
        <div className="h-6 bg-bg-surface-hover rounded animate-pulse" />
      ) : fingerprintHistory && fingerprintHistory.length > 0 ? (
        <div className="space-y-2">
          {fingerprintHistory.map((entry, idx) => (
            <div key={`${entry.scan_id}-${idx}`} className="flex items-center justify-between p-2.5 bg-bg-base rounded-md border border-border-subtle text-xs hover:border-border-normal transition-colors">
              <div className="flex items-center gap-2">
                <GitCommit className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                <span className="font-mono text-text-secondary font-medium">{entry.commit_hash?.substring(0, 7) || 'commit-ref'}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-bg-surface text-text-tertiary border border-border-subtle">
                {entry.scan_status || 'COMPLETED'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[11.5px] text-text-tertiary text-center py-4 space-y-1">
          <Clock className="w-6 h-6 mx-auto text-text-muted opacity-40 mb-1" />
          <p className="font-medium text-text-secondary">First Observed in Current Scan</p>
          <p className="text-[10.5px]">No previous baseline or PR scans contained this identical fingerprint.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col space-y-4 text-xs pb-8 min-h-0">
      {/* ── TOP HEADER HERO CARD ── */}
      <div className="p-4 bg-bg-surface-alt rounded-xl border border-border-subtle space-y-3 shadow-surface shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={finding.severity as any} size="md" />
            <span className="font-semibold text-text-primary text-sm tracking-tight">{finding.ruleType}</span>
          </div>
          <span className="font-mono text-[10.5px] text-text-tertiary bg-bg-base px-2.5 py-1 rounded-md border border-border-subtle">
            Confidence: {finding.confidenceScore !== null ? `${finding.confidenceScore}%` : 'High'}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-subtle/60 text-xs">
          <div className="font-mono text-[11px] text-text-secondary flex items-center gap-1.5 break-all min-w-0">
            <FileCode className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
            <span className="truncate">{finding.filePath}:{finding.lineNumber}</span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(`${finding.filePath}:${finding.lineNumber}`, 'path')}
            className="inline-flex items-center gap-1 text-[10.5px] text-text-tertiary hover:text-text-primary transition-colors cursor-pointer shrink-0"
            title="Copy path and line"
          >
            {copiedPath ? <CheckCheck className="w-3 h-3 text-primary-base" /> : <Copy className="w-3 h-3" />}
            <span>{copiedPath ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* ── SEGMENTED NAVIGATION TAB BAR ── */}
      <div className="flex items-center gap-1 bg-bg-surface p-1 rounded-lg border border-border-subtle overflow-x-auto max-w-full shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer select-none",
                isActive
                  ? "bg-bg-surface-active text-text-primary shadow-xs border border-border-strong"
                  : "text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[9.5px] font-mono",
                  isActive ? "bg-primary-alpha text-primary-base" : "bg-bg-base text-text-muted"
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT CONTAINERS (Zero Collision Guarantee) ── */}
      <div className="space-y-4">
        {/* TAB 1: OVERVIEW & CODE */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-fade-in">
            {renderTriageBox()}
            {renderCodeSnippet()}
            
            {/* Compact Jump Bar to other sections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('metadata')}
                className="p-3 rounded-lg border border-border-subtle bg-bg-surface hover:bg-bg-surface-hover transition-colors text-left flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="font-semibold text-xs text-text-primary block">Engine & Fingerprint</span>
                  <span className="text-[10.5px] text-text-tertiary">SHA-256 hash & telemetry</span>
                </div>
                <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className="p-3 rounded-lg border border-border-subtle bg-bg-surface hover:bg-bg-surface-hover transition-colors text-left flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="font-semibold text-xs text-text-primary block">Triage Audit Trail</span>
                  <span className="text-[10.5px] text-text-tertiary">{auditLogs.length} logged change(s)</span>
                </div>
                <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: METADATA & TELEMETRY */}
        {activeTab === 'metadata' && (
          <div className="space-y-4 animate-fade-in">
            {renderMetadataContent()}
          </div>
        )}

        {/* TAB 3: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="space-y-4 animate-fade-in">
            {renderAuditContent()}
          </div>
        )}

        {/* TAB 4: SCAN HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fade-in">
            {renderHistoryContent()}
          </div>
        )}

        {/* TAB 5: ALL SECTIONS (Smooth Accordion Cards with Framer-Motion) */}
        {activeTab === 'all' && (
          <div className="space-y-4 animate-fade-in">
            {renderTriageBox()}
            {renderCodeSnippet()}

            {/* Expand / Collapse Controls */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-tertiary">
                Detailed Telemetry Sections
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="text-[10.5px] text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
                >
                  Expand All
                </button>
                <span className="text-border-strong">•</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="text-[10.5px] text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* ACCORDION 1: Engine & Fingerprint */}
            <div className="border border-border-subtle rounded-lg overflow-hidden bg-bg-surface shadow-surface">
              <button 
                type="button"
                onClick={() => toggleSection('metadata')} 
                className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-bg-surface-hover transition-colors text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-primary-base" />
                  <span className="font-semibold text-xs text-text-primary">Engine & Fingerprint Metadata</span>
                </div>
                {expandedSections['metadata'] ? <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" /> : <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />}
              </button>

              <AnimatePresence initial={false}>
                {expandedSections['metadata'] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-border-subtle"
                  >
                    {renderMetadataContent()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ACCORDION 2: Audit Trail */}
            <div className="border border-border-subtle rounded-lg overflow-hidden bg-bg-surface shadow-surface">
              <button 
                type="button"
                onClick={() => toggleSection('audit')} 
                className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-bg-surface-hover transition-colors text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-primary-base" />
                  <span className="font-semibold text-xs text-text-primary">Triage Audit Trail</span>
                  {auditLogs.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-bg-base text-text-tertiary font-mono">
                      {auditLogs.length}
                    </span>
                  )}
                </div>
                {expandedSections['audit'] ? <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" /> : <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />}
              </button>

              <AnimatePresence initial={false}>
                {expandedSections['audit'] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-border-subtle"
                  >
                    {renderAuditContent()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ACCORDION 3: Scan History */}
            <div className="border border-border-subtle rounded-lg overflow-hidden bg-bg-surface shadow-surface">
              <button 
                type="button"
                onClick={() => toggleSection('scanHistory')} 
                className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-bg-surface-hover transition-colors text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <GitCommit className="w-3.5 h-3.5 text-primary-base" />
                  <span className="font-semibold text-xs text-text-primary">Historical Scan Appearances</span>
                  {fingerprintHistory.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-bg-base text-text-tertiary font-mono">
                      {fingerprintHistory.length}
                    </span>
                  )}
                </div>
                {expandedSections['scanHistory'] ? <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" /> : <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />}
              </button>

              <AnimatePresence initial={false}>
                {expandedSections['scanHistory'] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-border-subtle"
                  >
                    {renderHistoryContent()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

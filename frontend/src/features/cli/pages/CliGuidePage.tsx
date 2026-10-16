import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Check, Layers } from 'lucide-react';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useWorkspace } from '@/features/workspace/hooks/useWorkspace';
import { toast } from 'sonner';

import { CliHero } from '../components/CliHero';
import { CliDownloadsCard } from '../components/CliDownloadsCard';
import { CliQuickStart } from '../components/CliQuickStart';
import { CliInstallSection } from '../components/CliInstallSection';
import { CliAuthSection } from '../components/CliAuthSection';
import { CliConfigSection } from '../components/CliConfigSection';
import { CliFirstScanSection } from '../components/CliFirstScanSection';
import { CliCommandReference } from '../components/CliCommandReference';
import { CliOutputSection } from '../components/CliOutputSection';
import { CliExitCodesSection } from '../components/CliExitCodesSection';
import { CliCicdSection } from '../components/CliCicdSection';
import { CliTroubleshootingSection } from '../components/CliTroubleshootingSection';
import { CliSidebarNav } from '../components/CliSidebarNav';

export const CliGuidePage: React.FC = () => {
  const params = useParams<{ workspaceId?: string }>();
  const activeWorkspaceId = useWorkspaceStore((state: any) => state.activeWorkspaceId);
  const workspaceId = params.workspaceId || activeWorkspaceId || '';
  const { data: workspace } = useWorkspace(workspaceId);

  const [copiedWs, setCopiedWs] = useState(false);

  const copyWorkspaceId = () => {
    if (!workspaceId) return;
    navigator.clipboard.writeText(workspaceId);
    setCopiedWs(true);
    toast.success('Workspace ID copied to clipboard');
    setTimeout(() => setCopiedWs(false), 2000);
  };

  return (
    <div className="min-h-full bg-bg-base text-text-primary">
      <div className="max-w-[1240px] mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex gap-8 items-start">
          {/* Main Content Column */}
          <div className="flex-1 min-w-0 space-y-12">
            <section id="overview">
              <CliHero workspaceId={workspaceId} />
            </section>

            <CliDownloadsCard />

            <CliQuickStart workspaceId={workspaceId} />

            <CliInstallSection />

            <CliAuthSection workspaceId={workspaceId} />

            <CliConfigSection workspaceId={workspaceId} />

            <CliFirstScanSection workspaceId={workspaceId} />

            <CliCommandReference />

            <CliOutputSection />

            <CliExitCodesSection />

            <CliCicdSection />

            <CliTroubleshootingSection />

            {/* Footer */}
            <div className="pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-2">
              <div>Oculus CLI v1.0.0 · DevSecOps Command Line Interface</div>
              <div className="font-mono text-[11px]">Strict ANSI & JSON Compliance</div>
            </div>
          </div>

          {/* Sticky Desktop TOC Sidebar */}
          <div className="hidden xl:block w-64 shrink-0 sticky top-6 space-y-5">
            {/* Active Workspace helper card */}
            {workspaceId && (
              <div className="p-3.5 rounded-lg border border-border-subtle bg-bg-surface space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary-base" />
                    Active Workspace
                  </span>
                  <span className="text-[10px] text-emerald-400">Live</span>
                </div>
                <div className="font-medium text-xs text-text-primary truncate">
                  {workspace?.name || 'Current Workspace'}
                </div>
                <div className="flex items-center justify-between gap-1 p-1.5 rounded bg-bg-base border border-border-subtle font-mono text-[10.5px]">
                  <span className="truncate text-text-tertiary">{workspaceId}</span>
                  <button
                    onClick={copyWorkspaceId}
                    className="p-1 text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover rounded transition-colors cursor-pointer"
                    title="Copy workspace ID"
                  >
                    {copiedWs ? <Check className="w-3 h-3 text-primary-base" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg border border-border-subtle bg-bg-surface">
              <CliSidebarNav />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CliGuidePage;

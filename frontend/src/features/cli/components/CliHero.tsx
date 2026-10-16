import React from 'react';
import { Terminal, Download, ArrowRight, Key, ShieldCheck } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CliHeroProps {
  workspaceId?: string;
}

export const CliHero: React.FC<CliHeroProps> = ({ workspaceId }) => {
  const settingsTokenUrl = workspaceId ? `/w/${workspaceId}/settings` : '/settings';

  const scrollToQuickStart = () => {
    const el = document.getElementById('quickstart');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToDownloads = () => {
    const el = document.getElementById('downloads');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative rounded-xl border border-border-base bg-gradient-to-b from-bg-surface to-bg-base p-6 sm:p-8 overflow-hidden shadow-surface">
      {/* Decorative subtle background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-primary-base/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-alpha border border-primary-base/30 flex items-center justify-center shrink-0">
            <Terminal className="w-4.5 h-4.5 text-primary-base" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-text-primary">Oculus CLI Documentation</span>
          <Badge variant="primary" className="text-[10px] tracking-wide font-mono">
            @oculus/cli v1.0.0
          </Badge>
          <Badge variant="default" className="text-[10px] tracking-wide">
            Node.js ≥ 18.0.0
          </Badge>
          <Badge variant="outline" className="text-[10px] text-text-tertiary">
            macOS · Linux · Windows
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary leading-tight">
          Trigger security scans and enforce security gates directly from your terminal.
        </h1>

        <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
          The Oculus CLI (<code className="font-mono text-primary-base px-1.5 py-0.5 rounded bg-primary-alpha border border-primary-base/20">oculus</code>) brings the full intelligence of Oculus into developer terminals and continuous integration pipelines. Evaluate policy-based gates with native exit codes, triage findings, and monitor repositories without leaving your terminal.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <Button onClick={scrollToQuickStart} size="sm" className="gap-2">
            <span>Quick Start Flow</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>

          <Button onClick={scrollToDownloads} variant="secondary" size="sm" className="gap-2">
            <Download className="w-3.5 h-3.5" />
            <span>Downloads & Packages</span>
          </Button>

          <Link
            to={settingsTokenUrl}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'gap-2 text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors'
            )}
          >
            <Key className="w-3.5 h-3.5 text-risk-medium shrink-0" />
            <span>Get Developer Token</span>
          </Link>
        </div>

        <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center gap-y-2 gap-x-6 text-[11.5px] text-text-tertiary">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-base" />
            <span>Policy gate evaluation with exit codes <code className="font-mono text-text-secondary">0</code> and <code className="font-mono text-text-secondary">1</code></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-primary-base" />
            <span>Interactive colored TTY, NO_COLOR, and machine-readable JSON modes</span>
          </div>
        </div>
      </div>
    </div>
  );
};

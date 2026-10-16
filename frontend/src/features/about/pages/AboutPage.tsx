import React, { useState } from 'react';
import {
  Shield,
  ScanLine,
  AlertCircle,
  BarChart3,
  Terminal,
  Key,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  GitBranch,
  Users,
  FileDown,
  Bell,
  Lock,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GlossaryTerm {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  tag?: string;
  tagColor?: string;
  body: React.ReactNode;
}

// ─── Glossary Data ────────────────────────────────────────────────────────────

const GLOSSARY: GlossaryTerm[] = [
  {
    id: 'scan',
    icon: ScanLine,
    iconColor: 'text-primary-base',
    iconBg: 'bg-primary-alpha border-primary-base/20',
    label: 'What is a Scan?',
    body: (
      <p className="text-text-secondary leading-relaxed">
        A scan is Oculus analyzing a specific branch or commit in your repository. Every scan runs a set
        of checks across your codebase and produces a structured report of what it found — categorized
        by severity and type. Scans can be triggered automatically on every push via the GitHub App,
        manually from the web UI, or programmatically from your terminal or CI/CD pipeline using the CLI.
      </p>
    ),
  },
  {
    id: 'finding',
    icon: AlertCircle,
    iconColor: 'text-risk-high',
    iconBg: 'bg-risk-high-alpha border-risk-high-border',
    label: 'What is a Finding?',
    body: (
      <div className="space-y-3">
        <p className="text-text-secondary leading-relaxed">
          A finding is a specific security issue discovered during a scan — for example, a hardcoded
          credential, a suspicious high-entropy string, or a vulnerable dependency. Each finding includes
          the file location, severity, and a status you can manage over time.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {(['OPEN', 'CONFIRMED', 'FALSE POSITIVE', 'FIXED', 'IGNORED'] as const).map((s) => (
            <span
              key={s}
              className="text-[10.5px] font-semibold px-2 py-0.5 rounded border bg-bg-surface-alt border-border-base text-text-secondary"
            >
              {s}
            </span>
          ))}
        </div>
        <p className="text-[11.5px] text-text-tertiary">
          Triage findings over time by updating their status — Oculus tracks the full audit trail.
        </p>
      </div>
    ),
  },
  {
    id: 'risk-score',
    icon: BarChart3,
    iconColor: 'text-risk-medium',
    iconBg: 'bg-risk-medium-alpha border-risk-medium-border',
    label: 'What is a Risk Score?',
    body: (
      <p className="text-text-secondary leading-relaxed">
        Every repository in Oculus receives a risk score — a numeric measure of the current security
        posture of that codebase, computed from the findings discovered across its scans. A higher score
        reflects more unresolved issues or higher-severity findings. The risk score updates automatically
        as new scans complete or findings are triaged.
      </p>
    ),
  },
  {
    id: 'risk-grade',
    icon: Shield,
    iconColor: 'text-grade-a',
    iconBg: 'bg-primary-alpha border-primary-base/20',
    label: 'What is a Risk Grade?',
    body: (
      <div className="space-y-3">
        <p className="text-text-secondary leading-relaxed">
          A risk grade translates the risk score into a letter grade — giving you an at-a-glance view of
          a repository's security health. Grades are visible on the dashboard, the repository list, and
          in CLI output.
        </p>
        <div className="flex gap-2.5 flex-wrap pt-1">
          {[
            { g: 'A', color: 'text-grade-a border-grade-a/30 bg-grade-a/10', label: 'Secure' },
            { g: 'B', color: 'text-grade-b border-grade-b/30 bg-grade-b/10', label: 'Low Risk' },
            { g: 'C', color: 'text-grade-c border-grade-c/30 bg-grade-c/10', label: 'Moderate' },
            { g: 'D', color: 'text-grade-d border-grade-d/30 bg-grade-d/10', label: 'High Risk' },
            { g: 'F', color: 'text-grade-f border-grade-f/30 bg-grade-f/10', label: 'Critical' },
          ].map(({ g, color, label }) => (
            <div key={g} className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-bold', color)}>
              <span className="text-sm">{g}</span>
              <span className="font-normal text-[10.5px] opacity-80">{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'entropy',
    icon: Zap,
    iconColor: 'text-risk-info',
    iconBg: 'bg-risk-info-alpha border-risk-info-border',
    label: 'What is Entropy Detection?',
    tag: 'Secret Scanner',
    tagColor: 'text-risk-info border-risk-info-border bg-risk-info-alpha',
    body: (
      <p className="text-text-secondary leading-relaxed">
        Oculus watches for high-entropy strings in your codebase — patterns statistically unlikely to be
        ordinary text. These are often indicators of secrets, API tokens, or credentials that were
        accidentally committed. Entropy detection is one of the signals Oculus uses to surface potential
        secret leaks before they reach production or become a breach.
      </p>
    ),
  },
  {
    id: 'confidence',
    icon: BarChart3,
    iconColor: 'text-text-secondary',
    iconBg: 'bg-bg-surface-alt border-border-base',
    label: 'What is a Confidence Score?',
    body: (
      <p className="text-text-secondary leading-relaxed">
        Each finding includes a confidence score — Oculus's measure of how likely the finding is a
        genuine issue versus a false positive. Higher confidence means the finding matches more indicators
        of a real security problem. Use confidence alongside severity to prioritize your triage queue
        and avoid alert fatigue.
      </p>
    ),
  },
  {
    id: 'critical',
    icon: AlertCircle,
    iconColor: 'text-risk-critical',
    iconBg: 'bg-risk-critical-alpha border-risk-critical-border',
    label: 'What is a Critical Finding?',
    body: (
      <p className="text-text-secondary leading-relaxed">
        A critical finding is the highest-severity issue Oculus can report. Examples include exposed
        private keys, active cloud credentials, or code patterns with known exploitable vulnerabilities.
        Critical findings are flagged immediately and will fail security gates in your CI/CD pipeline
        by default — preventing vulnerable code from reaching deployment.
      </p>
    ),
  },
  {
    id: 'policy',
    icon: Lock,
    iconColor: 'text-primary-base',
    iconBg: 'bg-primary-alpha border-primary-base/20',
    label: 'What are Security Policies?',
    body: (
      <p className="text-text-secondary leading-relaxed">
        Policies let you define what Oculus should enforce across your organization. You can configure
        which finding severities are blocking, set thresholds for acceptable risk grades before a
        deployment gate fails, and define rules that apply across one or all repositories in your
        workspace. Policies turn Oculus from a passive scanner into an active security gate in your
        engineering pipeline.
      </p>
    ),
  },
  {
    id: 'gate',
    icon: Terminal,
    iconColor: 'text-risk-critical',
    iconBg: 'bg-risk-critical-alpha border-risk-critical-border',
    label: 'What is a CLI Gate Fail?',
    tag: 'CLI',
    tagColor: 'text-text-secondary border-border-base bg-bg-surface-alt',
    body: (
      <div className="space-y-3">
        <p className="text-text-secondary leading-relaxed">
          When you run <code className="font-mono text-primary-base text-[11.5px] bg-primary-alpha px-1.5 py-0.5 rounded">oculus scan --wait</code> in your terminal or CI/CD pipeline, Oculus evaluates
          the scan results against your configured security policy. If findings exceed the configured
          thresholds — for example, a critical finding is present — the CLI exits with a non-zero exit
          code. This is called a gate failure and signals that the branch should not proceed to deployment.
        </p>
        <div className="flex gap-4 pt-1">
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary-base" />
            <span className="text-text-secondary">Exit <code className="font-mono text-primary-base">0</code> — Gate passed</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <XCircle className="w-3.5 h-3.5 text-risk-critical" />
            <span className="text-text-secondary">Exit <code className="font-mono text-risk-critical">1</code> — Gate failed</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'cli',
    icon: Terminal,
    iconColor: 'text-text-primary',
    iconBg: 'bg-bg-surface-alt border-border-base',
    label: 'What is the Oculus CLI?',
    tag: 'CLI',
    tagColor: 'text-text-secondary border-border-base bg-bg-surface-alt',
    body: (
      <div className="space-y-3">
        <p className="text-text-secondary leading-relaxed">
          The Oculus CLI (<code className="font-mono text-primary-base text-[11.5px] bg-primary-alpha px-1.5 py-0.5 rounded">oculus</code>) lets you interact with the platform directly from your
          terminal or CI/CD pipeline. Trigger scans, inspect findings, evaluate security gates, and
          integrate Oculus into automated workflows — without touching the web UI.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {['oculus scan', 'oculus findings', 'oculus auth', 'oculus repo', 'oculus config'].map((cmd) => (
            <code
              key={cmd}
              className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-bg-root border border-border-base text-text-secondary"
            >
              {cmd}
            </code>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11.5px] text-text-tertiary">
            Compatible with GitHub Actions, GitLab CI, Bitbucket Pipelines, and any shell script.
          </p>
          <Link
            to="/cli"
            className="text-xs font-semibold text-primary-base hover:underline inline-flex items-center gap-1 shrink-0 ml-2"
          >
            CLI Guide →
          </Link>
        </div>
      </div>
    ),
  },
  {
    id: 'token',
    icon: Key,
    iconColor: 'text-risk-medium',
    iconBg: 'bg-risk-medium-alpha border-risk-medium-border',
    label: 'What is a Developer Token?',
    body: (
      <div className="space-y-3">
        <p className="text-text-secondary leading-relaxed">
          A developer token is how the CLI and API integrations authenticate with Oculus on your behalf.
          Generate one from <span className="text-text-primary font-medium">Settings → Developer Tokens</span> in the web UI.
          Treat your token like a password — store it securely as a CI/CD secret and never commit it
          to source code.
        </p>
        <div className="flex items-center gap-2 px-3 py-2 rounded bg-bg-root border border-border-base w-fit">
          <code className="text-[11.5px] font-mono text-primary-base tracking-wide">ocx_live_••••••••••••••••</code>
        </div>
      </div>
    ),
  },
  {
    id: 'workspace',
    icon: Layers,
    iconColor: 'text-text-secondary',
    iconBg: 'bg-bg-surface-alt border-border-base',
    label: 'What is a Workspace?',
    body: (
      <p className="text-text-secondary leading-relaxed">
        A workspace is your organization's namespace inside Oculus. All repositories, scans, findings,
        and policies live within a workspace. Team members you invite share access to the workspace's
        data and configuration. Oculus supports multiple workspaces, making it suitable for organizations
        managing separate product lines, teams, or environments.
      </p>
    ),
  },
];

// ─── Capability List ──────────────────────────────────────────────────────────

const CAPABILITIES = [
  { icon: ScanLine,  color: 'text-primary-base',   label: 'Continuous security scanning',        sub: 'Triggered by pushes or on demand' },
  { icon: Shield,    color: 'text-grade-a',         label: 'Per-repository risk grades',          sub: 'Updated after every scan, A through F' },
  { icon: AlertCircle, color: 'text-risk-critical', label: 'Finding triage workflow',             sub: 'Open → Confirmed → Fixed → Ignored' },
  { icon: Terminal,  color: 'text-text-primary',    label: 'CI/CD security gates via CLI',        sub: 'Policy-based pass/fail with exit codes' },
  { icon: BarChart3, color: 'text-risk-medium',     label: 'Security posture analytics',          sub: 'Trends, repository ranking, risk history' },
  { icon: Users,     color: 'text-risk-info',       label: 'Developer metrics',                   sub: 'Aggregated per-engineer security data' },
  { icon: FileDown,  color: 'text-text-secondary',  label: 'Export findings',                     sub: 'CSV or JSON for audits and reporting' },
  { icon: Bell,      color: 'text-risk-high',       label: 'Real-time notifications',             sub: 'Instant alerts as scans complete' },
  { icon: Key,       color: 'text-risk-medium',     label: 'Developer tokens for API access',     sub: 'Secure programmatic integration' },
  { icon: GitBranch, color: 'text-primary-base',    label: 'Native GitHub App integration',       sub: 'No manual webhook setup required' },
  { icon: Layers,    color: 'text-text-secondary',  label: 'Multi-workspace support',             sub: 'Org-scale team management' },
  { icon: Lock,      color: 'text-primary-base',    label: 'Configurable security policies',      sub: 'Define what fails your pipeline gate' },
];

// ─── Workflow Steps ───────────────────────────────────────────────────────────

const WORKFLOW = [
  {
    step: '01',
    title: 'Connect',
    color: 'text-primary-base',
    borderColor: 'border-primary-base/30',
    bg: 'bg-primary-alpha',
    desc: 'Install the Oculus GitHub App. Your repositories are synced automatically — no manual configuration needed.',
  },
  {
    step: '02',
    title: 'Scan',
    color: 'text-risk-medium',
    borderColor: 'border-risk-medium-border',
    bg: 'bg-risk-medium-alpha',
    desc: 'Push code. Oculus scans immediately. Results appear in the dashboard, the repository detail page, and in your terminal if you\'re using the CLI.',
  },
  {
    step: '03',
    title: 'Remediate',
    color: 'text-grade-a',
    borderColor: 'border-grade-a/30',
    bg: 'bg-grade-a/10',
    desc: 'Triage findings, enforce gates, track risk grades over time, and drive your organization\'s security posture toward A.',
  },
];

// ─── Glossary Item (accordion) ────────────────────────────────────────────────

const GlossaryItem: React.FC<{ term: GlossaryTerm }> = ({ term }) => {
  const [open, setOpen] = useState(false);
  const Icon = term.icon;

  return (
    <div
      className={cn(
        'border rounded-lg transition-colors duration-150',
        open ? 'border-border-hover bg-bg-surface' : 'border-border-subtle bg-bg-surface hover:border-border-normal',
      )}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className={cn('w-7 h-7 rounded-md flex items-center justify-center border shrink-0', term.iconBg)}>
          <Icon className={cn('w-3.5 h-3.5', term.iconColor)} />
        </div>
        <span className="flex-1 text-xs font-semibold text-text-primary">{term.label}</span>
        {term.tag && (
          <span className={cn('hidden sm:inline text-[9.5px] font-semibold px-1.5 py-0.5 rounded border mr-1', term.tagColor)}>
            {term.tag}
          </span>
        )}
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border-subtle">
          <div className="text-[12.5px] pt-3">{term.body}</div>
        </div>
      )}
    </div>
  );
};

// ─── Terminal Mock ────────────────────────────────────────────────────────────

const TerminalMock: React.FC = () => (
  <div className="rounded-xl overflow-hidden border border-border-base shadow-[0_0_40px_rgba(0,0,0,0.6)] bg-bg-root font-mono text-[11.5px]">
    {/* Window chrome */}
    <div className="flex items-center gap-1.5 px-4 py-3 bg-bg-surface border-b border-border-subtle">
      <div className="w-2.5 h-2.5 rounded-full bg-risk-critical/70" />
      <div className="w-2.5 h-2.5 rounded-full bg-risk-medium/70" />
      <div className="w-2.5 h-2.5 rounded-full bg-grade-a/70" />
      <span className="ml-3 text-[10px] text-text-muted tracking-wide">Terminal — zsh</span>
    </div>

    {/* Body */}
    <div className="p-5 space-y-1 leading-relaxed">
      <p>
        <span className="text-primary-base">➜</span>
        <span className="text-text-tertiary"> ~/api-service</span>
        <span className="text-text-muted"> git:(main)</span>
      </p>
      <p className="text-text-secondary">
        <span className="text-text-tertiary">$</span>{' '}
        <span className="text-text-primary">oculus scan</span>
        {' '}
        <span className="text-risk-info">--repository</span> r_8f3a9c1b
        {' '}
        <span className="text-risk-info">--branch</span> main
        {' '}
        <span className="text-risk-info">--wait</span>
      </p>

      <div className="pt-2 pb-1">
        <p className="text-text-tertiary">  ◈ Oculus Security Scan</p>
        <p className="text-text-tertiary">  Repository  <span className="text-text-secondary">my-org / api-service</span></p>
        <p className="text-text-tertiary">  Branch      <span className="text-text-secondary">main</span></p>
        <p className="text-text-tertiary">  Commit      <span className="text-text-secondary">a3f8c2d</span></p>
      </div>

      <p className="text-text-secondary">  ● Scanning…  <span className="text-primary-base">[████████████████████]</span> 100%</p>

      <div className="my-3 border border-risk-critical/40 rounded-lg bg-risk-critical-alpha p-3 space-y-1">
        <p className="text-risk-critical font-bold flex items-center gap-2">
          <XCircle className="w-3.5 h-3.5 inline" />
          {' '}Gate FAILED
        </p>
        <p className="text-text-secondary">  2 CRITICAL findings — policy threshold exceeded.</p>
        <p className="text-text-secondary">  Deployment blocked.</p>
      </div>

      <p className="text-text-tertiary">
        Run{' '}
        <code className="text-primary-base">oculus findings list --severity CRITICAL</code>
        {' '}to review.
      </p>
      <p className="pt-1">
        <span className="text-text-muted">exit code</span>{' '}
        <span className="text-risk-critical font-bold">1</span>
      </p>
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export const AboutPage: React.FC = () => {
  return (
    <div className="p-6 space-y-10 max-w-[860px] mx-auto animate-fade-in">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-[0_0_14px_rgba(16,185,129,0.4)]">
            <Shield className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest uppercase text-text-primary">Oculus</span>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary-alpha text-primary-base border border-primary-base/25 tracking-wider">
              v2.4
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-text-primary leading-snug tracking-tight">
          Continuous visibility into the security of <br className="hidden sm:block" />
          every repository, every branch, every commit.
        </h1>

        <p className="text-sm text-text-secondary leading-relaxed max-w-[680px]">
          Oculus is an enterprise-grade security and risk management platform for GitHub-connected
          engineering teams. It continuously monitors your repositories, analyzes code changes as they
          happen, and surfaces findings with enough context to act — not just alert.
        </p>
        <p className="text-sm text-text-secondary leading-relaxed max-w-[680px]">
          Whether you're a security lead reducing mean-time-to-remediation, or an engineer who wants
          to ship confidently, Oculus integrates directly into your workflow without slowing you down.
        </p>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="border-t border-border-subtle" />

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-text-primary tracking-tight">How Oculus Fits Into Your Workflow</h2>
          <p className="text-xs text-text-tertiary mt-0.5">Three steps from onboarding to security posture improvement.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {WORKFLOW.map((w) => (
            <Card key={w.step} className="p-4 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className={cn('w-7 h-7 rounded-md flex items-center justify-center border font-bold text-xs shrink-0', w.bg, w.borderColor, w.color)}>
                  {w.step}
                </div>
                <span className={cn('text-sm font-bold', w.color)}>{w.title}</span>
              </div>
              <p className="text-[12px] text-text-secondary leading-relaxed">{w.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="border-t border-border-subtle" />

      {/* ── Glossary ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-text-primary tracking-tight">Platform Glossary</h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            Understand every term you'll encounter in Oculus — explained for engineers and security teams.
          </p>
        </div>

        <div className="space-y-2">
          {GLOSSARY.map((term) => (
            <GlossaryItem key={term.id} term={term} />
          ))}
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="border-t border-border-subtle" />

      {/* ── Terminal Mock ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-text-primary tracking-tight">CLI Gate Fail — What It Looks Like</h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            When the security gate fails in your terminal or CI pipeline, this is what you see.
          </p>
        </div>
        <TerminalMock />
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="border-t border-border-subtle" />

      {/* ── Capabilities ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-text-primary tracking-tight">Platform Capabilities</h2>
          <p className="text-xs text-text-tertiary mt-0.5">Everything Oculus gives your organization out of the box.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.label}
                className="flex items-start gap-3 p-3 rounded-lg border border-border-subtle bg-bg-surface hover:border-border-normal transition-colors"
              >
                <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', cap.color)} />
                <div>
                  <p className="text-xs font-semibold text-text-primary">{cap.label}</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5">{cap.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="border-t border-border-subtle" />

      {/* ── What Oculus Does NOT Do ───────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-text-primary tracking-tight">What Oculus Does Not Do</h2>
          <p className="text-xs text-text-tertiary mt-0.5">Honest scoping builds trust. Here's what Oculus intentionally doesn't do.</p>
        </div>

        <div className="rounded-lg border border-border-subtle bg-bg-surface divide-y divide-border-subtle overflow-hidden">
          {[
            {
              icon: XCircle,
              color: 'text-text-tertiary',
              title: 'Does not replace your existing security tools',
              body: 'Oculus is designed to complement your stack — SCA, DAST, pen testing — not replace it.',
            },
            {
              icon: XCircle,
              color: 'text-text-tertiary',
              title: 'Does not store your source code',
              body: 'Scans analyze code structure and patterns. Your code is never retained after a scan completes.',
            },
            {
              icon: XCircle,
              color: 'text-text-tertiary',
              title: 'Does not make autonomous changes to your repositories',
              body: 'Oculus surfaces findings and provides context. Every fix decision remains with your team.',
            },
            {
              icon: XCircle,
              color: 'text-text-tertiary',
              title: 'Does not share your findings with other organizations',
              body: 'All workspace data is fully isolated. Your security posture is visible only to your team.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3 px-4 py-3.5">
                <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', item.color)} />
                <div>
                  <p className="text-xs font-semibold text-text-primary">{item.title}</p>
                  <p className="text-[11.5px] text-text-tertiary mt-0.5 leading-relaxed">{item.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="border-t border-border-subtle pt-6 flex items-center justify-between text-[11px] text-text-muted">
        <span>Oculus Security Platform · v2.4</span>
        <span>Enterprise DevSecOps · Built for engineering teams</span>
      </div>

    </div>
  );
};

import React, { useState } from 'react';
import { FileCode } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CliCodeBlock } from './CliCodeBlock';
import { cn } from '@/lib/utils';

export const CliOutputSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scan' | 'findings' | 'repo' | 'auth'>('scan');

  const jsonExamples = {
    scan: {
      title: 'oculus scan --wait --json',
      command: 'oculus scan -r repo_8f3a9c1b -b main --wait --json',
      schema: `{\n  "scanId": "scan_3a2b1c0d",\n  "status": "COMPLETED",\n  "gate": {\n    "status": "PASSED",\n    "passed": true,\n    "reason": "No critical findings detected"\n  }\n}`,
      scripting: `# Parsing gate status with jq\nGATE_STATUS=$(oculus scan -r $REPO_ID -b main --wait --json | jq -r '.gate.status')\nif [ "$GATE_STATUS" != "PASSED" ]; then\n  echo "Security gate failed!"\n  exit 1\nfi`,
    },
    findings: {
      title: 'oculus findings list --json',
      command: 'oculus findings list -r repo_8f3a9c1b --severity CRITICAL --json',
      schema: `{\n  "workspaceId": "ws_7a9c1e2b",\n  "total": 1,\n  "items": [\n    {\n      "id": "fnd_8a7b6c5d",\n      "severity": "CRITICAL",\n      "status": "OPEN",\n      "rule_type": "AWS_SECRET_ACCESS_KEY",\n      "file_path": "backend/config/credentials.js",\n      "line_number": 42,\n      "engine": "oculus-secrets-engine"\n    }\n  ]\n}`,
      scripting: `# Count open critical findings\nCRITICAL_COUNT=$(oculus findings list --severity CRITICAL --status OPEN --json | jq '.total')\necho "Open critical findings: $CRITICAL_COUNT"`,
    },
    repo: {
      title: 'oculus repo list --json',
      command: 'oculus repo list --json',
      schema: `{\n  "workspaceId": "ws_7a9c1e2b",\n  "total": 2,\n  "items": [\n    {\n      "id": "repo_8f3a9c1b",\n      "full_name": "acme-corp/api-gateway",\n      "current_risk_grade": "A",\n      "current_risk_score": 14,\n      "default_branch": "main",\n      "url": "https://github.com/acme-corp/api-gateway"\n    }\n  ]\n}`,
      scripting: `# Extract list of repository IDs\noculus repo list --json | jq -r '.items[].id'`,
    },
    auth: {
      title: 'oculus auth status --json',
      command: 'oculus auth status --json',
      schema: `{\n  "authenticated": true,\n  "apiUrl": "http://localhost:3000/api/v1",\n  "workspaces": [\n    {\n      "id": "ws_7a9c1e2b",\n      "name": "Production Engineering"\n    }\n  ]\n}`,
      scripting: `# Health check authentication in script\nIS_AUTH=$(oculus auth status --json | jq -r '.authenticated')\nif [ "$IS_AUTH" != "true" ]; then\n  echo "CLI is not authenticated!"\n  exit 1\nfi`,
    },
  };

  return (
    <section id="output" className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
          <FileCode className="w-4.5 h-4.5 text-primary-base" />
          Output Modes & JSON Automation
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Oculus CLI supports three clean output modes: rich interactive ANSI terminal, plain text, and machine-readable JSON.
        </p>
      </div>

      {/* 3 Modes Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg border border-border-subtle bg-bg-surface space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-xs text-text-primary">1. Rich Mode (Default)</span>
          </div>
          <p className="text-[11.5px] text-text-secondary leading-relaxed">
            Active in interactive terminal TTYs. Full chalk color coding for findings, severity levels, risk grades, and live progress indicators.
          </p>
        </div>

        <div className="p-3.5 rounded-lg border border-border-subtle bg-bg-surface space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-semibold text-xs text-text-primary">2. Plain Mode (Stripped)</span>
          </div>
          <p className="text-[11.5px] text-text-secondary leading-relaxed">
            Automatically activated when piped (<code className="font-mono text-text-primary">| grep</code>) or when <code className="font-mono text-text-primary">NO_COLOR=1</code> is set. Strips all ANSI color escapes.
          </p>
        </div>

        <div className="p-3.5 rounded-lg border border-border-subtle bg-bg-surface space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="font-semibold text-xs text-text-primary">3. JSON Mode (--json)</span>
          </div>
          <p className="text-[11.5px] text-text-secondary leading-relaxed">
            Activated via <code className="font-mono text-text-primary">--json</code> flag or <code className="font-mono text-text-primary">OCULUS_JSON=1</code>. Outputs pure JSON on stdout with zero formatting noise.
          </p>
        </div>
      </div>

      {/* JSON Schema Explorer */}
      <Card className="border-border-subtle bg-bg-surface">
        <CardHeader className="p-4 pb-3 border-b border-border-subtle">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold text-text-primary">
              Machine-Readable JSON Payloads
            </CardTitle>
            <div className="flex items-center gap-1 p-1 rounded-md bg-bg-base border border-border-subtle">
              {[
                { id: 'scan', label: 'Scan & Gate' },
                { id: 'findings', label: 'Findings List' },
                { id: 'repo', label: 'Repositories' },
                { id: 'auth', label: 'Auth Status' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded transition-colors cursor-pointer',
                    activeTab === t.id
                      ? 'bg-bg-surface text-primary-base font-semibold shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-text-primary">Command:</span>
            <CliCodeBlock code={jsonExamples[activeTab].command} language="bash" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-text-primary">JSON Schema:</span>
              <CliCodeBlock code={jsonExamples[activeTab].schema} language="json" title="JSON Output" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-text-primary">Automation Scripting (jq):</span>
              <CliCodeBlock code={jsonExamples[activeTab].scripting} language="bash" title="Shell Consumer Script" />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

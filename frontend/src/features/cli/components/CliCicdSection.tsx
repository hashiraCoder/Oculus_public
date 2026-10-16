import React, { useState } from 'react';
import { GitBranch, Download } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { CliCodeBlock } from './CliCodeBlock';
import { cn } from '@/lib/utils';

export const CliCicdSection: React.FC = () => {
  const [activePlatform, setActivePlatform] = useState<'github' | 'gitlab' | 'docker'>('github');

  const githubSnippet = `name: Oculus Security Gate

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  oculus-scan:
    name: Oculus Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Oculus CLI
        run: npm install -g @oculus/cli

      - name: Execute Security Gate Check
        env:
          OCULUS_TOKEN: \${{ secrets.OCULUS_TOKEN }}
          OCULUS_API_URL: \${{ vars.OCULUS_API_URL }}
          OCULUS_WORKSPACE_ID: \${{ vars.OCULUS_WORKSPACE_ID }}
        run: |
          oculus scan \\
            --repository \${{ vars.OCULUS_REPO_ID }} \\
            --branch \${{ github.ref_name }} \\
            --commit \${{ github.sha }} \\
            --wait \\
            --timeout 600 \\
            --json`;

  const gitlabSnippet = `oculus-security-scan:
  image: node:20
  stage: test
  script:
    - npm install -g @oculus/cli
    - oculus scan \\
        --repository $OCULUS_REPO_ID \\
        --branch $CI_COMMIT_REF_NAME \\
        --commit $CI_COMMIT_SHA \\
        --wait \\
        --timeout 600 \\
        --json
  variables:
    OCULUS_TOKEN: $OCULUS_TOKEN
    OCULUS_API_URL: $OCULUS_API_URL
    OCULUS_WORKSPACE_ID: $OCULUS_WORKSPACE_ID
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"`;

  const dockerSnippet = `# Run standalone scan inside Node.js container
docker run --rm \\
  -e OCULUS_TOKEN="ocx_live_..." \\
  -e OCULUS_API_URL="https://oculus.yourcompany.com/api/v1" \\
  -e OCULUS_WORKSPACE_ID="your-workspace-uuid" \\
  node:20-alpine \\
  sh -c "npm install -g @oculus/cli && oculus scan -r repo_uuid -b main --wait"`;

  return (
    <section id="cicd" className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
          <GitBranch className="w-4.5 h-4.5 text-primary-base" />
          CI/CD Pipeline Integration
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Automate security checks on every pull request to block vulnerable code before merge.
        </p>
      </div>

      <Card className="border-border-subtle bg-bg-surface">
        <CardHeader className="p-4 pb-3 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-md bg-bg-base border border-border-subtle">
            {[
              { id: 'github', label: 'GitHub Actions' },
              { id: 'gitlab', label: 'GitLab CI' },
              { id: 'docker', label: 'Docker / Generic' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePlatform(p.id as any)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded transition-colors cursor-pointer',
                  activePlatform === p.id
                    ? 'bg-bg-surface text-primary-base font-semibold shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <a
            href="/downloads/oculus-ci.yml"
            download="oculus-ci.yml"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-surface-hover border border-border-subtle transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-primary-base" />
            <span>Download Workflow YAML</span>
          </a>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <CliCodeBlock
            code={activePlatform === 'github' ? githubSnippet : activePlatform === 'gitlab' ? gitlabSnippet : dockerSnippet}
            language="yaml"
            title={activePlatform === 'github' ? '.github/workflows/oculus.yml' : activePlatform === 'gitlab' ? '.gitlab-ci.yml' : 'Shell'}
          />

          <div className="space-y-2 text-xs">
            <span className="font-semibold text-text-primary">Required Secrets & Variables:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-text-secondary font-mono text-[11px]">
              <div className="p-2.5 rounded bg-bg-base border border-border-subtle">
                <span className="text-risk-critical font-bold">OCULUS_TOKEN</span> (Secret)
                <p className="text-text-tertiary font-sans text-[11px] mt-0.5">Developer token (ocx_live_...)</p>
              </div>
              <div className="p-2.5 rounded bg-bg-base border border-border-subtle">
                <span className="text-primary-base font-bold">OCULUS_REPO_ID</span> (Variable)
                <p className="text-text-tertiary font-sans text-[11px] mt-0.5">Oculus Repository UUID</p>
              </div>
              <div className="p-2.5 rounded bg-bg-base border border-border-subtle">
                <span className="text-text-primary font-bold">OCULUS_WORKSPACE_ID</span> (Variable)
                <p className="text-text-tertiary font-sans text-[11px] mt-0.5">Oculus Workspace UUID</p>
              </div>
              <div className="p-2.5 rounded bg-bg-base border border-border-subtle">
                <span className="text-text-primary font-bold">OCULUS_API_URL</span> (Variable)
                <p className="text-text-tertiary font-sans text-[11px] mt-0.5">Backend API URL (e.g. https://.../api/v1)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

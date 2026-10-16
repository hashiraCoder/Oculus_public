import React from 'react';
import { Play, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CliCodeBlock } from './CliCodeBlock';

interface CliQuickStartProps {
  workspaceId?: string;
}

export const CliQuickStart: React.FC<CliQuickStartProps> = ({ workspaceId }) => {
  const wsId = workspaceId || '<workspace-id>';

  const steps = [
    {
      num: '01',
      title: 'Install the CLI',
      desc: 'Install globally via npm or from the distribution package. Requires Node.js ≥ 18.0.0.',
      code: 'npm install -g @oculus/cli\n\n# Verify installation\noculus --version',
      expected: 'Prints: 1.0.0',
    },
    {
      num: '02',
      title: 'Authenticate',
      desc: 'Save your developer token (generate one from Oculus UI → Settings → Developer Tokens). The CLI validates it against the backend.',
      code: 'oculus auth login --token ocx_live_your_developer_token_here',
      expected: '✓ Authentication token saved and verified successfully.',
    },
    {
      num: '03',
      title: 'Configure Your Workspace',
      desc: 'Set your active workspace so you do not need to supply --workspace on every findings or repo command.',
      code: `oculus config set workspace ${wsId}\n\n# Inspect registered repositories\noculus repo list`,
      expected: `✓ Set configuration workspace = ${wsId}`,
    },
    {
      num: '04',
      title: 'Trigger Scan & Evaluate Security Gate',
      desc: 'Trigger a security scan on your repository branch. The --wait flag blocks until evaluation completes and exits with 0 (PASSED) or 1 (FAILED).',
      code: 'oculus scan --repository <repo-id> --branch main --wait',
      expected: 'Security Gate: PASSED (exit code 0)',
    },
  ];

  return (
    <section id="quickstart" className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
          <Play className="w-4.5 h-4.5 text-primary-base" />
          Quick Start Flow
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Go from installation to your first security gate check in four terminal commands.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((s) => (
          <Card key={s.num} className="border-border-subtle bg-bg-surface flex flex-col justify-between hover:border-border-normal transition-colors">
            <CardHeader className="p-4 pb-2 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-primary-alpha text-primary-base border border-primary-base/25 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                  {s.num}
                </div>
                <CardTitle className="text-sm font-semibold text-text-primary">
                  {s.title}
                </CardTitle>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {s.desc}
              </p>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-2.5">
              <CliCodeBlock code={s.code} language="bash" />
              <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                <CheckCircle2 className="w-3 h-3 text-primary-base shrink-0" />
                <span className="truncate">Expected: <span className="text-text-secondary font-mono">{s.expected}</span></span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const CliExitCodesSection: React.FC = () => {
  return (
    <section id="exit-codes" className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
          <CheckCircle2 className="w-4.5 h-4.5 text-primary-base" />
          Exit Codes & Security Gate Policy
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Oculus CLI conforms to strict standard exit codes designed to drive CI/CD merge-blocking pipelines.
        </p>
      </div>

      <Card className="border-border-subtle bg-bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-base/60 text-text-tertiary font-semibold">
                <th className="p-3 w-28">Exit Code</th>
                <th className="p-3">Meaning</th>
                <th className="p-3">Trigger Condition</th>
                <th className="p-3">CI/CD Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-xs text-text-secondary">
              <tr className="hover:bg-bg-surface-hover/50">
                <td className="p-3">
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-primary-alpha text-primary-base border border-primary-base/20">
                    0
                  </span>
                </td>
                <td className="p-3 font-medium text-text-primary">Success / Gate PASSED</td>
                <td className="p-3 text-text-tertiary">
                  Command completed successfully, or security scan finished and findings did not violate workspace policy.
                </td>
                <td className="p-3 text-emerald-400 font-semibold">
                  Pipeline passes; build / deployment proceeds.
                </td>
              </tr>

              <tr className="hover:bg-bg-surface-hover/50">
                <td className="p-3">
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-risk-critical-alpha text-risk-critical border border-risk-critical-border">
                    1
                  </span>
                </td>
                <td className="p-3 font-medium text-text-primary">Gate FAILED or Error</td>
                <td className="p-3 text-text-tertiary">
                  Security gate failed due to policy violations (critical/high findings), token rejected, network failure, or scan timeout.
                </td>
                <td className="p-3 text-rose-400 font-semibold">
                  Pipeline fails; blocks PR merge or deployment.
                </td>
              </tr>

              <tr className="hover:bg-bg-surface-hover/50">
                <td className="p-3">
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-risk-medium-alpha text-risk-medium border border-risk-medium-border">
                    130
                  </span>
                </td>
                <td className="p-3 font-medium text-text-primary">User Interrupted (SIGINT)</td>
                <td className="p-3 text-text-tertiary">
                  User pressed <kbd className="font-mono px-1 py-0.5 rounded bg-bg-root border border-border-subtle">Ctrl+C</kbd> while polling a waiting scan. Scan continues asynchronously on the backend.
                </td>
                <td className="p-3 text-amber-400">
                  Job cancelled by operator.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
};

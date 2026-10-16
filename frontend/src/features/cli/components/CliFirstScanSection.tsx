import React from 'react';
import { ScanLine } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CliCodeBlock } from './CliCodeBlock';

interface CliFirstScanSectionProps {
  workspaceId?: string;
}

export const CliFirstScanSection: React.FC<CliFirstScanSectionProps> = () => {
  return (
    <section id="first-scan" className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
          <ScanLine className="w-4.5 h-4.5 text-primary-base" />
          Run Your First Scan & Triage
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Learn the complete workflow: discovering repository IDs, initiating scans, evaluating security gates, and triaging findings.
        </p>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <Card className="border-border-subtle bg-bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary-alpha text-primary-base text-xs font-bold font-mono flex items-center justify-center">1</span>
            <h3 className="text-sm font-semibold text-text-primary">Discover Repository IDs</h3>
          </div>
          <p className="text-xs text-text-secondary">
            Query repositories registered in your workspace to get the repository UUID:
          </p>
          <CliCodeBlock
            code="oculus repo list"
            language="bash"
          />
        </Card>

        {/* Step 2 */}
        <Card className="border-border-subtle bg-bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary-alpha text-primary-base text-xs font-bold font-mono flex items-center justify-center">2</span>
            <h3 className="text-sm font-semibold text-text-primary">Trigger Scan with Gate Evaluation (--wait)</h3>
          </div>
          <p className="text-xs text-text-secondary">
            Trigger a scan and block the terminal until analysis finishes. The exit code reflects whether the branch passed the security policy gate:
          </p>
          <CliCodeBlock
            code="oculus scan --repository repo_8f3a9c1b --branch main --wait"
            language="bash"
          />

          {/* Interactive terminal output simulation */}
          <div className="rounded-lg border border-border-subtle bg-[#08090C] p-3.5 font-mono text-[11px] space-y-1 text-text-secondary">
            <div className="text-text-tertiary">Triggering Oculus security scan…</div>
            <div className="text-emerald-400 font-semibold">✓ Scan successfully queued!</div>
            <div>  <span className="text-text-tertiary">Scan ID:</span> scan_9e8f7a6b</div>
            <div>  <span className="text-text-tertiary">Branch:</span>  main</div>
            <div className="text-text-tertiary pt-1">Waiting for scan execution and security gate evaluation… .....</div>
            <div className="pt-2 font-bold text-text-primary">Scan Execution: <span className="text-emerald-400">COMPLETED</span></div>
            <div className="font-bold text-text-primary">Security Gate:   <span className="text-emerald-400">PASSED</span></div>
            <div className="text-text-tertiary text-[10.5px]">Reason: No critical or high policy violations detected.</div>
          </div>
        </Card>

        {/* Step 3 */}
        <Card className="border-border-subtle bg-bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary-alpha text-primary-base text-xs font-bold font-mono flex items-center justify-center">3</span>
            <h3 className="text-sm font-semibold text-text-primary">Inspect & Triage Findings</h3>
          </div>
          <p className="text-xs text-text-secondary">
            If issues are flagged, query open findings and triage them directly from your terminal:
          </p>
          <CliCodeBlock
            code={`# 1. List critical findings for the repository
oculus findings list -r repo_8f3a9c1b --severity CRITICAL

# 2. Mark a test finding as false positive
oculus findings update fnd_1234abcd -s FALSE_POSITIVE -c "Validated test mock credential"

# 3. Confirm a real vulnerability
oculus findings update fnd_5678efgh -s CONFIRMED`}
            language="bash"
          />
        </Card>
      </div>
    </section>
  );
};

import React from 'react';
import { Settings, Sliders } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CliCodeBlock } from './CliCodeBlock';

interface CliConfigSectionProps {
  workspaceId?: string;
}

export const CliConfigSection: React.FC<CliConfigSectionProps> = ({ workspaceId }) => {
  const wsId = workspaceId || 'your-workspace-uuid';

  return (
    <section id="configuration" className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
          <Settings className="w-4.5 h-4.5 text-primary-base" />
          Configuration & Environment Variables
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Oculus CLI resolves each configuration parameter following a strict priority hierarchy.
        </p>
      </div>

      {/* Priority Hierarchy Flow */}
      <div className="p-3.5 rounded-lg border border-border-subtle bg-bg-surface flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-medium text-text-primary">
          <Sliders className="w-4 h-4 text-primary-base" />
          <span>Resolution Priority:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-primary-alpha text-primary-base font-semibold border border-primary-base/30">
            1. CLI Flag
          </span>
          <span className="text-text-muted">›</span>
          <span className="px-2 py-0.5 rounded bg-bg-root text-text-primary border border-border-subtle">
            2. Environment Variable
          </span>
          <span className="text-text-muted">›</span>
          <span className="px-2 py-0.5 rounded bg-bg-root text-text-secondary border border-border-subtle">
            3. ~/.oculus/config.json
          </span>
          <span className="text-text-muted">›</span>
          <span className="px-2 py-0.5 rounded bg-bg-root text-text-tertiary border border-border-subtle">
            4. Default Fallback
          </span>
        </div>
      </div>

      {/* Settings Matrix Table */}
      <Card className="border-border-subtle bg-bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-base/60 text-text-tertiary font-semibold">
                <th className="p-3">Parameter</th>
                <th className="p-3">CLI Flag</th>
                <th className="p-3">Environment Variable</th>
                <th className="p-3">Config Key</th>
                <th className="p-3">Default / Fallback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle font-mono text-[11.5px] text-text-secondary">
              <tr className="hover:bg-bg-surface-hover/50">
                <td className="p-3 font-sans font-medium text-text-primary">API Token</td>
                <td className="p-3 text-primary-base">--token</td>
                <td className="p-3 text-text-primary">OCULUS_TOKEN</td>
                <td className="p-3">token</td>
                <td className="p-3 text-risk-critical font-sans">None (Exits with error)</td>
              </tr>
              <tr className="hover:bg-bg-surface-hover/50">
                <td className="p-3 font-sans font-medium text-text-primary">API Endpoint</td>
                <td className="p-3 text-primary-base">--api-url</td>
                <td className="p-3 text-text-primary">OCULUS_API_URL</td>
                <td className="p-3">api-url</td>
                <td className="p-3 text-text-tertiary">http://localhost:3000/api/v1</td>
              </tr>
              <tr className="hover:bg-bg-surface-hover/50">
                <td className="p-3 font-sans font-medium text-text-primary">Workspace ID</td>
                <td className="p-3 text-primary-base">--workspace</td>
                <td className="p-3 text-text-primary">OCULUS_WORKSPACE_ID</td>
                <td className="p-3">workspace</td>
                <td className="p-3 text-risk-critical font-sans">None (Required for findings/repo)</td>
              </tr>
              <tr className="hover:bg-bg-surface-hover/50">
                <td className="p-3 font-sans font-medium text-text-primary">Disable Colors</td>
                <td className="p-3 text-text-muted">—</td>
                <td className="p-3 text-text-primary">NO_COLOR=1</td>
                <td className="p-3 text-text-muted">—</td>
                <td className="p-3 text-text-tertiary font-sans">Automatic if not a TTY</td>
              </tr>
              <tr className="hover:bg-bg-surface-hover/50">
                <td className="p-3 font-sans font-medium text-text-primary">CI Pipeline Mode</td>
                <td className="p-3 text-text-muted">—</td>
                <td className="p-3 text-text-primary">CI=true</td>
                <td className="p-3 text-text-muted">—</td>
                <td className="p-3 text-text-tertiary font-sans">Suppresses interactive notices</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Commands */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border-border-subtle bg-bg-surface space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">Set Stored Configurations</h3>
          <p className="text-xs text-text-secondary">Persists configuration across terminal sessions:</p>
          <CliCodeBlock
            code={`# Set default workspace\noculus config set workspace ${wsId}\n\n# Set custom API base URL\noculus config set api-url https://oculus.yourcompany.com/api/v1`}
            language="bash"
          />
        </Card>

        <Card className="p-4 border-border-subtle bg-bg-surface space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">Inspect Stored Values & Path</h3>
          <p className="text-xs text-text-secondary">Examine configuration file and keys (tokens are masked):</p>
          <CliCodeBlock
            code={`# Print all configuration values
oculus config get

# Inspect one key
oculus config get workspace

# Print path to ~/.oculus/config.json
oculus config path`}
            language="bash"
          />
        </Card>
      </div>
    </section>
  );
};

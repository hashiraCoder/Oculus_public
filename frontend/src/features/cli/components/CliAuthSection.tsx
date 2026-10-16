import React from 'react';
import { Key, ExternalLink, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CliCodeBlock } from './CliCodeBlock';
import { Link } from 'react-router-dom';

interface CliAuthSectionProps {
  workspaceId?: string;
}

export const CliAuthSection: React.FC<CliAuthSectionProps> = ({ workspaceId }) => {
  const settingsTokenUrl = workspaceId ? `/w/${workspaceId}/settings` : '/settings';

  return (
    <section id="authentication" className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
          <Key className="w-4.5 h-4.5 text-primary-base" />
          Authentication & Developer Tokens
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Authenticate your CLI commands using cryptographic developer tokens with granular scopes.
        </p>
      </div>

      {/* Security alert card */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg border border-risk-medium-border bg-risk-medium-alpha text-xs text-text-primary">
        <Lock className="w-4 h-4 text-risk-medium shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-risk-medium">Credential Security Contract:</span>
          <p className="text-text-secondary leading-relaxed">
            The CLI persists your token in <code className="font-mono text-text-primary bg-bg-root px-1 py-0.5 rounded">~/.oculus/config.json</code> with POSIX mode <code className="font-mono text-text-primary">0600</code> (owner read/write only). Never commit tokens to git repositories or hardcode them in shell scripts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Token scopes card */}
        <Card className="border-border-subtle bg-bg-surface md:col-span-1 flex flex-col">
          <CardHeader className="p-4 pb-3 space-y-1">
            <CardTitle className="text-sm font-semibold text-text-primary flex items-center justify-between">
              <span>Token Permissions</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-bg-base text-text-tertiary border border-border-subtle">
                Scopes
              </span>
            </CardTitle>
            <p className="text-xs text-text-secondary leading-relaxed">
              Developer tokens require appropriate scopes to execute CLI operations:
            </p>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-bg-base border border-border-subtle hover:border-border-normal transition-colors space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-primary-base bg-primary-alpha px-1.5 py-0.5 rounded border border-primary-base/20">
                    scans:create
                  </span>
                  <span className="text-[10px] text-text-tertiary font-mono">Write</span>
                </div>
                <div className="text-text-secondary text-[11px] leading-snug">
                  Required for <code className="font-mono text-text-primary bg-bg-surface px-1 py-0.5 rounded text-[10px]">oculus scan</code>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-bg-base border border-border-subtle hover:border-border-normal transition-colors space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-primary-base bg-primary-alpha px-1.5 py-0.5 rounded border border-primary-base/20">
                    scans:read
                  </span>
                  <span className="text-[10px] text-text-tertiary font-mono">Read</span>
                </div>
                <div className="text-text-secondary text-[11px] leading-snug">
                  Required to poll security gate status
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-bg-base border border-border-subtle hover:border-border-normal transition-colors space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-primary-base bg-primary-alpha px-1.5 py-0.5 rounded border border-primary-base/20">
                    findings:read
                  </span>
                  <span className="text-[10px] text-text-tertiary font-mono">Read</span>
                </div>
                <div className="text-text-secondary text-[11px] leading-snug">
                  Required for <code className="font-mono text-text-primary bg-bg-surface px-1 py-0.5 rounded text-[10px]">oculus findings list</code>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-bg-base border border-border-subtle hover:border-border-normal transition-colors space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-primary-base bg-primary-alpha px-1.5 py-0.5 rounded border border-primary-base/20">
                    findings:write
                  </span>
                  <span className="text-[10px] text-text-tertiary font-mono">Write</span>
                </div>
                <div className="text-text-secondary text-[11px] leading-snug">
                  Required for <code className="font-mono text-text-primary bg-bg-surface px-1 py-0.5 rounded text-[10px]">oculus findings update</code>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border-subtle/70 mt-auto">
              <Link
                to={settingsTokenUrl}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-text-primary bg-bg-surface-hover/80 hover:bg-bg-surface-hover hover:text-primary-base border border-border-base hover:border-primary-base/30 transition-colors group"
              >
                <span className="truncate">Manage Tokens in Settings</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-text-tertiary group-hover:text-primary-base transition-colors" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Authentication commands */}
        <Card className="border-border-subtle bg-bg-surface md:col-span-2 space-y-3 p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-text-primary">1. Login & Verification</h3>
            <p className="text-xs text-text-secondary">
              Stores token and automatically validates against the backend API by calling <code className="font-mono text-text-secondary">GET /workspaces</code>:
            </p>
            <CliCodeBlock
              code="oculus auth login --token ocx_live_your_token_here"
              language="bash"
            />
          </div>

          <div className="space-y-1 pt-2">
            <h3 className="text-sm font-semibold text-text-primary">2. Inspect Auth Status</h3>
            <p className="text-xs text-text-secondary">
              Confirms authentication and lists workspaces your token is authorized to access:
            </p>
            <CliCodeBlock
              code={`# Terminal human-readable output
oculus auth status

# JSON output for automated scripting
oculus auth status --json`}
              language="bash"
            />
          </div>

          <div className="space-y-1 pt-2">
            <h3 className="text-sm font-semibold text-text-primary">3. Logout & Token Revocation</h3>
            <p className="text-xs text-text-secondary">
              Removes local token and notifies backend to revoke credentials server-side:
            </p>
            <CliCodeBlock
              code="oculus auth logout"
              language="bash"
            />
          </div>
        </Card>
      </div>
    </section>
  );
};

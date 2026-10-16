import React, { useState } from 'react';
import { Wrench, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { CliCodeBlock } from './CliCodeBlock';
import { cn } from '@/lib/utils';

export const CliInstallSection: React.FC = () => {
  const [platform, setPlatform] = useState<'all' | 'macos' | 'linux' | 'windows'>('all');
  const [method, setMethod] = useState<'npm' | 'tarball' | 'source'>('npm');

  const getCodeSnippet = () => {
    if (method === 'npm') {
      if (platform === 'windows') {
        return `# Install globally via npm\nnpm install -g @oculus/cli\n\n# Verify binary\noculus --version`;
      }
      return `# Install globally via npm\nnpm install -g @oculus/cli\n\n# Verify binary\noculus --version`;
    }

    if (method === 'tarball') {
      if (platform === 'windows') {
        return `# 1. Download oculus-cli-1.0.0.tgz from the Downloads section\n# 2. Install globally using npm\nnpm install -g .\\oculus-cli-1.0.0.tgz\n\n# 3. Verify\noculus --version`;
      }
      return `# 1. Download oculus-cli-1.0.0.tgz from the Downloads section\n# 2. Install globally using npm\nnpm install -g ./oculus-cli-1.0.0.tgz\n\n# 3. Verify\noculus --version`;
    }

    // method === 'source'
    if (platform === 'windows') {
      return `# Clone the repository\ngit clone https://github.com/oculus-security/oculus.git\n\n# Navigate to CLI directory & install dependencies\ncd oculus\\cli\nnpm install\n\n# Register global symlink\nnpm link\n\n# Verify\noculus --version`;
    }
    return `# Clone the repository\ngit clone https://github.com/oculus-security/oculus.git\n\n# Navigate to CLI directory & install dependencies\ncd oculus/cli\nnpm install\n\n# Register global symlink\nnpm link\n\n# Verify\noculus --version`;
  };

  return (
    <section id="installation" className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
          <Wrench className="w-4.5 h-4.5 text-primary-base" />
          Installation & Setup
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Install the Oculus CLI on your operating system. Supported across macOS, Linux, and Windows.
        </p>
      </div>

      {/* Prerequisites notice */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg border border-primary-base/25 bg-primary-alpha text-xs text-text-primary">
        <CheckCircle2 className="w-4 h-4 text-primary-base shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-primary-base">Runtime Requirement:</span>
          <p className="text-text-secondary leading-relaxed">
            Oculus CLI requires <strong className="text-text-primary">Node.js ≥ 18.0.0</strong> (ES modules & native fetch support). Verify your local runtime with <code className="font-mono text-primary-base bg-bg-root px-1 py-0.5 rounded">node -v</code> before proceeding.
          </p>
        </div>
      </div>

      <Card className="border-border-subtle bg-bg-surface">
        <CardHeader className="p-4 pb-3 border-b border-border-subtle space-y-3">
          {/* Method selector */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-md bg-bg-base border border-border-subtle">
              {[
                { id: 'npm', label: 'npm Registry' },
                { id: 'tarball', label: 'Local Package (.tgz)' },
                { id: 'source', label: 'From Source (npm link)' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id as any)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer',
                    method === m.id
                      ? 'bg-bg-surface text-text-primary shadow-xs font-semibold'
                      : 'text-text-tertiary hover:text-text-primary'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Platform filter */}
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
              <span>Platform:</span>
              <div className="flex items-center gap-1 p-0.5 rounded bg-bg-base border border-border-subtle">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'macos', label: 'macOS' },
                  { id: 'linux', label: 'Linux' },
                  { id: 'windows', label: 'Windows' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id as any)}
                    className={cn(
                      'px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer',
                      platform === p.id
                        ? 'bg-primary-alpha text-primary-base font-semibold'
                        : 'hover:text-text-primary'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <CliCodeBlock code={getCodeSnippet()} language="bash" title="Terminal Installation" />

          <div className="text-xs text-text-secondary space-y-2">
            <div className="font-semibold text-text-primary">Verification Checklist:</div>
            <ul className="list-disc list-inside space-y-1 text-text-tertiary">
              <li>Run <code className="font-mono text-text-secondary">oculus --version</code> — Should output <code className="font-mono text-text-secondary">1.0.0</code></li>
              <li>Run <code className="font-mono text-text-secondary">oculus --help</code> — Should print help and the 5 core subcommands (<code className="font-mono text-text-secondary">auth, scan, findings, repo, config</code>)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

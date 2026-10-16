import React from 'react';
import { Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CliCodeBlock } from './CliCodeBlock';

export const CliDownloadsCard: React.FC = () => {
  const downloadItems = [
    {
      id: 'tgz',
      title: 'CLI Distribution Package',
      file: 'oculus-cli-1.0.0.tgz',
      size: '13.3 KB',
      description: 'Pre-packed npm tarball distribution. Install offline or in isolated environments.',
      href: '/downloads/oculus-cli-1.0.0.tgz',
      badge: 'npm tarball',
      installCmd: 'npm install -g ./oculus-cli-1.0.0.tgz',
    },
    {
      id: 'sh',
      title: 'macOS & Linux Automated Installer',
      file: 'install.sh',
      size: '2.1 KB',
      description: 'Checks Node.js version >= 18, installs the CLI, and verifies global binary registration.',
      href: '/downloads/install.sh',
      badge: 'POSIX Script',
      installCmd: 'bash install.sh',
    },
    {
      id: 'ps1',
      title: 'Windows PowerShell Installer',
      file: 'install.ps1',
      size: '1.8 KB',
      description: 'Installs global Oculus CLI on Windows, verifies PATH and npm environment.',
      href: '/downloads/install.ps1',
      badge: 'PowerShell',
      installCmd: 'powershell -ExecutionPolicy Bypass -File .\\install.ps1',
    },
    {
      id: 'ci',
      title: 'GitHub Actions Workflow',
      file: 'oculus-ci.yml',
      size: '1.9 KB',
      description: 'Ready-to-commit CI workflow for automated security gate evaluation on pushes and PRs.',
      href: '/downloads/oculus-ci.yml',
      badge: 'CI/CD YAML',
      installCmd: 'cp oculus-ci.yml .github/workflows/oculus-security.yml',
    },
    {
      id: 'env',
      title: 'Environment Variables Template',
      file: '.env.example',
      size: '0.8 KB',
      description: 'Template with OCULUS_TOKEN, OCULUS_API_URL, and OCULUS_WORKSPACE_ID.',
      href: '/downloads/.env.example',
      badge: 'Config Env',
      installCmd: 'cp .env.example .env',
    },
  ];

  return (
    <section id="downloads" className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
          <Download className="w-4.5 h-4.5 text-primary-base" />
          Downloadable Setup & Packages
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Download the standalone distribution tarball or helper setup scripts for your operating system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {downloadItems.map((item) => (
          <Card key={item.id} className="flex flex-col justify-between border-border-subtle bg-bg-surface hover:border-border-normal transition-colors">
            <CardHeader className="p-4 pb-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary-alpha text-primary-base border border-primary-base/20">
                  {item.badge}
                </span>
                <span className="text-[11px] font-mono text-text-muted">{item.size}</span>
              </div>
              <CardTitle className="text-sm font-semibold text-text-primary mt-1">
                {item.title}
              </CardTitle>
              <CardDescription className="text-xs text-text-secondary leading-relaxed">
                {item.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-3">
              <div className="space-y-1">
                <span className="text-[10.5px] font-medium text-text-tertiary">Quick run command:</span>
                <CliCodeBlock code={item.installCmd} language="bash" />
              </div>

              <div className="pt-1">
                <a
                  href={item.href}
                  download={item.file}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-bg-surface-hover hover:bg-border-normal text-text-primary border border-border-base transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-primary-base" />
                  <span>Download {item.file}</span>
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

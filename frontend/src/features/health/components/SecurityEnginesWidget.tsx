import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShieldCheck, Code, Key, GitBranch, CheckCircle2 } from 'lucide-react';

export const SecurityEnginesWidget: React.FC = () => {
  const engines = [
    {
      name: 'AST Semgrep Static Analysis',
      category: 'SAST Engine',
      description: 'Abstract syntax tree rule engine analyzing repository source code for OWASP Top 10 vulnerabilities.',
      status: 'OPERATIONAL',
      rulesCount: '184 rules active',
      icon: Code,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-500/10 border-cyan-500/25'
    },
    {
      name: 'Secret & Entropy Leak Scanner',
      category: 'Secret Detection',
      description: 'High-entropy credential and private token detector for API keys, SSH certs, and cloud secrets.',
      status: 'OPERATIONAL',
      rulesCount: '62 patterns active',
      icon: Key,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/25'
    },
    {
      name: 'Software Composition Analysis (SCA)',
      category: 'Dependency Audit',
      description: 'Package manifest scanner resolving dependency trees against the National Vulnerability Database.',
      status: 'OPERATIONAL',
      rulesCount: 'Live CVE Feed',
      icon: GitBranch,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/25'
    },
    {
      name: 'CI Promotion & Quality Gate',
      category: 'Security Governance',
      description: 'Automated GitHub pull request status check enforcement blocking merges with critical findings.',
      status: 'ACTIVE',
      rulesCount: 'Enforced',
      icon: ShieldCheck,
      iconColor: 'text-primary-base',
      iconBg: 'bg-primary-alpha border-primary-alpha'
    }
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border-subtle pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-text-tertiary flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-base" />
            <span>Security Analysis Engines & Pipeline Subsystems</span>
          </CardTitle>
          <span className="text-[11px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>4 / 4 Engines Ready</span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {engines.map((engine, idx) => {
            const Icon = engine.icon;
            return (
              <div 
                key={idx}
                className="p-3.5 rounded-lg bg-bg-base border border-border-subtle hover:border-border-normal transition-colors flex items-start gap-3.5"
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center border shrink-0 mt-0.5 ${engine.iconBg}`}>
                  <Icon className={`w-4 h-4 ${engine.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className="text-xs font-bold text-text-primary truncate">{engine.name}</h4>
                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>{engine.status}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed mb-1.5">
                    {engine.description}
                  </p>
                  <div className="flex items-center justify-between text-[10.5px] text-text-tertiary font-mono pt-1.5 border-t border-border-subtle">
                    <span>{engine.category}</span>
                    <span className="text-text-secondary">{engine.rulesCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

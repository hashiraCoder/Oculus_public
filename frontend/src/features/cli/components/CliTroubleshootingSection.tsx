import React, { useState, useMemo } from 'react';
import { AlertCircle, Search, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CLI_TROUBLESHOOTING } from '../data/cliTroubleshootingData';
import { CliCodeBlock } from './CliCodeBlock';

export const CliTroubleshootingSection: React.FC = () => {
  const [filter, setFilter] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set([CLI_TROUBLESHOOTING[0].id]));

  const filteredItems = useMemo(() => {
    if (!filter.trim()) return CLI_TROUBLESHOOTING;
    const q = filter.toLowerCase();
    return CLI_TROUBLESHOOTING.filter(
      (item) =>
        item.problem.toLowerCase().includes(q) ||
        item.symptom.toLowerCase().includes(q) ||
        item.cause.toLowerCase().includes(q) ||
        item.solution.toLowerCase().includes(q)
    );
  }, [filter]);

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section id="troubleshooting" className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
          <AlertCircle className="w-4.5 h-4.5 text-primary-base" />
          Troubleshooting & Error Recovery
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Direct solutions for real CLI failure modes, authentication rejections, and network timeouts.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter troubleshooting by error message or symptom (e.g. 401, timeout, workspace)..."
          className="pl-9 h-9 text-xs bg-bg-surface border-border-subtle"
        />
      </div>

      <div className="space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const isOpen = openIds.has(item.id) || filter.trim().length > 0;
            return (
              <Card
                key={item.id}
                className="border-border-subtle bg-bg-surface overflow-hidden hover:border-border-normal transition-colors"
              >
                <div
                  onClick={() => toggleItem(item.id)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none bg-bg-surface-alt/40 border-b border-border-subtle"
                >
                  <div className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-risk-medium shrink-0" />
                    <span className="text-sm font-semibold text-text-primary">{item.problem}</span>
                  </div>
                  <div className="text-text-tertiary">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isOpen && (
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="space-y-1">
                      <span className="font-semibold text-text-tertiary">Observed Output / Symptom:</span>
                      <div className="p-2.5 rounded bg-[#08090C] border border-border-subtle font-mono text-[11px] text-rose-300">
                        {item.symptom}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="font-semibold text-text-tertiary">Root Cause:</span>
                      <p className="text-text-secondary leading-relaxed">{item.cause}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="font-semibold text-emerald-400">Resolution:</span>
                      <p className="text-text-primary leading-relaxed">{item.solution}</p>
                    </div>

                    {item.exampleCommand && (
                      <div className="space-y-1 pt-1">
                        <span className="font-semibold text-text-tertiary">Suggested Command:</span>
                        <CliCodeBlock code={item.exampleCommand} language="bash" />
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        ) : (
          <div className="p-6 text-center rounded-lg border border-border-subtle bg-bg-surface text-text-secondary text-xs">
            No troubleshooting entries matched "<span className="text-text-primary font-mono">{filter}</span>".
          </div>
        )}
      </div>
    </section>
  );
};

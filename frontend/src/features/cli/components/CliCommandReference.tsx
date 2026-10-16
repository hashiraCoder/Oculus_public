import React, { useState, useMemo } from 'react';
import { Terminal, Search, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CLI_COMMANDS } from '../data/cliCommandsData';
import { CliCodeBlock } from './CliCodeBlock';
import { cn } from '@/lib/utils';

export const CliCommandReference: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCmdId, setExpandedCmdId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Commands' },
    { id: 'scan', label: 'Scanning' },
    { id: 'auth', label: 'Authentication' },
    { id: 'findings', label: 'Findings Triage' },
    { id: 'repo', label: 'Repositories' },
    { id: 'config', label: 'Configuration' },
    { id: 'system', label: 'System & Flags' },
  ];

  const filteredCommands = useMemo(() => {
    return CLI_COMMANDS.filter((cmd) => {
      const matchesCat = selectedCategory === 'all' || cmd.category === selectedCategory;
      if (!matchesCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        cmd.command.toLowerCase().includes(q) ||
        cmd.summary.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        (cmd.options && cmd.options.some((opt) => opt.flag.toLowerCase().includes(q) || opt.description.toLowerCase().includes(q)))
      );
    });
  }, [searchQuery, selectedCategory]);

  return (
    <section id="commands" className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-2">
          <Terminal className="w-4.5 h-4.5 text-primary-base" />
          Command Reference
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Complete, verified reference for all Oculus CLI commands, flags, arguments, and exit behavior.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands, options (e.g. --wait, --json, status)..."
            className="pl-9 h-9 text-xs bg-bg-surface border-border-subtle"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-md bg-bg-surface border border-border-subtle shrink-0">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={cn(
                'px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap cursor-pointer',
                selectedCategory === c.id
                  ? 'bg-primary-alpha text-primary-base font-semibold'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Command List */}
      <div className="space-y-4">
        {filteredCommands.length > 0 ? (
          filteredCommands.map((cmd) => {
            const isExpanded = expandedCmdId === cmd.id || searchQuery.trim().length > 0;
            return (
              <Card
                key={cmd.id}
                className="border-border-subtle bg-bg-surface overflow-hidden hover:border-border-normal transition-colors"
              >
                <div
                  onClick={() => setExpandedCmdId(isExpanded && !searchQuery ? null : cmd.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-bg-surface-alt/40 border-b border-border-subtle"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-mono font-bold text-text-primary">{cmd.command}</code>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.2 rounded bg-bg-root text-text-tertiary border border-border-subtle">
                        {cmd.category}
                      </span>
                      {cmd.authRequired ? (
                        <span className="text-[10px] font-medium px-2 py-0.2 rounded bg-risk-medium-alpha text-risk-medium border border-risk-medium-border flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          Auth Required
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.2 rounded bg-primary-alpha text-primary-base border border-primary-base/20">
                          Public
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary">{cmd.summary}</p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 text-text-tertiary">
                    <span className="text-[11px] hidden sm:inline font-mono text-text-muted">{cmd.usage}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <CardContent className="p-4 space-y-4 text-xs">
                    <p className="text-text-secondary leading-relaxed">{cmd.description}</p>

                    {/* Usage */}
                    <div className="space-y-1.5">
                      <span className="font-semibold text-text-primary">Syntax:</span>
                      <CliCodeBlock code={cmd.usage} language="bash" />
                    </div>

                    {/* Arguments if present */}
                    {cmd.arguments && cmd.arguments.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="font-semibold text-text-primary">Arguments:</span>
                        <div className="overflow-x-auto rounded border border-border-subtle">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-bg-base text-text-tertiary">
                              <tr>
                                <th className="p-2.5 font-mono">Argument</th>
                                <th className="p-2.5">Description</th>
                                <th className="p-2.5">Required</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle font-mono text-[11px] text-text-secondary">
                              {cmd.arguments.map((arg) => (
                                <tr key={arg.name}>
                                  <td className="p-2.5 text-primary-base">&lt;{arg.name}&gt;</td>
                                  <td className="p-2.5 font-sans">{arg.description}</td>
                                  <td className="p-2.5 font-sans">
                                    {arg.required ? <span className="text-risk-critical font-semibold">Yes</span> : 'No'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Options Table */}
                    {cmd.options && cmd.options.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="font-semibold text-text-primary">Options & Flags:</span>
                        <div className="overflow-x-auto rounded border border-border-subtle">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-bg-base text-text-tertiary">
                              <tr>
                                <th className="p-2.5 font-mono">Flag</th>
                                <th className="p-2.5">Description</th>
                                <th className="p-2.5">Default</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle font-mono text-[11px] text-text-secondary">
                              {cmd.options.map((opt) => (
                                <tr key={opt.flag}>
                                  <td className="p-2.5 text-primary-base font-semibold whitespace-nowrap">{opt.flag}</td>
                                  <td className="p-2.5 font-sans">{opt.description}</td>
                                  <td className="p-2.5 text-text-tertiary">{opt.defaultValue || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Exit behavior */}
                    {cmd.exitBehavior && (
                      <div className="p-2.5 rounded bg-bg-base border border-border-subtle text-[11.5px] text-text-tertiary">
                        <strong className="text-text-secondary">Exit contract: </strong>
                        {cmd.exitBehavior}
                      </div>
                    )}

                    {/* Examples */}
                    {cmd.examples && cmd.examples.length > 0 && (
                      <div className="space-y-2.5 pt-1">
                        <span className="font-semibold text-text-primary">Examples:</span>
                        {cmd.examples.map((ex, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="text-[11px] font-medium text-text-secondary flex items-center justify-between">
                              <span>{ex.title}</span>
                            </div>
                            <CliCodeBlock code={ex.command} language="bash" />
                            {ex.outputPreview && (
                              <div className="pt-1">
                                <span className="text-[10.5px] text-text-tertiary font-mono">Sample output:</span>
                                <CliCodeBlock code={ex.outputPreview} language="json" title="Output (JSON)" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        ) : (
          <div className="p-8 text-center rounded-lg border border-border-subtle bg-bg-surface text-text-secondary text-xs">
            No commands matched your search "<span className="text-text-primary font-mono">{searchQuery}</span>".
          </div>
        )}
      </div>
    </section>
  );
};

import React, { useState, useEffect } from 'react';
import type { Repository } from '@/types/common.types';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface FindingFilters {
  keyword?: string;
  severity?: string[];
  status?: string[];
  repositoryId?: string;
  fromDate?: string;
  toDate?: string;
}

interface FilterPanelProps {
  onFiltersChange: (filters: FindingFilters) => void;
  repositories: Repository[];
  initialFilters?: any;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ onFiltersChange, repositories }) => {
  const [keyword, setKeyword] = useState('');
  const [severity, setSeverity] = useState<string[]>([]);
  const [status, setStatus] = useState<string[]>(['OPEN', 'CONFIRMED']);
  const [repositoryId, setRepositoryId] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({
        keyword: keyword || undefined,
        severity: severity.length > 0 ? severity : undefined,
        status: status.length > 0 ? status : undefined,
        repositoryId: repositoryId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, severity, status, repositoryId, fromDate, toDate, onFiltersChange]);

  const toggleSeverity = (sev: string) => setSeverity(prev => prev.includes(sev) ? prev.filter(s => s !== sev) : [...prev, sev]);
  const toggleStatus = (st: string) => setStatus(prev => prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st]);

  const clearFilters = () => {
    setKeyword('');
    setSeverity([]);
    setStatus([]);
    setRepositoryId('');
    setFromDate('');
    setToDate('');
  };

  const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const STATUSES = ['OPEN', 'CONFIRMED', 'FIXED', 'FALSE_POSITIVE', 'IGNORED'];

  return (
    <div className="w-72 bg-bg-surface border-r border-border-base p-5 flex flex-col gap-6 overflow-y-auto h-full text-text-primary shrink-0 z-10 shadow-drawer">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Filters</h2>
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-text-tertiary hover:text-text-primary px-2 h-8">
          <X size={14} className="mr-1" /> Clear
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-text-secondary">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-text-tertiary" size={16} />
          <Input
            type="text"
            placeholder="Keyword..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-text-secondary">Severity</label>
        <div className="space-y-2 pt-1">
          {SEVERITIES.map(s => (
            <label key={s} className="flex items-center gap-2 text-sm cursor-pointer text-text-secondary hover:text-text-primary">
              <input type="checkbox" checked={severity.includes(s)} onChange={() => toggleSeverity(s)} className="rounded border-border-base bg-bg-root text-primary-base focus:ring-primary-base h-4 w-4" />
              {s}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-text-secondary">Status</label>
        <div className="space-y-2 pt-1">
          {STATUSES.map(s => (
            <label key={s} className="flex items-center gap-2 text-sm cursor-pointer text-text-secondary hover:text-text-primary">
              <input type="checkbox" checked={status.includes(s)} onChange={() => toggleStatus(s)} className="rounded border-border-base bg-bg-root text-primary-base focus:ring-primary-base h-4 w-4" />
              {s.replace('_', ' ')}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-text-secondary">Repository</label>
        <select
          value={repositoryId}
          onChange={(e) => setRepositoryId(e.target.value)}
          className="w-full bg-bg-root border border-border-base rounded-md p-2 text-sm focus:outline-none focus:border-primary-base text-text-primary focus:ring-1 focus:ring-primary-base"
        >
          <option value="">All Repositories</option>
          {repositories.map(repo => (
            <option key={repo.id} value={repo.id}>{repo.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-text-secondary">Date Range</label>
        <div className="space-y-2">
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 [color-scheme:dark]" />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 [color-scheme:dark]" />
        </div>
      </div>
    </div>
  );
};

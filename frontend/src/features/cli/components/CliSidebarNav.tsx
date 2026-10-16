import React, { useEffect, useState } from 'react';
import { 
  Sparkles, Download, Play, Wrench, Key, Settings, 
  ScanLine, Terminal, FileCode, CheckCircle2, GitBranch, AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavSection {
  id: string;
  title: string;
  icon: React.ElementType;
}

interface NavGroup {
  group: string;
  items: NavSection[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Getting Started',
    items: [
      { id: 'overview', title: 'Overview', icon: Sparkles },
      { id: 'downloads', title: 'Downloads & Setup', icon: Download },
      { id: 'quickstart', title: 'Quick Start', icon: Play },
      { id: 'installation', title: 'Installation', icon: Wrench },
      { id: 'authentication', title: 'Authentication', icon: Key },
    ],
  },
  {
    group: 'Core Workflow',
    items: [
      { id: 'configuration', title: 'Configuration', icon: Settings },
      { id: 'first-scan', title: 'Run Your First Scan', icon: ScanLine },
      { id: 'commands', title: 'Command Reference', icon: Terminal },
    ],
  },
  {
    group: 'Integration & Reference',
    items: [
      { id: 'output', title: 'Output Formats', icon: FileCode },
      { id: 'exit-codes', title: 'Exit Codes & Policy', icon: CheckCircle2 },
      { id: 'cicd', title: 'CI/CD Pipelines', icon: GitBranch },
      { id: 'troubleshooting', title: 'Troubleshooting', icon: AlertCircle },
    ],
  },
];

export const CliSidebarNav: React.FC = () => {
  const [activeId, setActiveId] = useState<string>('overview');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    );

    const sectionElements = document.querySelectorAll('section[id]');
    sectionElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `#${id}`);
      setActiveId(id);
    }
  };

  return (
    <nav aria-label="Table of contents" className="space-y-6">
      <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted px-2.5">
        Table of Contents
      </div>

      {NAV_GROUPS.map((group) => (
        <div key={group.group} className="space-y-1">
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            {group.group}
          </div>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeId === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => scrollToSection(e, item.id)}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors select-none',
                      isActive
                        ? 'bg-primary-alpha text-primary-base font-semibold'
                        : 'text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary'
                    )}
                  >
                    <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-primary-base' : 'text-text-tertiary')} />
                    <span className="truncate">{item.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
};

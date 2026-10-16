import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Search, ArrowRight, LayoutDashboard, Shield, 
  GitFork, ScanLine, Activity, Settings, RefreshCw, 
  Sun, Moon, Laptop, GitBranch, ActivitySquare, Terminal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRepositories } from '@/features/repositories/hooks/useRepositories';
import { useSyncGithub } from '@/features/github/hooks/useGithub';
import { useThemeStore } from '@/stores/themeStore';
import { toast } from 'sonner';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

interface PaletteItem {
  id: string;
  category: 'Commands' | 'Repositories' | 'Navigation';
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  badge?: string;
  action: () => void;
}

export function CommandPalette({ isOpen, onClose, workspaceId }: CommandPaletteProps) {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const navigate = useNavigate();
  const { data: repoData } = useRepositories(workspaceId);
  const { mutate: syncGithub, isPending: isSyncing } = useSyncGithub();
  const { theme, setTheme } = useThemeStore();

  const allRepositories = React.useMemo(() => {
    return repoData?.pages.flatMap((page) => page?.items ?? []) ?? [];
  }, [repoData]);

  // Build searchable items
  const items: PaletteItem[] = React.useMemo(() => {
    const list: PaletteItem[] = [];

    // 1. Quick Commands
    list.push({
      id: 'cmd-sync',
      category: 'Commands',
      label: 'Sync GitHub Repositories',
      sublabel: isSyncing ? 'Syncing...' : 'Fetch latest repositories & commits',
      icon: RefreshCw,
      badge: 'Action',
      action: () => {
        syncGithub({ workspaceId, installationId: null });
        toast.info('Syncing repositories from GitHub...');
      }
    });

    list.push({
      id: 'cmd-theme',
      category: 'Commands',
      label: `Switch Theme (Current: ${theme})`,
      sublabel: 'Cycle between dark, light, and system theme',
      icon: theme === 'dark' ? Moon : theme === 'light' ? Sun : Laptop,
      badge: 'Theme',
      action: () => {
        const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
        setTheme(nextTheme);
        toast.success(`Theme switched to ${nextTheme}`);
      }
    });

    // 2. Repositories (Entity Search)
    allRepositories.forEach((repo) => {
      list.push({
        id: `repo-${repo.id}`,
        category: 'Repositories',
        label: repo.name || 'Unnamed Repository',
        sublabel: `${repo.primary_language || 'Code'} • Score: ${repo.current_risk_score ?? 100}/100 • ${repo.total_findings || 0} open findings`,
        icon: GitBranch,
        badge: repo.primary_language || 'Repo',
        action: () => {
          navigate(`/w/${workspaceId}/repositories?repoId=${repo.id}`);
        }
      });
    });

    // 3. Navigation
    list.push(
      {
        id: 'nav-dashboard',
        category: 'Navigation',
        label: 'Dashboard',
        sublabel: 'Overview & security posture',
        icon: LayoutDashboard,
        action: () => navigate(`/w/${workspaceId}`)
      },
      {
        id: 'nav-findings',
        category: 'Navigation',
        label: 'Security Findings',
        sublabel: 'Triage vulnerabilities & secrets',
        icon: Shield,
        action: () => navigate(`/w/${workspaceId}/findings`)
      },
      {
        id: 'nav-scans',
        category: 'Navigation',
        label: 'Scan History',
        sublabel: 'Pipeline execution logs & gate status',
        icon: ScanLine,
        action: () => navigate(`/w/${workspaceId}/scans`)
      },
      {
        id: 'nav-repos',
        category: 'Navigation',
        label: 'Repositories',
        sublabel: 'Monitored codebases & coverage',
        icon: GitFork,
        action: () => navigate(`/w/${workspaceId}/repositories`)
      },
      {
        id: 'nav-activity',
        category: 'Navigation',
        label: 'Live Activity Log',
        sublabel: 'Real-time security events & scans',
        icon: Activity,
        action: () => navigate(`/w/${workspaceId}/activity`)
      },
      {
        id: 'nav-settings',
        category: 'Navigation',
        label: 'Settings & Developer Tokens',
        sublabel: 'API tokens, GitHub integration, risk weights',
        icon: Settings,
        action: () => navigate(`/w/${workspaceId}/settings`)
      },
      {
        id: 'nav-cli',
        category: 'Navigation',
        label: 'CLI Guide & Downloads',
        sublabel: 'Terminal commands, scans, gate checks & setup',
        icon: Terminal,
        badge: 'CLI',
        action: () => navigate(`/w/${workspaceId}/cli`)
      },
      {
        id: 'nav-health',
        category: 'Navigation',
        label: 'Platform Health',
        sublabel: 'System status, database & queue metrics',
        icon: ActivitySquare,
        action: () => navigate('/platform-health')
      }
    );

    return list;
  }, [allRepositories, isSyncing, navigate, syncGithub, theme, setTheme, workspaceId]);

  // Filter based on query
  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(item => 
      item.label.toLowerCase().includes(q) ||
      (item.sublabel && item.sublabel.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Reset selected index when query changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, filteredItems.length - 1)));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredItems, selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-bg-root/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-2xl bg-bg-surface border border-border-base rounded-xl shadow-popover overflow-hidden flex flex-col ring-1 ring-border-subtle"
          >
            {/* Input Header */}
            <div className="flex items-center px-4 border-b border-border-subtle bg-bg-surface-hover/30">
              <Search className="h-4.5 w-4.5 text-text-tertiary mr-3 shrink-0" />
              <input
                autoFocus
                className="flex-1 h-13 bg-transparent text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-0 border-none text-sm"
                placeholder="Search repositories, run actions, or navigate..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button 
                  onClick={() => setQuery('')}
                  className="p-1 text-text-tertiary hover:text-text-primary rounded text-xs mr-2"
                >
                  Clear
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary bg-bg-root border border-border-subtle rounded">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors group ${
                        isSelected 
                          ? 'bg-bg-surface-active text-text-primary ring-1 ring-border-normal' 
                          : 'text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary-alpha text-primary-base' : 'bg-bg-surface-alt text-text-tertiary'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-text-primary truncate">{item.label}</span>
                          {item.badge && (
                            <span className="text-[9.5px] font-medium px-1.5 py-0.2 rounded bg-bg-root text-text-tertiary border border-border-subtle shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.sublabel && (
                          <p className="text-[11px] text-text-tertiary truncate mt-0.5 font-mono">
                            {item.sublabel}
                          </p>
                        )}
                      </div>

                      <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted px-2 py-0.5 bg-bg-root rounded shrink-0">
                        {item.category}
                      </span>
                      <ArrowRight className={`h-3.5 w-3.5 text-text-tertiary transition-opacity shrink-0 ${
                        isSelected ? 'opacity-100 text-primary-base' : 'opacity-0'
                      }`} />
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center flex flex-col items-center">
                  <Search className="h-7 w-7 text-text-muted mb-2.5" />
                  <p className="text-xs text-text-tertiary">
                    No results found for "<span className="text-text-primary">{query}</span>"
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-border-subtle bg-bg-base/60 flex items-center justify-between text-[11px] text-text-tertiary">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.2 bg-bg-root border border-border-subtle rounded text-[9.5px] font-mono">↑</kbd>
                  <kbd className="px-1 py-0.2 bg-bg-root border border-border-subtle rounded text-[9.5px] font-mono">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.2 bg-bg-root border border-border-subtle rounded text-[9.5px] font-mono">↵</kbd>
                  Select
                </span>
              </div>
              <span>{filteredItems.length} items</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

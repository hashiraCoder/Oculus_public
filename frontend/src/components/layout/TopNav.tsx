import React, { useEffect } from 'react';
import { Menu, Search, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { notificationsApi } from '@/features/notifications/api/notificationsApi';
import { NotificationsPopover } from './NotificationsPopover';
import { formatNotification } from '@/features/notifications/formatters/notification.formatter';
import { useWorkspace } from '@/features/workspace/hooks/useWorkspace';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const activeWorkspaceId = useWorkspaceStore((state: any) => state.activeWorkspaceId);
  const { data: workspace } = useWorkspace(activeWorkspaceId);
  
  const pathnames = location.pathname.split('/').filter(x => x && x !== 'w');

  if (pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'default')) {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
        <span>Dashboard</span>
      </div>
    );
  }

  const sectionName = pathnames[1] 
    ? pathnames[1].charAt(0).toUpperCase() + pathnames[1].slice(1) 
    : 'Dashboard';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-text-tertiary font-medium">{workspace?.name || 'hashiraCoder'}</span>
      <span className="text-border-strong text-[11px]">/</span>
      <span className="text-text-primary font-semibold truncate max-w-[200px]">
        {sectionName}
      </span>
      <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold tracking-wider ml-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10B981]" />
        <span>PRODUCTION</span>
      </div>
    </div>
  );
};

interface TopNavProps {
  onToggleSidebar: () => void;
  onOpenCommandPalette: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleSidebar, onOpenCommandPalette }) => {
  const activeWorkspaceId = useWorkspaceStore((state: any) => state.activeWorkspaceId);
  const { unreadCount, setNotifications } = useNotificationsStore();
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    notificationsApi.getNotifications(activeWorkspaceId).then(data => {
      const mapped = data.map((n: any) => ({
        ...formatNotification(n, activeWorkspaceId),
        read: n.is_read
      }));
      setNotifications(mapped);
    }).catch(console.error);
  }, [activeWorkspaceId, setNotifications]);

  return (
    <header className="h-13 bg-bg-base border-b border-border-subtle sticky top-0 z-30 flex items-center justify-between px-4 shrink-0 select-none">
      <div className="flex items-center flex-1 min-w-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleSidebar}
          className="md:hidden mr-2 -ml-1 text-text-secondary hover:text-text-primary"
        >
          <Menu className="w-4 h-4" />
        </Button>
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-2.5">
        {/* Global Search / Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center justify-between w-56 px-2.5 py-1.5 border border-border-subtle rounded-md bg-bg-surface hover:bg-bg-surface-hover hover:border-border-normal text-xs text-text-tertiary transition-colors group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-text-tertiary group-hover:text-text-secondary" />
            <span>Search or jump to...</span>
          </div>
          <kbd className="inline-flex items-center rounded border border-border-normal bg-bg-base px-1.5 py-0.2 font-mono text-[10px] text-text-muted">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setPopoverOpen(!popoverOpen)}
            className="relative text-text-secondary hover:text-text-primary"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 block h-1.5 w-1.5 rounded-full bg-risk-critical" />
            )}
          </Button>
          <NotificationsPopover isOpen={popoverOpen} onClose={() => setPopoverOpen(false)} />
        </div>
      </div>
    </header>
  );
};

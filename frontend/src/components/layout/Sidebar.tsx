import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, GitFork, Shield, ScanLine, 
  Users, BarChart3, Settings, LogOut, Activity, ActivitySquare, Terminal, Cpu, ChevronsLeft, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { useWorkspaces } from '@/features/workspace/hooks/useWorkspace';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { useAuthStore } from '@/features/auth/stores/authStore';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: 'danger' | 'default';
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, className }) => {
  const { workspaceId: paramWorkspaceId } = useParams();
  const { activeWorkspaceId } = useWorkspaceStore();
  const workspaceId = paramWorkspaceId || activeWorkspaceId || 'default';
  
  const { data: workspaces } = useWorkspaces();
  const { mutate: logout } = useLogout();
  const user = useAuthStore((state) => state.user);
  const activeWorkspace = workspaces?.find(w => w.id === workspaceId);
  const workspaceName = activeWorkspace ? activeWorkspace.name : "hashiraCoder's Org";

  const navGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', path: `/w/${workspaceId}`, icon: LayoutDashboard },
        { name: 'Activity Log', path: `/w/${workspaceId}/activity`, icon: Activity, badge: 'Live' },
      ],
    },
    {
      title: 'Security',
      items: [
        { name: 'Findings', path: `/w/${workspaceId}/findings`, icon: Shield },
        { name: 'Scans History', path: `/w/${workspaceId}/scans`, icon: ScanLine },
        { name: 'Repositories', path: `/w/${workspaceId}/repositories`, icon: GitFork },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { name: 'Risk Analytics', path: `/w/${workspaceId}/analytics`, icon: BarChart3 },
        { name: 'Developer Metrics', path: `/w/${workspaceId}/developers`, icon: Users },
      ],
    },
    {
      title: 'Developer',
      items: [
        { name: 'CLI Guide', path: `/w/${workspaceId}/cli`, icon: Terminal, badge: 'v1.0' },
      ],
    },
    {
      title: 'System',
      items: [
        { name: 'Platform Health', path: `/platform-health`, icon: ActivitySquare },
        ...(user?.role === 'SUPER_ADMIN' ? [{ name: 'Engine Control Center', path: '/admin/engine', icon: Cpu }] : []),
        { name: 'Integrations & API', path: `/w/${workspaceId}/settings`, icon: Settings },
        { name: 'About Oculus', path: `/w/${workspaceId}/about`, icon: Info },
      ],
    },
  ];

  return (
    <aside 
      className={cn(
        "flex flex-col bg-bg-base border-r border-border-subtle transition-all duration-200 z-40 select-none",
        collapsed ? "w-14 min-w-[56px]" : "w-60 min-w-[240px]",
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-13 px-3.5 flex items-center justify-between border-b border-border-subtle shrink-0">
        <div 
          onClick={collapsed ? onToggle : undefined}
          className={cn("flex items-center gap-2.5 min-w-0", collapsed && "cursor-pointer")}
          title={collapsed ? "Expand sidebar" : undefined}
        >
          <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.35)] shrink-0">
            <Shield className="w-3.5 h-3.5 text-white stroke-[2.5]" />
          </div>
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-xs tracking-wider uppercase text-text-primary">Oculus</span>
              <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-primary-alpha text-primary-base border border-primary-base/25 tracking-wider">v2.4</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={onToggle}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-surface-hover transition-colors"
            title="Collapse sidebar"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Workspace Indicator */}
      <div className="px-2 pt-2 pb-1 shrink-0">
        <div 
          className="w-full flex items-center p-2 rounded-md bg-bg-surface border border-border-subtle text-left"
          title={`Workspace: ${workspaceName}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-4.5 h-4.5 rounded bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
              {workspaceName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="text-xs font-semibold text-text-primary truncate block">
                  {workspaceName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-0.5">
            {!collapsed && (
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {group.title}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === `/w/${workspaceId}`}
                className={({ isActive }) => cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors relative group",
                  isActive 
                    ? "bg-bg-surface text-text-primary font-semibold" 
                    : "text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary"
                )}
                title={collapsed ? item.name : undefined}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1 bottom-1 w-[2.5px] bg-primary-base rounded-r" />
                    )}
                    <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary-base" : "text-text-tertiary group-hover:text-text-primary")} />
                    {!collapsed && (
                      <span className="flex-1 truncate">{item.name}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className={cn(
                        "text-[9.5px] font-semibold px-1.5 py-0.2 rounded-full border",
                        item.badgeVariant === 'danger'
                          ? "bg-risk-critical-alpha text-risk-critical border-risk-critical-border"
                          : "bg-bg-surface-alt text-text-tertiary border-border-subtle"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User Section Footer */}
      <div className="p-3 border-t border-border-subtle bg-bg-base shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6.5 h-6.5 rounded-full bg-border-strong border border-border-normal flex items-center justify-center font-semibold text-[10.5px] text-text-primary shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">{user?.name || 'Alex DevSec'}</p>
              <p className="text-[10px] text-text-tertiary truncate">{user?.email || 'alex@oculus.security'}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button 
            className="p-1 text-text-tertiary hover:text-risk-critical hover:bg-bg-surface-hover rounded transition-colors"
            title="Logout"
            onClick={() => logout()}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
};

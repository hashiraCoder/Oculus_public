import React, { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { TopNav } from '../components/layout/TopNav';
import { CommandPalette } from '../components/ui/command-palette';

export const DashboardLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { workspaceId = 'default' } = useParams();

  // Handle Cmd+K globally in the layout
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-bg-base text-text-primary overflow-hidden font-sans antialiased relative">
      {/* Mobile overlay */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-bg-root/80 backdrop-blur-sm z-[50] md:hidden" 
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopNav 
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
        
        <main className="flex-1 overflow-auto relative">
          <Outlet />
        </main>
      </div>

      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)}
        workspaceId={workspaceId}
      />
    </div>
  );
};

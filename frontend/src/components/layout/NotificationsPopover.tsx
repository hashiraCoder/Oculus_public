import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { Bell, Check, ShieldAlert, Activity, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ isOpen, onClose }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotificationsStore();
  const activeWorkspaceId = useWorkspaceStore((state: any) => state.activeWorkspaceId);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMarkAll = async () => {
    if (activeWorkspaceId && !isMarkingAll) {
      setIsMarkingAll(true);
      try {
        await markAllAsRead(activeWorkspaceId);
      } finally {
        setIsMarkingAll(false);
      }
    }
  };

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeWorkspaceId && !markingIds.has(id)) {
      setMarkingIds(prev => new Set(prev).add(id));
      try {
        await markAsRead(activeWorkspaceId, id);
      } finally {
        setMarkingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }
  };



  return (
    <div 
      ref={popoverRef} 
      className="absolute top-12 right-0 w-80 max-h-[32rem] bg-bg-surface border border-border-base rounded-xl shadow-popover flex flex-col z-[100] overflow-hidden"
    >
      <div className="p-3.5 border-b border-border-subtle flex items-center justify-between bg-bg-surface">
        <h3 className="font-semibold text-text-primary text-sm flex items-center">
          <Bell className="w-4 h-4 mr-2 text-text-secondary" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary-base text-white text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleMarkAll} 
            disabled={isMarkingAll}
            className="h-8 text-xs text-text-secondary hover:text-text-primary"
          >
            {isMarkingAll ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
            Mark all read
          </Button>
        )}
      </div>
      
      <div className="overflow-y-auto flex-1 p-2 space-y-1 bg-bg-base/50">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-text-tertiary flex flex-col items-center justify-center">
            <Bell className="w-8 h-8 mb-3 opacity-20" />
            <p className="text-sm">No notifications right now.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`p-3 rounded-lg text-sm border transition-all ${!notif.read ? 'bg-bg-surface border-border-subtle shadow-sm' : 'bg-transparent border-transparent opacity-70'}`}
            >
              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0">
                  {notif.severity === 'error' ? (
                    <ShieldAlert className="w-4 h-4 text-risk-critical" />
                  ) : (
                    <Activity className="w-4 h-4 text-primary-base" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <p className={`font-medium truncate ${!notif.read ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-text-tertiary whitespace-nowrap shrink-0 mt-0.5">
                      {formatDistanceToNow(notif.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-text-secondary text-xs mt-1">
                    {notif.message}
                  </div>
                  {notif.actionUrl && notif.actionLabel && (
                    <div className="mt-2">
                      <Link to={notif.actionUrl} className="text-xs font-medium text-primary-base hover:text-primary-hover flex items-center" onClick={() => onClose()}>
                        {notif.actionLabel}
                        <span className="ml-1">→</span>
                      </Link>
                    </div>
                  )}
                </div>
                {!notif.read && (
                  <button 
                    onClick={(e) => handleMarkRead(notif.id, e)}
                    disabled={markingIds.has(notif.id)}
                    className="shrink-0 p-1.5 rounded-md hover:bg-bg-surface-hover text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-50 h-fit"
                    title="Mark as read"
                  >
                    {markingIds.has(notif.id) ? (
                      <Loader2 className="w-3 h-3 animate-spin text-primary-base" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-primary-base block" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

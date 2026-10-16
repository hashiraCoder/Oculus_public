import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCircle, XCircle, AlertTriangle, Info, CheckCheck } from 'lucide-react';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationsStore();
  const workspaceId = useWorkspaceStore((state: any) => state.activeWorkspaceId);

  const getIcon = (type: string, severity: string) => {
    if (type.includes('Complete')) return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (type.includes('Failed')) return <XCircle className="w-4 h-4 text-rose-400" />;
    if (severity === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    if (severity === 'error') return <XCircle className="w-4 h-4 text-rose-400" />;
    return <Info className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5 animate-fade-in text-text-primary">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary">Security Alerts & Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-risk-critical text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <Button 
          variant="outline"
          size="sm"
          onClick={() => workspaceId && markAllAsRead(workspaceId)}
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Mark All Read</span>
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
            <Bell className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No pending notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              onClick={() => workspaceId && markAsRead(workspaceId, notification.id)}
              className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                !notification.read ? 'bg-bg-surface-hover/70 border-border-normal' : 'bg-bg-surface border-border-subtle'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {getIcon(notification.type, notification.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-xs font-semibold ${!notification.read ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {notification.title}
                  </h3>
                  <span className="text-[10px] text-text-tertiary font-mono whitespace-nowrap">
                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1">{notification.message}</p>
                {notification.actionUrl && notification.actionLabel && (
                  <div className="mt-2">
                    <a href={notification.actionUrl} className="text-xs font-semibold text-primary-base hover:underline inline-flex items-center gap-1">
                      <span>{notification.actionLabel}</span>
                      <span>&rarr;</span>
                    </a>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

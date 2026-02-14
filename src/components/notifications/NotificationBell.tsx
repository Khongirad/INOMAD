'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  icon?: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silently fail
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleOpen = () => {
    setOpen(!open);
    if (!open) fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await fetch(`/api/notifications/${notification.id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    setOpen(false);
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      ORG_INVITATION: '📨',
      ORG_ROLE_CHANGED: '🔄',
      ORG_MEMBER_JOINED: '👋',
      ORG_MEMBER_LEFT: '👋',
      ORG_ELECTION_STARTED: '🗳️',
      ORG_ELECTION_RESULT: '📢',
      TASK_ASSIGNED: '📋',
      TASK_COMPLETED: '✅',
      QUEST_AVAILABLE: '⚔️',
      QUEST_COMPLETED: '🏆',
      PROPOSAL_CREATED: '📝',
      VOTE_REQUIRED: '🗳️',
      PROPOSAL_PASSED: '✅',
      PROPOSAL_REJECTED: '❌',
      LAW_ENACTED: '📜',
      CASE_FILED: '⚖️',
      PAYMENT_RECEIVED: '💰',
      UBI_DISTRIBUTED: '🪙',
      DOCUMENT_REQUIRES_SIGNATURE: '✍️',
      DOCUMENT_SIGNED: '📄',
      SYSTEM_ANNOUNCEMENT: '📢',
    };
    return iconMap[type] || '🔔';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'сейчас';
    if (minutes < 60) return `${minutes} мин.`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч.`;
    const days = Math.floor(hours / 24);
    return `${days} д.`;
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-popover border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 flex justify-between items-center border-b">
            <h3 className="font-semibold text-sm">🔔 Уведомления</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={handleMarkAllRead}>
                <CheckCheck className="h-3.5 w-3.5" />
                Прочитать все
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">Нет уведомлений</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0 ${
                    !n.isRead ? 'bg-accent/50 border-l-[3px] border-l-primary' : ''
                  }`}
                >
                  <div className="flex gap-3 w-full">
                    <span className="text-lg mt-0.5 shrink-0">
                      {n.icon || getNotificationIcon(n.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${!n.isRead ? 'font-semibold' : ''}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {n.body}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {formatTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

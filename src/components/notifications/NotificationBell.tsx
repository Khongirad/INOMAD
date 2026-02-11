'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  Chip,
} from '@mui/material';
import { Bell, Check, CheckCheck } from 'lucide-react';
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
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
    // Mark as read
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

    handleClose();

    // Navigate to link
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
    <>
      <IconButton
        onClick={handleOpen}
        sx={{ color: 'inherit' }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <Bell size={22} />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 480,
            borderRadius: 2,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontSize={16}>
            🔔 Уведомления
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<CheckCheck size={16} />}
              onClick={handleMarkAllRead}
            >
              Прочитать все
            </Button>
          )}
        </Box>
        <Divider />

        {/* List */}
        {notifications.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Нет уведомлений
            </Typography>
          </Box>
        ) : (
          notifications.map((n) => (
            <MenuItem
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              sx={{
                py: 1.5,
                px: 2,
                bgcolor: n.isRead ? 'transparent' : 'action.hover',
                borderLeft: n.isRead ? 'none' : '3px solid',
                borderLeftColor: 'primary.main',
                whiteSpace: 'normal',
              }}
            >
              <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                <Typography variant="h6" sx={{ mt: 0.3 }}>
                  {n.icon || getNotificationIcon(n.type)}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={n.isRead ? 'normal' : 'bold'} noWrap>
                    {n.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {n.body}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                    {formatTime(n.createdAt)}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}

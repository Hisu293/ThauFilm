import { useEffect, useState } from 'react';
import { Badge, Box, Divider, IconButton, ListItemButton, Menu, Stack, Typography } from '@mui/material';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import CircleIcon from '@mui/icons-material/Circle';
import { useNavigate } from 'react-router-dom';
import { connectRealtime } from '../services/realtimeService';
import notificationService from '../services/notificationService';

export default function NotificationBell({ onNavigate }) {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    notificationService.recent().then((items) => {
      if (!active) return;
      const recent = Array.isArray(items) ? items : [];
      setNotifications(recent);
      setUnread(recent.filter((item) => !item.readAt).length);
    }).catch(() => undefined);
    const disconnect = connectRealtime({
      onStatus: (status) => setConnected(status === 'connected'),
      onEvent: (event) => {
        if (event.type !== 'NOTIFICATION') return;
        setNotifications((current) => [event.data, ...current.filter((item) => item.id !== event.data.id)].slice(0, 30));
        if (!event.data.readAt) setUnread((current) => current + 1);
      },
    });
    return () => { active = false; disconnect(); };
  }, []);

  const open = (event) => {
    setAnchor(event.currentTarget);
    if (unread > 0) {
      const readAt = new Date().toISOString();
      setNotifications((items) => items.map((item) => item.readAt ? item : { ...item, readAt }));
      setUnread(0);
      notificationService.markAllRead().catch(() => undefined);
    }
  };
  const select = (item) => {
    setAnchor(null);
    if (!item.readAt) notificationService.markRead(item.id).catch(() => undefined);
    if (item.link) {
      if (onNavigate) onNavigate(item.link, item);
      else navigate(item.link);
    }
  };

  return <>
    <IconButton
      color="inherit"
      onClick={open}
      aria-label="Thông báo realtime"
      sx={{
        width: 42,
        height: 42,
        flex: '0 0 42px',
        color: 'text.secondary',
        bgcolor: 'action.hover',
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          color: 'text.primary',
          bgcolor: 'action.selected',
        },
      }}
    >
      <Badge badgeContent={unread} color="error"><NotificationsNoneRoundedIcon /></Badge>
    </IconButton>
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { width: 360, maxWidth: '92vw', maxHeight: 480 } } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" px={2} py={1}>
        <Typography fontWeight={800}>Thông báo</Typography>
        <Stack direction="row" spacing={.7} alignItems="center"><CircleIcon sx={{ fontSize: 9, color: connected ? 'success.main' : 'text.disabled' }} /><Typography variant="caption" color="text.secondary">{connected ? 'Realtime' : 'Đang kết nối'}</Typography></Stack>
      </Stack>
      <Divider />
      {notifications.length === 0 ? <Box px={2} py={4} textAlign="center"><Typography color="text.secondary">Chưa có thông báo mới.</Typography></Box> : notifications.map((item) => <ListItemButton key={item.id} onClick={() => select(item)} sx={{ alignItems: 'flex-start', py: 1.5 }}><Box><Typography fontWeight={700}>{item.title}</Typography><Typography variant="body2" color="text.secondary">{item.message}</Typography><Typography variant="caption" color="text.disabled">{new Date(item.createdAt).toLocaleString('vi-VN')}</Typography></Box></ListItemButton>)}
    </Menu>
  </>;
}

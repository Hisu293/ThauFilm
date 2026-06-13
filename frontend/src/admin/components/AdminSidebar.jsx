import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { ADMIN_NAV_GROUPS } from '../adminNav';

const AdminSidebar = ({ activeView, onViewChange, onNavigate }) => {
  const [openGroups, setOpenGroups] = useState(() =>
    ADMIN_NAV_GROUPS.filter((g) => g.label).reduce((acc, g) => ({ ...acc, [g.id]: g.defaultOpen ?? false }), {})
  );

  const toggleGroup = (id) => setOpenGroups((s) => ({ ...s, [id]: !s[id] }));

  return (
    <Box className="admin-sidebar-inner" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2, py: 2.5, flexShrink: 0 }}>
        <Box component="img" src="/logo-removebg-preview.png" alt="ThauFilm" sx={{ height: 36, width: 'auto', objectFit: 'contain' }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.2 }} noWrap>
            ThauFilm Admin
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            Panel quản trị
          </Typography>
        </Box>
      </Stack>

      <Box className="admin-sidebar-scroll" sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1, pb: 1 }}>
        {ADMIN_NAV_GROUPS.map((group) => {
          if (!group.label) {
            return (
              <List key={group.id} dense disablePadding>
                {group.items.map(({ id, label, icon: Icon }) => (
                  <ListItemButton
                    key={id}
                    className={activeView === id ? 'admin-nav-item active' : 'admin-nav-item'}
                    onClick={() => onViewChange(id)}
                    sx={navItemSx(activeView === id)}
                  >
                    <ListItemIcon sx={navIconSx(activeView === id)}>
                      <Icon sx={{ fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText primary={label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: activeView === id ? 700 : 500 }} />
                  </ListItemButton>
                ))}
              </List>
            );
          }

          const isOpen = openGroups[group.id];
          const hasActive = group.items.some((i) => i.id === activeView);

          return (
            <Box key={group.id} sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => toggleGroup(group.id)}
                className={hasActive ? 'admin-nav-group active-group' : 'admin-nav-group'}
                sx={{
                  borderRadius: 2,
                  py: 0.9,
                  px: 1.5,
                  color: hasActive ? '#fff' : 'rgba(255,255,255,0.55)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                }}
              >
                <ListItemText
                  primary={group.label}
                  primaryTypographyProps={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                />
                {isOpen ? <ExpandLess sx={{ fontSize: 18, opacity: 0.6 }} /> : <ExpandMore sx={{ fontSize: 18, opacity: 0.6 }} />}
              </ListItemButton>
              <Collapse in={isOpen} timeout="auto" unmountOnExit>
                <List dense disablePadding sx={{ pl: 0.5 }}>
                  {group.items.map(({ id, label, icon: Icon }) => (
                    <ListItemButton
                      key={id}
                      className={activeView === id ? 'admin-nav-item active admin-nav-sub' : 'admin-nav-item admin-nav-sub'}
                      onClick={() => onViewChange(id)}
                      sx={{ ...navItemSx(activeView === id), pl: 2 }}
                    >
                      <ListItemIcon sx={{ ...navIconSx(activeView === id), minWidth: 32 }}>
                        <Icon sx={{ fontSize: 18 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={label}
                        primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: activeView === id ? 600 : 400, lineHeight: 1.3 }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ p: 2, flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Button
          component={RouterLink}
          to="/"
          startIcon={<ArrowBackRoundedIcon />}
          fullWidth
          variant="outlined"
          size="small"
          onClick={onNavigate}
          sx={{
            borderColor: 'rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.75)',
            fontSize: '0.8rem',
            '&:hover': { borderColor: '#e50914', bgcolor: 'rgba(229,9,20,0.08)' },
          }}
        >
          Về trang chủ
        </Button>
      </Box>
    </Box>
  );
};

const navItemSx = (active) => ({
  borderRadius: 2,
  mb: 0.25,
  py: 0.85,
  color: active ? '#fff' : 'rgba(255,255,255,0.62)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
});

const navIconSx = (active) => ({
  minWidth: 36,
  color: active ? '#e50914' : 'rgba(255,255,255,0.45)',
});

export default AdminSidebar;

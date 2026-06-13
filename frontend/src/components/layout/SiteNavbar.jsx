import { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import UserMenu, { AuthButtons } from '../UserMenu';
import { useAuth } from '../../context/AuthContext';
import { NAV_LINKS } from '../../theme/cinemaTheme';

const SiteNavbar = () => {
  const { isLoggedIn } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(10, 10, 10, 0.78)',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: 72, gap: 1 }}>
            <Stack
              component={RouterLink}
              to="/"
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mr: 4, textDecoration: 'none' }}
            >
              <Box component="img" src="/logo-removebg-preview.png" alt="ThauFilm" sx={{ height: 36, width: 'auto', objectFit: 'contain' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', letterSpacing: '0.01em' }}>
                ThauFilm
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.5} sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              {NAV_LINKS.map((link) => (
                <Button
                  key={link.label}
                  component={RouterLink}
                  to={link.to}
                  color="inherit"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    color: isActive(link.to) ? '#fff' : 'rgba(255,255,255,0.8)',
                    borderRadius: '8px',
                    position: 'relative',
                    '&::after': isActive(link.to)
                      ? {
                          content: '""',
                          position: 'absolute',
                          left: 12,
                          right: 12,
                          bottom: 6,
                          height: 2,
                          borderRadius: 2,
                          backgroundColor: '#e50914',
                        }
                      : {},
                    '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Stack>

            <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />
            <Stack direction="row" spacing={1.5} alignItems="center">
              {isLoggedIn && <UserMenu />}
              <AuthButtons />
            </Stack>

            <IconButton
              color="inherit"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { md: 'none' }, ml: 1, color: '#fff' }}
            >
              <MenuRoundedIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { md: 'none' }, '& .MuiDrawer-paper': { width: 240 } }}
      >
        <Box onClick={() => setMobileOpen(false)} sx={{ backgroundColor: '#0f0f0f', height: '100%', pt: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, mb: 2 }}>
            <Box component="img" src="/logo-removebg-preview.png" alt="ThauFilm" sx={{ height: 28, width: 'auto' }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff' }}>
              ThauFilm
            </Typography>
          </Stack>
          <List>
            {NAV_LINKS.map((link) => (
              <ListItem key={link.label} disablePadding>
                <ListItemButton component={RouterLink} to={link.to} sx={{ '&:hover': { backgroundColor: 'rgba(229,9,20,0.1)' } }}>
                  <ListItemText
                    primary={link.label}
                    primaryTypographyProps={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default SiteNavbar;

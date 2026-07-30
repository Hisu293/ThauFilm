import { useEffect, useState } from 'react';
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
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import UserMenu, { AuthButtons } from '../UserMenu';
import { useAuth } from '../../context/AuthContext';
import { NAV_LINKS } from '../../theme/theme';
import NotificationBell from '../NotificationBell';
import MovieSearch from './MovieSearch';

const SiteNavbar = () => {
  const { isLoggedIn } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [communityAnchor, setCommunityAnchor] = useState(null);
  const [scrolled, setScrolled] = useState(() => window.scrollY > 24);

  const isActive = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to));
  const solidHeader = pathname !== '/' || scrolled;
  const primaryLinks = NAV_LINKS.slice(0, 4);
  const communityLinks = NAV_LINKS.slice(4);
  const communityActive = communityLinks.some((link) => isActive(link.to));

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: solidHeader ? 'blur(16px)' : 'none',
          borderBottom: solidHeader ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
          backgroundColor: solidHeader ? 'rgba(7,7,9,0.94)' : 'transparent',
          boxShadow: solidHeader ? '0 8px 28px rgba(0,0,0,.24)' : 'none',
          transition: 'background-color .28s ease, border-color .28s ease, box-shadow .28s ease, backdrop-filter .28s ease',
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
              sx={{ mr: { md: 2, xl: 3 }, textDecoration: 'none', flexShrink: 0 }}
            >
              <Box component="img" src="/logo-removebg-preview.png" alt="ThauFilm" sx={{ height: 36, width: 'auto', objectFit: 'contain' }} />
              <Typography variant="h6" noWrap sx={{ fontWeight: 800, color: '#fff', letterSpacing: '0.01em' }}>
                ThauFilm
              </Typography>
            </Stack>

            <Box sx={{ display: { xs: 'none', lg: 'block' }, mr: { lg: 1.5, xl: 2.5 } }}>
              <MovieSearch />
            </Box>

            <Stack
              direction="row"
              spacing={0.25}
              justifyContent="center"
              sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, minWidth: 0 }}
            >
              {primaryLinks.map((link) => (
                <Button
                  key={link.label}
                  component={RouterLink}
                  to={link.to}
                  color="inherit"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: { md: '.78rem', xl: '.88rem' },
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    minWidth: 0,
                    px: { md: 0.75, xl: 1.15 },
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
                          backgroundColor: 'primary.main',
                        }
                      : {},
                    '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' },
                  }}
                >
                  {link.label}
                </Button>
              ))}
              <Button
                color="inherit"
                endIcon={<KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} />}
                onClick={(event) => setCommunityAnchor(event.currentTarget)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: { md: '.78rem', xl: '.88rem' },
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  px: { md: 0.75, xl: 1.15 },
                  color: communityActive ? '#fff' : 'rgba(255,255,255,0.8)',
                  borderRadius: '8px',
                  position: 'relative',
                  '&::after': communityActive
                    ? {
                        content: '""',
                        position: 'absolute',
                        left: 12,
                        right: 12,
                        bottom: 6,
                        height: 2,
                        borderRadius: 2,
                        backgroundColor: 'primary.main',
                      }
                    : {},
                  '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.07)' },
                }}
              >
                Cộng đồng
              </Button>
            </Stack>

            <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />
            <Stack
              direction="row"
              spacing={{ md: 0.75, xl: 1.25 }}
              alignItems="center"
              sx={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                pl: { md: 1, xl: 2 },
                ml: { md: 0.5, xl: 1 },
                borderLeft: { md: '1px solid rgba(255,255,255,.1)' },
              }}
            >
              {isLoggedIn && <NotificationBell />}
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

      <Menu
        anchorEl={communityAnchor}
        open={Boolean(communityAnchor)}
        onClose={() => setCommunityAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 220,
              borderRadius: 2,
              bgcolor: 'rgba(15,15,18,.98)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,.1)',
              boxShadow: '0 18px 50px rgba(0,0,0,.45)',
            },
          },
        }}
      >
        {communityLinks.map((link) => (
          <MenuItem
            key={link.to}
            component={RouterLink}
            to={link.to}
            selected={isActive(link.to)}
            onClick={() => setCommunityAnchor(null)}
            sx={{ py: 1.15, fontSize: '.9rem', fontWeight: 650 }}
          >
            {link.label}
          </MenuItem>
        ))}
      </Menu>

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
          <Box sx={{ px: 2, mb: 1.5 }} onClick={(event) => event.stopPropagation()}>
            <MovieSearch onNavigate={() => setMobileOpen(false)} />
          </Box>
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

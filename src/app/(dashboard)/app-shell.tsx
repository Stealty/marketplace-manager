'use client';

import * as React from 'react';
import { AppBar, Box, Drawer, IconButton, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { NavList } from './nav-list';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';

const SIDEBAR_WIDTH = 240;

export function AppShell({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar>
        <Typography variant="subtitle1" fontFamily="var(--font-heading)" fontWeight={600}>
          Command Center
        </Typography>
      </Toolbar>
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <NavList onNavigate={() => setMobileOpen(false)} />
      </Box>
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', py: 1 }}>
        <LogoutButton />
      </Box>
    </Box>
  );

  return (
    // bgcolor/color set explicitly: CssBaseline's own body background/text
    // color don't refresh on a client-side theme switch (only on first SSR
    // paint), so anything here relying on inherited defaults would show a
    // stale, low-contrast color after toggling.
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      {isDesktop ? (
        <Box
          component="nav"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {sidebarContent}
        </Box>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH } }}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <AppBar position="static" color="transparent">
          <Toolbar sx={{ justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!isDesktop && (
                <IconButton
                  edge="start"
                  aria-label="Abrir menu"
                  onClick={() => setMobileOpen(true)}
                >
                  <MenuIcon />
                </IconButton>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="body2" color="text.secondary" noWrap>
                {userEmail}
              </Typography>
              <ThemeToggle />
            </Box>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ p: { xs: 2, sm: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

'use client';

import * as React from 'react';
import { AppBar, Box, Drawer, IconButton, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { NavList } from './nav-list';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ThemePresetToggle } from '@/components/ThemePresetToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { ExpiredConnectionsBanner, type ExpiredConnectionInfo } from './expired-connections-banner';

const SIDEBAR_WIDTH = 240;

export function AppShell({
  userEmail,
  expiredConnections,
  showAdmin,
  children,
}: {
  userEmail: string | null;
  expiredConnections: ExpiredConnectionInfo[];
  showAdmin: boolean;
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
        <NavList onNavigate={() => setMobileOpen(false)} showAdmin={showAdmin} />
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
            position: 'fixed',
            top: 0,
            left: 0,
            width: SIDEBAR_WIDTH,
            height: '100dvh',
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            zIndex: (theme) => theme.zIndex.appBar + 1,
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
          sx={{
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              height: 'auto',
              maxHeight: '100dvh',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0, ...(isDesktop && { ml: `${SIDEBAR_WIDTH}px` }) }}>
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
              <ThemePresetToggle />
              <ThemeToggle />
            </Box>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ p: { xs: 2, sm: 3 } }}>
          <ExpiredConnectionsBanner connections={expiredConnections} />
          {children}
        </Box>
      </Box>
    </Box>
  );
}

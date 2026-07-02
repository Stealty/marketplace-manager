'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { createClient } from '@/lib/supabase/browser';

export function LogoutButton() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [loading, setLoading] = React.useState(false);

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <ListItemButton onClick={handleLogout} disabled={loading} sx={{ borderRadius: 1, mx: 1 }}>
      <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
        <LogoutIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary={loading ? 'Saindo…' : 'Sair'} />
    </ListItemButton>
  );
}

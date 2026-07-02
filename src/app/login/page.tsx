'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Paper, TextField, Typography, Alert } from '@mui/material';
import { createClient } from '@/lib/supabase/browser';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        color: 'text.primary',
        px: 2,
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggle />
      </Box>

      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 4, width: '100%', maxWidth: 360 }}>
        <Typography
          variant="caption"
          color="primary.main"
          fontWeight={700}
          letterSpacing="0.12em"
          sx={{ textTransform: 'uppercase' }}
        >
          Command Center
        </Typography>
        <Typography variant="h5" mb={3} mt={0.5}>
          Marketplace Manager
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          required
        />
        <Button fullWidth type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 2 }}>
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
      </Paper>
    </Box>
  );
}

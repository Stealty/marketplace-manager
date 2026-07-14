'use client';

import * as React from 'react';
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { DetailDrawer } from '@/components/DetailDrawer';
import type { MembershipRole } from '@/types/database';
import { inviteMember } from './actions';

const ROLE_LABEL: Record<MembershipRole, string> = {
  admin: 'Admin',
  atendente: 'Atendente',
  financeiro: 'Financeiro',
  super_admin: 'Super-admin',
};

export function InviteMemberButton({
  orgId,
  roles,
  onInvited,
}: {
  orgId: string;
  roles: MembershipRole[];
  onInvited: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<MembershipRole>(roles[0]);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleClose() {
    setOpen(false);
    setEmail('');
    setRole(roles[0]);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await inviteMember(orgId, email, role);
      if (result.error) {
        setError(result.error);
        return;
      }
      handleClose();
      onInvited();
    });
  }

  return (
    <>
      <Button size="small" startIcon={<PersonAddOutlinedIcon />} onClick={() => setOpen(true)}>
        Convidar membro
      </Button>

      <DetailDrawer open={open} onClose={handleClose} title="Convidar membro">
        <Stack component="form" onSubmit={handleSubmit} spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            fullWidth
          />
          <TextField
            select
            label="Função"
            value={role}
            onChange={(e) => setRole(e.target.value as MembershipRole)}
            fullWidth
          >
            {roles.map((r) => (
              <MenuItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </MenuItem>
            ))}
          </TextField>
          <Button type="submit" variant="contained" disabled={isPending || !email.trim()}>
            {isPending ? 'Convidando…' : 'Enviar convite'}
          </Button>
        </Stack>
      </DetailDrawer>
    </>
  );
}

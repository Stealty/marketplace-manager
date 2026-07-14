'use client';

import * as React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { DataList, type DataListColumn } from '@/components/DataList';
import type { MembershipRole, Organization } from '@/types/database';
import { getOrgMembers, removeMember, renameOrganization, updateMemberRole } from './actions';
import type { OrgMember } from '@/services/adminService';
import { InviteMemberButton } from './invite-member-button';

const ROLE_LABEL: Record<MembershipRole, string> = {
  admin: 'Admin',
  atendente: 'Atendente',
  financeiro: 'Financeiro',
  super_admin: 'Super-admin',
};

function selectableRoles(isSuperAdmin: boolean): MembershipRole[] {
  const base: MembershipRole[] = ['admin', 'atendente', 'financeiro'];
  return isSuperAdmin ? [...base, 'super_admin'] : base;
}

export function OrgPanel({
  org,
  isSuperAdmin,
  currentUserId,
}: {
  org: Organization;
  isSuperAdmin: boolean;
  currentUserId: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [members, setMembers] = React.useState<OrgMember[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isLoading, startLoading] = React.useTransition();

  const loadMembers = React.useCallback(() => {
    startLoading(async () => {
      const result = await getOrgMembers(org.id);
      if (result.error) {
        setLoadError(result.error);
        return;
      }
      setLoadError(null);
      setMembers(result.members ?? []);
    });
  }, [org.id]);

  function handleExpand(_event: React.SyntheticEvent, isExpanded: boolean) {
    setExpanded(isExpanded);
    if (isExpanded && members === null) {
      loadMembers();
    }
  }

  const columns: DataListColumn<OrgMember>[] = [
    {
      id: 'email',
      label: 'E-mail',
      hideable: false,
      render: (row) => row.email ?? '—',
    },
    {
      id: 'role',
      label: 'Função',
      hideable: false,
      render: (row) => (
        <MemberRoleSelect
          orgId={org.id}
          member={row}
          roles={selectableRoles(isSuperAdmin)}
          isSelf={row.user_id === currentUserId}
          onChanged={loadMembers}
        />
      ),
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      hideable: false,
      render: (row) => (
        <RemoveMemberButton
          orgId={org.id}
          member={row}
          isSelf={row.user_id === currentUserId}
          onRemoved={loadMembers}
        />
      ),
    },
  ];

  return (
    <Accordion expanded={expanded} onChange={handleExpand} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <OrgName org={org} />
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="flex-end">
            <InviteMemberButton orgId={org.id} roles={selectableRoles(isSuperAdmin)} onInvited={loadMembers} />
          </Stack>

          {loadError && <Alert severity="error">{loadError}</Alert>}

          <DataList
            columns={columns}
            rows={members ?? []}
            getRowId={(row) => row.id}
            emptyMessage={isLoading ? 'Carregando membros…' : 'Nenhum membro nesta organização.'}
            storageKey={`admin-members-${org.id}`}
          />
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function OrgName({ org }: { org: Organization }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(org.name);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function stopPropagation(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  function handleSave() {
    if (!draft.trim()) return;
    startTransition(async () => {
      const result = await renameOrganization(org.id, draft.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" onClick={stopPropagation} sx={{ width: '100%' }}>
        <TextField
          size="small"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={isPending}
          autoFocus
        />
        <IconButton size="small" color="primary" onClick={handleSave} aria-label="Salvar">
          <CheckIcon fontSize="inherit" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => {
            setDraft(org.name);
            setError(null);
            setEditing(false);
          }}
          aria-label="Cancelar"
        >
          <CloseIcon fontSize="inherit" />
        </IconButton>
        {error && (
          <Typography variant="caption" color="error.main">
            {error}
          </Typography>
        )}
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="subtitle1" fontWeight={600}>
        {org.name}
      </Typography>
      <IconButton
        size="small"
        onClick={(e) => {
          stopPropagation(e);
          setEditing(true);
        }}
        aria-label="Renomear organização"
      >
        <EditIcon fontSize="inherit" />
      </IconButton>
    </Stack>
  );
}

function MemberRoleSelect({
  orgId,
  member,
  roles,
  isSelf,
  onChanged,
}: {
  orgId: string;
  member: OrgMember;
  roles: MembershipRole[];
  isSelf: boolean;
  onChanged: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const options = roles.includes(member.role) ? roles : [...roles, member.role];

  function handleChange(role: MembershipRole) {
    startTransition(async () => {
      const result = await updateMemberRole(orgId, member.user_id, role);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      onChanged();
    });
  }

  // Bloqueado também na API (0018_prevent_self_role_change.sql) — aqui só
  // evita a viagem ao servidor pra descobrir que não é permitido.
  const select = (
    <Select
      size="small"
      value={member.role}
      disabled={isPending || isSelf}
      onChange={(e) => handleChange(e.target.value as MembershipRole)}
    >
      {options.map((role) => (
        <MenuItem key={role} value={role}>
          {ROLE_LABEL[role]}
        </MenuItem>
      ))}
    </Select>
  );

  return (
    <Stack spacing={0.5}>
      {isSelf ? (
        <Tooltip title="Você não pode alterar a sua própria função.">
          <span>{select}</span>
        </Tooltip>
      ) : (
        select
      )}
      {error && (
        <Typography variant="caption" color="error.main">
          {error}
        </Typography>
      )}
    </Stack>
  );
}

function RemoveMemberButton({
  orgId,
  member,
  isSelf,
  onRemoved,
}: {
  orgId: string;
  member: OrgMember;
  isSelf: boolean;
  onRemoved: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleRemove() {
    if (!window.confirm(`Remover ${member.email ?? 'este membro'} da organização?`)) return;
    startTransition(async () => {
      const result = await removeMember(orgId, member.user_id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      onRemoved();
    });
  }

  const button = (
    <IconButton
      size="small"
      color="error"
      disabled={isPending || isSelf}
      onClick={handleRemove}
      aria-label="Remover membro"
    >
      <DeleteOutlineIcon fontSize="small" />
    </IconButton>
  );

  return (
    <Stack alignItems="flex-end" spacing={0.5}>
      {isSelf ? (
        <Tooltip title="Você não pode remover a si mesmo.">
          <span>{button}</span>
        </Tooltip>
      ) : (
        button
      )}
      {error && (
        <Typography variant="caption" color="error.main">
          {error}
        </Typography>
      )}
    </Stack>
  );
}

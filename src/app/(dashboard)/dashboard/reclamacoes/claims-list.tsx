'use client';

import * as React from 'react';
import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DataList, type DataListColumn } from '@/components/DataList';
import { StatusTag } from '@/components/StatusTag';
import { MARKETPLACE_LABELS } from '@/lib/marketplace';
import type { ClaimWithRelations } from '@/services/claimsService';
import { ClaimDetailDrawer } from './claim-detail-drawer';

type Filter = 'open' | 'closed' | 'all';

const columns: DataListColumn<ClaimWithRelations>[] = [
  {
    id: 'type',
    label: 'Tipo',
    sortable: true,
    sortValue: (row) => row.type,
    render: (row) => row.type ?? '—',
  },
  {
    id: 'reason',
    label: 'Motivo',
    render: (row) => row.reason ?? '—',
  },
  {
    id: 'status',
    label: 'Status',
    sortable: true,
    sortValue: (row) => row.status,
    render: (row) =>
      row.status ? (
        <StatusTag
          label={`${row.stage ? `${row.stage} · ` : ''}${row.status}`}
          tone={row.status === 'closed' ? 'neutral' : 'warning'}
        />
      ) : (
        '—'
      ),
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    sortable: true,
    sortValue: (row) => row.marketplace_connections?.marketplace ?? null,
    render: (row) =>
      row.marketplace_connections ? MARKETPLACE_LABELS[row.marketplace_connections.marketplace] : '—',
  },
  {
    id: 'order',
    label: 'Pedido',
    hideable: false,
    render: (row) => row.orders?.external_order_id ?? row.external_order_id ?? '—',
  },
  {
    id: 'updated',
    label: 'Atualizado',
    sortable: true,
    sortValue: (row) => row.last_updated,
    render: (row) =>
      row.last_updated
        ? formatDistanceToNow(new Date(row.last_updated), { addSuffix: true, locale: ptBR })
        : '—',
  },
];

export function ClaimsList({ claims }: { claims: ClaimWithRelations[] }) {
  const [filter, setFilter] = React.useState<Filter>('open');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = claims.find((claim) => claim.id === selectedId) ?? null;

  const filtered = claims.filter((claim) => {
    if (filter === 'all') return true;
    if (filter === 'open') return claim.status !== 'closed';
    return claim.status === 'closed';
  });

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ p: 2, pt: 0 }} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField
          select
          label="Status"
          size="small"
          value={filter}
          onChange={(event) => setFilter(event.target.value as Filter)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="open">Abertas</MenuItem>
          <MenuItem value="closed">Fechadas</MenuItem>
          <MenuItem value="all">Todas</MenuItem>
        </TextField>
        {claims.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {filtered.length} de {claims.length} reclamações
          </Typography>
        )}
      </Stack>

      <DataList
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.id}
        onRowClick={(row) => setSelectedId(row.id)}
        storageKey="reclamacoes"
        emptyMessage={
          claims.length === 0
            ? 'Nenhuma reclamação ou devolução sincronizada ainda.'
            : 'Nenhuma reclamação encontrada para o filtro selecionado.'
        }
      />

      <ClaimDetailDrawer claim={selected} onClose={() => setSelectedId(null)} />
    </Stack>
  );
}

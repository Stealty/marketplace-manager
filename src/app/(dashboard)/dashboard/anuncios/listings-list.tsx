'use client';

import * as React from 'react';
import { LinearProgress, Stack, Tab, Tabs, Typography } from '@mui/material';
import { DataList, type DataListColumn } from '@/components/DataList';
import { StatusTag } from '@/components/StatusTag';
import { StoreTag, storeSortValue } from '@/components/StoreTag';
import { MARKETPLACE_LABELS } from '@/lib/marketplace';
import { currency } from '@/lib/format';
import type { ProductListingWithRelations } from '@/services/listingsService';
import { ListingDetailDrawer } from './listing-detail-drawer';

function qualityColor(score: number | null): 'success' | 'warning' | 'error' | 'inherit' {
  if (score === null) return 'inherit';
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
}

const columns: DataListColumn<ProductListingWithRelations>[] = [
  {
    id: 'title',
    label: 'Título',
    sortable: true,
    hideable: false,
    sortValue: (row) => row.title ?? row.products?.title ?? null,
    render: (row) => (
      <Typography variant="body2" fontWeight={600}>
        {row.title ?? row.products?.title ?? 'Anúncio sem título'}
      </Typography>
    ),
  },
  {
    id: 'sku',
    label: 'SKU',
    sortable: true,
    sortValue: (row) => row.products?.sku ?? null,
    render: (row) => row.products?.sku ?? '—',
  },
  {
    id: 'loja',
    label: 'Loja',
    sortable: true,
    sortValue: (row) => storeSortValue(row.marketplace_connections),
    render: (row) => <StoreTag connection={row.marketplace_connections} />,
  },
  {
    id: 'price',
    label: 'Preço',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.price,
    render: (row) => (row.price !== null ? currency.format(row.price) : '—'),
  },
  {
    id: 'status',
    label: 'Status',
    sortable: true,
    sortValue: (row) => row.status,
    render: (row) => (row.status ? <StatusTag label={row.status} tone={row.status === 'active' ? 'success' : 'warning'} /> : '—'),
  },
  {
    id: 'quality_score',
    label: 'Qualidade',
    sortable: true,
    sortValue: (row) => row.quality_score,
    width: 140,
    render: (row) => (
      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          {row.quality_score !== null ? `${row.quality_score}/100` : '—'}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={row.quality_score ?? 0}
          color={qualityColor(row.quality_score)}
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Stack>
    ),
  },
];

export function ListingsList({ listings }: { listings: ProductListingWithRelations[] }) {
  const [marketplace, setMarketplace] = React.useState<string>('all');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = listings.find((listing) => listing.id === selectedId) ?? null;

  const marketplacesPresent = Array.from(
    new Set(listings.map((l) => l.marketplace_connections?.marketplace).filter(Boolean))
  ) as string[];

  const filtered =
    marketplace === 'all'
      ? listings
      : listings.filter((l) => l.marketplace_connections?.marketplace === marketplace);

  return (
    <Stack spacing={2}>
      {marketplacesPresent.length > 1 && (
        <Tabs
          value={marketplace}
          onChange={(_, value) => setMarketplace(value)}
          variant="scrollable"
          scrollButtons={false}
        >
          <Tab value="all" label="Todos" />
          {marketplacesPresent.map((m) => (
            <Tab key={m} value={m} label={MARKETPLACE_LABELS[m as keyof typeof MARKETPLACE_LABELS]} />
          ))}
        </Tabs>
      )}

      <DataList
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.id}
        onRowClick={(row) => setSelectedId(row.id)}
        storageKey="anuncios"
        emptyMessage="Nenhum anúncio sincronizado ainda. Conecte um marketplace em Conexões para importar seu catálogo."
      />

      <ListingDetailDrawer listing={selected} onClose={() => setSelectedId(null)} />
    </Stack>
  );
}

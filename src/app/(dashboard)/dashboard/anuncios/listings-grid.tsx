'use client';

import * as React from 'react';
import { Box, LinearProgress, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { EmptyState } from '@/components/EmptyState';
import { StatusTag } from '@/components/StatusTag';
import { MARKETPLACE_LABELS } from '@/lib/marketplace';
import type { ProductListingWithRelations } from '@/services/listingsService';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function qualityColor(score: number | null): 'success' | 'warning' | 'error' | 'inherit' {
  if (score === null) return 'inherit';
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
}

export function ListingsGrid({ listings }: { listings: ProductListingWithRelations[] }) {
  const [marketplace, setMarketplace] = React.useState<string>('all');

  const marketplacesPresent = Array.from(
    new Set(listings.map((l) => l.marketplace_connections?.marketplace).filter(Boolean))
  ) as string[];

  const filtered =
    marketplace === 'all'
      ? listings
      : listings.filter((l) => l.marketplace_connections?.marketplace === marketplace);

  if (listings.length === 0) {
    return (
      <EmptyState message="Nenhum anúncio sincronizado ainda. Conecte um marketplace em Conexões para importar seu catálogo." />
    );
  }

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

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
        }}
      >
        {filtered.map((listing) => (
          <Paper key={listing.id} sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {listing.marketplace_connections
                    ? MARKETPLACE_LABELS[listing.marketplace_connections.marketplace]
                    : '—'}{' '}
                  · {listing.products?.sku ?? '—'}
                </Typography>
                <Typography variant="subtitle2" fontWeight={600}>
                  {listing.title ?? listing.products?.title ?? 'Anúncio sem título'}
                </Typography>
              </Box>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" color="primary.main">
                  {listing.price !== null ? currency.format(listing.price) : '—'}
                </Typography>
                {listing.status && (
                  <StatusTag
                    label={listing.status}
                    tone={listing.status === 'active' ? 'success' : 'warning'}
                  />
                )}
              </Stack>

              <Box>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Qualidade do anúncio
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {listing.quality_score !== null ? `${listing.quality_score}/100` : '—'}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={listing.quality_score ?? 0}
                  color={qualityColor(listing.quality_score)}
                  sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                />
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
}

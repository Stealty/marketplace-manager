'use client';

import * as React from 'react';
import { Button, CircularProgress, Stack, Typography } from '@mui/material';
import { DetailDrawer } from '@/components/DetailDrawer';
import { ExternalLinkButton } from '@/components/ExternalLinkButton';
import { InlineEditableValue } from '@/components/InlineEditableValue';
import { StatusTag } from '@/components/StatusTag';
import { MARKETPLACE_LABELS } from '@/lib/marketplace';
import type { ProductListingWithRelations } from '@/services/listingsService';
import { toggleListingStatus, updateListingPrice, updateListingStock } from './actions';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function parsePrice(raw: string): number | null {
  const normalized = raw.replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseStock(raw: string): number | null {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

export function ListingDetailDrawer({
  listing,
  onClose,
}: {
  listing: ProductListingWithRelations | null;
  onClose: () => void;
}) {
  const [isTogglePending, startToggleTransition] = React.useTransition();
  const [toggleError, setToggleError] = React.useState<string | null>(null);

  if (!listing) return null;

  const isActive = listing.status === 'active';

  function handleToggleStatus() {
    if (!listing) return;
    setToggleError(null);
    startToggleTransition(async () => {
      const result = await toggleListingStatus(listing.id, isActive ? 'paused' : 'active');
      if (result.error) setToggleError(result.error);
    });
  }

  return (
    <DetailDrawer
      open={Boolean(listing)}
      onClose={onClose}
      title={listing.title ?? listing.products?.title ?? 'Anúncio'}
      subtitle={
        listing.marketplace_connections
          ? `${MARKETPLACE_LABELS[listing.marketplace_connections.marketplace]} · ${listing.products?.sku ?? '—'}`
          : listing.products?.sku
      }
    >
      <Stack spacing={2.5}>
        {listing.permalink && (
          <ExternalLinkButton href={listing.permalink} label="Ver no Mercado Livre" />
        )}

        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Preço
          </Typography>
          <InlineEditableValue
            value={listing.price !== null ? currency.format(listing.price) : '—'}
            parse={parsePrice}
            inputType="number"
            onSave={(raw) => updateListingPrice(listing.id, parsePrice(raw) ?? 0)}
          />
        </Stack>

        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Estoque
          </Typography>
          <InlineEditableValue
            value={listing.stock !== null ? String(listing.stock) : '—'}
            parse={parseStock}
            inputType="number"
            onSave={(raw) => updateListingStock(listing.id, parseStock(raw) ?? 0)}
          />
        </Stack>

        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Status
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {listing.status && (
              <StatusTag label={listing.status} tone={isActive ? 'success' : 'warning'} />
            )}
            <Button
              size="small"
              variant="outlined"
              disabled={isTogglePending}
              startIcon={isTogglePending ? <CircularProgress size={14} /> : undefined}
              onClick={handleToggleStatus}
            >
              {isActive ? 'Pausar' : 'Reativar'}
            </Button>
          </Stack>
          {toggleError && (
            <Typography variant="caption" color="error.main">
              {toggleError}
            </Typography>
          )}
        </Stack>

        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Qualidade do anúncio
          </Typography>
          <Typography variant="body2">
            {listing.quality_score !== null ? `${listing.quality_score}/100` : '—'}
          </Typography>
        </Stack>
      </Stack>
    </DetailDrawer>
  );
}

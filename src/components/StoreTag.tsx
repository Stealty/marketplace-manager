import { Stack, Typography } from '@mui/material';
import { MARKETPLACE_ABBREVIATIONS, MARKETPLACE_COLORS, MARKETPLACE_LABELS } from '@/lib/marketplace';
import type { MarketplaceType } from '@/types/database';

export interface StoreTagConnection {
  marketplace: MarketplaceType;
  label: string;
  seller_nickname?: string | null;
}

/** Selo curto (ML, SHP, TT...) com a cor de marca do marketplace, para identificar a origem sem repetir o nome completo. */
export function MarketplaceBadge({ marketplace }: { marketplace: MarketplaceType }) {
  const { bg, fg } = MARKETPLACE_COLORS[marketplace];
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      title={MARKETPLACE_LABELS[marketplace]}
      sx={{
        width: 26,
        height: 18,
        borderRadius: '4px',
        bgcolor: bg,
        flexShrink: 0,
      }}
    >
      <Typography sx={{ fontSize: '0.6rem', lineHeight: 1, fontWeight: 700, color: fg }}>
        {MARKETPLACE_ABBREVIATIONS[marketplace]}
      </Typography>
    </Stack>
  );
}

/** Nome da loja conectada (não o nome do marketplace), com o selo do marketplace ao lado. */
export function StoreTag({ connection }: { connection: StoreTagConnection | null | undefined }) {
  if (!connection) return <>—</>;
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <MarketplaceBadge marketplace={connection.marketplace} />
      <Typography variant="body2" noWrap>
        {connection.seller_nickname || connection.label}
      </Typography>
    </Stack>
  );
}

export function storeSortValue(connection: StoreTagConnection | null | undefined): string | null {
  return connection ? connection.seller_nickname || connection.label : null;
}

import type { MarketplaceType } from '@/types/database';

export const MARKETPLACE_LABELS: Record<MarketplaceType, string> = {
  mercado_livre: 'Mercado Livre',
  amazon: 'Amazon',
  tiktok_shop: 'TikTok Shop',
  shopee: 'Shopee',
  magalu: 'Magalu',
  americanas: 'Americanas',
  shein: 'Shein',
};

export const MARKETPLACE_TYPES = Object.keys(MARKETPLACE_LABELS) as MarketplaceType[];

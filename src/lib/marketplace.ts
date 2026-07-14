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

// Abreviação curta usada como selo ao lado do nome da loja, para identificar
// de qual marketplace ela é sem repetir o nome completo em toda tela.
export const MARKETPLACE_ABBREVIATIONS: Record<MarketplaceType, string> = {
  mercado_livre: 'ML',
  amazon: 'AMZ',
  tiktok_shop: 'TT',
  shopee: 'SHP',
  magalu: 'MGL',
  americanas: 'AME',
  shein: 'SHN',
};

// Cores de marca aproximadas — fixas independente do tema claro/escuro, já
// que identificam o marketplace, não o estado da aplicação.
export const MARKETPLACE_COLORS: Record<MarketplaceType, { bg: string; fg: string }> = {
  mercado_livre: { bg: '#FFE600', fg: '#2D2D2D' },
  amazon: { bg: '#FF9900', fg: '#131921' },
  tiktok_shop: { bg: '#111111', fg: '#FFFFFF' },
  shopee: { bg: '#EE4D2D', fg: '#FFFFFF' },
  magalu: { bg: '#0086FF', fg: '#FFFFFF' },
  americanas: { bg: '#E60014', fg: '#FFFFFF' },
  shein: { bg: '#000000', fg: '#FFFFFF' },
};

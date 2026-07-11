alter table product_listings add column permalink text;
comment on column product_listings.permalink is
  'URL pública do anúncio no marketplace (campo permalink retornado por GET /items/{id} no Mercado Livre) — usada para o link "Ver no Mercado Livre".';

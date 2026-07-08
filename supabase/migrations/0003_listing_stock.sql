alter table product_listings add column stock integer;
comment on column product_listings.stock is
  'Estoque espelhado do anúncio no marketplace (available_quantity do ML) — distinto de stock_levels, que é o estoque agregado por produto.';

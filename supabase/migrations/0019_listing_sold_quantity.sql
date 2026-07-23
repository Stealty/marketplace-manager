alter table product_listings add column sold_quantity integer;
comment on column product_listings.sold_quantity is
  'Unidades vendidas do anúncio (sold_quantity do item no ML); base do ranking de mais vendidos (painel "Top 100" do app legado).';

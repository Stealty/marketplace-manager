alter table orders add column buyer_nickname text;
alter table product_listings add column image_url text;
alter table order_items add column conferido boolean not null default false;

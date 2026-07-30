-- Foto do item vendido gravada direto na linha do pedido, desacoplada do
-- vínculo com product_listings. Antes a foto do pedido só vinha via join em
-- product_listings.image_url, então itens de anúncios encerrados/pausados/
-- apagados (sem linha em product_listings) apareciam sem foto. Passa a ser
-- populada pelo sync de pedidos (ordersSync), que resolve a imagem — inclusive
-- a foto específica da variação vendida — a partir do multiget /items do ML.
alter table order_items add column image_url text;

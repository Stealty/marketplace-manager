-- Backfill de vínculos que ficaram null por causa da ordem de sync antiga
-- (orders sincronizava antes de listings; claims antes de orders — corrigido
-- em código). Os registros já gravados antes da correção continuam com o
-- link quebrado até essa migration rodar uma vez; syncs futuros já resolvem
-- o vínculo corretamente e não dependem mais dela.
-- NOTE: questions_threads.product_listing_id não entra aqui — a tabela não
-- guarda o item_id do ML localmente, então não dá pra recalcular por SQL; o
-- próprio syncQuestions já resolve de novo a cada rodada (sem precisar de
-- backfill).

update order_items oi
set product_listing_id = pl.id
from orders o, product_listings pl
where oi.order_id = o.id
  and pl.marketplace_connection_id = o.marketplace_connection_id
  and pl.external_id = oi.sku
  and oi.product_listing_id is null
  and oi.sku is not null;

update claims c
set order_id = o.id
from orders o
where c.order_id is null
  and c.external_order_id is not null
  and o.marketplace_connection_id = c.marketplace_connection_id
  and o.external_order_id = c.external_order_id;

-- Permite upsert por (order_id, sku) no sync de pedidos, em vez de
-- delete+insert — isso evitava que o campo `conferido` fosse resetado
-- toda vez que os pedidos eram ressincronizados com o Mercado Livre.
-- Remove duplicatas remanescentes do delete+insert concorrente antes de
-- criar a constraint (mesmo padrão usado em 0007 para chat_messages).
delete from order_items a
where a.id not in (
  select id from (
    select distinct on (order_id, sku) id
    from order_items
    order by order_id, sku, id desc
  ) keep_ids
);

alter table order_items add constraint order_items_order_sku_key unique (order_id, sku);

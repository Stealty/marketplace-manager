-- Campos de status do envio — já vêm na mesma resposta de GET /shipments/{id}
-- usada hoje para freight_value/is_free_shipping (sem chamada de API extra).
-- Base para o filtro "Aguardando envio" da tela de Lucratividade (ver
-- src/lib/mercadolivre/shippingReadiness.ts), que replica o critério do app
-- legado (ml-oauth): envio pronto para coleta, com etiqueta impressa, ainda
-- não postado e fora do Mercado Envios Full.
alter table orders add column pack_id text;
alter table orders add column shipping_status text;
alter table orders add column shipping_substatus text;
alter table orders add column logistic_type text;
alter table orders add column date_shipped timestamptz;
alter table orders add column label_printed_at timestamptz;

-- IDs de pagamento do pedido (resumo de /orders/search) — usados sob demanda
-- pelo repasse líquido preciso (ver 0015_precise_profitability.sql) para
-- consultar cada pagamento na API do Mercado Pago sem precisar re-buscar o
-- pedido inteiro no ML.
alter table orders add column payments jsonb;

-- id do shipment no ML (mlOrder.shipping.id) — hoje só usado em memória
-- durante o sync (ver ordersSync.ts) para casar com o mapa de
-- shipments/shipmentCosts buscado daquela rodada. Persistir permite ao
-- repasse líquido preciso (sob demanda, fora do sync) buscar
-- /shipments/{id}/costs de novo para pegar o frete pago pelo comprador
-- (costs.receiver.cost) sem precisar re-sincronizar o pedido inteiro.
alter table orders add column shipment_id bigint;

create index orders_pack_id_idx on orders (pack_id) where pack_id is not null;

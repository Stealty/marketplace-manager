-- `orders.freight_value` (shipping_option.cost) reflete o quanto o COMPRADOR
-- paga pelo frete — em anúncios com frete grátis isso vem como 0, mesmo
-- quando o Mercado Livre debita o custo do envio do repasse do vendedor. Esse
-- valor por si só não serve para medir o custo de frete que o vendedor
-- efetivamente absorve (usado hoje só para o indicador de "frete grátis" e
-- para a tela Frete).
--
-- `freight_cost_seller` guarda uma estimativa best-effort do custo de frete
-- realmente absorvido pelo vendedor: max(list_cost - cost, 0), calculado a
-- partir dos campos já retornados por GET /shipments/{id} (shipping_option).
-- NOTE: essa é uma aproximação (mesma ressalva de sale_fee/claims neste
-- projeto) — revalidar contra o extrato real de repasse de uma venda com
-- frete grátis assim que possível; se divergir, o ideal é migrar para
-- GET /shipments/{id}/costs (retorna a divisão receiver/senders), hoje não
-- usado por ter schema não confirmado contra a doc oficial.
alter table orders add column freight_cost_seller numeric
  check (freight_cost_seller is null or freight_cost_seller >= 0);

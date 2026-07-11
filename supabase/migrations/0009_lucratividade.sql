-- Custo unitário por SKU (preenchido manualmente pelo usuário) e comissão do
-- Mercado Livre por item vendido — base para a tela de Lucratividade por Venda.
-- Valor único "atual" por SKU, sem histórico (reaproveitado em todas as vendas
-- futuras e passadas daquele SKU).
alter table products add column unit_cost numeric
  check (unit_cost is null or unit_cost >= 0);

-- NOTE: sale_fee (comissão do ML por item) presente na resposta real de
-- /orders/search segundo conhecimento geral da API — revalidar contra a doc
-- atual do Mercado Livre Developers (ver log em fetchOrders, client.ts) antes
-- de confiar neste valor em produção.
alter table order_items add column sale_fee numeric
  check (sale_fee is null or sale_fee >= 0);

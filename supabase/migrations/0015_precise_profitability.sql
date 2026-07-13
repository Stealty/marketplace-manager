-- Repasse líquido preciso por item — calculado sob demanda (não no sync
-- automático) a partir da transação de pagamento real na API do Mercado Pago
-- (ver src/lib/mercadopago.ts e getPreciseProfitability em
-- lucratividade/actions.ts), réplica do que o app legado ml-oauth faz em
-- /ml/profit-orders. Persistido para não recalcular (nem gastar chamadas de
-- API extras) toda vez que a mesma venda aparecer na tela outra vez.
alter table order_items add column net_received_precise numeric
  check (net_received_precise is null or net_received_precise >= 0);
alter table order_items add column net_received_source text;
alter table order_items add column net_received_estimated boolean;

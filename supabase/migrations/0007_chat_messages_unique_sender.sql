-- Sync de perguntas fazia delete+insert em chat_messages a cada sync
-- concorrente (ensureFresh só marca sync_state como "fresco" no final do
-- loop, então recarregar a tela durante um sync em andamento dispara outro
-- sync em paralelo) — o delete de uma execução podia rodar depois do insert
-- de outra, deixando mensagens duplicadas em vez de repor 1 buyer + 1 seller.
-- Mesmo padrão já usado em 0006 para order_items: troca delete+insert por
-- upsert em (thread_id, sender), que é idempotente mesmo com execuções
-- concorrentes.
delete from chat_messages a
where a.id not in (
  select id from (
    select distinct on (thread_id, sender) id
    from chat_messages
    order by thread_id, sender, sent_at desc, id desc
  ) keep_ids
);

alter table chat_messages add constraint chat_messages_thread_sender_key unique (thread_id, sender);

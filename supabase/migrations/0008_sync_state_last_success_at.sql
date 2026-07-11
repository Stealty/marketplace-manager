-- last_synced_at é sobrescrito a cada tentativa (sucesso ou falha), então não
-- serve para responder "quando os dados foram atualizados de verdade pela
-- última vez" depois de uma falha subsequente. last_success_at só avança em
-- syncs bem-sucedidos (ok/partial), preservando esse momento mesmo que
-- tentativas seguintes falhem.
alter table sync_state add column last_success_at timestamptz;

update sync_state set last_success_at = last_synced_at where last_status in ('ok', 'partial');

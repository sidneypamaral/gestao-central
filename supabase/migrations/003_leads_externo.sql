-- Leads com id de origem, para reenviar o histórico sem duplicar.
alter table gestao.leads add column if not exists id_externo text;
create unique index if not exists leads_produto_externo on gestao.leads (produto_id, id_externo);

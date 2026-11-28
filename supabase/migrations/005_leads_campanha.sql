-- Leads com meio (utm_medium) e campanha (utm_campaign) vindos dos links rastreados.
-- A campanha é criada sozinha na primeira vez que um lead chega com ela (canal = origem do lead).
alter table gestao.leads add column if not exists meio text;

-- Se já houver campanhas repetidas (mesmo produto e nome), junta numa só antes de criar o índice.
with dup as (
  select id, first_value(id) over (partition by produto_id, nome order by inicio nulls last, id) as fica
  from gestao.campanhas
)
update gestao.leads l set campanha_id = dup.fica from dup where l.campanha_id = dup.id and dup.id <> dup.fica;
delete from gestao.campanhas c using (
  select id, first_value(id) over (partition by produto_id, nome order by inicio nulls last, id) as fica from gestao.campanhas
) dup where c.id = dup.id and dup.id <> dup.fica;

create unique index if not exists campanhas_produto_nome on gestao.campanhas (produto_id, nome);

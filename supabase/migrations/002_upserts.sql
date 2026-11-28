-- Permite reenviar eventos sem duplicar assinaturas e pagamentos.
create unique index if not exists assinaturas_produto_externo on gestao.assinaturas (produto_id, id_externo);
create unique index if not exists pagamentos_produto_externo on gestao.pagamentos (produto_id, id_externo);

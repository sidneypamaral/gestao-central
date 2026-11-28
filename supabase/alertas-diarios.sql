-- Alertas diários (somente leitura). Uma linha por cliente que precisa de atenção; nenhuma linha = nada a avisar.
-- Mesma regra do quadro "Precisa de atenção" do painel (lib/consultas.ts, alertasClientes).
with hoje as (select (now() at time zone 'America/Sao_Paulo')::date d)
select p.nome as saas, c.nome as cliente, c.email,
  case when a.status = 'inadimplente' then 'inadimplente'
       when a.status = 'ativa' then 'pagamento atrasado' else 'fim do teste' end as alerta,
  a.vence_em, a.vence_em - hoje.d as dias_para_vencer, a.valor_mensal
from gestao.assinaturas a
join gestao.clientes c on c.id = a.cliente_id
join gestao.produtos p on p.id = a.produto_id, hoje
where a.status = 'inadimplente'
   or (a.status = 'ativa' and a.vence_em < hoje.d)
   or (a.status = 'trial' and a.vence_em <= hoje.d + 3)
order by alerta, a.vence_em nulls first;

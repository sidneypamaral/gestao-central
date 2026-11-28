import { sql } from "@/lib/db";
import type { lerFiltro } from "@/lib/filtro";

type Filtro = Awaited<ReturnType<typeof lerFiltro>>;
export const ETAPAS = ["novo", "contato", "trial", "ganho", "perdido"];

// Funil e origem dos leads criados no período escolhido.
export async function dadosLeads(f: Filtro) {
  const [funil, origens] = await Promise.all([
    sql`select etapa, count(*)::int as n from gestao.leads
        where criado_em >= now() - make_interval(days => ${f.dias}) ${f.doProduto()} group by etapa`,
    sql`select coalesce(nullif(origem, ''), 'sem origem') as origem, count(*)::int as leads,
          count(*) filter (where etapa = 'ganho')::int as ganhos
        from gestao.leads where criado_em >= now() - make_interval(days => ${f.dias}) ${f.doProduto()}
        group by 1 order by leads desc limit 10`,
  ]);
  return {
    funil: ETAPAS.map((etapa) => ({ etapa, n: Number(funil.find((x) => x.etapa === etapa)?.n ?? 0) })),
    origens: origens.map((o) => ({ origem: String(o.origem), leads: Number(o.leads), ganhos: Number(o.ganhos) })),
  };
}

// MRR estimado no fim de cada um dos últimos 6 meses, a partir das assinaturas.
export function mrrMensal(f: Filtro) {
  return sql`
    select m as mes, coalesce((
      select sum(a.valor_mensal) from gestao.assinaturas a
      where a.status in ('ativa', 'cancelada') and a.iniciada_em < m + interval '1 month'
        and (a.cancelada_em is null or a.cancelada_em >= m + interval '1 month') ${f.doProduto("a.produto_id")}
    ), 0) as mrr
    from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') m
    order by m`;
}

// Etiqueta do prazo de uma tarefa: [classe de cor, texto].
export function prazoTag(prazo: Date | string | null): [string, string] {
  if (!prazo) return ["neutra", "Sem prazo"];
  const hoje = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }));
  const dias = Math.round((new Date(prazo).getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) return ["ruim", "Atrasada"];
  if (dias === 0) return ["alerta", "Hoje"];
  return ["", dias === 1 ? "Amanhã" : `${dias} dias`];
}

// Alertas de clientes: inadimplente, pagamento atrasado e teste (trial) acabando em até 3 dias.
// Mesma regra do alerta diário (supabase/alertas-diarios.sql).
export function alertasClientes(f: Filtro) {
  return sql`
    with hoje as (select (now() at time zone 'America/Fortaleza')::date d)
    select c.nome, a.status, a.vence_em, a.vence_em - hoje.d as dias,
      case when a.status = 'inadimplente' then 'inadimplente'
           when a.status = 'ativa' then 'atrasado' else 'teste' end as tipo
    from gestao.assinaturas a join gestao.clientes c on c.id = a.cliente_id, hoje
    where (a.status = 'inadimplente'
       or (a.status = 'ativa' and a.vence_em < hoje.d)
       or (a.status = 'trial' and a.vence_em <= hoje.d + 3)) ${f.doProduto("a.produto_id")}
    order by a.vence_em nulls first limit 10`;
}

// Etiqueta de um alerta de cliente: [classe de cor, texto].
export function alertaTag(tipo: string, dias: number | null): [string, string] {
  if (tipo === "inadimplente") return ["ruim", "Inadimplente"];
  const n = Number(dias ?? 0);
  if (tipo === "atrasado") return ["ruim", n === -1 ? "Pagamento 1 dia atrasado" : `Pagamento ${-n} dias atrasado`];
  if (n < 0) return ["ruim", "Teste acabou"];
  if (n === 0) return ["alerta", "Teste acaba hoje"];
  return ["alerta", n === 1 ? "Teste acaba amanhã" : `Teste acaba em ${n} dias`];
}

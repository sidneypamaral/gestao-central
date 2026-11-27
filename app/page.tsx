import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function Painel() {
  const [k] = await sql`
    select
      (select coalesce(sum(valor_mensal),0) from gestao.assinaturas where status = 'ativa') as mrr,
      (select count(*) from gestao.assinaturas where status = 'ativa') as ativos,
      (select count(*) from gestao.assinaturas where status = 'trial') as trials,
      (select coalesce(sum(valor),0) from gestao.pagamentos where status = 'aprovado' and pago_em >= date_trunc('month', now())) as receita_mes,
      (select coalesce(sum(valor),0) from gestao.custos where competencia >= date_trunc('month', now())) as custos_mes,
      (select count(*) from gestao.leads where criado_em >= date_trunc('month', now())) as leads_mes,
      (select count(*) from gestao.assinaturas where status = 'cancelada' and cancelada_em >= date_trunc('month', now())) as cancel_mes,
      (select count(*) from gestao.tarefas where status <> 'concluida') as tarefas_abertas`;

  const produtos = await sql`
    select p.nome,
      coalesce(sum(a.valor_mensal) filter (where a.status = 'ativa'),0) as mrr,
      count(a.id) filter (where a.status = 'ativa') as ativos,
      count(a.id) filter (where a.status = 'trial') as trials,
      (select count(*) from gestao.leads l where l.produto_id = p.id and l.criado_em >= date_trunc('month', now())) as leads
    from gestao.produtos p left join gestao.assinaturas a on a.produto_id = p.id
    group by p.id, p.nome order by mrr desc`;

  const margem = Number(k.receita_mes) - Number(k.custos_mes);
  const cards: [string, string][] = [
    ["MRR", brl(k.mrr)], ["Clientes ativos", String(k.ativos)], ["Em trial", String(k.trials)],
    ["Receita do mês", brl(k.receita_mes)], ["Custos do mês", brl(k.custos_mes)], ["Resultado do mês", brl(margem)],
    ["Leads do mês", String(k.leads_mes)], ["Cancelamentos no mês", String(k.cancel_mes)], ["Tarefas abertas", String(k.tarefas_abertas)],
  ];

  return (
    <main>
      <h1>Central de Gestão</h1>
      <p className="sub">Visão consolidada de todos os SaaS conectados.</p>
      <div className="grid">
        {cards.map(([r, v]) => (
          <div className="card" key={r}><div className="r">{r}</div><div className="v">{v}</div></div>
        ))}
      </div>
      <h2>Por produto</h2>
      <table>
        <thead><tr><th>Produto</th><th className="n">MRR</th><th className="n">Ativos</th><th className="n">Trials</th><th className="n">Leads no mês</th></tr></thead>
        <tbody>
          {produtos.length === 0 && <tr><td colSpan={5}>Nenhum produto conectado ainda.</td></tr>}
          {produtos.map((p) => (
            <tr key={p.nome}><td>{p.nome}</td><td className="n">{brl(p.mrr)}</td><td className="n">{p.ativos}</td><td className="n">{p.trials}</td><td className="n">{p.leads}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

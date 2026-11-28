import Link from "next/link";
import { sql } from "@/lib/db";
import { criarTarefa, concluirTarefa, lancarCusto } from "./actions";

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

  const funil = await sql`
    select etapa, count(*)::int as n from gestao.leads group by etapa`;
  const origens = await sql`
    select coalesce(nullif(origem, ''), 'sem origem') as origem, count(*)::int as leads,
      count(*) filter (where etapa = 'ganho')::int as ganhos
    from gestao.leads where criado_em >= now() - interval '90 days'
    group by 1 order by leads desc limit 10`;
  const tarefas = await sql`
    select t.id, t.titulo, t.tipo, t.responsavel, t.prazo, p.nome as produto, c.nome as cliente
    from gestao.tarefas t left join gestao.produtos p on p.id = t.produto_id left join gestao.clientes c on c.id = t.cliente_id
    where t.status <> 'concluida' order by t.prazo nulls last, t.criado_em limit 30`;
  const custos = await sql`
    select c.categoria, c.descricao, c.valor, c.competencia, p.nome as produto
    from gestao.custos c left join gestao.produtos p on p.id = c.produto_id
    where c.competencia >= date_trunc('month', now()) order by c.competencia desc limit 30`;
  const lista = await sql`select id, nome from gestao.produtos order by nome`;
  const etapas = ["novo", "contato", "trial", "ganho", "perdido"];
  const nEtapa = (e: string) => funil.find((f) => f.etapa === e)?.n ?? 0;
  const hoje = new Date().toISOString().slice(0, 10);
  const opcoes = (
    <select name="produto_id" defaultValue=""><option value="">Geral</option>
      {lista.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
  );

  const margem = Number(k.receita_mes) - Number(k.custos_mes);
  const cards: [string, string][] = [
    ["MRR", brl(k.mrr)], ["Clientes ativos", String(k.ativos)], ["Em trial", String(k.trials)],
    ["Receita do mês", brl(k.receita_mes)], ["Custos do mês", brl(k.custos_mes)], ["Resultado do mês", brl(margem)],
    ["Leads do mês", String(k.leads_mes)], ["Cancelamentos no mês", String(k.cancel_mes)], ["Tarefas abertas", String(k.tarefas_abertas)],
  ];

  return (
    <main>
      <nav><Link href="/">Painel</Link><Link href="/produtos">Sistemas conectados</Link></nav>
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

      <h2>Funil comercial (todos os leads)</h2>
      <div className="grid">
        {etapas.map((e) => (
          <div className="card" key={e}><div className="r">{e[0].toUpperCase() + e.slice(1)}</div><div className="v">{nEtapa(e)}</div></div>
        ))}
      </div>

      <h2>Marketing: de onde vêm os leads (90 dias)</h2>
      <table>
        <thead><tr><th>Origem</th><th className="n">Leads</th><th className="n">Viraram clientes</th><th className="n">Conversão</th></tr></thead>
        <tbody>
          {origens.length === 0 && <tr><td colSpan={4}>Nenhum lead ainda.</td></tr>}
          {origens.map((o) => (
            <tr key={o.origem}><td>{o.origem}</td><td className="n">{o.leads}</td><td className="n">{o.ganhos}</td>
              <td className="n">{o.leads ? Math.round((100 * o.ganhos) / o.leads) : 0}%</td></tr>
          ))}
        </tbody>
      </table>

      <div className="duas">
        <section>
          <h2>Operacional: tarefas e suporte abertos</h2>
          <form action={criarTarefa} className="linha">
            <input name="titulo" placeholder="Nova tarefa" required />
            <select name="tipo"><option value="operacional">Operacional</option><option value="suporte">Suporte</option></select>
            <input name="prazo" type="date" />
            {opcoes}
            <button>Adicionar</button>
          </form>
          <table>
            <tbody>
              {tarefas.length === 0 && <tr><td>Nenhuma tarefa aberta.</td></tr>}
              {tarefas.map((t) => (
                <tr key={t.id}>
                  <td>{t.tipo === "suporte" ? "🎧 " : ""}{t.titulo}{t.cliente ? ` · ${t.cliente}` : ""}{t.produto ? ` · ${t.produto}` : ""}</td>
                  <td>{t.prazo ? new Date(t.prazo).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : ""}</td>
                  <td><form action={concluirTarefa}><input type="hidden" name="id" value={t.id} /><button className="sec">Concluir</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <h2>Controle: custos do mês</h2>
          <form action={lancarCusto} className="linha">
            <select name="categoria" required defaultValue="">
              <option value="" disabled>Categoria</option>
              {["infraestrutura", "mídia paga", "ferramentas", "pessoal", "impostos", "outros"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <input name="descricao" placeholder="Descrição" />
            <input name="valor" placeholder="Valor (R$)" inputMode="decimal" required />
            <input name="competencia" type="date" defaultValue={hoje} />
            {opcoes}
            <button>Lançar</button>
          </form>
          <table>
            <tbody>
              {custos.length === 0 && <tr><td>Nenhum custo lançado neste mês.</td></tr>}
              {custos.map((c, i) => (
                <tr key={i}><td>{c.categoria}{c.descricao ? ` · ${c.descricao}` : ""}{c.produto ? ` · ${c.produto}` : ""}</td><td className="n">{brl(c.valor)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

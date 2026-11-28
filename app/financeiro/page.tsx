import { sql } from "@/lib/db";
import { lerFiltro, brl, pct, rotuloMes, data, type Busca } from "@/lib/filtro";
import { Topo, Painel, Kpis, Barras, Vazio } from "@/components/ui";
import { SeletorProduto } from "@/components/form";
import { lancarCusto } from "../actions";

export const dynamic = "force-dynamic";
const CATEGORIAS = ["infraestrutura", "mídia paga", "ferramentas", "pessoal", "impostos", "outros"];

export default async function Financeiro({ searchParams }: { searchParams: Busca }) {
  const f = await lerFiltro(searchParams);
  const P = f.doProduto;
  const [[k], meses, custos, planos, produtos] = await Promise.all([
    sql`select
      (select coalesce(sum(valor_mensal),0) from gestao.assinaturas where status = 'ativa' ${P()}) as mrr,
      (select count(*) from gestao.assinaturas where status = 'ativa' ${P()})::int as ativos,
      (select coalesce(sum(valor),0) from gestao.pagamentos where status = 'aprovado' and pago_em >= date_trunc('month', now()) ${P()}) as receita,
      (select coalesce(sum(valor),0) from gestao.custos where competencia >= date_trunc('month', now()) ${P()}) as custos,
      (select count(*) from gestao.assinaturas where status = 'cancelada' and cancelada_em >= date_trunc('month', now()) ${P()})::int as cancel`,
    sql`select m as mes,
      (select coalesce(sum(valor),0) from gestao.pagamentos where status = 'aprovado' and date_trunc('month', pago_em) = m ${P()}) as receita,
      (select coalesce(sum(valor),0) from gestao.custos where date_trunc('month', competencia) = m ${P()}) as custos
      from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') m order by m`,
    sql`select c.categoria, c.descricao, c.valor, c.competencia, p.nome as produto
      from gestao.custos c left join gestao.produtos p on p.id = c.produto_id
      where c.competencia >= date_trunc('month', now()) ${P("c.produto_id")} order by c.competencia desc limit 30`,
    sql`select coalesce(pl.nome, 'Sem plano') as plano, count(*)::int as clientes, sum(a.valor_mensal) as mrr
      from gestao.assinaturas a left join gestao.planos pl on pl.id = a.plano_id
      where a.status = 'ativa' ${P("a.produto_id")} group by 1 order by mrr desc`,
    sql`select id, nome from gestao.produtos order by nome`,
  ]);
  const receita = Number(k.receita), resultado = receita - Number(k.custos);
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  return (
    <>
      <Topo titulo="Financeiro" sub="Receita, custos e resultado" />
      <div className="g hero">
        <Painel titulo="Receita x custos" desc="Pagamentos aprovados e custos lançados, por mês">
          <Barras a={meses.map((m) => Number(m.receita))} b={meses.map((m) => Number(m.custos))} rotulos={meses.map((m) => rotuloMes(m.mes))} />
        </Painel>
        <Painel titulo="Resumo do mês" desc="Mês atual">
          <Kpis itens={[
            ["MRR", brl(k.mrr)], ["Ticket médio", brl(k.ativos ? Number(k.mrr) / k.ativos : 0)],
            ["Resultado", brl(resultado), resultado < 0], ["Margem", `${pct(resultado, receita)}%`, resultado < 0],
            ["Cancelamentos", String(k.cancel), k.cancel > 0], ["Churn", `${pct(k.cancel, k.ativos + k.cancel)}%`, k.cancel > 0],
          ]} />
        </Painel>
      </div>
      <div className="g duas">
        <Painel titulo="Custos do mês" desc="Lance cada gasto para ver o resultado real">
          <form action={lancarCusto} className="acao">
            <select name="categoria" required defaultValue="" aria-label="Categoria">
              <option value="" disabled>Categoria</option>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input name="descricao" placeholder="Descrição" aria-label="Descrição" />
            <input name="valor" placeholder="Valor (R$)" inputMode="decimal" required size={10} aria-label="Valor" />
            <input name="competencia" type="date" defaultValue={hoje} aria-label="Data" />
            <SeletorProduto produtos={produtos as never} padrao={f.produto} />
            <button className="btn">Lançar custo</button>
          </form>
          {custos.length === 0 ? <Vazio>Nenhum custo lançado neste mês.</Vazio> : (
            <table>
              <thead><tr><th>Custo</th><th className="n">Data</th><th className="n">Valor</th></tr></thead>
              <tbody>{custos.map((c, i) => (
                <tr key={i}>
                  <td>{c.categoria}{c.descricao ? ` · ${c.descricao}` : ""}{c.produto ? <span className="mut"> · {c.produto}</span> : null}</td>
                  <td className="n">{data(c.competencia)}</td><td className="n">{brl(c.valor, true)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Painel>
        <Painel titulo="Assinaturas por plano" desc="Clientes ativos hoje">
          {planos.length === 0 ? <Vazio>Nenhuma assinatura ativa ainda.</Vazio> : (
            <table>
              <thead><tr><th>Plano</th><th className="n">Clientes</th><th className="n">MRR</th></tr></thead>
              <tbody>{planos.map((p) => (
                <tr key={p.plano}><td>{p.plano}</td><td className="n">{p.clientes}</td><td className="n">{brl(p.mrr, true)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Painel>
      </div>
    </>
  );
}

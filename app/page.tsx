import { sql } from "@/lib/db";
import { lerFiltro, brl, rotuloMes, type Busca } from "@/lib/filtro";
import { Topo, Periodo, Painel, Kpis, Linha, Funil, Rosca, Vazio } from "@/components/ui";
import { dadosLeads, mrrMensal, prazoTag } from "@/lib/consultas";

export const dynamic = "force-dynamic";

export default async function VisaoGeral({ searchParams }: { searchParams: Busca }) {
  const f = await lerFiltro(searchParams);
  const P = f.doProduto;
  const [k] = await sql`
    select
      (select coalesce(sum(valor_mensal),0) from gestao.assinaturas where status = 'ativa' ${P()}) as mrr,
      (select count(*) from gestao.assinaturas where status = 'ativa' ${P()})::int as ativos,
      (select count(*) from gestao.assinaturas where status = 'trial' ${P()})::int as trials,
      (select coalesce(sum(valor),0) from gestao.pagamentos where status = 'aprovado' and pago_em >= date_trunc('month', now()) ${P()}) as receita,
      (select coalesce(sum(valor),0) from gestao.custos where competencia >= date_trunc('month', now()) ${P()}) as custos,
      (select count(*) from gestao.assinaturas where status = 'cancelada' and cancelada_em >= date_trunc('month', now()) ${P()})::int as cancel`;
  const [serie, leads, tarefas] = await Promise.all([
    mrrMensal(f),
    dadosLeads(f),
    sql`select titulo, tipo, prazo from gestao.tarefas where status <> 'concluida' ${P()}
        order by prazo nulls last, criado_em limit 5`,
  ]);
  const mrr = Number(k.mrr);
  const valores = serie.map((s, i) => (i === serie.length - 1 ? mrr : Number(s.mrr)));
  const anterior = valores[valores.length - 2] ?? 0;
  const variacao = anterior ? Math.round(((mrr - anterior) / anterior) * 100) : null;
  const resultado = Number(k.receita) - Number(k.custos);
  const mes = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

  return (
    <>
      <Topo titulo="Visão geral" sub="Como está o negócio hoje, em todos os sistemas">
        <Periodo dias={f.dias} produto={f.produto} caminho="/" />
      </Topo>
      <div className="g hero">
        <Painel titulo="Receita recorrente mensal (MRR)" desc="Quanto entra todo mês com as assinaturas ativas" className="destaque">
          <div className="mrr-num">
            {brl(mrr)}
            {variacao !== null && <span className="var">{variacao >= 0 ? "+" : ""}{variacao}% no mês</span>}
          </div>
          <Linha valores={valores} rotulos={serie.map((s) => rotuloMes(s.mes))} />
        </Painel>
        <Painel titulo="Este mês" desc={mes[0].toUpperCase() + mes.slice(1)}>
          <Kpis itens={[
            ["Clientes ativos", String(k.ativos)], ["Em trial", String(k.trials)],
            ["Receita", brl(k.receita)], ["Custos", brl(k.custos)],
            ["Resultado", brl(resultado), resultado < 0], ["Cancelamentos", String(k.cancel), k.cancel > 0],
          ]} />
        </Painel>
      </div>
      <div className="g tres">
        <Painel titulo="Funil comercial" desc={`Leads criados nos últimos ${f.dias} dias`}><Funil etapas={leads.funil} /></Painel>
        <Painel titulo="De onde vêm os leads" desc={`Últimos ${f.dias} dias`}><Rosca itens={leads.origens.map((o) => ({ nome: o.origem, n: o.leads }))} /></Painel>
        <Painel titulo="Precisa de atenção" desc="Tarefas abertas com prazo mais próximo">
          {tarefas.length === 0 ? <Vazio>Nada pendente. Crie tarefas em Operacional.</Vazio> : (
            <table><tbody>
              {tarefas.map((t, i) => {
                const [c, txt] = prazoTag(t.prazo);
                return <tr key={i}><td>{t.tipo === "suporte" ? "🎧 " : ""}{t.titulo}</td><td className="n"><span className={`tag ${c}`}>{txt}</span></td></tr>;
              })}
            </tbody></table>
          )}
        </Painel>
      </div>
    </>
  );
}

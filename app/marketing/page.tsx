import { sql } from "@/lib/db";
import { lerFiltro, pct, brl, type Busca } from "@/lib/filtro";
import { Topo, Periodo, Painel, Barrinhas, Vazio, Blocos, Indicadores } from "@/components/ui";
import { dadosLeads } from "@/lib/consultas";

export const dynamic = "force-dynamic";

export default async function Marketing({ searchParams }: { searchParams: Busca }) {
  const f = await lerFiltro(searchParams);
  const [{ origens, funil }, campanhas, [nc]] = await Promise.all([
    dadosLeads(f),
    sql`select c.nome, c.canal, c.orcamento,
        count(l.id)::int as leads, count(l.id) filter (where l.etapa = 'ganho')::int as ganhos
      from gestao.campanhas c left join gestao.leads l on l.campanha_id = c.id
        and l.criado_em >= now() - make_interval(days => ${f.dias})
      where true ${f.doProduto("c.produto_id")}
      group by c.id order by leads desc limit 20`,
    sql`select count(*)::int as n from gestao.campanhas where true ${f.doProduto()}`,
  ]);

  const totalLeads = funil.reduce((t, e) => t + e.n, 0), totalGanhos = funil.find((e) => e.etapa === "ganho")?.n ?? 0;
  return (
    <>
      <Topo titulo={`Marketing · últimos ${f.dias} dias`}
        hero={{ rotulo: "Leads no período", valor: String(totalLeads), delta: `${pct(totalGanhos, totalLeads)}% conversão` }}
        direita={<>
          <Periodo dias={f.dias} produto={f.produto} caminho="/marketing" />
          <Blocos titulo="Principais origens" proporcional itens={origens.slice(0, 4).map((o, i) => ({ n: o.leads, nome: o.origem, destaque: i === 0 }))} />
        </>} />
      <div className="corpo">
        <Indicadores itens={[
          ["Viraram clientes", String(totalGanhos), `${pct(totalGanhos, totalLeads)}% de conversão`, false, "alvo", true],
          ["Melhor origem", origens[0]?.origem ?? "—", origens[0] ? `${origens[0].leads} leads` : "sem dados", false, "megafone"],
          ["Origens ativas", String(origens.length), "canais trazendo leads", false, "funil"],
          ["Campanhas", String(nc.n), "cadastradas", false, "ticket"],
        ]} />
      <div className="g duas">
        <Painel titulo="Origem dos leads" desc={`Últimos ${f.dias} dias`}><Barrinhas itens={origens.map((o) => ({ nome: o.origem, n: o.leads }))} vazio="Nenhum lead no período." /></Painel>
        <Painel titulo="Conversão por origem" desc="Quantos leads viraram clientes">
          {origens.length === 0 ? <Vazio>Nenhum lead no período.</Vazio> : (
            <table>
              <thead><tr><th>Origem</th><th className="n">Leads</th><th className="n">Clientes</th><th className="n">Conversão</th></tr></thead>
              <tbody>{origens.map((o) => (
                <tr key={o.origem}><td>{o.origem}</td><td className="n">{o.leads}</td><td className="n">{o.ganhos}</td><td className="n">{pct(o.ganhos, o.leads)}%</td></tr>
              ))}</tbody>
            </table>
          )}
        </Painel>
      </div>
      <div className="g">
        <Painel titulo="Campanhas" desc={`Leads trazidos por campanha nos últimos ${f.dias} dias`}>
          {campanhas.length === 0 ? <Vazio>Nenhuma campanha cadastrada ainda.</Vazio> : (
            <div className="rolar"><table>
              <thead><tr><th>Campanha</th><th>Canal</th><th className="n">Orçamento</th><th className="n">Leads</th><th className="n">Clientes</th><th className="n">Custo por lead</th></tr></thead>
              <tbody>{campanhas.map((c, i) => (
                <tr key={i}>
                  <td>{c.nome}</td><td>{c.canal}</td><td className="n">{c.orcamento ? brl(c.orcamento) : "—"}</td>
                  <td className="n">{c.leads}</td><td className="n">{c.ganhos}</td>
                  <td className="n">{c.orcamento && c.leads ? brl(Number(c.orcamento) / c.leads, true) : "—"}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Painel>
      </div>
      </div>
    </>
  );
}

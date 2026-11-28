import { sql } from "@/lib/db";
import { lerFiltro, pct, brl, type Busca } from "@/lib/filtro";
import { Topo, Periodo, Painel, Rosca, Vazio } from "@/components/ui";
import { dadosLeads } from "@/lib/consultas";

export const dynamic = "force-dynamic";

export default async function Marketing({ searchParams }: { searchParams: Busca }) {
  const f = await lerFiltro(searchParams);
  const [{ origens }, campanhas] = await Promise.all([
    dadosLeads(f),
    sql`select c.nome, c.canal, c.orcamento,
        count(l.id)::int as leads, count(l.id) filter (where l.etapa = 'ganho')::int as ganhos
      from gestao.campanhas c left join gestao.leads l on l.campanha_id = c.id
        and l.criado_em >= now() - make_interval(days => ${f.dias})
      where true ${f.doProduto("c.produto_id")}
      group by c.id order by leads desc limit 20`,
  ]);

  return (
    <>
      <Topo titulo="Marketing" sub="De onde vêm os clientes">
        <Periodo dias={f.dias} produto={f.produto} caminho="/marketing" />
      </Topo>
      <div className="g duas topo0">
        <Painel titulo="Origem dos leads" desc={`Últimos ${f.dias} dias`}><Rosca itens={origens.map((o) => ({ nome: o.origem, n: o.leads }))} /></Painel>
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
    </>
  );
}

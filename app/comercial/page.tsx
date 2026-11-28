import { sql } from "@/lib/db";
import { lerFiltro, pct, data, type Busca } from "@/lib/filtro";
import { Topo, Periodo, Painel, Funil, TagEtapa, Vazio, Blocos, Indicadores } from "@/components/ui";
import { dadosLeads } from "@/lib/consultas";

export const dynamic = "force-dynamic";

export default async function Comercial({ searchParams }: { searchParams: Busca }) {
  const f = await lerFiltro(searchParams);
  const [{ funil }, [k], recentes] = await Promise.all([
    dadosLeads(f),
    sql`select (select count(*) from gestao.assinaturas where status = 'trial' ${f.doProduto()})::int as trials`,
    sql`select l.nome, l.email, l.origem, l.etapa, l.criado_em, p.nome as produto
      from gestao.leads l join gestao.produtos p on p.id = l.produto_id
      where true ${f.doProduto("l.produto_id")} order by l.criado_em desc limit 15`,
  ]);
  const total = funil.reduce((s, e) => s + e.n, 0);
  const n = (e: string) => funil.find((x) => x.etapa === e)?.n ?? 0;

  return (
    <>
      <Topo titulo={`Comercial · últimos ${f.dias} dias`}
        hero={{ rotulo: "Leads novos", valor: String(total), delta: `${pct(n("ganho"), total)}% viraram clientes` }}
        direita={<>
          <Periodo dias={f.dias} produto={f.produto} caminho="/comercial" />
          <Blocos titulo="Leads por etapa atual" proporcional itens={[
            { n: n("novo"), nome: "novos" }, { n: n("contato"), nome: "contato" }, { n: n("trial"), nome: "trial" },
            { n: n("ganho"), nome: "ganhos", destaque: true }, { n: n("perdido"), nome: "perdidos", neg: true },
          ]} />
        </>} />
      <div className="corpo">
        <Indicadores itens={[
          ["Conversão", `${pct(n("ganho"), total)}%`, "leads que viraram clientes", false, "alvo", true],
          ["Trials ativos", String(k.trials), "testando hoje", false, "relogio"],
          ["Clientes no período", String(n("ganho")), `últimos ${f.dias} dias`, false, "pessoas"],
          ["Perdidos", String(n("perdido")), "no período", n("perdido") > 0, "alerta"],
        ]} />
      <div className="g duas">
        <Painel titulo="Funil comercial" desc={`Leads criados nos últimos ${f.dias} dias, pela etapa atual`}><Funil etapas={funil} /></Painel>
        <Painel titulo="Leads recentes" desc="Os 15 últimos que chegaram">
          {recentes.length === 0 ? <Vazio>Nenhum lead ainda. Eles chegam sozinhos pelos sistemas conectados.</Vazio> : (
            <div className="rolar"><table>
              <thead><tr><th>Lead</th><th>Origem</th><th>Sistema</th><th className="n">Chegou</th><th className="n">Etapa</th></tr></thead>
              <tbody>{recentes.map((l, i) => (
                <tr key={i}>
                  <td>{l.nome || l.email || "Sem nome"}</td><td>{l.origem || "sem origem"}</td><td className="mut">{l.produto}</td>
                  <td className="n">{data(l.criado_em)}</td><td className="n"><TagEtapa etapa={l.etapa} /></td>
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

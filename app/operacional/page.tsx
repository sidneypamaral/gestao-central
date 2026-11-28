import { sql } from "@/lib/db";
import { lerFiltro, type Busca } from "@/lib/filtro";
import { Topo, Painel, Vazio, Destaques } from "@/components/ui";
import { SeletorProduto } from "@/components/form";
import { prazoTag } from "@/lib/consultas";
import { criarTarefa, concluirTarefa } from "../actions";

export const dynamic = "force-dynamic";

export default async function Operacional({ searchParams }: { searchParams: Busca }) {
  const f = await lerFiltro(searchParams);
  const [tarefas, [k], produtos] = await Promise.all([
    sql`select t.id, t.titulo, t.tipo, t.prazo, p.nome as produto, c.nome as cliente
      from gestao.tarefas t left join gestao.produtos p on p.id = t.produto_id left join gestao.clientes c on c.id = t.cliente_id
      where t.status <> 'concluida' ${f.doProduto("t.produto_id")} order by t.prazo nulls last, t.criado_em limit 50`,
    sql`select count(*)::int as abertas,
        count(*) filter (where prazo < (now() at time zone 'America/Sao_Paulo')::date)::int as atrasadas,
        count(*) filter (where prazo = (now() at time zone 'America/Sao_Paulo')::date)::int as hoje,
        count(*) filter (where tipo = 'suporte')::int as suporte
      from gestao.tarefas where status <> 'concluida' ${f.doProduto()}`,
    sql`select id, nome from gestao.produtos order by nome`,
  ]);

  return (
    <>
      <Topo titulo="Operacional" sub="Tarefas do dia a dia e suporte">
        <Destaques itens={[
          ["Abertas", String(k.abertas), "no total"], ["Atrasadas", String(k.atrasadas), "passaram do prazo", k.atrasadas > 0],
          ["Para hoje", String(k.hoje), "vencem hoje"], ["Suporte", String(k.suporte), "chamados abertos"],
        ]} />
      </Topo>
      <div className="corpo">
      <div className="g">
        <Painel titulo="Tarefas e suporte" desc="Abertas, da mais urgente para a menos urgente">
          <form action={criarTarefa} className="acao">
            <input name="titulo" placeholder="Nova tarefa" required aria-label="Nova tarefa" />
            <select name="tipo" aria-label="Tipo"><option value="operacional">Operacional</option><option value="suporte">Suporte</option></select>
            <input name="prazo" type="date" aria-label="Prazo" />
            <SeletorProduto produtos={produtos as never} padrao={f.produto} />
            <button className="btn">Adicionar</button>
          </form>
          {tarefas.length === 0 ? <Vazio>Nenhuma tarefa aberta. Adicione a primeira acima.</Vazio> : (
            <div className="rolar"><table>
              <thead><tr><th>Tarefa</th><th className="n">Prazo</th><th></th></tr></thead>
              <tbody>{tarefas.map((t) => {
                const [c, txt] = prazoTag(t.prazo);
                return (
                  <tr key={t.id}>
                    <td>{t.tipo === "suporte" ? "🎧 " : ""}{t.titulo}<span className="mut">{t.cliente ? ` · ${t.cliente}` : ""}{t.produto ? ` · ${t.produto}` : ""}</span></td>
                    <td className="n"><span className={`tag ${c}`}>{txt}</span></td>
                    <td className="n"><form action={concluirTarefa}><input type="hidden" name="id" value={t.id} /><button className="btn sec">Concluir</button></form></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )}
        </Painel>
      </div>
      </div>
    </>
  );
}

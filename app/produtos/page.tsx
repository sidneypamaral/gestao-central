import { sql } from "@/lib/db";
import { Topo, Painel, Vazio } from "@/components/ui";
import { NovoProduto, TrocarChave } from "./novo";

export const dynamic = "force-dynamic";

export default async function Produtos() {
  const produtos = await sql`
    select p.id, p.nome, p.status,
      (select max(recebido_em) from gestao.eventos e where e.produto_id = p.id) as ultimo,
      (select count(*) from gestao.eventos e where e.produto_id = p.id and not processado)::int as falhas
    from gestao.produtos p order by p.criado_em`;
  return (
    <>
      <Topo titulo="Sistemas conectados" sub="Cada SaaS envia seus dados para a central" />
      <div className="g">
        <Painel titulo="Cadastrar novo sistema" desc="Gera a chave de conexão. Depois siga o guia em docs/conectar-novo-saas.md.">
          <NovoProduto />
        </Painel>
        <Painel titulo="Sistemas" desc="Situação de cada conexão">
          {produtos.length === 0 ? <Vazio>Nenhum sistema cadastrado ainda.</Vazio> : (
            <div className="rolar"><table>
              <thead><tr><th>Sistema</th><th>Último dado recebido</th><th className="n">Eventos com erro</th><th className="n">Situação</th><th></th></tr></thead>
              <tbody>{produtos.map((p) => (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td>{p.ultimo ? new Date(p.ultimo).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "nunca"}</td>
                  <td className="n">{p.falhas}</td>
                  <td className="n"><span className={`tag ${p.status !== "ativo" ? "neutra" : p.falhas > 0 ? "alerta" : ""}`}>{p.status !== "ativo" ? "Pausado" : p.falhas > 0 ? "Com erros" : p.ultimo ? "Conectado" : "Aguardando dados"}</span></td>
                  <td className="n"><TrocarChave id={p.id} /></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Painel>
      </div>
    </>
  );
}

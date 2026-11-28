import Link from "next/link";
import { sql } from "@/lib/db";
import { NovoProduto, TrocarChave } from "./novo";

export const dynamic = "force-dynamic";

export default async function Produtos() {
  const produtos = await sql`
    select p.id, p.nome, p.status,
      (select max(recebido_em) from gestao.eventos e where e.produto_id = p.id) as ultimo,
      (select count(*) from gestao.eventos e where e.produto_id = p.id and not processado) as falhas
    from gestao.produtos p order by p.criado_em`;
  return (
    <main>
      <p><Link href="/">← Painel</Link></p>
      <h1>Sistemas conectados</h1>
      <p className="sub">Cadastre um novo SaaS para gerar a chave de conexão. Depois siga o guia em docs/conectar-novo-saas.md.</p>
      <NovoProduto />
      <table>
        <thead><tr><th>Sistema</th><th>Último dado recebido</th><th className="n">Eventos não processados</th><th></th></tr></thead>
        <tbody>
          {produtos.map((p) => (
            <tr key={p.id}>
              <td>{p.nome}</td>
              <td>{p.ultimo ? new Date(p.ultimo).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "nunca"}</td>
              <td className="n">{p.falhas}</td>
              <td><TrocarChave id={p.id} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

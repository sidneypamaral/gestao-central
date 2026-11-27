import { createHash } from "crypto";
import { sql } from "@/lib/db";
import { processarEvento } from "@/lib/eventos";

// POST /api/eventos  — header: x-api-key
// body: { "tipo": "pagamento.aprovado", "ocorrido_em": "2026-11-27T10:00:00Z", "dados": { ... } }
export async function POST(req: Request) {
  const chave = req.headers.get("x-api-key");
  if (!chave) return Response.json({ erro: "x-api-key ausente" }, { status: 401 });
  const hash = createHash("sha256").update(chave).digest("hex");
  const [produto] = await sql`select id from gestao.produtos where api_key_hash = ${hash} and status = 'ativo'`;
  if (!produto) return Response.json({ erro: "chave inválida" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.tipo) return Response.json({ erro: "campo tipo obrigatório" }, { status: 400 });
  const ocorridoEm = body.ocorrido_em ?? new Date().toISOString();
  const dados = body.dados ?? {};

  const [ev] = await sql`insert into gestao.eventos (produto_id, tipo, ocorrido_em, dados)
    values (${produto.id}, ${body.tipo}, ${ocorridoEm}, ${sql.json(dados)}) returning id`;
  const ok = await processarEvento(produto.id, body.tipo, ocorridoEm, dados);
  if (ok) await sql`update gestao.eventos set processado = true where id = ${ev.id}`;

  return Response.json({ id: ev.id, processado: ok }, { status: 201 });
}

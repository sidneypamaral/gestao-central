"use server";
import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { UUID } from "@/lib/filtro";

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
// Só aceita id no formato UUID e data AAAA-MM-DD; o resto vira vazio.
const id = (f: FormData, k: string) => (UUID.test(txt(f, k)) ? txt(f, k) : null);
const dia = (f: FormData, k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(txt(f, k)) ? txt(f, k) : null);
const hojeBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export async function criarTarefa(f: FormData) {
  const titulo = txt(f, "titulo");
  if (!titulo) return;
  await sql`insert into gestao.tarefas (titulo, tipo, responsavel, prazo, produto_id)
    values (${titulo}, ${txt(f, "tipo") || "operacional"}, ${txt(f, "responsavel") || null},
            ${dia(f, "prazo")}, ${id(f, "produto_id")})`;
  revalidatePath("/", "layout");
}

export async function concluirTarefa(f: FormData) {
  const t = id(f, "id");
  if (!t) return;
  await sql`update gestao.tarefas set status = 'concluida' where id = ${t}`;
  revalidatePath("/", "layout");
}

export async function lancarCusto(f: FormData) {
  const valor = Number(txt(f, "valor").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(valor) || valor <= 0 || !txt(f, "categoria")) return;
  await sql`insert into gestao.custos (categoria, descricao, valor, competencia, produto_id)
    values (${txt(f, "categoria")}, ${txt(f, "descricao") || null}, ${valor},
            ${dia(f, "competencia") ?? hojeBR()}, ${id(f, "produto_id")})`;
  revalidatePath("/", "layout");
}

// Cadastra um SaaS e devolve a chave UMA vez (só o hash fica no banco).
export async function criarProduto(_: unknown, f: FormData): Promise<{ nome?: string; chave?: string; erro?: string }> {
  const nome = txt(f, "nome");
  if (!nome) return { erro: "Informe o nome do sistema." };
  const chave = "gc_" + randomBytes(24).toString("hex");
  const hash = createHash("sha256").update(chave).digest("hex");
  try {
    await sql`insert into gestao.produtos (nome, api_key_hash) values (${nome}, ${hash})`;
  } catch {
    return { erro: "Já existe um sistema com esse nome." };
  }
  revalidatePath("/", "layout");
  return { nome, chave };
}

export async function trocarChave(_: unknown, f: FormData): Promise<{ nome?: string; chave?: string; erro?: string }> {
  const pid = id(f, "id");
  if (!pid) return { erro: "Sistema não encontrado." };
  const chave = "gc_" + randomBytes(24).toString("hex");
  const hash = createHash("sha256").update(chave).digest("hex");
  const [p] = await sql`update gestao.produtos set api_key_hash = ${hash} where id = ${pid} returning nome`;
  if (!p) return { erro: "Sistema não encontrado." };
  return { nome: p.nome, chave };
}

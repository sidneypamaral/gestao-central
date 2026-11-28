"use server";
import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function criarTarefa(f: FormData) {
  const titulo = txt(f, "titulo");
  if (!titulo) return;
  await sql`insert into gestao.tarefas (titulo, tipo, responsavel, prazo, produto_id)
    values (${titulo}, ${txt(f, "tipo") || "operacional"}, ${txt(f, "responsavel") || null},
            ${txt(f, "prazo") || null}, ${txt(f, "produto_id") || null})`;
  revalidatePath("/");
}

export async function concluirTarefa(f: FormData) {
  await sql`update gestao.tarefas set status = 'concluida' where id = ${txt(f, "id")}`;
  revalidatePath("/");
}

export async function lancarCusto(f: FormData) {
  const valor = Number(txt(f, "valor").replace(/\./g, "").replace(",", "."));
  if (!valor || !txt(f, "categoria")) return;
  await sql`insert into gestao.custos (categoria, descricao, valor, competencia, produto_id)
    values (${txt(f, "categoria")}, ${txt(f, "descricao") || null}, ${valor},
            ${txt(f, "competencia") || new Date().toISOString().slice(0, 10)}, ${txt(f, "produto_id") || null})`;
  revalidatePath("/");
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
  revalidatePath("/produtos");
  return { nome, chave };
}

export async function trocarChave(_: unknown, f: FormData): Promise<{ nome?: string; chave?: string; erro?: string }> {
  const id = txt(f, "id");
  const chave = "gc_" + randomBytes(24).toString("hex");
  const hash = createHash("sha256").update(chave).digest("hex");
  const [p] = await sql`update gestao.produtos set api_key_hash = ${hash} where id = ${id} returning nome`;
  if (!p) return { erro: "Sistema não encontrado." };
  return { nome: p.nome, chave };
}

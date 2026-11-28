// Formulário do site (POST com nome, email, telefone e um campo escondido "site" vazio contra robôs). A origem vem de ?utm_source= ou do campo "origem".
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const texto = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(req: Request) {
  const tipo = req.headers.get("content-type") ?? "";
  const d = tipo.includes("json") ? (await req.json().catch(() => null)) ?? {} : Object.fromEntries(await req.formData().catch(() => new FormData()));
  if (texto(d.site, 200)) return NextResponse.json({ ok: true }); // campo escondido: robô preencheu, ignora
  const nome = texto(d.nome, 120), email = texto(d.email, 200);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
  if (!nome || (!email && !texto(d.telefone, 30))) return NextResponse.json({ erro: "Informe nome e e-mail ou telefone." }, { status: 400 });
  const origem = texto(new URL(req.url).searchParams.get("utm_source"), 60) ?? texto(d.origem, 60) ?? "site";
  const { error } = await createAdminClient().from("leads").insert({ nome, email, telefone: texto(d.telefone, 30), origem });
  if (error) return NextResponse.json({ erro: "Não foi possível salvar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

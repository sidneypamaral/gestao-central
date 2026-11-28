"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Entrar e criar conta. Ao criar, o banco abre sozinho uma conta em teste (14 dias) e avisa a central.
export async function entrar(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("senha")) });
  if (error) redirect("/login?erro=" + encodeURIComponent("E-mail ou senha incorretos."));
  redirect("/app");
}

export async function criarConta(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: String(form.get("email")), password: String(form.get("senha")),
    options: { data: { nome: String(form.get("nome") ?? "") } },
  });
  if (error) redirect("/login?erro=" + encodeURIComponent("Não foi possível criar a conta. Confira os dados ou tente entrar."));
  redirect("/login?ok=" + encodeURIComponent("Conta criada. Confira seu e-mail para confirmar e depois entre."));
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

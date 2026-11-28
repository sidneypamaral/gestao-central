// Webhook do Asaas: confere o token, grava o pagamento e o banco avisa a central sozinho.
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { lerEventoAsaas } from "@/lib/asaas";

function tokenConfere(recebido: string | null) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido), b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!tokenConfere(req.headers.get("asaas-access-token"))) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  const ev = lerEventoAsaas(await req.json().catch(() => null));
  const db = createAdminClient();
  if (ev?.cancelada) { // assinatura apagada no Asaas: conta cancelada (o banco avisa a central)
    const { error } = await db.from("contas").update({ situacao: "cancelada" }).eq("asaas_subscription_id", ev.cancelada);
    return error ? NextResponse.json({ erro: "Falha ao cancelar" }, { status: 500 }) : NextResponse.json({ recebido: true });
  }
  if (!ev || !("paymentId" in ev) || !ev.subscription) return NextResponse.json({ recebido: true, ignorado: true }); // confirma para não travar a fila
  const { data, error } = await db.rpc("asaas_registrar_pagamento", {
    p_evento: ev.evento, p_payment_id: ev.paymentId, p_subscription: ev.subscription,
    p_valor_cents: ev.valorCents, p_vencimento: ev.vencimento, p_forma: ev.forma, p_referencia: ev.referencia,
  });
  if (error) return NextResponse.json({ erro: "Falha ao registrar" }, { status: 500 }); // o Asaas tenta de novo
  return NextResponse.json({ recebido: true, resultado: data });
}

// Cobrança no Asaas (só servidor). Endereço em ASAAS_API_URL (padrão: sandbox, para testes).
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

async function asaas<T>(caminho: string, body?: object): Promise<T> { // body = POST; sem body = GET
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) throw new Error("ASAAS_API_KEY não configurada.");
  const base = (process.env.ASAAS_API_URL || "https://api-sandbox.asaas.com/v3").replace(/\/$/, "");
  const res = await fetch(base + caminho, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", access_token: chave, "User-Agent": "NovoSaaS/1.0" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json) throw new Error(json?.errors?.[0]?.description ?? `Asaas recusou (HTTP ${res.status}).`);
  return json as T;
}

/** Cria cliente + assinatura mensal no Asaas para a conta e guarda os ids. O cliente escolhe Pix, boleto ou cartão. */
export async function assinar(contaId: string, valorCents: number, primeiroVencimento: string, descricao: string) {
  const db = createAdminClient();
  const { data: c, error } = await db.from("contas").select("*").eq("id", contaId).single();
  if (error || !c) throw new Error("Conta não encontrada.");
  if (!c.documento) throw new Error("Cadastre o CPF/CNPJ antes de assinar.");
  if (c.asaas_subscription_id) return c.asaas_subscription_id as string;
  const ref = encodeURIComponent(c.id);
  const gravar = async (campos: object) => {
    const { error: e } = await db.from("contas").update(campos).eq("id", c.id);
    if (e) throw new Error("Não foi possível salvar no banco. Tente de novo.");
  };
  // Procura antes de criar (pela referência = id da conta): clique duplo ou falha anterior não cobram em dobro.
  const cliente = c.asaas_customer_id
    ?? (await asaas<{ data: { id: string }[] }>(`/customers?externalReference=${ref}`)).data[0]?.id
    ?? (await asaas<{ id: string }>("/customers", { name: c.nome, cpfCnpj: c.documento, email: c.email ?? undefined, externalReference: c.id })).id;
  await gravar({ asaas_customer_id: cliente });
  const assinatura = (await asaas<{ data: { id: string; status: string }[] }>(`/subscriptions?externalReference=${ref}`))
      .data.find((s) => s.status === "ACTIVE")?.id
    ?? (await asaas<{ id: string }>("/subscriptions", {
      customer: cliente, billingType: "UNDEFINED", cycle: "MONTHLY", value: valorCents / 100,
      nextDueDate: primeiroVencimento, description: descricao, externalReference: c.id,
    })).id;
  await gravar({ asaas_subscription_id: assinatura, valor_mensal_cents: valorCents });
  return assinatura;
}

/** Lê o corpo do webhook; nulo se não for evento de cobrança. */
export function lerEventoAsaas(b: any) {
  const p = b?.payment;
  if (b?.event === "SUBSCRIPTION_DELETED" && typeof b?.subscription?.id === "string")
    return { evento: b.event as string, cancelada: b.subscription.id as string };
  if (typeof b?.event !== "string" || typeof p?.id !== "string") return null;
  const bt = String(p.billingType ?? "");
  return {
    evento: b.event as string, paymentId: p.id as string, cancelada: null,
    referencia: typeof p.externalReference === "string" ? p.externalReference : null,
    subscription: typeof p.subscription === "string" ? p.subscription : null,
    valorCents: typeof p.value === "number" ? Math.round(p.value * 100) : null,
    vencimento: /^\d{4}-\d{2}-\d{2}$/.test(p.dueDate ?? "") ? (p.dueDate as string) : null,
    forma: bt === "PIX" ? "pix" : bt === "BOLETO" ? "boleto" : bt.includes("CARD") ? "cartao" : "outro",
  };
}

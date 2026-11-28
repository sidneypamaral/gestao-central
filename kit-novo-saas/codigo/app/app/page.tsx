// Área logada (troque pelo produto). Mostra a situação da conta do usuário.
import { createClient } from "@/lib/supabase/server";
import { sair } from "../login/actions";

const ROTULO: Record<string, string> = { trial: "Em teste", ativa: "Ativa", inadimplente: "Pagamento pendente", cancelada: "Cancelada" };

export default async function AreaLogada() {
  const supabase = await createClient();
  const { data: conta } = await supabase.from("contas").select("nome, situacao, trial_ate, proxima_renovacao").single();
  return (
    <main style={{ maxWidth: 640, margin: "8vh auto", fontFamily: "system-ui" }}>
      <h1>Olá, {conta?.nome ?? "cliente"}</h1>
      <p>Situação: <strong>{ROTULO[conta?.situacao ?? ""] ?? "—"}</strong>
        {conta?.situacao === "trial" && conta.trial_ate ? ` até ${conta.trial_ate.split("-").reverse().join("/")}` : ""}</p>
      <form action={sair}><button>Sair</button></form>
    </main>
  );
}

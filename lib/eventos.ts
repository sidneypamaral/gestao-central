import { sql } from "./db";

type Dados = Record<string, any>;

// Aplica um evento recebido de um SaaS nas tabelas da central.
export async function processarEvento(produtoId: string, tipo: string, ocorridoEm: string, d: Dados) {
  // Vencimento (fim do teste ou próxima renovação): só aceita data AAAA-MM-DD; outro valor vira vazio.
  const venceEm = typeof d.vence_em === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.vence_em) ? d.vence_em : null;
  const cliente = async () => {
    if (!d.cliente_id) return null;
    const [c] = await sql`
      insert into gestao.clientes (produto_id, id_externo, nome, email, documento)
      values (${produtoId}, ${d.cliente_id}, ${d.nome ?? d.cliente_id}, ${d.email ?? null}, ${d.documento ?? null})
      on conflict (produto_id, id_externo) do update
        set nome = coalesce(${d.nome ?? null}::text, gestao.clientes.nome),
            email = coalesce(excluded.email, gestao.clientes.email),
            documento = coalesce(excluded.documento, gestao.clientes.documento)
      returning id`;
    return c.id as string;
  };

  switch (tipo) {
    case "lead.criado":
      await sql`insert into gestao.leads (produto_id, id_externo, nome, email, telefone, origem, criado_em)
        values (${produtoId}, ${d.lead_id ?? null}, ${d.nome ?? null}, ${d.email ?? null}, ${d.telefone ?? null},
                ${d.origem ?? null}, ${ocorridoEm})
        on conflict (produto_id, id_externo) do nothing`;
      // Lead de quem já é cliente entra no funil na etapa certa.
      if (d.email)
        await sql`update gestao.leads l set etapa = case a.status when 'ativa' then 'ganho' when 'trial' then 'trial' else l.etapa end
          from gestao.clientes c join gestao.assinaturas a on a.cliente_id = c.id
          where l.produto_id = ${produtoId} and c.produto_id = ${produtoId} and lower(c.email) = lower(${d.email})
            and lower(l.email) = lower(${d.email}) and l.etapa in ('novo','contato')`;
      break;
    case "cliente.criado":
      await cliente();
      break;
    case "assinatura.iniciada": {
      const cid = await cliente();
      await sql`insert into gestao.assinaturas (produto_id, cliente_id, id_externo, status, valor_mensal, iniciada_em, vence_em)
        values (${produtoId}, ${cid}, ${d.assinatura_id}, ${d.status ?? "ativa"}, ${d.valor_mensal ?? 0}, ${ocorridoEm}, ${venceEm})
        on conflict (produto_id, id_externo) do update
          set status = excluded.status, valor_mensal = excluded.valor_mensal, vence_em = case when ${"vence_em" in d}::boolean then excluded.vence_em else gestao.assinaturas.vence_em end`;
      break;
    }
    case "assinatura.alterada":
      await sql`update gestao.assinaturas
        set status = coalesce(${d.status ?? null}, status), valor_mensal = coalesce(${d.valor_mensal ?? null}, valor_mensal),
            vence_em = case when ${"vence_em" in d}::boolean then ${venceEm}::date else vence_em end,
            cancelada_em = case when ${d.status ?? null}::text = 'cancelada' then ${ocorridoEm}::timestamptz else cancelada_em end
        where produto_id = ${produtoId} and id_externo = ${d.assinatura_id}`;
      break;
    case "assinatura.cancelada":
      await sql`update gestao.assinaturas set status = 'cancelada', cancelada_em = ${ocorridoEm}
        where produto_id = ${produtoId} and id_externo = ${d.assinatura_id}`;
      break;
    case "pagamento.aprovado":
    case "pagamento.falhou": {
      const cid = await cliente();
      await sql`insert into gestao.pagamentos (produto_id, cliente_id, id_externo, valor, status, meio, pago_em)
        values (${produtoId}, ${cid}, ${d.pagamento_id ?? null}, ${d.valor ?? 0},
                ${tipo === "pagamento.aprovado" ? "aprovado" : "falhou"}, ${d.meio ?? null}, ${ocorridoEm})
        on conflict (produto_id, id_externo) do nothing`;
      break;
    }
    case "suporte.aberto": {
      const cid = await cliente();
      await sql`insert into gestao.tarefas (produto_id, cliente_id, tipo, titulo)
        values (${produtoId}, ${cid}, 'suporte', ${d.titulo ?? "Chamado de suporte"})`;
      break;
    }
    default:
      return false;
  }
  // Conversão automática do funil: lead com o mesmo e-mail avança quando vira trial ou assinante.
  if (tipo.startsWith("assinatura.") && d.email) {
    const etapa = d.status === "ativa" ? "ganho" : d.status === "trial" ? "trial" : null;
    if (etapa)
      await sql`update gestao.leads set etapa = ${etapa}
        where produto_id = ${produtoId} and lower(email) = lower(${d.email})
          and etapa <> 'ganho' and (${etapa} = 'ganho' or etapa in ('novo','contato'))`;
  }
  return true;
}

import { sql } from "./db";

type Dados = Record<string, any>;

// Aplica um evento recebido de um SaaS nas tabelas da central.
export async function processarEvento(produtoId: string, tipo: string, ocorridoEm: string, d: Dados) {
  const cliente = async () => {
    if (!d.cliente_id) return null;
    const [c] = await sql`
      insert into gestao.clientes (produto_id, id_externo, nome, email, documento)
      values (${produtoId}, ${d.cliente_id}, ${d.nome ?? d.cliente_id}, ${d.email ?? null}, ${d.documento ?? null})
      on conflict (produto_id, id_externo) do update
        set nome = coalesce(excluded.nome, gestao.clientes.nome),
            email = coalesce(excluded.email, gestao.clientes.email)
      returning id`;
    return c.id as string;
  };

  switch (tipo) {
    case "lead.criado":
      await sql`insert into gestao.leads (produto_id, nome, email, telefone, origem)
        values (${produtoId}, ${d.nome ?? null}, ${d.email ?? null}, ${d.telefone ?? null}, ${d.origem ?? null})`;
      break;
    case "cliente.criado":
      await cliente();
      break;
    case "assinatura.iniciada": {
      const cid = await cliente();
      await sql`insert into gestao.assinaturas (produto_id, cliente_id, id_externo, status, valor_mensal, iniciada_em)
        values (${produtoId}, ${cid}, ${d.assinatura_id}, ${d.status ?? "ativa"}, ${d.valor_mensal ?? 0}, ${ocorridoEm})`;
      break;
    }
    case "assinatura.alterada":
      await sql`update gestao.assinaturas
        set status = coalesce(${d.status ?? null}, status), valor_mensal = coalesce(${d.valor_mensal ?? null}, valor_mensal)
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
                ${tipo === "pagamento.aprovado" ? "aprovado" : "falhou"}, ${d.meio ?? null}, ${ocorridoEm})`;
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
  return true;
}

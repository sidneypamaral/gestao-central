import { sql } from "@/lib/db";
import { lerFiltro, brl, pct, rotuloMes, type Busca } from "@/lib/filtro";
import { Topo, Periodo, Painel, Kpis, Linha, Barrinhas, Destaques, ProximoPasso, Vazio } from "@/components/ui";
import { dadosLeads, mrrMensal, prazoTag, alertasClientes, alertaTag } from "@/lib/consultas";

export const dynamic = "force-dynamic";
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export default async function VisaoGeral({ searchParams }: { searchParams: Busca }) {
  const f = await lerFiltro(searchParams);
  const P = f.doProduto;
  const q = f.produto ? `?produto=${f.produto}` : "";
  const [[k], serie, leads, tarefas, alertas] = await Promise.all([
    sql`select
      (select coalesce(sum(valor_mensal),0) from gestao.assinaturas where status = 'ativa' ${P()}) as mrr,
      (select count(*) from gestao.assinaturas where status = 'ativa' ${P()})::int as ativos,
      (select coalesce(sum(valor),0) from gestao.pagamentos where status = 'aprovado' and pago_em >= date_trunc('month', now()) ${P()}) as receita,
      (select coalesce(sum(valor),0) from gestao.custos where competencia >= date_trunc('month', now()) ${P()}) as custos,
      (select count(*) from gestao.custos where competencia >= date_trunc('month', now()) ${P()})::int as n_custos,
      (select count(*) from gestao.assinaturas where status = 'cancelada' and cancelada_em >= date_trunc('month', now()) ${P()})::int as cancel,
      (select count(*) from gestao.tarefas where status <> 'concluida' and prazo < (now() at time zone 'America/Sao_Paulo')::date ${P()})::int as atrasadas,
      (select count(*) from gestao.assinaturas where (status = 'inadimplente'
         or (status = 'ativa' and vence_em < (now() at time zone 'America/Sao_Paulo')::date)) ${P()})::int as cobrar,
      (select count(*) from gestao.assinaturas where status = 'trial'
         and vence_em between (now() at time zone 'America/Sao_Paulo')::date and (now() at time zone 'America/Sao_Paulo')::date + 3 ${P()})::int as testes`,
    mrrMensal(f),
    dadosLeads(f),
    sql`select titulo, tipo, prazo from gestao.tarefas where status <> 'concluida' ${P()}
        order by prazo nulls last, criado_em limit 5`,
    alertasClientes(f),
  ]);

  // Jornada: quantos leads do período chegaram a cada etapa (quem está numa etapa passou pelas anteriores).
  const n = (e: string) => leads.funil.find((x) => x.etapa === e)?.n ?? 0;
  const captacao = leads.funil.reduce((s, e) => s + e.n, 0);
  const clientes = n("ganho"), trial = n("trial") + clientes, contato = n("contato") + trial;
  const jornada: [string, string, string?][] = [
    ["Captação", String(captacao), "leads no período"],
    ["Contato", String(contato), `${pct(contato, captacao)}% da etapa anterior`],
    ["Trial", String(trial), `${pct(trial, contato)}% da etapa anterior`],
    ["Clientes", String(clientes), `${pct(clientes, trial)}% da etapa anterior`],
  ];

  // Próximo passo: a ação mais urgente, calculada a partir dos dados.
  const { cobrar, testes } = k;
  const passo =
    cobrar ? { titulo: `Cobre ${plural(cobrar, "cliente com pagamento atrasado", "clientes com pagamento atrasado")}`, motivo: "Receita que já deveria ter entrado.", href: "#atencao", acao: "Ver quem" }
    : k.atrasadas ? { titulo: `Resolva ${plural(k.atrasadas, "tarefa atrasada", "tarefas atrasadas")}`, motivo: "Passaram do prazo combinado.", href: `/operacional${q}`, acao: "Ver tarefas" }
    : testes ? { titulo: `Fale com ${plural(testes, "cliente cujo teste acaba em breve", "clientes cujo teste acaba em breve")}`, motivo: "São quem está mais perto de virar assinante.", href: "#atencao", acao: "Ver quem" }
    : n("novo") ? { titulo: `Entre em contato com ${plural(n("novo"), "lead novo", "leads novos")}`, motivo: "Quanto antes o contato, maior a chance de fechar.", href: `/comercial${q}`, acao: "Ver leads" }
    : !k.n_custos ? { titulo: "Lance os custos do mês", motivo: "Sem eles o resultado do mês fica errado.", href: `/financeiro${q}`, acao: "Lançar custos" }
    : { titulo: "Tudo em dia", motivo: "Aproveite para ver quais canais trazem mais leads.", href: `/marketing${q}`, acao: "Ver marketing" };

  const mrr = Number(k.mrr);
  const valores = serie.map((s, i) => (i === serie.length - 1 ? mrr : Number(s.mrr)));
  const anterior = valores[valores.length - 2] ?? 0;
  const variacao = anterior ? Math.round(((mrr - anterior) / anterior) * 100) : null;
  const resultado = Number(k.receita) - Number(k.custos);
  const mes = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

  return (
    <>
      <Topo titulo="Visão geral" sub={`Do lead ao cliente, nos últimos ${f.dias} dias (pela etapa atual de cada lead)`} direita={<Periodo dias={f.dias} produto={f.produto} caminho="/" />}>
        <Destaques itens={jornada} etapas />
        <ProximoPasso {...passo} />
      </Topo>
      <div className="corpo">
        <div className="g hero">
          <Painel titulo="Receita recorrente mensal (MRR)" desc="Quanto entra todo mês com as assinaturas ativas">
            <div className="mrr-num">
              {brl(mrr)}
              {variacao !== null && <span className={`var ${variacao < 0 ? "neg" : ""}`}>{variacao >= 0 ? "+" : ""}{variacao}% no mês</span>}
            </div>
            <Linha valores={valores} rotulos={serie.map((s) => rotuloMes(s.mes))} />
          </Painel>
          <Painel titulo="Este mês" desc={mes[0].toUpperCase() + mes.slice(1)}>
            <Kpis itens={[
              ["Clientes ativos", String(k.ativos)], ["Receita", brl(k.receita)],
              ["Custos", brl(k.custos)], ["Resultado", brl(resultado), resultado < 0],
              ["Cancelamentos", String(k.cancel), k.cancel > 0], ["Tarefas atrasadas", String(k.atrasadas), k.atrasadas > 0],
            ]} />
          </Painel>
        </div>
        <div className="g duas">
          <Painel titulo="De onde vêm os leads" desc={`Últimos ${f.dias} dias`}>
            <Barrinhas itens={leads.origens.map((o) => ({ nome: o.origem, n: o.leads }))} vazio="Nenhum lead no período." />
          </Painel>
          <section className="p" id="atencao">
            <h2>Precisa de atenção</h2>
            <p className="d">Pagamentos e testes vencendo, e tarefas com prazo mais próximo</p>
            {tarefas.length + alertas.length === 0 ? <Vazio>Nada pendente.</Vazio> : (
              <table><tbody>
                {alertas.map((a, i) => {
                  const [c, txt] = alertaTag(a.tipo, a.dias);
                  return <tr key={`a${i}`}><td>{a.nome}</td><td className="n"><span className={`tag ${c}`}>{txt}</span></td></tr>;
                })}
                {tarefas.map((t, i) => {
                  const [c, txt] = prazoTag(t.prazo);
                  return <tr key={i}><td>{t.titulo}{t.tipo === "suporte" ? <span className="mut"> · suporte</span> : null}</td><td className="n"><span className={`tag ${c}`}>{txt}</span></td></tr>;
                })}
              </tbody></table>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

import { sql } from "@/lib/db";

export type Busca = Promise<Record<string, string | string[] | undefined>>;

export const PERIODOS = [
  { dias: 7, nome: "7 dias" },
  { dias: 30, nome: "30 dias" },
  { dias: 90, nome: "90 dias" },
  { dias: 365, nome: "12 meses" },
];

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lê os filtros da URL (?produto=<id>&dias=30) de forma segura.
export async function lerFiltro(busca: Busca) {
  const b = await busca;
  const p = typeof b.produto === "string" && UUID.test(b.produto) ? b.produto : null;
  const d = Number(b.dias);
  const dias = PERIODOS.some((x) => x.dias === d) ? d : 30;
  // Pedaço de SQL reaproveitável: filtra pelo sistema escolhido (ou nada, se "Todos").
  const doProduto = (col = "produto_id") => (p ? sql`and ${sql(col)} = ${p}` : sql``);
  return { produto: p, dias, doProduto };
}

export const brl = (v: number | string, cent = false) =>
  Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: cent ? 2 : 0,
    maximumFractionDigits: cent ? 2 : 0,
  });

export const data = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" }) : "";

export const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

export const rotuloMes = (d: Date | string) =>
  new Date(d).toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "");

import Link from "next/link";
import { sql } from "@/lib/db";
import { PERIODOS, brl } from "@/lib/filtro";
import { Barra } from "@/components/menu";

// Peças visuais do painel (sem JavaScript no navegador: tudo vira HTML/SVG no servidor).

// Faixa azul do topo: menu, título e os números principais da página.
export async function Topo({ titulo, sub, direita, children }: { titulo: string; sub: string; direita?: React.ReactNode; children?: React.ReactNode }) {
  let produtos: { id: string; nome: string }[] = [];
  try {
    produtos = (await sql`select id, nome from gestao.produtos order by nome`) as unknown as typeof produtos;
  } catch (e) {
    console.error("Topo: não consegui listar os sistemas", e);
  }
  return (
    <section className="banda">
      <Barra produtos={produtos} />
      <div className="banda-topo">
        <div><h1>{titulo}</h1><p className="sub">{sub}</p></div>
        {direita}
      </div>
      {children}
    </section>
  );
}

// Cartões translúcidos com os números principais (dentro da faixa azul).
export function Destaques({ itens, etapas = false }: { itens: [string, string, string?, boolean?][]; etapas?: boolean }) {
  return (
    <ol className={`destaques ${etapas ? "etapas" : ""}`}>
      {itens.map(([nome, n, det, neg]) => (
        <li key={nome} className="dq">
          <div className="nome">{nome}</div>
          <div className={`n ${neg ? "neg" : ""}`}>{n}</div>
          {det && <div className="det">{det}</div>}
        </li>
      ))}
    </ol>
  );
}

export function ProximoPasso({ titulo, motivo, href, acao }: { titulo: string; motivo: string; href: string; acao: string }) {
  return (
    <div className="proximo">
      <div><small>Próximo passo</small><strong>{titulo}</strong><p>{motivo}</p></div>
      <Link className="btn" href={href}>{acao}</Link>
    </div>
  );
}

// Lista de barras horizontais (ex.: origem dos leads).
export function Barrinhas({ itens, vazio }: { itens: { nome: string; n: number }[]; vazio: string }) {
  const max = Math.max(...itens.map((i) => i.n), 1);
  if (!itens.length) return <Vazio>{vazio}</Vazio>;
  return (
    <ul className="barrinhas">
      {itens.map((i) => (
        <li key={i.nome}><span>{i.nome}</span><div><i style={{ width: `${(i.n / max) * 100}%` }} /></div><b>{i.n}</b></li>
      ))}
    </ul>
  );
}

export function Periodo({ dias, produto, caminho }: { dias: number; produto: string | null; caminho: string }) {
  return (
    <nav className="periodo" aria-label="Período">
      {PERIODOS.map((p) => {
        const q = new URLSearchParams({ dias: String(p.dias), ...(produto ? { produto } : {}) });
        return (
          <Link key={p.dias} href={`${caminho}?${q}`} className={p.dias === dias ? "on" : ""} aria-current={p.dias === dias ? "true" : undefined}>
            {p.nome}
          </Link>
        );
      })}
    </nav>
  );
}

export function Painel({ titulo, desc, className = "", children }: { titulo: string; desc?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`p ${className}`}>
      <h2>{titulo}</h2>
      {desc && <p className="d">{desc}</p>}
      {children}
    </section>
  );
}

export function Kpis({ itens }: { itens: [string, string, boolean?][] }) {
  return (
    <div className="kpis">
      {itens.map(([r, v, neg]) => (
        <div className="kpi" key={r}><div className="r">{r}</div><div className={`v ${neg ? "neg" : ""}`}>{v}</div></div>
      ))}
    </div>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="vazio">{children}</p>;
}

const ETAPAS: Record<string, string> = { novo: "Novo", contato: "Contato", trial: "Trial", ganho: "Ganho", perdido: "Perdido" };
export const nomeEtapa = (e: string) => ETAPAS[e] ?? e;
export function TagEtapa({ etapa }: { etapa: string }) {
  const c = etapa === "perdido" ? "ruim" : etapa === "contato" || etapa === "novo" ? "alerta" : "";
  return <span className={`tag ${c}`}>{nomeEtapa(etapa)}</span>;
}

// Gráfico de linha (MRR).
export function Linha({ valores, rotulos }: { valores: number[]; rotulos: string[] }) {
  const w = 640, h = 200, n = valores.length;
  const topo = Math.max(...valores, 1) * 1.15;
  const px = (i: number) => 34 + (i * (w - 54)) / Math.max(n - 1, 1);
  const py = (v: number) => h - 26 - (v / topo) * (h - 46);
  const pts = valores.map((v, i) => `${px(i)},${py(v)}`).join(" ");
  const k = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace(".0", "")}k` : String(Math.round(v)));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="MRR nos últimos meses">
      <defs>
        <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2FA35B" stopOpacity=".22" /><stop offset="1" stopColor="#2FA35B" stopOpacity="0" /></linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1="34" x2={w - 20} y1={py((topo / 1.15) * f)} y2={py((topo / 1.15) * f)} stroke="var(--bd)" />
          <text x="0" y={py((topo / 1.15) * f) + 4}>{k((topo / 1.15) * f)}</text>
        </g>
      ))}
      <polygon points={`${px(0)},${h - 26} ${pts} ${px(n - 1)},${h - 26}`} fill="url(#ga)" />
      <polyline points={pts} fill="none" stroke="#2FA35B" strokeWidth="3" strokeLinejoin="round" />
      {valores.map((v, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(v)} r={i === n - 1 ? 5 : 3} fill="var(--sf)" stroke="#2FA35B" strokeWidth="2.5"><title>{`${rotulos[i]}: ${brl(v)}`}</title></circle>
          <text x={px(i)} y={h - 6} textAnchor="middle">{rotulos[i]}</text>
        </g>
      ))}
    </svg>
  );
}

// Barras lado a lado: receita x custos.
export function Barras({ a, b, rotulos }: { a: number[]; b: number[]; rotulos: string[] }) {
  const w = 640, h = 220, topo = Math.max(...a, ...b, 1) * 1.1, bw = (w - 50) / a.length;
  const py = (v: number) => h - 26 - (v / topo) * (h - 40);
  return (
    <>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Receita e custos por mês">
                <line x1="20" x2={w - 10} y1={h - 26} y2={h - 26} stroke="var(--bd)" />
        {a.map((v, i) => {
          const x = 30 + i * bw;
          return (
            <g key={i}>
              <rect x={x} y={py(v)} width={bw * 0.36} height={h - 26 - py(v)} rx="4" fill="var(--azul)"><title>{`Receita ${rotulos[i]}: ${brl(v)}`}</title></rect>
              <rect x={x + bw * 0.4} y={py(b[i])} width={bw * 0.36} height={h - 26 - py(b[i])} rx="4" fill="#2FA35B"><title>{`Custos ${rotulos[i]}: ${brl(b[i])}`}</title></rect>
              <text x={x + bw * 0.38} y={h - 6} textAnchor="middle">{rotulos[i]}</text>
            </g>
          );
        })}
      </svg>
      <div className="leg"><span><i style={{ background: "var(--azul)" }} />Receita</span><span><i style={{ background: "#2FA35B" }} />Custos</span></div>
    </>
  );
}

// Funil em barras, com a taxa de passagem entre etapas.
export function Funil({ etapas }: { etapas: { etapa: string; n: number }[] }) {
  const max = Math.max(...etapas.map((e) => e.n), 1);
  return (
    <div className="funil">
      {etapas.map((e, i) => (
        <div key={e.etapa}>
          <div className={`et ${e.etapa}`}>
            <span>{nomeEtapa(e.etapa)}</span>
            <div className="barra"><i style={{ width: `${(e.n / max) * 100}%` }} /></div>
            <span className="n">{e.n}</span>
          </div>
          {i > 0 && i < 4 && etapas[i - 1].n > 0 && (
            <div className="conv">{Math.round((100 * e.n) / etapas[i - 1].n)}% passaram da etapa anterior</div>
          )}
        </div>
      ))}
    </div>
  );
}

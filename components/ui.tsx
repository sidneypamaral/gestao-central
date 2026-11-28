import Link from "next/link";
import { sql } from "@/lib/db";
import { PERIODOS, brl } from "@/lib/filtro";
import { Barra } from "@/components/menu";

// Peças visuais do painel no estilo "Cockpit": faixa azul de comando no topo e cartões em relevo no corpo branco.

type Hero = { rotulo: string; valor: string; delta?: string; deltaNeg?: boolean; serie?: number[] };

// Faixa azul do topo: menu, número principal da página (com minigráfico) e um quadro à direita.
export async function Topo({ titulo, hero, direita }: { titulo: string; hero: Hero; direita?: React.ReactNode }) {
  let produtos: { id: string; nome: string }[] = [];
  try {
    produtos = (await sql`select id, nome from gestao.produtos order by nome`) as unknown as typeof produtos;
  } catch (e) {
    console.error("Topo: não consegui listar os sistemas", e);
  }
  return (
    <section className="banda">
      <Barra produtos={produtos} />
      <div className="cockpit">
        <div className="hero">
          <h1>{titulo}</h1>
          <div className="rot">{hero.rotulo}</div>
          <div className="big">
            {hero.valor}
            {hero.delta && <span className={`delta ${hero.deltaNeg ? "neg" : ""}`}>{hero.delta}</span>}
          </div>
          {hero.serie && hero.serie.length > 1 && <Spark valores={hero.serie} />}
        </div>
        {direita && <div className="lado">{direita}</div>}
      </div>
    </section>
  );
}

function Spark({ valores }: { valores: number[] }) {
  const w = 300, h = 50, max = Math.max(...valores, 1), min = Math.min(...valores, 0);
  const pts = valores.map((v, i) => `${(i * w) / (valores.length - 1)},${h - 4 - ((v - min) / (max - min || 1)) * (h - 8)}`).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="#22C55E" strokeWidth="7" opacity=".35" style={{ filter: "blur(3px)" }} />
      <polyline points={pts} fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

// Blocos 3D na faixa azul (funil, origens, contagens). "proporcional" faz a largura seguir o número.
export function Blocos({ titulo, itens, legenda, proporcional = false }: {
  titulo: string; itens: { n: string | number; nome: string; destaque?: boolean; neg?: boolean }[]; legenda?: string[]; proporcional?: boolean;
}) {
  const tons = ["#1E3F80", "#2856A8", "#3A6FD0", "#4A82E8"];
  return (
    <div>
      <div className="lado-tit">{titulo}</div>
      <div className="blocos">
        {itens.map((b, i) => (
          <div key={b.nome} className={`bloco3d ${b.destaque ? "ok" : ""} ${b.neg ? "neg" : ""}`}
            style={{ flex: proporcional ? Math.max(Number(b.n) || 0, 1) : 1, background: b.destaque || b.neg ? undefined : tons[i % tons.length] }}>
            <b>{b.n}</b><span>{b.nome}</span>
          </div>
        ))}
      </div>
      {legenda && <div className="blocos-leg">{legenda.map((l) => <span key={l}>{l}</span>)}</div>}
    </div>
  );
}

// Faixa "Agora" logo abaixo do azul: a ação mais importante do momento.
export function Agora({ titulo, motivo, href, acao }: { titulo: string; motivo: string; href: string; acao: string }) {
  return (
    <div className="agora">
      <span className="agora-tag">AGORA</span>
      <span><b>{titulo}</b> {motivo}</span>
      <Link href={href}>{acao}</Link>
    </div>
  );
}

const ICONES: Record<string, string> = {
  pessoas: "M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a4 4 0 00-3-3.9M15 4.1a3 3 0 010 5.8",
  entrada: "M12 3v12M7 10l5 5 5-5M5 21h14",
  saida: "M12 21V9M7 14l5-5 5 5M5 3h14",
  resultado: "M4 20h16M7 16V9M12 16V5M17 16v-4",
  alvo: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8z",
  relogio: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  alerta: "M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  funil: "M3 4h18l-7 8v6l-4 2v-8z",
  megafone: "M3 11v2l13 5V6zM16 9a3 3 0 010 6",
  ticket: "M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z",
  plug: "M8 3v4M16 3v4M6 7h12v4a6 6 0 01-12 0zM12 17v4",
};

// Cartões de indicador em relevo, com ícone 3D. Item: [rótulo, valor, detalhe?, negativo?, ícone, verde?]
export function Indicadores({ itens }: { itens: [string, string, string | undefined, boolean | undefined, string, boolean?][] }) {
  return (
    <div className="indicadores">
      {itens.map(([r, v, det, neg, ic, verde]) => (
        <div key={r} className="ind relevo rel">
          <i className={`chip ${verde ? "v" : ""}`} aria-hidden="true"><svg viewBox="0 0 24 24"><path d={ICONES[ic] ?? ICONES.resultado} /></svg></i>
          <div>
            <span>{r}</span>
            <strong className={neg ? "neg" : ""}>{v}</strong>
            {det && <em className={neg ? "neg" : ""}>{det}</em>}
          </div>
        </div>
      ))}
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
    <section className={`p relevo rel ${className}`}>
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
        <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2F6BFF" stopOpacity=".22" /><stop offset="1" stopColor="#2FA35B" stopOpacity="0" /></linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1="34" x2={w - 20} y1={py((topo / 1.15) * f)} y2={py((topo / 1.15) * f)} stroke="var(--bd)" />
          <text x="0" y={py((topo / 1.15) * f) + 4}>{k((topo / 1.15) * f)}</text>
        </g>
      ))}
      <polygon points={`${px(0)},${h - 26} ${pts} ${px(n - 1)},${h - 26}`} fill="url(#ga)" />
      <polyline points={pts} fill="none" stroke="#2F6BFF" strokeWidth="3" strokeLinejoin="round" />
      {valores.map((v, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(v)} r={i === n - 1 ? 5 : 3} fill="var(--sf)" stroke="#2F6BFF" strokeWidth="2.5"><title>{`${rotulos[i]}: ${brl(v)}`}</title></circle>
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

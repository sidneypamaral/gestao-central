import Link from "next/link";
import { PERIODOS, brl } from "@/lib/filtro";

// Peças visuais do painel (sem JavaScript no navegador: tudo vira HTML/SVG no servidor).

export function Topo({ titulo, sub, children }: { titulo: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="topo">
      <div><h1>{titulo}</h1><p>{sub}</p></div>
      {children}
    </div>
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

// Gráfico de linha (MRR). Feito para ficar sobre o cartão em degradê.
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
        <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <filter id="gl"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1="34" x2={w - 20} y1={py((topo / 1.15) * f)} y2={py((topo / 1.15) * f)} stroke="rgba(255,255,255,.18)" />
          <text x="0" y={py((topo / 1.15) * f) + 4}>{k((topo / 1.15) * f)}</text>
        </g>
      ))}
      <polygon points={`${px(0)},${h - 26} ${pts} ${px(n - 1)},${h - 26}`} fill="url(#ga)" />
      <polyline points={pts} fill="none" stroke="#5EEAD4" strokeWidth="6" opacity=".6" filter="url(#gl)" />
      <polyline points={pts} fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      {valores.map((v, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(v)} r={i === n - 1 ? 6 : 3.5} fill="#4F46E5" stroke="#fff" strokeWidth="2"><title>{`${rotulos[i]}: ${brl(v)}`}</title></circle>
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
        <defs>
          <linearGradient id="br" x1="0" x2="1"><stop offset="0" stopColor="#818CF8" /><stop offset=".5" stopColor="#6366F1" /><stop offset="1" stopColor="#3730A3" /></linearGradient>
          <linearGradient id="bc" x1="0" x2="1"><stop offset="0" stopColor="#5EEAD4" /><stop offset=".5" stopColor="#14B8A6" /><stop offset="1" stopColor="#0F766E" /></linearGradient>
        </defs>
        <line x1="20" x2={w - 10} y1={h - 26} y2={h - 26} stroke="var(--bd)" />
        {a.map((v, i) => {
          const x = 30 + i * bw;
          return (
            <g key={i}>
              <rect x={x} y={py(v)} width={bw * 0.36} height={h - 26 - py(v)} rx="4" fill="url(#br)"><title>{`Receita ${rotulos[i]}: ${brl(v)}`}</title></rect>
              <rect x={x + bw * 0.4} y={py(b[i])} width={bw * 0.36} height={h - 26 - py(b[i])} rx="4" fill="url(#bc)"><title>{`Custos ${rotulos[i]}: ${brl(b[i])}`}</title></rect>
              <text x={x + bw * 0.38} y={h - 6} textAnchor="middle">{rotulos[i]}</text>
            </g>
          );
        })}
      </svg>
      <div className="leg"><span><i style={{ background: "#6366F1" }} />Receita</span><span><i style={{ background: "#14B8A6" }} />Custos</span></div>
    </>
  );
}

const CORES = ["#6366F1", "#14B8A6", "#F59E0B", "#EC4899", "#0EA5E9", "#94A3B8"];

// Rosca com sombra (origem dos leads).
export function Rosca({ itens }: { itens: { nome: string; n: number }[] }) {
  const total = itens.reduce((s, o) => s + o.n, 0);
  if (!total) return <Vazio>Nenhum lead no período.</Vazio>;
  const c = 2 * Math.PI * 52;
  let acc = 0;
  const arcos = itens.slice(0, 6).map((o, i) => {
    const f = o.n / total;
    const el = (
      <circle key={o.nome} r="52" cx="70" cy="70" fill="none" stroke={CORES[i]} strokeWidth="22"
        strokeDasharray={`${Math.max(f * c - 2, 0.5)} ${c}`} strokeDashoffset={-acc * c} transform="rotate(-90 70 70)">
        <title>{`${o.nome}: ${o.n}`}</title>
      </circle>
    );
    acc += f;
    return el;
  });
  return (
    <div className="rosca">
      <svg viewBox="0 0 140 150" width="150" role="img" aria-label="Origem dos leads">
        <g transform="translate(0,6)" opacity=".35">{arcos}</g>
        {arcos}
        <text x="70" y="70" textAnchor="middle" className="rosca-n">{total}</text>
        <text x="70" y="88" textAnchor="middle">leads</text>
      </svg>
      <ul>
        {itens.slice(0, 6).map((o, i) => (
          <li key={o.nome}><i style={{ background: CORES[i] }} />{o.nome} <b>{o.n}</b></li>
        ))}
      </ul>
    </div>
  );
}

// Funil em barras 3D, com a taxa de passagem entre etapas.
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

"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const PAGINAS: [string, string][] = [
  ["/", "Visão geral"], ["/financeiro", "Financeiro"], ["/comercial", "Comercial"],
  ["/marketing", "Marketing"], ["/operacional", "Operacional"], ["/produtos", "Sistemas"],
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Links() {
  const caminho = usePathname();
  const p = useSearchParams().get("produto") ?? "";
  const q = UUID.test(p) ? `?${new URLSearchParams({ produto: p })}` : "";
  return (
    <nav className="menu" aria-label="Módulos">
      {PAGINAS.map(([href, nome]) => (
        <Link key={href} href={href + q} className={caminho === href ? "on" : ""} aria-current={caminho === href ? "page" : undefined}>{nome}</Link>
      ))}
    </nav>
  );
}

function Sistema({ produtos }: { produtos: { id: string; nome: string }[] }) {
  const router = useRouter();
  const caminho = usePathname();
  const busca = useSearchParams();
  return (
    <select className="sis" aria-label="Sistema" value={busca.get("produto") ?? ""}
      onChange={(e) => {
        const q = new URLSearchParams(busca.toString());
        if (e.target.value) q.set("produto", e.target.value); else q.delete("produto");
        router.push(`${caminho}${q.size ? `?${q}` : ""}`);
      }}>
      <option value="">Todos os sistemas</option>
      {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
    </select>
  );
}

// Claro é o padrão; o escuro só liga se a pessoa escolher (fica salvo no navegador).
function Tema() {
  const [t, setT] = useState("light");
  useEffect(() => { try { setT(localStorage.getItem("tema") === "dark" ? "dark" : "light"); } catch {} }, []);
  const escolher = (v: string) => {
    setT(v);
    document.documentElement.setAttribute("data-theme", v);
    try { localStorage.setItem("tema", v); } catch {}
  };
  return (
    <div className="tema" role="group" aria-label="Tema">
      {[["light", "Claro"], ["dark", "Escuro"]].map(([v, n]) => (
        <button key={v} type="button" className={t === v ? "on" : ""} aria-pressed={t === v} onClick={() => escolher(v)}>{n}</button>
      ))}
    </div>
  );
}

export function Barra({ produtos }: { produtos: { id: string; nome: string }[] }) {
  return (
    <header className="barra">
      <Link href="/" className="marca"><b aria-hidden="true">C</b><span>Central de Gestão</span></Link>
      <Suspense><Links /></Suspense>
      <div className="ctl">
        <Suspense><Sistema produtos={produtos} /></Suspense>
        <Tema />
      </div>
    </header>
  );
}

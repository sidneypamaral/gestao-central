"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const ICONES: Record<string, string> = {
  "/": "M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z",
  "/financeiro": "M3 17l5-5 4 4 8-8M15 8h5v5",
  "/comercial": "M3 4h18l-7 8v6l-4 2v-8z",
  "/marketing": "M3 11v2l13 5V6zM16 9a3 3 0 010 6M6 14l1 5h3l-1-4",
  "/operacional": "M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9",
  "/produtos": "M8 3v4M16 3v4M6 7h12v4a6 6 0 01-12 0zM12 17v4",
};
const PAGINAS: [string, string][] = [
  ["/", "Visão geral"], ["/financeiro", "Financeiro"], ["/comercial", "Comercial"],
  ["/marketing", "Marketing"], ["/operacional", "Operacional"], ["/produtos", "Sistemas conectados"],
];

function Links() {
  const caminho = usePathname();
  const busca = useSearchParams();
  const p = busca.get("produto") ?? "";
  const produto = /^[0-9a-f-]{36}$/i.test(p) ? p : null;
  return (
    <nav className="links" aria-label="Módulos">
      {PAGINAS.map(([href, nome]) => (
        <Link key={href} href={produto ? `${href}?produto=${produto}` : href} className={caminho === href ? "on" : ""} aria-current={caminho === href ? "page" : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONES[href]} /></svg>{nome}
        </Link>
      ))}
    </nav>
  );
}

function Sistema({ produtos }: { produtos: { id: string; nome: string }[] }) {
  const router = useRouter();
  const caminho = usePathname();
  const busca = useSearchParams();
  return (
    <select className="sistema" aria-label="Sistema" value={busca.get("produto") ?? ""}
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

function Tema() {
  const [t, setT] = useState("auto");
  useEffect(() => { try { setT(localStorage.getItem("tema") ?? "auto"); } catch {} }, []);
  const escolher = (v: string) => {
    setT(v);
    const h = document.documentElement;
    if (v === "auto") h.removeAttribute("data-theme"); else h.setAttribute("data-theme", v);
    try { localStorage.setItem("tema", v); } catch {}
  };
  return (
    <div className="tema" role="group" aria-label="Tema">
      {[["light", "Claro"], ["auto", "Auto"], ["dark", "Escuro"]].map(([v, n]) => (
        <button key={v} type="button" className={t === v ? "on" : ""} aria-pressed={t === v} onClick={() => escolher(v)}>{n}</button>
      ))}
    </div>
  );
}

// Inclina levemente os cartões ao passar o mouse (efeito 3D). Desligado no celular e para quem prefere menos movimento.
function Inclinar() {
  const caminho = usePathname();
  const busca = useSearchParams().toString();
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(hover: none)").matches) return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>("main .p"));
    const mover = (e: MouseEvent) => {
      const c = e.currentTarget as HTMLElement, r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      c.style.transform = `rotateX(${-y * 3}deg) rotateY(${x * 3}deg) translateY(-3px)`;
    };
    const sair = (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.transform = ""; };
    cards.forEach((c) => { c.addEventListener("mousemove", mover); c.addEventListener("mouseleave", sair); });
    return () => cards.forEach((c) => { c.removeEventListener("mousemove", mover); c.removeEventListener("mouseleave", sair); });
  }, [caminho, busca]);
  return null;
}

export function Menu({ produtos }: { produtos: { id: string; nome: string }[] }) {
  return (
    <aside>
      <div className="marca"><div className="cubo" aria-hidden="true">C</div><span>Central de Gestão<small>Todos os seus SaaS em um lugar</small></span></div>
      <Suspense>
        <Sistema produtos={produtos} />
        <Links />
      </Suspense>
      <Tema />
      <Suspense><Inclinar /></Suspense>
    </aside>
  );
}

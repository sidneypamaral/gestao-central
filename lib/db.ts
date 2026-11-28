import postgres from "postgres";

// Aceita senha com caracteres especiais (@, #, /, ?...) sem exigir que o usuário a codifique.
function normalizarUrl(url: string) {
  const m = url.trim().match(/^(postgres(?:ql)?:\/\/)([^:\/]+):(.*)@([^@]+)$/);
  if (!m) return url.trim();
  const [, proto, user, senha, resto] = m;
  let s = senha;
  try { s = decodeURIComponent(senha); } catch {}
  return `${proto}${user}:${encodeURIComponent(s)}@${resto}`;
}

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { sql?: Sql };

// Conexão criada só no primeiro uso (não durante o build).
function conectar(): Sql {
  if (!g.sql) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada");
    g.sql = postgres(normalizarUrl(process.env.DATABASE_URL), { prepare: false, max: 5 });
  }
  return g.sql;
}

export const sql = new Proxy(function () {} as unknown as Sql, {
  apply: (_t, _this, args) => (conectar() as any)(...args),
  get: (_t, prop) => (conectar() as any)[prop],
});

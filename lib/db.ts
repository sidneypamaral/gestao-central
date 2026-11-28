import postgres from "postgres";

// Lê a DATABASE_URL de forma tolerante: com ou sem "postgresql://", senha com qualquer
// caractere especial e até com os colchetes do modelo do Supabase ([SENHA]).
export function lerConexao(bruto: string) {
  let s = bruto.trim().replace(/^["']|["']$/g, "").replace(/^DATABASE_URL\s*=\s*/, "");
  s = s.replace(/^postgres(ql)?:\/\//, "");
  const arroba = s.lastIndexOf("@");
  if (arroba < 0) throw new Error("DATABASE_URL sem usuário e senha");
  const cred = s.slice(0, arroba);
  const resto = s.slice(arroba + 1);
  const doisPontos = cred.indexOf(":");
  const username = doisPontos < 0 ? cred : cred.slice(0, doisPontos);
  let password = doisPontos < 0 ? "" : cred.slice(doisPontos + 1);
  if (password.startsWith("[") && password.endsWith("]")) password = password.slice(1, -1);
  try { password = decodeURIComponent(password); } catch {}
  const [hostPorta, caminho = "postgres"] = resto.split(/\/(.*)/s);
  const [host, porta] = hostPorta.split(":");
  const database = caminho.split("?")[0] || "postgres";
  return { host, port: Number(porta) || 5432, database, username, password };
}

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { sql?: Sql };

// Conexão criada só no primeiro uso (não durante o build).
function conectar(): Sql {
  if (!g.sql) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada");
    g.sql = postgres({ ...lerConexao(process.env.DATABASE_URL), ssl: "require", prepare: false, max: 5, connection: { TimeZone: "America/Sao_Paulo" } });
  }
  return g.sql;
}

export const sql = new Proxy(function () {} as unknown as Sql, {
  apply: (_t, _this, args) => (conectar() as any)(...args),
  get: (_t, prop) => (conectar() as any)[prop],
});

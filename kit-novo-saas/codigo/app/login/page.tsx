import { entrar, criarConta } from "./actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { erro, ok } = await searchParams;
  return (
    <main style={{ maxWidth: 360, margin: "10vh auto", fontFamily: "system-ui", display: "grid", gap: 24 }}>
      {erro && <p role="alert" style={{ color: "#b91c1c" }}>{erro}</p>}
      {ok && <p role="status" style={{ color: "#047857" }}>{ok}</p>}
      <form action={entrar} style={{ display: "grid", gap: 8 }}>
        <h1>Entrar</h1>
        <label>E-mail <input name="email" type="email" required autoComplete="email" /></label>
        <label>Senha <input name="senha" type="password" required autoComplete="current-password" /></label>
        <button>Entrar</button>
      </form>
      <form action={criarConta} style={{ display: "grid", gap: 8 }}>
        <h2>Criar conta grátis</h2>
        <label>Nome <input name="nome" required autoComplete="name" /></label>
        <label>E-mail <input name="email" type="email" required autoComplete="email" /></label>
        <label>Senha <input name="senha" type="password" required minLength={8} autoComplete="new-password" /></label>
        <button>Criar conta</button>
      </form>
    </main>
  );
}

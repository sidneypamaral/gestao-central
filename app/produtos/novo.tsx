"use client";
import { useActionState } from "react";
import { criarProduto, trocarChave } from "../actions";

type Estado = { nome?: string; chave?: string; erro?: string };

function Resultado({ s }: { s: Estado }) {
  if (s.erro) return <p className="erro">{s.erro}</p>;
  if (!s.chave) return null;
  return (
    <div className="card chave">
      <b>Chave de {s.nome}</b> (copie agora, ela não aparece de novo):
      <code>{s.chave}</code>
    </div>
  );
}

export function NovoProduto() {
  const [s, acao, pend] = useActionState<Estado, FormData>(criarProduto, {});
  return (
    <form action={acao} className="linha">
      <input name="nome" placeholder="Nome do novo sistema" required />
      <button disabled={pend}>Cadastrar e gerar chave</button>
      <Resultado s={s} />
    </form>
  );
}

export function TrocarChave({ id }: { id: string }) {
  const [s, acao, pend] = useActionState<Estado, FormData>(trocarChave, {});
  return (
    <form action={acao}>
      <input type="hidden" name="id" value={id} />
      <button className="sec" disabled={pend}>Gerar nova chave</button>
      <Resultado s={s} />
    </form>
  );
}

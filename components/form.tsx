// Campo "Sistema" dos formulários (Geral = vale para todos).
export function SeletorProduto({ produtos, padrao }: { produtos: { id: string; nome: string }[]; padrao?: string | null }) {
  return (
    <select name="produto_id" defaultValue={padrao ?? ""} aria-label="Sistema">
      <option value="">Geral</option>
      {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
    </select>
  );
}

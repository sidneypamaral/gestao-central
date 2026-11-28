# Central de Gestão

Painel que consolida finanças, vendas, marketing e operação de todos os SaaS (começando pelo Meu Societário).

- **Banco:** Supabase `gestao-central`, schema `gestao` (ver `supabase/migrations`).
- **Painel:** Next.js, protegido por senha (`PAINEL_SENHA`, usuário `admin`).
- **Integração:** cada SaaS envia eventos para `POST /api/eventos` com o header `x-api-key`.
- **SaaS novo:** comece pelo [`kit-novo-saas/`](kit-novo-saas/LEIA-ME.md) (login, Asaas e ligação prontos). Sistema que já existe: `docs/conectar-novo-saas.md`.

## Eventos aceitos
`lead.criado`, `cliente.criado`, `assinatura.iniciada`, `assinatura.alterada`, `assinatura.cancelada`, `pagamento.aprovado`, `pagamento.falhou`, `suporte.aberto`.

```json
{ "tipo": "pagamento.aprovado", "ocorrido_em": "2026-11-27T10:00:00Z",
  "dados": { "cliente_id": "123", "nome": "Empresa X", "valor": 99.9, "pagamento_id": "pg_1" } }
```

## Rodar local
1. Copie `.env.example` para `.env.local` e preencha.
2. `npm install && npm run dev`

# Central de Gestão

Painel central (Next.js 15 na Vercel + Postgres do Supabase via `postgres.js`) que recebe eventos dos SaaS do Sidney (começando pelo Meu Societário) e mostra a gestão comercial, operacional, marketing e financeira.

- `app/api/eventos/route.ts`: entrada de eventos (`x-api-key`). `lib/eventos.ts`: regras por tipo de evento.
- `app/page.tsx`: painel, protegido por senha em `middleware.ts`.
- `supabase/migrations/`: SQL do schema `gestao` (RLS sempre ligado).
- Segredos só em variáveis da Vercel (`DATABASE_URL`, `PAINEL_SENHA`), nunca no código.

## Regras
- Antes de abrir ou atualizar um PR, chame os agentes **revisor** e **testador** e corrija o que apontarem.
- Respostas e textos em português, curtos. Explicações ao Sidney em passo a passo simples.
- Gaste poucos tokens: leia só os arquivos necessários.

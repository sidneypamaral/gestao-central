# Central de Gestão

Painel central (Next.js 15 na Vercel + Postgres do Supabase via `postgres.js`) que recebe eventos dos SaaS do Sidney (começando pelo Meu Societário) e mostra a gestão comercial, operacional, marketing e financeira.

- `app/api/eventos/route.ts`: entrada de eventos (`x-api-key`). `lib/eventos.ts`: regras por tipo de evento.
- `app/page.tsx`: painel, protegido por senha em `middleware.ts`.
- `kit-novo-saas/`: modelo para todo SaaS novo nascer com login, Asaas e ligado à central (ver LEIA-ME).
- `supabase/migrations/`: SQL do schema `gestao` (RLS sempre ligado).
- Segredos só em variáveis da Vercel (`DATABASE_URL`, `PAINEL_SENHA`), nunca no código.

## Agentes (`.claude/agents/`) — chame sozinho, sem o Sidney pedir
- **arquiteto**: antes de tabela, migração, RLS, tipo de evento novo ou ligar outro SaaS.
- **designer**: depois de mudar tela, componente ou `globals.css`.
- **financeiro**: ao mexer em `app/financeiro` ou consultas de receita/MRR/inadimplência.
- **comercial**: ao mexer em `app/comercial` ou eventos de lead/cliente/teste.
- **marketing**: ao mexer em `app/marketing` ou origem/campanha.
- **operacoes**: ao mexer em `app/operacional`, rotinas agendadas ou quando eventos pararem.
- **documentacao**: no fim de mudança que crie tela, evento, variável, rotina ou agente.
- **revisor** e **testador**: sempre antes de abrir ou atualizar um PR; corrija o que apontarem.
- Chame só os agentes ligados ao que mudou, em paralelo quando possível.

## Regras
- Respostas e textos em português, curtos. Explicações ao Sidney em passo a passo simples.
- Gaste poucos tokens: leia só os arquivos necessários.

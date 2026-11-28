# Kit novo SaaS

Ponto de partida para todo sistema novo do Sidney já nascer com **login**, **cobrança no Asaas** e **ligado à Central de Gestão**.
Stack: Next.js na Vercel + Supabase (igual ao Meu Societário).

## O que vem no kit
| Arquivo | Para que serve |
|---|---|
| `sql/01-tabelas-base.sql` | Cria as tabelas `contas` (cliente + assinatura), `pagamentos` e `leads`, com segurança (RLS). Quem cria login ganha uma conta em teste de 14 dias. |
| `sql/02-ligar-central.sql` | Faz o banco avisar a central sozinho a cada conta, pagamento ou lead. |
| `codigo/` | Arquivos para copiar no projeto Next.js: tela de login, proteção das páginas, cobrança Asaas, webhook do Asaas e formulário de leads. |
| `codigo/.env.example` | Lista das variáveis para colar na Vercel. |

## Passo a passo (uma vez por SaaS novo)
1. **Criar o projeto no Supabase:** supabase.com > **New project**. Anote o nome.
2. **Rodar as tabelas:** no projeto novo, menu **SQL Editor** > **New query** > cole `sql/01-tabelas-base.sql` > **Run**.
3. **Gerar a chave da central:** abra https://gestao-central-six.vercel.app/produtos (**Sistemas conectados**), digite o nome do SaaS e clique **Cadastrar e gerar chave**. Copie a chave (ela só aparece uma vez).
4. **Ligar à central:** no **SQL Editor** do SaaS novo, cole `sql/02-ligar-central.sql`, troque `<<CHAVE_GERADA>>` pela chave copiada e clique **Run**. Não salve esse texto com a chave em lugar nenhum.
5. **Criar o projeto Next.js:** peça ao Claude: "crie o SaaS X a partir do kit-novo-saas". Ele copia a pasta `codigo/` e instala `@supabase/ssr`, `@supabase/supabase-js` e `server-only`.
6. **Variáveis na Vercel:** projeto na Vercel > **Settings** > **Environment Variables**. Crie uma por linha do `.env.example`, com os valores do Supabase (**Project Settings** > **API**) e do Asaas (**Integrações** > **Chave de API**).
7. **Webhook do Asaas:** no Asaas > **Integrações** > **Webhooks** > **Adicionar**. URL: `https://<site-do-saas>/api/asaas/webhook`. Token de autenticação: o mesmo texto de `ASAAS_WEBHOOK_TOKEN`. Marque os eventos de **Cobrança**.
8. **Conferir:** crie um login de teste no SaaS. Em até 1 minuto ele aparece na central como "teste". Se for conta sua, no Supabase > **Table Editor** > `contas`, marque `interna = true` e ela sai da central.

## Como cada coisa chega na central
- Login novo → `assinatura.iniciada` (em teste, com a data de fim do teste).
- Mudou situação, valor ou datas → `assinatura.alterada`.
- Asaas confirmou pagamento → `pagamento.aprovado` e a conta vira **ativa**.
- Pagamento venceu sem pagar → `pagamento.falhou` e a conta vira **inadimplente**.
- Formulário do site (`/api/leads?utm_source=instagram`) → `lead.criado` com a origem. Se aparecer muito lead falso, peça ao Claude para pôr limite de envios ou captcha.
- Algo parou de chegar? No SQL Editor do SaaS: `select central_sincronizar_tudo();` (reenviar não duplica).

## Para cobrar
No código do SaaS, chame `assinar(contaId, valorEmCentavos, "AAAA-MM-DD", "Nome do plano")` de `lib/asaas.ts` (ex.: num botão "Assinar"). A conta precisa ter CPF/CNPJ. Teste primeiro no sandbox do Asaas; em produção troque `ASAAS_API_URL`.

## Sistema que já existe (tabelas próprias)
Use `supabase/modelo-novo-saas.sql` (molde com os nomes a trocar) ou envie `POST /api/eventos` com `x-api-key` direto do código. Ver `docs/conectar-novo-saas.md`.

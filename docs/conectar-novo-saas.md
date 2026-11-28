# Como ligar um novo SaaS à Central de Gestão

1. **Gerar a chave:** abra o painel > **Sistemas conectados**, digite o nome do sistema e clique em **Cadastrar e gerar chave**. Copie a chave (ela só aparece uma vez).
2. **Escolher o jeito de enviar os dados:**
   - **SaaS com banco Supabase (recomendado):** peça ao Claude para adaptar `supabase/modelo-novo-saas.sql` às tabelas do novo sistema. O resultado é um SQL pronto para colar no **SQL Editor** do novo SaaS.
   - **Outro tipo de sistema:** o código do SaaS faz um `POST https://gestao-central-six.vercel.app/api/eventos` com o cabeçalho `x-api-key: <chave>` a cada acontecimento (ver formato no README).
3. **Gravar a chave no cofre** (só no caminho Supabase): as duas últimas linhas do SQL, com a chave colada no lugar indicado.
4. **Enviar o histórico:** `select central_sincronizar_tudo();`
5. **Conferir:** em **Sistemas conectados**, a coluna "Último dado recebido" mostra a hora do último envio. Os números aparecem no painel.

## Eventos aceitos
| Evento | Campos em `dados` |
|---|---|
| `assinatura.iniciada` / `assinatura.alterada` | `cliente_id`, `assinatura_id`, `nome`, `email`, `status` (trial, ativa, inadimplente, cancelada), `valor_mensal` |
| `assinatura.cancelada` | `assinatura_id` |
| `pagamento.aprovado` / `pagamento.falhou` | `cliente_id`, `pagamento_id`, `valor`, `meio` |
| `lead.criado` | `nome`, `email`, `telefone`, `origem` (ex.: `site`, `google`, `instagram`) |
| `suporte.aberto` | `cliente_id`, `titulo` |

Reenviar o mesmo evento não duplica dados. Um lead avança no funil sozinho quando o mesmo e-mail vira trial ou cliente ativo.

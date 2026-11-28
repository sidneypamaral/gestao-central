-- KIT NOVO SaaS · passo 2: ligar este SaaS à Central de Gestão.
-- Rode no SQL Editor DO NOVO SaaS, depois do passo 1. Troque <<CHAVE_GERADA>> pela chave
-- que a central mostrou em "Sistemas conectados". Não salve este arquivo com a chave no GitHub.
-- Falha silenciosa: se a central cair, o SaaS continua funcionando normalmente.

create extension if not exists pg_net;

create or replace function public.central_enviar(p_tipo text, p_dados jsonb, p_ocorrido timestamptz default now())
returns void language plpgsql security definer set search_path = '' as $$
declare v_url text; v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'central_url' limit 1;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'central_api_key' limit 1;
  if coalesce(v_url, '') = '' or coalesce(v_key, '') = '' then return; end if;
  perform net.http_post(url := rtrim(v_url, '/') || '/api/eventos',
    headers := jsonb_build_object('x-api-key', v_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object('tipo', p_tipo, 'ocorrido_em', p_ocorrido, 'dados', p_dados));
exception when others then return;
end $$;
revoke all on function public.central_enviar(text, jsonb, timestamptz) from public, anon, authenticated;

-- Dados de uma conta no formato da central (vence_em = fim do teste ou próxima renovação).
create or replace function public.central_dados_conta(c public.contas) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('cliente_id', c.id, 'assinatura_id', c.id, 'nome', c.nome, 'email', c.email,
    'documento', c.documento, 'status', c.situacao, 'valor_mensal', c.valor_mensal_cents / 100.0,
    'vence_em', case when c.situacao = 'trial' then c.trial_ate else c.proxima_renovacao end)
$$;

create or replace function public.central_trg_conta() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if not new.interna then perform public.central_enviar('assinatura.iniciada', public.central_dados_conta(new), new.created_at); end if;
  elsif new.interna and not old.interna then -- virou conta interna: sai da central
    perform public.central_enviar('assinatura.alterada', public.central_dados_conta(new) || '{"status":"cancelada"}');
  elsif old.interna and not new.interna then
    perform public.central_enviar('assinatura.iniciada', public.central_dados_conta(new), new.created_at);
  elsif not new.interna and (new.nome, new.email, new.situacao, new.valor_mensal_cents, new.trial_ate, new.proxima_renovacao)
        is distinct from (old.nome, old.email, old.situacao, old.valor_mensal_cents, old.trial_ate, old.proxima_renovacao) then
    perform public.central_enviar('assinatura.alterada', public.central_dados_conta(new));
  end if;
  return new;
end $$;
drop trigger if exists central_conta on public.contas;
create trigger central_conta after insert or update on public.contas for each row execute function public.central_trg_conta();

-- Pagamento: avisa quando vira "pago" ou "atrasado".
create or replace function public.central_trg_pagamento() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('pago', 'atrasado') and (tg_op = 'INSERT' or new.status is distinct from old.status)
     and not exists (select 1 from public.contas c where c.id = new.conta_id and c.interna) then
    perform public.central_enviar(case new.status when 'pago' then 'pagamento.aprovado' else 'pagamento.falhou' end,
      jsonb_build_object('cliente_id', new.conta_id, 'pagamento_id', new.id, 'valor', new.valor_cents / 100.0, 'meio', new.forma),
      coalesce(new.pago_em, now()));
  end if;
  return new;
end $$;
drop trigger if exists central_pagamento on public.pagamentos;
create trigger central_pagamento after insert or update of status on public.pagamentos
  for each row execute function public.central_trg_pagamento();

create or replace function public.central_trg_lead() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.central_enviar('lead.criado', jsonb_build_object('lead_id', new.id, 'nome', new.nome, 'email', new.email,
    'telefone', new.telefone, 'origem', new.origem), new.created_at);
  return new;
end $$;
drop trigger if exists central_lead on public.leads;
create trigger central_lead after insert on public.leads for each row execute function public.central_trg_lead();

-- Reenvia tudo (não duplica na central). Use depois de gravar a chave ou se algo parar de chegar.
create or replace function public.central_sincronizar_tudo() returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer := 0; c public.contas; p public.pagamentos; l public.leads;
begin
  for c in select * from public.contas where not interna loop
    perform public.central_enviar('assinatura.iniciada', public.central_dados_conta(c), c.created_at); n := n + 1;
  end loop;
  for p in select pg.* from public.pagamentos pg join public.contas ct on ct.id = pg.conta_id
           where pg.status = 'pago' and not ct.interna loop
    perform public.central_enviar('pagamento.aprovado', jsonb_build_object('cliente_id', p.conta_id,
      'pagamento_id', p.id, 'valor', p.valor_cents / 100.0, 'meio', p.forma), coalesce(p.pago_em, p.created_at)); n := n + 1;
  end loop;
  for l in select * from public.leads loop
    perform public.central_enviar('lead.criado', jsonb_build_object('lead_id', l.id, 'nome', l.nome, 'email', l.email,
      'telefone', l.telefone, 'origem', l.origem), l.created_at); n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.central_sincronizar_tudo() from public, anon, authenticated;

-- Endereço e chave da central guardados no cofre (Vault). Rodar de novo troca a chave.
do $$ begin
  perform vault.create_secret('https://gestao-central-six.vercel.app', 'central_url')
    where not exists (select 1 from vault.secrets where name = 'central_url');
  if exists (select 1 from vault.secrets where name = 'central_api_key') then
    perform vault.update_secret((select id from vault.secrets where name = 'central_api_key'), '<<CHAVE_GERADA>>');
  else
    perform vault.create_secret('<<CHAVE_GERADA>>', 'central_api_key');
  end if;
end $$;

select public.central_sincronizar_tudo() as eventos_enviados;

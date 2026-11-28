-- MODELO: ligar um novo SaaS (com banco Supabase) à Central de Gestão.
-- Troque os nomes marcados com <<...>> pelas tabelas do seu sistema e rode no SQL Editor DO NOVO SaaS.
-- Baseado na migração 0193 do Meu Societário. Falha silenciosa: a central nunca derruba o SaaS.

create extension if not exists pg_net;

create or replace function central_enviar(p_tipo text, p_dados jsonb, p_ocorrido timestamptz default now())
returns void language plpgsql security definer set search_path = public, vault as $$
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
revoke all on function central_enviar(text, jsonb, timestamptz) from public, anon, authenticated;

-- 1) Clientes/assinaturas. status aceito: trial | ativa | inadimplente | cancelada
create or replace function central_dados_cliente(c <<tabela_clientes>>) returns jsonb language sql stable as $$
  select jsonb_build_object('cliente_id', c.id, 'assinatura_id', c.id, 'nome', c.<<coluna_nome>>,
    'email', c.<<coluna_email>>, 'status', <<expressao_status>>, 'valor_mensal', <<expressao_valor_reais>>)
$$;
create or replace function central_trg_cliente() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform central_enviar(case when tg_op = 'INSERT' then 'assinatura.iniciada' else 'assinatura.alterada' end,
    central_dados_cliente(new));
  return new;
end $$;
drop trigger if exists central_cliente on <<tabela_clientes>>;
create trigger central_cliente after insert or update on <<tabela_clientes>> for each row execute function central_trg_cliente();

-- 2) Pagamentos
create or replace function central_trg_pagamento() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform central_enviar('pagamento.aprovado', jsonb_build_object('cliente_id', new.<<coluna_cliente_id>>,
    'pagamento_id', new.id, 'valor', <<expressao_valor_pago_reais>>, 'meio', <<expressao_meio>>));
  return new;
end $$;
drop trigger if exists central_pagamento on <<tabela_pagamentos>>;
create trigger central_pagamento after insert on <<tabela_pagamentos>> for each row execute function central_trg_pagamento();

-- 3) Leads (opcional)
create or replace function central_trg_lead() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform central_enviar('lead.criado', jsonb_build_object('nome', new.<<coluna_nome>>, 'email', new.<<coluna_email>>,
    'telefone', null, 'origem', <<expressao_origem>>));
  return new;
end $$;
drop trigger if exists central_lead on <<tabela_leads>>;
create trigger central_lead after insert on <<tabela_leads>> for each row execute function central_trg_lead();

-- 4) Histórico (rodar uma vez depois dos segredos): select central_sincronizar_tudo();
create or replace function central_sincronizar_tudo() returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0; c record; p record;
begin
  for c in select * from <<tabela_clientes>> loop
    perform central_enviar('assinatura.iniciada', central_dados_cliente(c::<<tabela_clientes>>)); n := n + 1;
  end loop;
  for p in select * from <<tabela_pagamentos>> loop
    perform central_enviar('pagamento.aprovado', jsonb_build_object('cliente_id', p.<<coluna_cliente_id>>,
      'pagamento_id', p.id, 'valor', <<expressao_valor_pago_reais_p>>)); n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function central_sincronizar_tudo() from public, anon, authenticated;

-- 5) Segredos (troque pela chave gerada em /produtos)
-- select vault.create_secret('https://gestao-central-six.vercel.app', 'central_url');
-- select vault.create_secret('<<CHAVE_GERADA>>', 'central_api_key');

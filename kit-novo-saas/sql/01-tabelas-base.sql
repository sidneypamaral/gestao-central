-- KIT NOVO SaaS · passo 1: tabelas base (login, assinatura, pagamentos, leads).
-- Rode no SQL Editor DO NOVO SaaS. Pode rodar de novo sem estragar nada.
-- Cada pessoa que cria login ganha uma "conta" em teste de 14 dias, automaticamente.

create table if not exists public.contas (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null unique references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  documento text,                       -- CPF/CNPJ (o Asaas exige para cobrar)
  telefone text,
  situacao text not null default 'trial' check (situacao in ('trial', 'ativa', 'inadimplente', 'cancelada')),
  valor_mensal_cents integer not null default 0 check (valor_mensal_cents >= 0),
  trial_ate date default (current_date + 14),
  proxima_renovacao date,
  asaas_customer_id text unique,
  asaas_subscription_id text unique,
  interna boolean not null default false, -- true = conta de teste sua; não vai para a central
  created_at timestamptz not null default now()
);

create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.contas(id) on delete cascade,
  asaas_payment_id text not null unique,
  valor_cents integer not null check (valor_cents >= 0),
  forma text not null default 'outro',  -- pix | boleto | cartao | outro
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado', 'estornado')),
  vencimento date,
  pago_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists pagamentos_conta_idx on public.pagamentos (conta_id);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  telefone text,
  origem text not null default 'site',  -- site, google, instagram... (vem do ?utm_source=)
  created_at timestamptz not null default now()
);

-- Segurança: cada usuário só enxerga a própria conta e os próprios pagamentos.
-- Leads e escritas sensíveis só pelo servidor (chave service_role), nunca pelo navegador.
alter table public.contas enable row level security;
alter table public.pagamentos enable row level security;
alter table public.leads enable row level security;

drop policy if exists contas_dono_le on public.contas;
create policy contas_dono_le on public.contas for select to authenticated using (dono_id = (select auth.uid()));
drop policy if exists contas_dono_edita on public.contas;
create policy contas_dono_edita on public.contas for update to authenticated
  using (dono_id = (select auth.uid())) with check (dono_id = (select auth.uid()));
-- O dono só pode mudar os próprios dados de cadastro; situação, valor e ids do Asaas ficam com o servidor.
revoke update on public.contas from authenticated;
grant update (nome, documento, telefone) on public.contas to authenticated;

drop policy if exists pagamentos_dono_le on public.pagamentos;
create policy pagamentos_dono_le on public.pagamentos for select to authenticated
  using (conta_id in (select id from public.contas where dono_id = (select auth.uid())));

-- Login novo => conta nova em teste.
create or replace function public.criar_conta_do_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.contas (dono_id, nome, email)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)), new.email)
  on conflict (dono_id) do nothing;
  return new;
end $$;
revoke all on function public.criar_conta_do_usuario() from public, anon, authenticated;
drop trigger if exists criar_conta_do_usuario on auth.users;
create trigger criar_conta_do_usuario after insert on auth.users for each row execute function public.criar_conta_do_usuario();

drop function if exists public.asaas_registrar_pagamento(text, text, text, integer, date, text);
-- Webhook do Asaas grava aqui (chamado só pelo servidor). Reenvio do mesmo evento não duplica.
create or replace function public.asaas_registrar_pagamento(
  p_evento text, p_payment_id text, p_subscription text, p_valor_cents integer, p_vencimento date, p_forma text,
  p_referencia text default null -- externalReference (id da conta), usado se o webhook chegar antes do id da assinatura
) returns text language plpgsql security definer set search_path = '' as $$
declare v_conta uuid; v_status text;
begin
  v_status := case p_evento
    when 'PAYMENT_CREATED' then 'pendente'
    when 'PAYMENT_RECEIVED' then 'pago' when 'PAYMENT_CONFIRMED' then 'pago'
    when 'PAYMENT_OVERDUE' then 'atrasado' when 'PAYMENT_REFUNDED' then 'estornado' end;
  if v_status is null then return 'ignorado'; end if; -- outros eventos não mudam nada
  select id into v_conta from public.contas where asaas_subscription_id = p_subscription;
  if v_conta is null and p_referencia ~ '^[0-9a-f-]{36}$' then
    select id into v_conta from public.contas where id = p_referencia::uuid;
  end if;
  if v_conta is null then return 'assinatura desconhecida'; end if;
  insert into public.pagamentos (conta_id, asaas_payment_id, valor_cents, forma, status, vencimento, pago_em)
  values (v_conta, p_payment_id, coalesce(p_valor_cents, 0), coalesce(p_forma, 'outro'), v_status, p_vencimento,
          case when v_status = 'pago' then now() end)
  on conflict (asaas_payment_id) do update
    set status = case when public.pagamentos.status in ('pago', 'estornado') and excluded.status in ('pendente', 'atrasado')
                      then public.pagamentos.status
                      when public.pagamentos.status = 'estornado' then 'estornado'
                      else excluded.status end, -- evento fora de ordem não "despaga" nem desfaz estorno
        valor_cents = excluded.valor_cents, forma = excluded.forma, vencimento = excluded.vencimento,
        pago_em = coalesce(public.pagamentos.pago_em, excluded.pago_em)
  returning status into v_status;
  if v_status = 'pago' then
    update public.contas set situacao = 'ativa',
      proxima_renovacao = greatest(coalesce(proxima_renovacao, current_date), coalesce(p_vencimento, current_date) + interval '1 month')::date
    where id = v_conta and situacao <> 'cancelada';
  elsif v_status = 'atrasado' then
    update public.contas set situacao = 'inadimplente' where id = v_conta and situacao = 'ativa';
  end if;
  return v_status;
end $$;
revoke all on function public.asaas_registrar_pagamento(text, text, text, integer, date, text, text) from public, anon, authenticated;
grant execute on function public.asaas_registrar_pagamento(text, text, text, integer, date, text, text) to service_role;

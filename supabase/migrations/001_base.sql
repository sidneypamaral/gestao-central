-- Central de Gestão: estrutura base (schema "gestao")
create schema if not exists gestao;

create table gestao.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  api_key_hash text not null,
  status text not null default 'ativo' check (status in ('ativo','pausado')),
  criado_em timestamptz not null default now()
);

create table gestao.clientes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references gestao.produtos(id),
  id_externo text not null,
  nome text not null,
  email text,
  documento text,
  criado_em timestamptz not null default now(),
  unique (produto_id, id_externo)
);

create table gestao.planos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references gestao.produtos(id),
  nome text not null,
  preco_mensal numeric(12,2) not null,
  ativo boolean not null default true
);

create table gestao.assinaturas (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references gestao.produtos(id),
  cliente_id uuid not null references gestao.clientes(id),
  plano_id uuid references gestao.planos(id),
  id_externo text,
  status text not null check (status in ('trial','ativa','inadimplente','cancelada')),
  valor_mensal numeric(12,2) not null default 0,
  iniciada_em timestamptz not null default now(),
  cancelada_em timestamptz
);

create table gestao.pagamentos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references gestao.produtos(id),
  cliente_id uuid references gestao.clientes(id),
  assinatura_id uuid references gestao.assinaturas(id),
  id_externo text,
  valor numeric(12,2) not null,
  status text not null check (status in ('aprovado','falhou','estornado')),
  meio text,
  pago_em timestamptz not null default now()
);

create table gestao.custos (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references gestao.produtos(id), -- nulo = custo geral
  categoria text not null, -- infra, midia, ferramentas, pessoal...
  descricao text,
  valor numeric(12,2) not null,
  competencia date not null
);

create table gestao.campanhas (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references gestao.produtos(id),
  nome text not null,
  canal text not null, -- meta, google, organico...
  orcamento numeric(12,2),
  inicio date,
  fim date
);

create table gestao.leads (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references gestao.produtos(id),
  campanha_id uuid references gestao.campanhas(id),
  nome text,
  email text,
  telefone text,
  origem text,
  etapa text not null default 'novo' check (etapa in ('novo','contato','trial','ganho','perdido')),
  criado_em timestamptz not null default now()
);

create table gestao.tarefas (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references gestao.produtos(id),
  cliente_id uuid references gestao.clientes(id),
  tipo text not null default 'operacional' check (tipo in ('operacional','suporte')),
  titulo text not null,
  status text not null default 'aberta' check (status in ('aberta','andamento','concluida')),
  responsavel text,
  prazo date,
  criado_em timestamptz not null default now()
);

create table gestao.eventos (
  id bigint generated always as identity primary key,
  produto_id uuid not null references gestao.produtos(id),
  tipo text not null,
  ocorrido_em timestamptz not null,
  dados jsonb not null default '{}',
  processado boolean not null default false,
  recebido_em timestamptz not null default now()
);

create index on gestao.eventos (produto_id, tipo, ocorrido_em);
create index on gestao.assinaturas (produto_id, status);
create index on gestao.pagamentos (produto_id, pago_em);
create index on gestao.leads (produto_id, etapa);

-- Segurança: RLS ligado em tudo; acesso só pelo service role (API da central)
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'gestao' loop
    execute format('alter table gestao.%I enable row level security', t);
  end loop;
end $$;
revoke all on schema gestao from anon, authenticated;

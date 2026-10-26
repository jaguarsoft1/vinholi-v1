-- VINHOLI / Supabase
-- Execute no SQL Editor do seu projeto.

create extension if not exists pgcrypto;

create table if not exists public.imoveis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  codigo text,
  titulo text not null,
  descricao text,
  tipo text not null,
  negocio text not null check (negocio in ('venda','aluguel')),
  valor numeric(14,2) not null default 0,
  condominio numeric(14,2) default 0,
  iptu numeric(14,2) default 0,
  cep text,
  estado text,
  cidade text,
  bairro text,
  rua text,
  numero text,
  complemento text,
  mostrar_endereco boolean not null default false,
  quartos integer not null default 0,
  suites integer not null default 0,
  banheiros integer not null default 0,
  vagas integer not null default 0,
  area_util numeric(12,2) default 0,
  area_construida numeric(12,2) default 0,
  area_terreno numeric(12,2) default 0,
  status text not null default 'rascunho' check (status in ('publicado','rascunho')),
  destaque boolean not null default false
);

create table if not exists public.imovel_fotos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  imovel_id uuid not null references public.imoveis(id) on delete cascade,
  url text not null,
  storage_path text not null,
  ordem integer not null default 0,
  principal boolean not null default false
);

alter table public.imoveis enable row level security;
alter table public.imovel_fotos enable row level security;

-- Painel administrativo: usuário autenticado pode gerenciar.
create policy "admin autenticado pode ler imoveis"
on public.imoveis for select to authenticated using (true);

create policy "admin autenticado pode inserir imoveis"
on public.imoveis for insert to authenticated with check (true);

create policy "admin autenticado pode atualizar imoveis"
on public.imoveis for update to authenticated using (true) with check (true);

create policy "admin autenticado pode excluir imoveis"
on public.imoveis for delete to authenticated using (true);

create policy "admin autenticado pode ler fotos"
on public.imovel_fotos for select to authenticated using (true);

create policy "admin autenticado pode inserir fotos"
on public.imovel_fotos for insert to authenticated with check (true);

create policy "admin autenticado pode atualizar fotos"
on public.imovel_fotos for update to authenticated using (true) with check (true);

create policy "admin autenticado pode excluir fotos"
on public.imovel_fotos for delete to authenticated using (true);

-- ATENÇÃO:
-- Crie no Storage um bucket chamado "imoveis".
-- Para este painel, deixe o bucket público somente se quiser usar
-- getPublicUrl() diretamente. Em uma configuração privada, trocaremos
-- por signed URLs.

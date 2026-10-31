-- ============================================================
-- Controle Financeiro Pessoal — schema do Supabase
-- Execute este script no SQL Editor do seu projeto Supabase
-- (Project > SQL Editor > New query > cole e clique em Run)
-- ============================================================

-- Uma linha por usuário, guardando todos os dados financeiros
-- (receitas, despesas, parcelamentos, dívidas, metas, categorias,
-- configurações etc.) como um único documento JSON.
create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Ativa Row Level Security: ninguém consegue ler ou escrever
-- dados de outro usuário, nem mesmo com a chave anônima pública.
alter table public.app_state enable row level security;

create policy "Usuário lê apenas seus próprios dados"
  on public.app_state for select
  using (auth.uid() = user_id);

create policy "Usuário insere apenas seus próprios dados"
  on public.app_state for insert
  with check (auth.uid() = user_id);

create policy "Usuário atualiza apenas seus próprios dados"
  on public.app_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuário exclui apenas seus próprios dados"
  on public.app_state for delete
  using (auth.uid() = user_id);

-- Mantém updated_at sempre atualizado automaticamente.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_app_state_updated_at on public.app_state;
create trigger trg_app_state_updated_at
  before update on public.app_state
  for each row execute function public.set_updated_at();

-- ============================================================
-- OPCIONAL — Histórico de versões (ative em Configurações > Histórico)
-- ============================================================
-- Histórico de versões do Kivo (rode uma única vez no SQL Editor do Supabase).
-- Só CRIA uma tabela nova: não altera nenhum dado nem a tabela app_state.
create table if not exists public.app_state_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  reason text not null default 'Automática',
  summary jsonb not null default '{}'::jsonb,
  data jsonb not null
);

create index if not exists app_state_history_user_created
  on public.app_state_history (user_id, created_at desc);

alter table public.app_state_history enable row level security;

drop policy if exists "Usuário lê apenas seu próprio histórico" on public.app_state_history;
create policy "Usuário lê apenas seu próprio histórico"
  on public.app_state_history for select using (auth.uid() = user_id);

drop policy if exists "Usuário cria apenas seu próprio histórico" on public.app_state_history;
create policy "Usuário cria apenas seu próprio histórico"
  on public.app_state_history for insert with check (auth.uid() = user_id);

drop policy if exists "Usuário apaga apenas seu próprio histórico" on public.app_state_history;
create policy "Usuário apaga apenas seu próprio histórico"
  on public.app_state_history for delete using (auth.uid() = user_id);

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

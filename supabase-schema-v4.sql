-- ═══════════════════════════════════════════════════════════════
--  ByteForce · Lyra — ATUALIZAÇÃO v4
--  Notas + Agenda (a Lyra cria, lê e você também)
--  Cole no SQL Editor do Supabase e clique em Run.
-- ═══════════════════════════════════════════════════════════════

-- NOTAS
create table if not exists public.notes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  titulo     text not null default 'Nota',
  conteudo   text not null default '',
  cor        text not null default 'roxo',
  fixada     boolean not null default false,
  criada_por text not null default 'usuario',   -- 'usuario' ou 'lyra'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- AGENDA (compromissos e lembretes)
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  titulo     text not null,
  detalhe    text,
  quando     timestamptz not null,
  concluido  boolean not null default false,
  criado_por text not null default 'usuario',   -- 'usuario' ou 'lyra'
  created_at timestamptz not null default now()
);

create index if not exists idx_notes_user  on public.notes(user_id, updated_at desc);
create index if not exists idx_events_user on public.events(user_id, quando);

-- Segurança: cada pessoa só vê o que é dela.
-- (O painel admin usa a SERVICE KEY, que passa por cima do RLS.)
alter table public.notes  enable row level security;
alter table public.events enable row level security;

drop policy if exists "notes_all" on public.notes;
create policy "notes_all" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "events_all" on public.events;
create policy "events_all" on public.events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

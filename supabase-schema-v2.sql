-- ═══════════════════════════════════════════════════════════════
--  ByteForce · Lyra — ATUALIZAÇÃO v2
--  Conversas (estilo ChatGPT) + Memória da Lyra
--  Cole no SQL Editor do Supabase e clique em Run.
-- ═══════════════════════════════════════════════════════════════

-- Conversas (cada "chat" da barra lateral)
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'Nova conversa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mensagens de cada conversa
create table if not exists public.messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null,
  sources         jsonb,
  created_at      timestamptz not null default now()
);

-- MEMÓRIA: o que a Lyra lembra sobre cada pessoa (entre conversas)
create table if not exists public.memories (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  fato       text not null,              -- ex: "Mora em Cuiabá-MT"
  created_at timestamptz not null default now()
);

create index if not exists idx_msg_conv on public.messages(conversation_id, created_at);
create index if not exists idx_conv_user on public.conversations(user_id, updated_at desc);
create index if not exists idx_mem_user on public.memories(user_id, created_at desc);

-- Segurança: cada pessoa só vê o que é dela
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.memories      enable row level security;

drop policy if exists "conv_all" on public.conversations;
create policy "conv_all" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "msg_all" on public.messages;
create policy "msg_all" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mem_all" on public.memories;
create policy "mem_all" on public.memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
--  ByteForce · Lyra — ATUALIZAÇÃO v3 · PAINEL ADMIN
--  Cole no SQL Editor do Supabase e clique em Run.
-- ═══════════════════════════════════════════════════════════════

-- 1) Colunas novas em profiles: admin, banimento
alter table public.profiles add column if not exists is_admin    boolean not null default false;
alter table public.profiles add column if not exists banned       boolean not null default false;
alter table public.profiles add column if not exists banned_reason text;
alter table public.profiles add column if not exists banned_at    timestamptz;
alter table public.profiles add column if not exists pro_since    timestamptz;
alter table public.profiles add column if not exists notes        text;

-- 2) DENÚNCIAS (usuário denuncia uma resposta)
create table if not exists public.reports (
  id              bigint generated always as identity primary key,
  reporter_id     uuid references auth.users(id) on delete set null,
  target_user_id  uuid references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  message_id      bigint,
  motivo          text not null,
  detalhe         text,
  status          text not null default 'aberta'
                  check (status in ('aberta','analisando','resolvida','arquivada')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 3) LOGS de moderação e ações do admin
create table if not exists public.admin_logs (
  id         bigint generated always as identity primary key,
  admin_id   uuid references auth.users(id) on delete set null,
  acao       text not null,        -- ex: 'ver_conversa', 'banir', 'dar_pro'
  alvo_id    uuid,                 -- usuário afetado
  detalhe    jsonb,
  created_at timestamptz not null default now()
);

-- 4) FLAGS automáticas (perguntas estranhas)
create table if not exists public.flags (
  id              bigint generated always as identity primary key,
  user_id         uuid references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  trecho          text not null,
  motivo          text not null,     -- ex: 'palavra_sensivel'
  revisado        boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists idx_reports_status on public.reports(status, created_at desc);
create index if not exists idx_logs_admin on public.admin_logs(created_at desc);
create index if not exists idx_flags_rev on public.flags(revisado, created_at desc);

-- 5) RLS: só o dono acessa. O painel usa a SERVICE KEY (contorna RLS).
alter table public.reports    enable row level security;
alter table public.admin_logs enable row level security;
alter table public.flags      enable row level security;

drop policy if exists "report_insert" on public.reports;
create policy "report_insert" on public.reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "report_read_own" on public.reports;
create policy "report_read_own" on public.reports
  for select using (auth.uid() = reporter_id);

-- admin_logs e flags: ninguém acessa pelo cliente (só via service key)

-- 6) Função: define quanto tempo de Pro um usuário tem (usada pelo admin)
create or replace function public.set_pro_until(uid uuid, ate timestamptz)
returns void language plpgsql security definer as $$
begin
  update public.profiles
     set pro_until = ate,
         pro_since = coalesce(pro_since, now())
   where id = uid;
end $$;

-- 7) TORNE-SE ADMIN — troque 'SEU_USUARIO' pelo seu nome de usuário
-- update public.profiles set is_admin = true where username = 'SEU_USUARIO';

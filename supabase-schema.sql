-- ═══════════════════════════════════════════════════════════════
--  ByteForce · Lyra  —  Banco de dados (Supabase)
--  Cole TUDO isto no SQL Editor do Supabase e clique em "Run".
--  Modelo: assinatura mensal — cada pagamento dá +30 dias de Pro.
-- ═══════════════════════════════════════════════════════════════

-- 1) Perfil de cada usuário. pro_until = até quando o Pro vale.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique,
  pro_until  timestamptz,               -- null = nunca foi Pro / expirado
  created_at timestamptz not null default now()
);

-- 2) Registro de cada pergunta feita à Lyra.
create table if not exists public.questions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  prompt     text,
  created_at timestamptz not null default now()
);

-- 3) Registro de pagamentos confirmados pelo Mercado Pago.
create table if not exists public.payments (
  id            bigint generated always as identity primary key,
  user_id       uuid references auth.users(id) on delete set null,
  mp_payment_id text unique,
  status        text,
  amount        numeric,
  created_at    timestamptz not null default now()
);

-- ── Segurança (RLS): cada pessoa só enxerga os próprios dados ──
alter table public.profiles  enable row level security;
alter table public.questions enable row level security;
alter table public.payments  enable row level security;

create policy "perfil_leitura"    on public.profiles for select using (auth.uid() = id);
create policy "perfil_insercao"   on public.profiles for insert with check (auth.uid() = id);
create policy "perfil_update"     on public.profiles for update using (auth.uid() = id);

create policy "pergunta_leitura"  on public.questions for select using (auth.uid() = user_id);
create policy "pergunta_insercao" on public.questions for insert with check (auth.uid() = user_id);

create policy "pagamento_leitura" on public.payments for select using (auth.uid() = user_id);

-- ── Cria o perfil automaticamente quando alguém se cadastra ──
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Soma +30 dias de Pro (usada pelo webhook quando o pagamento é aprovado) ──
-- Se o Pro ainda estiver válido, soma a partir da data atual de expiração.
-- Se já expirou (ou nunca teve), soma a partir de agora.
create or replace function public.add_pro_days(uid uuid, days int)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set pro_until = greatest(coalesce(pro_until, now()), now()) + make_interval(days => days)
  where id = uid;
end;
$$;

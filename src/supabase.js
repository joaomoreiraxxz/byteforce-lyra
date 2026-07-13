import { createClient } from "@supabase/supabase-js";

// As chaves PÚBLICAS do Supabase (URL + anon key) podem ficar no frontend —
// elas são feitas para isso. A segurança real vem das políticas RLS no banco.
// No Vercel: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anon);

// Transformamos "usuario" em "usuario@lyra.local" por baixo dos panos,
// porque o Supabase Auth precisa de um email — mas a pessoa só vê o usuário.
export const toEmail = (username) =>
  `${username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@lyra.local`;

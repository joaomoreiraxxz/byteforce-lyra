// ─────────────────────────────────────────────────────────────
//  /api/status  — Retorna o estado do usuário: nº de perguntas e se é Pro.
//  O frontend chama isto ao carregar para mostrar o progresso certo.
//  Vercel env: SUPABASE_URL, SUPABASE_SERVICE_KEY
// ─────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !sbKey) return res.status(500).json({ error: "Configuração do servidor pendente." });

  const admin = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Não autenticado." });

    const { data: userData, error } = await admin.auth.getUser(token);
    if (error || !userData?.user) return res.status(401).json({ error: "Sessão inválida." });
    const uid = userData.user.id;

    const { data: profile } = await admin.from("profiles").select("pro_until, username, is_admin, banned").eq("id", uid).single();
    const { count } = await admin
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", uid);

    const isPro = !!profile?.pro_until && new Date(profile.pro_until) > new Date();

    return res.status(200).json({
      count: count || 0,
      isPro,
      isAdmin: !!profile?.is_admin,
      banned: !!profile?.banned,
      proUntil: profile?.pro_until || null,
      username: profile?.username || "",
    });
  } catch (e) {
    return res.status(500).json({ error: "Falha ao carregar status." });
  }
}

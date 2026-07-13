// /api/report — usuário denuncia uma resposta da Lyra
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !sbKey) return res.status(500).json({ error: "Servidor não configurado." });

  const admin = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Não autenticado." });
  const { data: ud, error } = await admin.auth.getUser(token);
  if (error || !ud?.user) return res.status(401).json({ error: "Sessão inválida." });

  const { conversationId, motivo, detalhe } = req.body || {};
  if (!motivo) return res.status(400).json({ error: "Motivo obrigatório." });

  await admin.from("reports").insert({
    reporter_id: ud.user.id,
    target_user_id: ud.user.id,
    conversation_id: conversationId || null,
    motivo: String(motivo).slice(0, 100),
    detalhe: String(detalhe || "").slice(0, 500),
  });

  return res.json({ ok: true });
}

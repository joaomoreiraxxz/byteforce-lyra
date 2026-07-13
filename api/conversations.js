// ─────────────────────────────────────────────────────────────
//  /api/conversations — lista, cria, carrega e apaga conversas
//  GET            → lista as conversas do usuário
//  GET ?id=xxx    → carrega as mensagens de uma conversa
//  POST           → cria conversa nova {title}
//  PATCH ?id=xxx  → renomeia {title}
//  DELETE ?id=xxx → apaga
// ─────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !sbKey) return res.status(500).json({ error: "Servidor não configurado." });

  const admin = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Não autenticado." });
  const { data: ud, error } = await admin.auth.getUser(token);
  if (error || !ud?.user) return res.status(401).json({ error: "Sessão inválida." });
  const uid = ud.user.id;
  const id = req.query.id;

  try {
    if (req.method === "GET") {
      if (id) {
        const { data } = await admin
          .from("messages").select("role, content, sources, created_at")
          .eq("conversation_id", id).eq("user_id", uid)
          .order("created_at", { ascending: true });
        return res.status(200).json({ messages: data || [] });
      }
      const { data } = await admin
        .from("conversations").select("id, title, updated_at")
        .eq("user_id", uid).order("updated_at", { ascending: false }).limit(50);
      return res.status(200).json({ conversations: data || [] });
    }

    if (req.method === "POST") {
      const title = (req.body?.title || "Nova conversa").slice(0, 60);
      const { data, error: e } = await admin
        .from("conversations").insert({ user_id: uid, title }).select("id, title, updated_at").single();
      if (e) return res.status(500).json({ error: "Não foi possível criar a conversa." });
      return res.status(200).json({ conversation: data });
    }

    if (req.method === "PATCH") {
      if (!id) return res.status(400).json({ error: "id faltando." });
      const title = (req.body?.title || "").slice(0, 60);
      await admin.from("conversations").update({ title }).eq("id", id).eq("user_id", uid);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      if (!id) return res.status(400).json({ error: "id faltando." });
      await admin.from("conversations").delete().eq("id", id).eq("user_id", uid);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch {
    return res.status(500).json({ error: "Falha na operação." });
  }
}

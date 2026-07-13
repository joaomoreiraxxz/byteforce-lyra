// /api/memories — o que a Lyra lembra sobre você
// GET → lista | DELETE ?id=xx → apaga uma | DELETE ?all=1 → apaga tudo

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

  try {
    if (req.method === "GET") {
      const { data } = await admin.from("memories").select("id, fato, created_at")
        .eq("user_id", uid).order("created_at", { ascending: false });
      return res.status(200).json({ memories: data || [] });
    }
    if (req.method === "DELETE") {
      if (req.query.all === "1") {
        await admin.from("memories").delete().eq("user_id", uid);
        return res.status(200).json({ ok: true });
      }
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id faltando." });
      await admin.from("memories").delete().eq("id", id).eq("user_id", uid);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch {
    return res.status(500).json({ error: "Falha na operação." });
  }
}

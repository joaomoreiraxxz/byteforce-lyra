// /api/notes — notas e agenda do usuário
// GET ?tipo=notas|eventos  → lista
// POST ?tipo=...           → cria
// PATCH ?tipo=...&id=x     → edita
// DELETE ?tipo=...&id=x    → apaga

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

  const tipo = req.query.tipo === "eventos" ? "events" : "notes";
  const id = req.query.id;

  try {
    if (req.method === "GET") {
      const q = admin.from(tipo).select("*").eq("user_id", uid);
      const { data } = tipo === "notes"
        ? await q.order("fixada", { ascending: false }).order("updated_at", { ascending: false }).limit(200)
        : await q.order("quando", { ascending: true }).limit(200);
      return res.json({ itens: data || [] });
    }

    if (req.method === "POST") {
      const b = req.body || {};
      const linha = tipo === "notes"
        ? {
            user_id: uid,
            titulo: (b.titulo || "Nota").slice(0, 120),
            conteudo: (b.conteudo || "").slice(0, 5000),
            cor: b.cor || "roxo",
            criada_por: "usuario",
          }
        : {
            user_id: uid,
            titulo: (b.titulo || "Compromisso").slice(0, 120),
            detalhe: (b.detalhe || "").slice(0, 500),
            quando: b.quando,
            criado_por: "usuario",
          };
      const { data, error: e } = await admin.from(tipo).insert(linha).select().single();
      if (e) return res.status(500).json({ error: "Não foi possível criar." });
      return res.json({ item: data });
    }

    if (req.method === "PATCH") {
      if (!id) return res.status(400).json({ error: "id faltando." });
      const b = req.body || {};
      const patch = {};
      if (tipo === "notes") {
        if (b.titulo !== undefined) patch.titulo = String(b.titulo).slice(0, 120);
        if (b.conteudo !== undefined) patch.conteudo = String(b.conteudo).slice(0, 5000);
        if (b.cor !== undefined) patch.cor = b.cor;
        if (b.fixada !== undefined) patch.fixada = !!b.fixada;
        patch.updated_at = new Date().toISOString();
      } else {
        if (b.titulo !== undefined) patch.titulo = String(b.titulo).slice(0, 120);
        if (b.detalhe !== undefined) patch.detalhe = String(b.detalhe).slice(0, 500);
        if (b.quando !== undefined) patch.quando = b.quando;
        if (b.concluido !== undefined) patch.concluido = !!b.concluido;
      }
      await admin.from(tipo).update(patch).eq("id", id).eq("user_id", uid);
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      if (!id) return res.status(400).json({ error: "id faltando." });
      await admin.from(tipo).delete().eq("id", id).eq("user_id", uid);
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch {
    return res.status(500).json({ error: "Falha na operação." });
  }
}

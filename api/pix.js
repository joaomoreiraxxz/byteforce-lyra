// ─────────────────────────────────────────────────────────────
//  /api/pix — Gera um pagamento Pix (Checkout Transparente)
//  POST { email } → cria o Pix, devolve QR code + copia-e-cola
//  GET  ?id=xxx   → consulta se já foi pago
//  Vercel env: MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY
// ─────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export default async function handler(req, res) {
  const token = process.env.MP_ACCESS_TOKEN;
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;
  if (!token || !sbUrl || !sbKey) return res.status(500).json({ error: "Pagamento indisponível no momento." });

  const admin = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

  // autentica
  const authToken = (req.headers.authorization || "").replace("Bearer ", "");
  if (!authToken) return res.status(401).json({ error: "Faça login para assinar." });
  const { data: ud, error } = await admin.auth.getUser(authToken);
  if (error || !ud?.user) return res.status(401).json({ error: "Sessão inválida." });
  const uid = ud.user.id;

  try {
    // ── CONSULTAR se o Pix já foi pago ──
    if (req.method === "GET") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id faltando." });

      const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pay = await r.json();
      if (!r.ok) return res.status(400).json({ error: "Não foi possível consultar." });

      // se aprovou, libera o Pro (o webhook também faz isso — aqui é redundância segura)
      if (pay.status === "approved") {
        const alvo = pay.external_reference || uid;
        const { data: prof } = await admin.from("profiles").select("pro_until").eq("id", alvo).single();
        const base = prof?.pro_until && new Date(prof.pro_until) > new Date()
          ? new Date(prof.pro_until) : new Date();
        base.setDate(base.getDate() + 30);
        await admin.from("profiles").update({ pro_until: base.toISOString() }).eq("id", alvo);
        await admin.from("payments")
          .upsert({ user_id: alvo, mp_payment_id: String(pay.id), status: "approved", amount: pay.transaction_amount },
                  { onConflict: "mp_payment_id" });
      }

      return res.json({ status: pay.status });
    }

    // ── CRIAR o Pix ──
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const email = String(req.body?.email || "").trim().toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && !email.endsWith(".local");
    if (!emailOk) return res.status(400).json({ error: "Informe um email válido para o comprovante." });

    const { data: prof } = await admin.from("profiles").select("username").eq("id", uid).single();

    const r = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: 3.0,
        description: "Byte Force Pro — Lyra (30 dias)",
        payment_method_id: "pix",
        payer: { email, first_name: prof?.username || "cliente" },
        external_reference: uid,
        metadata: { user_id: uid },
      }),
    });

    const pay = await r.json();
    if (!r.ok) {
      const msg = pay?.message || pay?.cause?.[0]?.description || "";
      return res.status(400).json({ error: msg || "Não foi possível gerar o Pix." });
    }

    await admin.from("payments").upsert(
      { user_id: uid, mp_payment_id: String(pay.id), status: pay.status, amount: pay.transaction_amount },
      { onConflict: "mp_payment_id" }
    );

    const td = pay.point_of_interaction?.transaction_data || {};
    return res.json({
      id: pay.id,
      status: pay.status,
      qr_code: td.qr_code || null,               // chave copia-e-cola
      qr_code_base64: td.qr_code_base64 || null, // imagem do QR
      expira: pay.date_of_expiration || null,
    });
  } catch {
    return res.status(500).json({ error: "Falha ao gerar o Pix." });
  }
}

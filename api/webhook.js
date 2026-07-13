// ─────────────────────────────────────────────────────────────
//  /api/webhook  — Mercado Pago avisa AQUI quando um pagamento acontece.
//  Confirmamos o pagamento na API do MP e, se aprovado, liberamos o
//  Pro vitalício para o usuário certo (external_reference = user id).
//  Isto é o que torna o "liberar Pro" seguro: quem decide é o MP, não o navegador.
//  Vercel env: MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY
// ─────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const token = process.env.MP_ACCESS_TOKEN;
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;
  if (!token || !sbUrl || !sbKey) return res.status(200).json({ ok: true }); // responde 200 pra MP não reenviar

  const admin = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

  try {
    // O MP manda o id do pagamento por query (?type=payment&data.id=...) ou no corpo.
    const paymentId =
      req.query["data.id"] ||
      req.query.id ||
      req.body?.data?.id ||
      req.body?.id;

    const type = req.query.type || req.body?.type;
    if (type && type !== "payment") return res.status(200).json({ ok: true });
    if (!paymentId) return res.status(200).json({ ok: true });

    // Consulta o pagamento na API do Mercado Pago para confirmar de verdade.
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pay = await r.json();
    if (!r.ok) return res.status(200).json({ ok: true });

    const uid = pay.external_reference;      // quem pagou
    const status = pay.status;               // approved / pending / rejected

    // Evita creditar o mesmo pagamento duas vezes: só credita se ainda não existe.
    const { data: existing } = await admin
      .from("payments")
      .select("id")
      .eq("mp_payment_id", String(paymentId))
      .maybeSingle();

    // Registra/atualiza o pagamento.
    await admin.from("payments").upsert(
      {
        user_id: uid || null,
        mp_payment_id: String(paymentId),
        status,
        amount: pay.transaction_amount || null,
      },
      { onConflict: "mp_payment_id" }
    );

    // Se aprovado E ainda não tinha sido creditado, soma +30 dias de Pro.
    if (status === "approved" && uid && !existing) {
      await admin.rpc("add_pro_days", { uid, days: 30 });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: true }); // sempre 200 para o MP não ficar reenviando
  }
}

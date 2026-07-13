// ─────────────────────────────────────────────────────────────
//  /api/admin — Painel administrativo (só para is_admin = true)
//  Toda ação sensível é registrada em admin_logs.
//  Ações via ?acao=...
// ─────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !sbKey) return res.status(500).json({ error: "Servidor não configurado." });

  const admin = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

  // ── autentica e confirma que é admin ──
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Não autenticado." });
  const { data: ud, error } = await admin.auth.getUser(token);
  if (error || !ud?.user) return res.status(401).json({ error: "Sessão inválida." });
  const me = ud.user.id;

  const { data: meProf } = await admin.from("profiles").select("is_admin, username").eq("id", me).single();
  if (!meProf?.is_admin) return res.status(403).json({ error: "Acesso negado." });

  const log = (acao, alvo_id, detalhe) =>
    admin.from("admin_logs").insert({ admin_id: me, acao, alvo_id: alvo_id || null, detalhe: detalhe || null });

  const acao = req.query.acao;

  try {
    // ═══ VISÃO GERAL ═══
    if (acao === "overview") {
      const agora = new Date().toISOString();
      const [users, pagos, perguntas, denuncias, flags, notas, eventos] = await Promise.all([
        admin.from("profiles").select("id, pro_until, banned, created_at"),
        admin.from("payments").select("amount, status, created_at"),
        admin.from("questions").select("id", { count: "exact", head: true }),
        admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "aberta"),
        admin.from("flags").select("id", { count: "exact", head: true }).eq("revisado", false),
        admin.from("notes").select("id", { count: "exact", head: true }),
        admin.from("events").select("id", { count: "exact", head: true }),
      ]);

      const lista = users.data || [];
      const aprovados = (pagos.data || []).filter(p => p.status === "approved");
      const faturamento = aprovados.reduce((s, p) => s + Number(p.amount || 0), 0);

      // faturamento dos últimos 30 dias, por dia
      const hoje = new Date();
      const dias = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(hoje); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const total = aprovados
          .filter(p => (p.created_at || "").slice(0, 10) === key)
          .reduce((s, p) => s + Number(p.amount || 0), 0);
        dias.push({ dia: key.slice(8) + "/" + key.slice(5, 7), valor: total });
      }

      const mes = new Date(); mes.setDate(mes.getDate() - 30);
      const novos30 = lista.filter(u => new Date(u.created_at) > mes).length;

      return res.json({
        totalUsers: lista.length,
        proAtivos: lista.filter(u => u.pro_until && new Date(u.pro_until) > new Date(agora)).length,
        banidos: lista.filter(u => u.banned).length,
        novos30,
        faturamento,
        pagamentos: aprovados.length,
        totalPerguntas: perguntas.count || 0,
        totalNotas: notas.count || 0,
        totalEventos: eventos.count || 0,
        denunciasAbertas: denuncias.count || 0,
        flagsPendentes: flags.count || 0,
        grafico: dias,
      });
    }

    // ═══ USUÁRIOS ═══
    if (acao === "users") {
      const q = (req.query.q || "").trim();
      let query = admin.from("profiles")
        .select("id, username, pro_until, pro_since, is_admin, banned, banned_reason, created_at, notes")
        .order("created_at", { ascending: false }).limit(200);
      if (q) query = query.ilike("username", `%${q}%`);
      const { data } = await query;

      // conta perguntas de cada um
      const ids = (data || []).map(u => u.id);
      const { data: qs } = await admin.from("questions").select("user_id").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const contagem = {};
      (qs || []).forEach(x => { contagem[x.user_id] = (contagem[x.user_id] || 0) + 1; });

      return res.json({
        users: (data || []).map(u => ({
          ...u,
          perguntas: contagem[u.id] || 0,
          isPro: !!u.pro_until && new Date(u.pro_until) > new Date(),
        })),
      });
    }

    // ═══ DAR / DEFINIR ASSINATURA ═══
    if (acao === "set_pro" && req.method === "POST") {
      const { userId, ate } = req.body || {};
      if (!userId) return res.status(400).json({ error: "userId faltando." });
      // ate = null → remove o Pro
      const val = ate ? new Date(ate).toISOString() : null;
      await admin.from("profiles").update({ pro_until: val, pro_since: val ? new Date().toISOString() : null }).eq("id", userId);
      await log(val ? "dar_pro" : "remover_pro", userId, { ate: val });
      return res.json({ ok: true });
    }

    // ═══ BANIR / DESBANIR ═══
    if (acao === "ban" && req.method === "POST") {
      const { userId, banned, motivo } = req.body || {};
      if (!userId) return res.status(400).json({ error: "userId faltando." });
      await admin.from("profiles").update({
        banned: !!banned,
        banned_reason: banned ? (motivo || "Sem motivo informado") : null,
        banned_at: banned ? new Date().toISOString() : null,
      }).eq("id", userId);
      await log(banned ? "banir" : "desbanir", userId, { motivo });
      return res.json({ ok: true });
    }

    // ═══ TORNAR ADMIN ═══
    if (acao === "set_admin" && req.method === "POST") {
      const { userId, is_admin } = req.body || {};
      if (!userId) return res.status(400).json({ error: "userId faltando." });
      if (userId === me && !is_admin) return res.status(400).json({ error: "Você não pode remover seu próprio admin." });
      await admin.from("profiles").update({ is_admin: !!is_admin }).eq("id", userId);
      await log(is_admin ? "promover_admin" : "remover_admin", userId, {});
      return res.json({ ok: true });
    }

    // ═══ NOTA INTERNA ═══
    if (acao === "note" && req.method === "POST") {
      const { userId, notes } = req.body || {};
      await admin.from("profiles").update({ notes: (notes || "").slice(0, 500) }).eq("id", userId);
      return res.json({ ok: true });
    }

    // ═══ DELETAR USUÁRIO ═══
    if (acao === "delete_user" && req.method === "DELETE") {
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: "userId faltando." });
      if (userId === me) return res.status(400).json({ error: "Você não pode deletar a si mesmo." });
      const { data: alvo } = await admin.from("profiles").select("username").eq("id", userId).single();
      await log("deletar_usuario", userId, { username: alvo?.username });
      // apaga o usuário do Auth — as tabelas caem junto (on delete cascade)
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) return res.status(500).json({ error: "Não foi possível deletar." });
      return res.json({ ok: true });
    }

    // ═══ CRIAR USUÁRIO (admin ou normal) ═══
    if (acao === "create_user" && req.method === "POST") {
      const { username, password, is_admin, proDias } = req.body || {};
      const u = String(username || "").trim().toLowerCase();
      if (u.length < 3 || String(password || "").length < 6)
        return res.status(400).json({ error: "Usuário (3+) e senha (6+) obrigatórios." });

      const { data: novo, error: e } = await admin.auth.admin.createUser({
        email: `${u}@lyra.local`,
        password,
        email_confirm: true,
        user_metadata: { username: u },
      });
      if (e) return res.status(400).json({ error: e.message.includes("already") ? "Usuário já existe." : "Falha ao criar." });

      const uid = novo.user.id;
      const patch = { is_admin: !!is_admin };
      if (proDias > 0) {
        const ate = new Date(); ate.setDate(ate.getDate() + Number(proDias));
        patch.pro_until = ate.toISOString();
        patch.pro_since = new Date().toISOString();
      }
      await admin.from("profiles").update(patch).eq("id", uid);
      await log("criar_usuario", uid, { username: u, is_admin: !!is_admin, proDias });
      return res.json({ ok: true, userId: uid });
    }

    // ═══ NOTAS E AGENDA DE UM USUÁRIO ═══
    if (acao === "user_notes") {
      const userId = req.query.userId;
      const [notas, eventos] = await Promise.all([
        admin.from("notes").select("id, titulo, conteudo, criada_por, updated_at")
          .eq("user_id", userId).order("updated_at", { ascending: false }).limit(50),
        admin.from("events").select("id, titulo, detalhe, quando, concluido, criado_por")
          .eq("user_id", userId).order("quando", { ascending: false }).limit(50),
      ]);
      await log("ver_notas", userId, {});
      return res.json({ notas: notas.data || [], eventos: eventos.data || [] });
    }

    // ═══ CONVERSAS DE UM USUÁRIO ═══
    if (acao === "user_convs") {
      const userId = req.query.userId;
      const { data } = await admin.from("conversations")
        .select("id, title, updated_at").eq("user_id", userId)
        .order("updated_at", { ascending: false }).limit(100);
      return res.json({ conversations: data || [] });
    }

    // ═══ LER UMA CONVERSA (registra no log) ═══
    if (acao === "read_conv") {
      const convId = req.query.convId;
      const { data: conv } = await admin.from("conversations").select("user_id, title").eq("id", convId).single();
      const { data } = await admin.from("messages")
        .select("id, role, content, created_at").eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      await log("ver_conversa", conv?.user_id, { conversationId: convId, titulo: conv?.title });
      return res.json({ messages: data || [], titulo: conv?.title });
    }

    // ═══ DENÚNCIAS (Kanban) ═══
    if (acao === "reports") {
      const { data } = await admin.from("reports")
        .select("id, motivo, detalhe, status, created_at, target_user_id, conversation_id, reporter_id")
        .order("created_at", { ascending: false }).limit(200);

      const ids = [...new Set((data || []).flatMap(r => [r.target_user_id, r.reporter_id]).filter(Boolean))];
      const { data: profs } = await admin.from("profiles").select("id, username")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const nomes = {};
      (profs || []).forEach(p => { nomes[p.id] = p.username; });

      return res.json({
        reports: (data || []).map(r => ({
          ...r,
          alvo: nomes[r.target_user_id] || "—",
          denunciante: nomes[r.reporter_id] || "—",
        })),
      });
    }

    // ═══ MOVER DENÚNCIA (Kanban drag) ═══
    if (acao === "move_report" && req.method === "POST") {
      const { id, status } = req.body || {};
      const validos = ["aberta", "analisando", "resolvida", "arquivada"];
      if (!validos.includes(status)) return res.status(400).json({ error: "Status inválido." });
      await admin.from("reports").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      await log("mover_denuncia", null, { reportId: id, status });
      return res.json({ ok: true });
    }

    // ═══ FLAGS (perguntas estranhas) ═══
    if (acao === "flags") {
      const { data } = await admin.from("flags")
        .select("id, trecho, motivo, revisado, created_at, user_id, conversation_id")
        .order("created_at", { ascending: false }).limit(100);
      const ids = [...new Set((data || []).map(f => f.user_id).filter(Boolean))];
      const { data: profs } = await admin.from("profiles").select("id, username")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const nomes = {};
      (profs || []).forEach(p => { nomes[p.id] = p.username; });
      return res.json({ flags: (data || []).map(f => ({ ...f, username: nomes[f.user_id] || "—" })) });
    }

    if (acao === "review_flag" && req.method === "POST") {
      const { id } = req.body || {};
      await admin.from("flags").update({ revisado: true }).eq("id", id);
      return res.json({ ok: true });
    }

    // ═══ LOGS ═══
    if (acao === "logs") {
      const { data } = await admin.from("admin_logs")
        .select("id, acao, alvo_id, detalhe, created_at, admin_id")
        .order("created_at", { ascending: false }).limit(150);
      const ids = [...new Set((data || []).flatMap(l => [l.admin_id, l.alvo_id]).filter(Boolean))];
      const { data: profs } = await admin.from("profiles").select("id, username")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const nomes = {};
      (profs || []).forEach(p => { nomes[p.id] = p.username; });
      return res.json({
        logs: (data || []).map(l => ({
          ...l,
          admin: nomes[l.admin_id] || "—",
          alvo: nomes[l.alvo_id] || null,
        })),
      });
    }

    // ═══ PAGAMENTOS ═══
    if (acao === "payments") {
      const { data } = await admin.from("payments")
        .select("id, user_id, mp_payment_id, status, amount, created_at")
        .order("created_at", { ascending: false }).limit(100);
      const ids = [...new Set((data || []).map(p => p.user_id).filter(Boolean))];
      const { data: profs } = await admin.from("profiles").select("id, username")
        .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const nomes = {};
      (profs || []).forEach(p => { nomes[p.id] = p.username; });
      return res.json({ payments: (data || []).map(p => ({ ...p, username: nomes[p.user_id] || "—" })) });
    }

    return res.status(400).json({ error: "Ação desconhecida." });
  } catch (e) {
    return res.status(500).json({ error: "Falha na operação." });
  }
}

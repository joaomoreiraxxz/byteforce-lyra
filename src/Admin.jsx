import { useState, useEffect, useCallback, useRef } from "react";
import { I } from "./Icons.jsx";
import Saturn from "./Saturn.jsx";

const brl = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dt = (s) => s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
const d = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";

export default function Admin({ session, onExit, tema, setTema }) {
  const [aba, setAba] = useState("visao");
  const [toast, setToast] = useState("");
  const auth = { Authorization: `Bearer ${session.access_token}` };
  const aviso = (t) => { setToast(t); setTimeout(() => setToast(""), 2800); };

  const api = useCallback(async (acao, opts = {}) => {
    const r = await fetch(`/api/admin?acao=${acao}${opts.qs || ""}`, {
      method: opts.method || "GET",
      headers: { ...auth, ...(opts.body ? { "Content-Type": "application/json" } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Falha");
    return d;
  }, [session]);

  const [live, setLive] = useState(true);
  const [tick, setTick] = useState(0);

  // Auto-refresh: recarrega os dados a cada 10 segundos
  useEffect(() => {
    if (!live) return;
    const iv = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(iv);
  }, [live]);

  const abas = [
    { id: "visao", n: "Visão geral", i: I.chart },
    { id: "users", n: "Usuários", i: I.users },
    { id: "denuncias", n: "Denúncias", i: I.flag },
    { id: "flags", n: "Sinalizadas", i: I.alert },
    { id: "pagamentos", n: "Pagamentos", i: I.money },
    { id: "logs", n: "Logs", i: I.list },
  ];

  return (
    <div className="ad">
      <AdminStyles />
      {toast && <div className="ad-toast">{toast}</div>}

      <aside className="ad-side">
        <div className="ad-brand">
          <Saturn size={22} glow={.7} float={false} className="ad-sat" />
          <div><b>Painel</b><small>Byte Force</small></div>
        </div>
        <nav className="ad-nav">
          {abas.map(a => (
            <button key={a.id} className={aba === a.id ? "on" : ""} onClick={() => setAba(a.id)}>
              {a.i(16)} {a.n}
            </button>
          ))}
        </nav>
        <div className="ad-ctrl">
          <button className={"ad-live" + (live ? " on" : "")} onClick={() => setLive(l => !l)}
            title={live ? "Atualizando a cada 10s" : "Atualização pausada"}>
            <span className="ad-live-d" />{live ? "Ao vivo" : "Pausado"}
          </button>
          <button className="ad-tema" onClick={() => setTema(tema === "escuro" ? "claro" : "escuro")}>
            {tema === "escuro" ? I.sun(14) : I.moon(14)}
          </button>
        </div>
        <button className="ad-exit" onClick={onExit}>{I.home(15)} Voltar ao site</button>
      </aside>

      <main className="ad-main">
        {aba === "visao" && <Visao api={api} tick={tick} />}
        {aba === "users" && <Users api={api} aviso={aviso} tick={tick} />}
        {aba === "denuncias" && <Denuncias api={api} aviso={aviso} tick={tick} />}
        {aba === "flags" && <Flags api={api} aviso={aviso} tick={tick} />}
        {aba === "pagamentos" && <Pagamentos api={api} tick={tick} />}
        {aba === "logs" && <Logs api={api} tick={tick} />}
      </main>
    </div>
  );
}

// ═══ VISÃO GERAL ═══
function Visao({ api, tick }) {
  const [d, setD] = useState(null);
  useEffect(() => { api("overview").then(setD).catch(() => {}); }, [api, tick]);
  if (!d) return <Load />;

  const max = Math.max(...d.grafico.map(g => g.valor), 1);

  return (
    <>
      <H t="Visão geral" s="O panorama da Lyra hoje" />
      <div className="ad-cards">
        <Card i={I.users(20)} n={d.totalUsers} l="usuários" sub={`+${d.novos30} nos últimos 30 dias`} />
        <Card i={I.star(20)} n={d.proAtivos} l="assinantes Pro" sub={`${d.pagamentos} pagamentos` } cor="roxo" />
        <Card i={I.money(20)} n={brl(d.faturamento)} l="faturado" sub="total confirmado" cor="verde" />
        <Card i={I.spark(20)} n={d.totalPerguntas} l="perguntas" sub="feitas à Lyra" />
      </div>

      <div className="ad-cards s2">
        <Card i={I.flag(20)} n={d.denunciasAbertas} l="denúncias abertas" cor={d.denunciasAbertas ? "vermelho" : ""} />
        <Card i={I.alert(20)} n={d.flagsPendentes} l="sinalizadas pendentes" cor={d.flagsPendentes ? "amarelo" : ""} />
        <Card i={I.lock(20)} n={d.banidos} l="usuários banidos" />
      </div>

      <div className="ad-cards s2">
        <Card i={I.note(20)} n={d.totalNotas} l="notas criadas" />
        <Card i={I.cal(20)} n={d.totalEventos} l="compromissos" />
        <Card i={I.users(20)} n={d.totalUsers ? (d.totalPerguntas / d.totalUsers).toFixed(1) : 0} l="perguntas por usuário" />
      </div>

      <div className="ad-panel">
        <h3>Faturamento — últimos 30 dias</h3>
        <div className="ad-chart">
          {d.grafico.map((g, i) => (
            <div key={i} className="ad-bar" title={`${g.dia}: ${brl(g.valor)}`}>
              <div className="ad-bar-f" style={{ height: `${(g.valor / max) * 100}%` }} />
              {i % 5 === 0 && <span>{g.dia}</span>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ═══ USUÁRIOS ═══
function Users({ api, aviso, tick }) {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [criar, setCriar] = useState(false);

  const load = useCallback(async () => {
    try { const d = await api("users", { qs: q ? `&q=${encodeURIComponent(q)}` : "" }); setUsers(d.users); }
    catch { setUsers([]); }
  }, [api, q]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load, tick]);

  return (
    <>
      <H t="Usuários" s={`${users?.length ?? "—"} contas`}
        acao={<button className="ad-btn p" onClick={() => setCriar(true)}>{I.plus(15)} Criar usuário</button>} />

      <div className="ad-find">
        {I.search(15)}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por usuário…" />
      </div>

      {!users ? <Load /> : users.length === 0 ? <Vazio t="Nenhum usuário encontrado" /> : (
        <div className="ad-table">
          <div className="ad-tr ad-th">
            <span>Usuário</span><span>Plano</span><span>Perguntas</span><span>Criado</span><span></span>
          </div>
          {users.map(u => (
            <div key={u.id} className={"ad-tr" + (u.banned ? " ban" : "")} onClick={() => setSel(u)}>
              <span className="ad-u">
                <b>{u.username}</b>
                {u.is_admin && <em className="tag adm">admin</em>}
                {u.banned && <em className="tag ban">banido</em>}
              </span>
              <span>{u.isPro ? <em className="tag pro">{I.star(11)} Pro até {d(u.pro_until)}</em> : <em className="tag free">Grátis</em>}</span>
              <span>{u.perguntas}</span>
              <span className="ad-dim">{d(u.created_at)}</span>
              <span className="ad-go">{I.arrow(14)}</span>
            </div>
          ))}
        </div>
      )}

      {sel && <UserModal u={sel} api={api} aviso={aviso} onClose={() => setSel(null)} onChange={load} />}
      {criar && <CriarModal api={api} aviso={aviso} onClose={() => setCriar(false)} onDone={load} />}
    </>
  );
}

// ═══ MODAL DO USUÁRIO ═══
function UserModal({ u, api, aviso, onClose, onChange }) {
  const [tab, setTab] = useState("acoes");
  const [convs, setConvs] = useState(null);
  const [conv, setConv] = useState(null);
  const [notas, setNotas] = useState(null);
  const [dias, setDias] = useState(30);
  const [motivo, setMotivo] = useState("");
  const [nota, setNota] = useState(u.notes || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (tab === "convs" && !convs) {
      api("user_convs", { qs: `&userId=${u.id}` }).then(d => setConvs(d.conversations)).catch(() => setConvs([]));
    }
    if (tab === "notas" && !notas) {
      api("user_notes", { qs: `&userId=${u.id}` }).then(setNotas).catch(() => setNotas({ notas: [], eventos: [] }));
    }
  }, [tab, convs, notas, api, u.id]);

  const run = async (fn, msg) => {
    setBusy(true);
    try { await fn(); aviso(msg); onChange(); }
    catch (e) { aviso(e.message); }
    finally { setBusy(false); }
  };

  const darPro = () => run(async () => {
    const ate = new Date(); ate.setDate(ate.getDate() + Number(dias));
    await api("set_pro", { method: "POST", body: { userId: u.id, ate: ate.toISOString() } });
  }, `Pro de ${dias} dias concedido a ${u.username}`);

  const tirarPro = () => run(() => api("set_pro", { method: "POST", body: { userId: u.id, ate: null } }),
    "Assinatura removida");

  const banir = () => run(() => api("ban", { method: "POST", body: { userId: u.id, banned: !u.banned, motivo } }),
    u.banned ? "Usuário desbanido" : "Usuário banido");

  const admin = () => run(() => api("set_admin", { method: "POST", body: { userId: u.id, is_admin: !u.is_admin } }),
    u.is_admin ? "Admin removido" : "Agora é admin");

  const salvarNota = () => run(() => api("note", { method: "POST", body: { userId: u.id, notes: nota } }), "Nota salva");

  const deletar = () => {
    if (!confirm(`Deletar ${u.username} PERMANENTEMENTE? Isso apaga conversas, memórias e pagamentos. Não tem volta.`)) return;
    run(async () => {
      await api("delete_user", { method: "DELETE", qs: `&userId=${u.id}` });
      onClose();
    }, `${u.username} foi deletado`);
  };

  const abrirConv = async (id) => {
    const d = await api("read_conv", { qs: `&convId=${id}` });
    setConv({ id, titulo: d.titulo, messages: d.messages });
  };

  return (
    <div className="ad-ovl" onClick={onClose}>
      <div className="ad-modal big" onClick={e => e.stopPropagation()}>
        <button className="ad-x" onClick={onClose}>{I.close()}</button>

        <div className="ad-uhead">
          <div className="ad-ava">{u.username[0].toUpperCase()}</div>
          <div>
            <h3>{u.username}
              {u.is_admin && <em className="tag adm">admin</em>}
              {u.banned && <em className="tag ban">banido</em>}
            </h3>
            <small>
              {u.isPro ? `Pro até ${d(u.pro_until)}` : "Plano grátis"} · {u.perguntas} perguntas · desde {d(u.created_at)}
            </small>
          </div>
        </div>

        <div className="ad-tabs">
          <button className={tab === "acoes" ? "on" : ""} onClick={() => setTab("acoes")}>Ações</button>
          <button className={tab === "convs" ? "on" : ""} onClick={() => setTab("convs")}>Conversas</button>
          <button className={tab === "notas" ? "on" : ""} onClick={() => setTab("notas")}>Notas e agenda</button>
        </div>

        {tab === "acoes" && (
          <div className="ad-acoes">
            <div className="ad-bloco">
              <label>Assinatura</label>
              <div className="ad-row">
                <select value={dias} onChange={e => setDias(e.target.value)}>
                  <option value="7">7 dias</option>
                  <option value="30">30 dias</option>
                  <option value="90">90 dias</option>
                  <option value="365">1 ano</option>
                  <option value="3650">10 anos (vitalício)</option>
                </select>
                <button className="ad-btn p" onClick={darPro} disabled={busy}>{I.star(14)} Dar Pro grátis</button>
                {u.isPro && <button className="ad-btn" onClick={tirarPro} disabled={busy}>Remover</button>}
              </div>
            </div>

            <div className="ad-bloco">
              <label>Moderação</label>
              {!u.banned && (
                <input placeholder="Motivo do banimento…" value={motivo} onChange={e => setMotivo(e.target.value)} />
              )}
              {u.banned && <p className="ad-banmsg">Banido: {u.banned_reason}</p>}
              <div className="ad-row">
                <button className={"ad-btn " + (u.banned ? "" : "d")} onClick={banir} disabled={busy}>
                  {I.lock(14)} {u.banned ? "Desbanir" : "Banir usuário"}
                </button>
              </div>
            </div>

            <div className="ad-bloco">
              <label>Permissões</label>
              <div className="ad-row">
                <button className="ad-btn" onClick={admin} disabled={busy}>
                  {I.star(14)} {u.is_admin ? "Remover admin" : "Tornar admin"}
                </button>
              </div>
            </div>

            <div className="ad-bloco">
              <label>Nota interna (só você vê)</label>
              <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Anotações sobre este usuário…" />
              <button className="ad-btn" onClick={salvarNota} disabled={busy}>Salvar nota</button>
            </div>

            <div className="ad-bloco perigo">
              <label>Zona de perigo</label>
              <p>Deletar apaga a conta, conversas, memórias e histórico. Não tem volta.</p>
              <button className="ad-btn d" onClick={deletar} disabled={busy}>{I.trash(14)} Deletar usuário</button>
            </div>
          </div>
        )}

        {tab === "notas" && (
          <div className="ad-convs">
            <div className="ad-lgpd">{I.alert(14)} Acessos são registrados nos logs.</div>
            {!notas ? <Load /> : (
              <>
                <h4 className="ad-sec">{I.note(15)} Notas ({notas.notas.length})</h4>
                {notas.notas.length === 0 ? <p className="ad-nada">Nenhuma nota.</p> : (
                  <div className="ad-nlist">
                    {notas.notas.map(n => (
                      <div key={n.id} className="ad-n">
                        <b>{n.titulo}</b>
                        {n.criada_por === "lyra" && <em className="tag pro">Lyra</em>}
                        <p>{n.conteudo}</p>
                        <small>{dt(n.updated_at)}</small>
                      </div>
                    ))}
                  </div>
                )}
                <h4 className="ad-sec">{I.cal(15)} Agenda ({notas.eventos.length})</h4>
                {notas.eventos.length === 0 ? <p className="ad-nada">Nenhum compromisso.</p> : (
                  <div className="ad-nlist">
                    {notas.eventos.map(e => (
                      <div key={e.id} className={"ad-n" + (e.concluido ? " ok" : "")}>
                        <b>{e.titulo}</b>
                        {e.criado_por === "lyra" && <em className="tag pro">Lyra</em>}
                        {e.detalhe && <p>{e.detalhe}</p>}
                        <small>{dt(e.quando)}{e.concluido ? " · concluído" : ""}</small>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "convs" && (
          <div className="ad-convs">
            <div className="ad-lgpd">{I.alert(14)} Acessos a conversas são registrados nos logs.</div>
            {!convs ? <Load /> : convs.length === 0 ? <Vazio t="Nenhuma conversa" /> : (
              conv ? (
                <>
                  <button className="ad-back" onClick={() => setConv(null)}>← Voltar</button>
                  <h4 className="ad-convt">{conv.titulo}</h4>
                  <div className="ad-chat">
                    {conv.messages.map(m => (
                      <div key={m.id} className={"ad-m " + m.role}>
                        <b>{m.role === "user" ? u.username : "Lyra"}</b>
                        <p>{m.content}</p>
                        <small>{dt(m.created_at)}</small>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="ad-clist">
                  {convs.map(c => (
                    <button key={c.id} onClick={() => abrirConv(c.id)}>
                      <span>{c.title}</span>
                      <small>{dt(c.updated_at)}</small>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ CRIAR USUÁRIO ═══
function CriarModal({ api, aviso, onClose, onDone }) {
  const [u, setU] = useState(""), [p, setP] = useState("");
  const [adm, setAdm] = useState(false), [dias, setDias] = useState(0);
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");

  async function criar() {
    setBusy(true); setErr("");
    try {
      await api("create_user", { method: "POST", body: { username: u, password: p, is_admin: adm, proDias: Number(dias) } });
      aviso(`Usuário ${u} criado`); onDone(); onClose();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="ad-ovl" onClick={onClose}>
      <div className="ad-modal" onClick={e => e.stopPropagation()}>
        <button className="ad-x" onClick={onClose}>{I.close()}</button>
        <h3>Criar usuário</h3>
        <div className="ad-bloco">
          <label>Nome de usuário</label>
          <input value={u} onChange={e => setU(e.target.value)} placeholder="joao_novo" autoCapitalize="none" />
          <label>Senha</label>
          <input type="password" value={p} onChange={e => setP(e.target.value)} placeholder="mínimo 6 caracteres" />
          <label>Assinatura inicial</label>
          <select value={dias} onChange={e => setDias(e.target.value)}>
            <option value="0">Sem Pro (grátis)</option>
            <option value="7">7 dias de Pro</option>
            <option value="30">30 dias de Pro</option>
            <option value="365">1 ano de Pro</option>
            <option value="3650">Vitalício</option>
          </select>
          <label className="ad-check">
            <input type="checkbox" checked={adm} onChange={e => setAdm(e.target.checked)} />
            Tornar administrador
          </label>
        </div>
        {err && <div className="ad-err">{err}</div>}
        <button className="ad-btn p full" onClick={criar} disabled={busy || u.length < 3 || p.length < 6}>
          {busy ? "Criando…" : "Criar usuário"}
        </button>
      </div>
    </div>
  );
}

// ═══ DENÚNCIAS — KANBAN ═══
const COLS = [
  { id: "aberta", n: "Aberta", c: "#f87171" },
  { id: "analisando", n: "Analisando", c: "#fbbf24" },
  { id: "resolvida", n: "Resolvida", c: "#4ade80" },
  { id: "arquivada", n: "Arquivada", c: "#6b6483" },
];

function Denuncias({ api, aviso, tick }) {
  const [reports, setReports] = useState(null);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);

  const load = useCallback(() => api("reports").then(d => setReports(d.reports)).catch(() => setReports([])), [api]);
  useEffect(() => { load(); }, [load, tick]);

  async function mover(id, status) {
    setReports(r => r.map(x => x.id === id ? { ...x, status } : x));
    try { await api("move_report", { method: "POST", body: { id, status } }); }
    catch { aviso("Falha ao mover"); load(); }
  }

  if (!reports) return <Load />;

  return (
    <>
      <H t="Denúncias" s="Arraste os cards entre as colunas" />
      <div className="ad-kanban">
        {COLS.map(col => {
          const cards = reports.filter(r => r.status === col.id);
          return (
            <div key={col.id}
              className={"ad-col" + (over === col.id ? " over" : "")}
              onDragOver={e => { e.preventDefault(); setOver(col.id); }}
              onDragLeave={() => setOver(null)}
              onDrop={e => { e.preventDefault(); setOver(null); if (drag) mover(drag, col.id); setDrag(null); }}
            >
              <div className="ad-col-h">
                <span className="ad-dot" style={{ background: col.c }} />
                {col.n}
                <em>{cards.length}</em>
              </div>
              <div className="ad-col-b">
                {cards.length === 0 && <div className="ad-col-e">Vazio</div>}
                {cards.map(r => (
                  <div key={r.id} className="ad-card" draggable
                    onDragStart={() => setDrag(r.id)}
                    onDragEnd={() => { setDrag(null); setOver(null); }}
                  >
                    <div className="ad-card-t">{r.motivo}</div>
                    {r.detalhe && <p>{r.detalhe}</p>}
                    <div className="ad-card-f">
                      <span>{r.alvo}</span>
                      <small>{d(r.created_at)}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ═══ FLAGS ═══
function Flags({ api, aviso, tick }) {
  const [flags, setFlags] = useState(null);
  const load = useCallback(() => api("flags").then(d => setFlags(d.flags)).catch(() => setFlags([])), [api]);
  useEffect(() => { load(); }, [load, tick]);

  const revisar = async (id) => {
    setFlags(f => f.map(x => x.id === id ? { ...x, revisado: true } : x));
    try { await api("review_flag", { method: "POST", body: { id } }); aviso("Marcada como revisada"); } catch {}
  };

  if (!flags) return <Load />;

  return (
    <>
      <H t="Perguntas sinalizadas" s="Detectadas automaticamente pelo sistema" />
      {flags.length === 0 ? <Vazio t="Nada sinalizado. Tudo tranquilo." /> : (
        <div className="ad-flags">
          {flags.map(f => (
            <div key={f.id} className={"ad-flag" + (f.revisado ? " ok" : "")}>
              <div className="ad-flag-h">
                <em className={"tag " + (f.motivo.includes("CRÍTICO") ? "ban" : "warn")}>{f.motivo}</em>
                <span>{f.username}</span>
                <small>{dt(f.created_at)}</small>
              </div>
              <p className="ad-flag-t">"{f.trecho}"</p>
              {!f.revisado && (
                <button className="ad-btn sm" onClick={() => revisar(f.id)}>{I.check(13)} Marcar revisada</button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ═══ PAGAMENTOS ═══
function Pagamentos({ api, tick }) {
  const [p, setP] = useState(null);
  useEffect(() => { api("payments").then(d => setP(d.payments)).catch(() => setP([])); }, [api, tick]);
  if (!p) return <Load />;
  const total = p.filter(x => x.status === "approved").reduce((s, x) => s + Number(x.amount || 0), 0);

  return (
    <>
      <H t="Pagamentos" s={`${brl(total)} confirmados · ${p.length} registros`} />
      {p.length === 0 ? <Vazio t="Nenhum pagamento ainda" /> : (
        <div className="ad-table">
          <div className="ad-tr ad-th"><span>Usuário</span><span>Valor</span><span>Status</span><span>Data</span></div>
          {p.map(x => (
            <div key={x.id} className="ad-tr">
              <span><b>{x.username}</b></span>
              <span>{brl(x.amount)}</span>
              <span><em className={"tag " + (x.status === "approved" ? "pro" : "free")}>{x.status}</em></span>
              <span className="ad-dim">{dt(x.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ═══ LOGS ═══
function Logs({ api, tick }) {
  const [l, setL] = useState(null);
  useEffect(() => { api("logs").then(d => setL(d.logs)).catch(() => setL([])); }, [api, tick]);
  if (!l) return <Load />;

  const nome = {
    ver_conversa: "abriu uma conversa de", banir: "baniu", desbanir: "desbaniu",
    dar_pro: "deu Pro para", remover_pro: "removeu o Pro de", promover_admin: "promoveu a admin",
    remover_admin: "removeu admin de", deletar_usuario: "DELETOU", criar_usuario: "criou",
    mover_denuncia: "moveu uma denúncia",
  };

  return (
    <>
      <H t="Logs de auditoria" s="Tudo o que os admins fizeram" />
      {l.length === 0 ? <Vazio t="Nenhuma ação registrada" /> : (
        <div className="ad-logs">
          {l.map(x => (
            <div key={x.id} className={"ad-log" + (x.acao === "deletar_usuario" ? " d" : "")}>
              <span className="ad-log-d">{dt(x.created_at)}</span>
              <span className="ad-log-t">
                <b>{x.admin}</b> {nome[x.acao] || x.acao} {x.alvo && <b>{x.alvo}</b>}
                {x.detalhe?.titulo && <em> ("{x.detalhe.titulo}")</em>}
                {x.detalhe?.motivo && <em> — {x.detalhe.motivo}</em>}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ═══ AUXILIARES ═══
const H = ({ t, s, acao }) => (
  <div className="ad-h">
    <div><h2>{t}</h2><p>{s}</p></div>
    {acao}
  </div>
);
const Card = ({ i, n, l, sub, cor }) => (
  <div className={"ad-c " + (cor || "")}>
    <span className="ad-c-i">{i}</span>
    <div className="ad-c-n">{n}</div>
    <div className="ad-c-l">{l}</div>
    {sub && <div className="ad-c-s">{sub}</div>}
  </div>
);
const Load = () => <div className="ad-load"><span /></div>;
const Vazio = ({ t }) => <div className="ad-vazio">{t}</div>;

function AdminStyles() {
  return (
    <style>{`
      .ad{position:fixed;inset:0;display:flex;background:var(--bg);color:var(--ink);font-family:'Inter',sans-serif;z-index:600;
        background-image:radial-gradient(ellipse 100% 60% at 50% -15%,rgba(109,40,217,.13),transparent 60%)}
      .ad *{box-sizing:border-box}
      .ad button{font-family:inherit}
      /* SIDEBAR */
      .ad-side{width:230px;flex:0 0 230px;background:var(--surface-2);backdrop-filter:blur(20px);border-right:1px solid var(--line);display:flex;flex-direction:column;padding:16px}
      .ad-brand{display:flex;align-items:center;gap:4px;margin-bottom:22px;padding:0 4px}
      .ad-sat{margin:-12px -8px -12px -12px}
      .ad-brand b{font-family:'Sora',sans-serif;font-size:15px;display:block;letter-spacing:-.01em}
      .ad-brand small{font-size:11px;color:var(--ink-3)}
      .ad-nav{flex:1;display:flex;flex-direction:column;gap:3px}
      .ad-nav button{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:9px;background:none;border:none;color:var(--ink-2);font-size:13.5px;cursor:pointer;transition:.16s;text-align:left;font-weight:500}
      .ad-nav button:hover{background:var(--surface-2);color:var(--ink)}
      .ad-nav button.on{background:rgba(168,85,247,.14);color:var(--ink)}
      .ad-exit{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:9px;background:none;border:1px solid var(--line);color:var(--ink-3);font-size:12.5px;cursor:pointer;transition:.2s;justify-content:center}
      .ad-exit:hover{background:var(--surface-2);color:var(--ink)}
      /* MAIN */
      .ad-main{flex:1;overflow-y:auto;padding:30px 34px}
      .ad-main::-webkit-scrollbar{width:7px}.ad-main::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
      .ad-h{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;gap:16px;flex-wrap:wrap}
      .ad-h h2{font-family:'Sora',sans-serif;font-size:25px;font-weight:700;letter-spacing:-.03em}
      .ad-h p{color:var(--ink-2);font-size:13.5px;margin-top:4px}
      /* CARDS */
      .ad-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px}
      .ad-cards.s2{grid-template-columns:repeat(3,1fr);margin-bottom:24px}
      @media(max-width:1100px){.ad-cards,.ad-cards.s2{grid-template-columns:repeat(2,1fr)}}
      .ad-c{background:var(--surface);border:1px solid var(--line);border-radius:15px;padding:18px}
      .ad-c-i{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:rgba(168,85,247,.12);color:var(--v3);margin-bottom:12px}
      .ad-c.roxo .ad-c-i{background:rgba(168,85,247,.2)}
      .ad-c.verde .ad-c-i{background:rgba(74,222,128,.14);color:#4ade80}
      .ad-c.vermelho{border-color:rgba(248,113,113,.3)}
      .ad-c.vermelho .ad-c-i{background:rgba(248,113,113,.14);color:#f87171}
      .ad-c.amarelo{border-color:rgba(251,191,36,.3)}
      .ad-c.amarelo .ad-c-i{background:rgba(251,191,36,.14);color:#fbbf24}
      .ad-c-n{font-family:'Sora',sans-serif;font-size:26px;font-weight:700;letter-spacing:-.03em;line-height:1}
      .ad-c-l{color:var(--ink-2);font-size:12.5px;margin-top:5px}
      .ad-c-s{color:var(--ink-3);font-size:11px;margin-top:6px}
      /* PAINEL / GRÁFICO */
      .ad-panel{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:22px}
      .ad-panel h3{font-family:'Sora',sans-serif;font-size:15px;font-weight:600;margin-bottom:20px}
      .ad-chart{display:flex;align-items:flex-end;gap:3px;height:130px}
      .ad-bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;position:relative}
      .ad-bar-f{width:100%;background:linear-gradient(180deg,var(--v2),var(--v1));border-radius:3px 3px 0 0;min-height:2px;transition:.3s}
      .ad-bar:hover .ad-bar-f{background:linear-gradient(180deg,#f0abfc,#a855f7)}
      .ad-bar span{position:absolute;bottom:-18px;font-size:9px;color:var(--ink-3);white-space:nowrap}
      /* BUSCA */
      .ad-find{display:flex;align-items:center;gap:9px;padding:11px 14px;border-radius:11px;background:var(--surface);border:1px solid var(--line);color:var(--ink-3);margin-bottom:16px;max-width:340px}
      .ad-find:focus-within{border-color:rgba(168,85,247,.4)}
      .ad-find input{flex:1;background:none;border:none;outline:none;color:var(--ink);font-size:13.5px;font-family:inherit}
      .ad-find input::placeholder{color:#5a5470}
      /* TABELA */
      .ad-table{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
      .ad-tr{display:grid;grid-template-columns:2fr 1.6fr .7fr 1fr 40px;gap:12px;padding:13px 16px;align-items:center;font-size:13.5px;border-bottom:1px solid var(--line);cursor:pointer;transition:.14s}
      .ad-tr:last-child{border-bottom:none}
      .ad-tr:not(.ad-th):hover{background:rgba(168,85,247,.07)}
      .ad-th{font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.08em;font-weight:600;cursor:default;background:var(--surface)}
      .ad-th:hover{background:var(--surface)}
      .ad-tr.ban{opacity:.55}
      .ad-u{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
      .ad-dim{color:var(--ink-3);font-size:12.5px}
      .ad-go{color:var(--ink-3);display:grid;place-items:center}
      .tag{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;padding:3px 8px;border-radius:999px;font-style:normal;white-space:nowrap}
      .tag.pro{background:rgba(168,85,247,.16);color:var(--v3)}
      .tag.free{background:var(--surface-2);color:var(--ink-2)}
      .tag.adm{background:rgba(96,165,250,.16);color:#60a5fa}
      .tag.ban{background:rgba(248,113,113,.16);color:#f87171}
      .tag.warn{background:rgba(251,191,36,.14);color:#fbbf24}
      /* KANBAN */
      .ad-kanban{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;align-items:start}
      @media(max-width:1100px){.ad-kanban{grid-template-columns:repeat(2,1fr)}}
      .ad-col{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px;min-height:280px;transition:.2s}
      .ad-col.over{background:rgba(168,85,247,.09);border-color:rgba(168,85,247,.4)}
      .ad-col-h{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--ink-2);margin-bottom:12px;padding:0 4px}
      .ad-dot{width:7px;height:7px;border-radius:50%;flex:0 0 auto}
      .ad-col-h em{margin-left:auto;font-style:normal;font-size:11px;color:var(--ink-3);background:var(--surface-2);padding:2px 7px;border-radius:999px}
      .ad-col-b{display:flex;flex-direction:column;gap:8px;min-height:60px}
      .ad-col-e{text-align:center;padding:24px 0;font-size:11.5px;color:#4a4460}
      .ad-card{background:var(--surface-2);border:1px solid var(--line);border-radius:11px;padding:12px;cursor:grab;transition:.18s}
      .ad-card:hover{border-color:rgba(168,85,247,.35);transform:translateY(-2px)}
      .ad-card:active{cursor:grabbing;opacity:.6}
      .ad-card-t{font-size:12.5px;font-weight:600;margin-bottom:5px;color:var(--ink)}
      .ad-card p{font-size:11.5px;color:var(--ink-2);line-height:1.5;margin-bottom:9px}
      .ad-card-f{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--ink-3)}
      .ad-card-f span{color:var(--v3);font-weight:500}
      /* FLAGS */
      .ad-flags{display:flex;flex-direction:column;gap:10px}
      .ad-flag{background:var(--surface);border:1px solid rgba(251,191,36,.25);border-radius:13px;padding:16px}
      .ad-flag.ok{border-color:rgba(255,255,255,.07);opacity:.5}
      .ad-flag-h{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
      .ad-flag-h span{font-size:12.5px;color:var(--v3);font-weight:600}
      .ad-flag-h small{margin-left:auto;font-size:11px;color:var(--ink-3)}
      .ad-flag-t{font-size:13px;color:var(--ink-2);line-height:1.6;font-style:italic;padding:10px 12px;background:rgba(0,0,0,.25);border-radius:9px;margin-bottom:10px}
      /* LOGS */
      .ad-logs{display:flex;flex-direction:column;gap:2px}
      .ad-log{display:flex;gap:14px;padding:11px 14px;border-radius:9px;font-size:13px;transition:.14s}
      .ad-log:hover{background:var(--surface)}
      .ad-log.d{background:rgba(248,113,113,.07)}
      .ad-log-d{color:var(--ink-3);font-size:11.5px;white-space:nowrap;flex:0 0 105px;padding-top:1px}
      .ad-log-t{color:#a8a2bd;line-height:1.5}
      .ad-log-t b{color:var(--ink);font-weight:600}
      .ad-log-t em{color:var(--ink-3);font-style:normal;font-size:12px}
      /* MODAL */
      .ad-ovl{position:fixed;inset:0;z-index:700;background:rgba(4,2,10,.8);backdrop-filter:blur(8px);display:grid;place-items:center;padding:20px;animation:af .25s;overflow-y:auto}
      @keyframes af{from{opacity:0}to{opacity:1}}
      .ad-modal{width:100%;max-width:430px;background:var(--bg-2);border:1px solid var(--line-2);border-radius:20px;padding:26px;position:relative;box-shadow:0 40px 100px rgba(0,0,0,.8);margin:auto}
      .ad-modal.big{max-width:620px;max-height:86vh;display:flex;flex-direction:column}
      .ad-x{position:absolute;top:15px;right:15px;background:var(--surface-2);border:1px solid var(--line-2);width:28px;height:28px;border-radius:50%;color:#a8a2bd;cursor:pointer;display:grid;place-items:center;transition:.2s;z-index:2}
      .ad-x:hover{background:rgba(255,255,255,.12);color:#fff}
      .ad-modal h3{font-family:'Sora',sans-serif;font-size:18px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .ad-uhead{display:flex;gap:14px;align-items:center;margin-bottom:18px;padding-right:34px}
      .ad-ava{width:46px;height:46px;border-radius:13px;background:linear-gradient(140deg,var(--v1),var(--v2));display:grid;place-items:center;font-size:18px;font-weight:700;color:#fff;flex:0 0 auto}
      .ad-uhead h3{margin-bottom:3px}
      .ad-uhead small{color:var(--ink-2);font-size:12px}
      .ad-tabs{display:flex;gap:4px;margin-bottom:18px;border-bottom:1px solid var(--line)}
      .ad-tabs button{background:none;border:none;color:var(--ink-2);font-size:13px;padding:9px 14px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:.16s;font-weight:500}
      .ad-tabs button.on{color:var(--v3);border-color:#a855f7}
      .ad-acoes,.ad-convs{overflow-y:auto;flex:1;padding-right:4px}
      .ad-acoes::-webkit-scrollbar,.ad-convs::-webkit-scrollbar{width:5px}
      .ad-acoes::-webkit-scrollbar-thumb,.ad-convs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
      .ad-bloco{padding:16px;background:var(--surface);border:1px solid var(--line);border-radius:13px;margin-bottom:10px}
      .ad-bloco.perigo{border-color:rgba(248,113,113,.25);background:rgba(248,113,113,.04)}
      .ad-bloco label{display:block;font-size:11.5px;color:var(--ink-2);font-weight:600;margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em}
      .ad-bloco p{font-size:12px;color:var(--ink-2);line-height:1.55;margin-bottom:12px}
      .ad-bloco input,.ad-bloco select,.ad-bloco textarea{width:100%;background:var(--surface-2);border:1px solid var(--line-2);border-radius:9px;padding:10px 12px;color:var(--ink);font-size:13.5px;font-family:inherit;outline:none;margin-bottom:10px}
      .ad-bloco input:focus,.ad-bloco select:focus,.ad-bloco textarea:focus{border-color:rgba(168,85,247,.5)}
      .ad-bloco textarea{min-height:70px;resize:vertical;line-height:1.5}
      .ad-bloco select{cursor:pointer}
      .ad-bloco option{background:#16112a}
      .ad-check{display:flex!important;align-items:center;gap:9px;text-transform:none!important;letter-spacing:0!important;font-size:13px!important;color:var(--ink-2)!important;cursor:pointer;margin-top:4px}
      .ad-check input{width:auto!important;margin:0!important;accent-color:#a855f7;cursor:pointer}
      .ad-row{display:flex;gap:8px;flex-wrap:wrap}
      .ad-banmsg{color:#f87171!important;font-size:12.5px!important}
      .ad-btn{padding:9px 15px;border-radius:9px;background:var(--surface-2);border:1px solid var(--line-2);color:var(--ink-2);font-size:12.5px;font-weight:600;cursor:pointer;transition:.18s;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
      .ad-btn:hover{background:rgba(255,255,255,.1)}
      .ad-btn.p{background:linear-gradient(120deg,var(--v1),var(--v2));border:none;color:#fff;box-shadow:0 3px 14px rgba(139,92,246,.35)}
      .ad-btn.p:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(139,92,246,.5)}
      .ad-btn.d{background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.35);color:#f87171}
      .ad-btn.d:hover{background:rgba(248,113,113,.22)}
      .ad-btn.sm{padding:6px 11px;font-size:11.5px}
      .ad-btn.full{width:100%;justify-content:center;margin-top:6px}
      .ad-btn:disabled{opacity:.45;cursor:default;transform:none}
      .ad-err{color:#f87171;font-size:12.5px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.25);padding:10px 12px;border-radius:9px;margin-bottom:12px}
      /* CONVERSAS DO USER */
      .ad-lgpd{display:flex;align-items:center;gap:8px;font-size:11.5px;color:#fbbf24;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);padding:9px 12px;border-radius:9px;margin-bottom:14px}
      .ad-clist{display:flex;flex-direction:column;gap:6px}
      .ad-clist button{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;background:var(--surface);border:1px solid var(--line);border-radius:10px;color:var(--ink-2);font-size:13px;cursor:pointer;text-align:left;transition:.16s}
      .ad-clist button:hover{background:rgba(168,85,247,.1);border-color:rgba(168,85,247,.3)}
      .ad-clist small{color:var(--ink-3);font-size:11px;white-space:nowrap}
      .ad-back{background:none;border:none;color:var(--v3);font-size:12.5px;cursor:pointer;margin-bottom:10px;padding:0}
      .ad-convt{font-family:'Sora',sans-serif;font-size:15px;margin-bottom:14px}
      .ad-chat{display:flex;flex-direction:column;gap:12px}
      .ad-m{padding:12px 14px;border-radius:11px;font-size:13px}
      .ad-m.user{background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.2)}
      .ad-m.assistant{background:var(--surface);border:1px solid var(--line)}
      .ad-m b{font-size:11.5px;color:var(--v3);display:block;margin-bottom:5px}
      .ad-m p{color:var(--ink-2);line-height:1.65;white-space:pre-wrap;word-break:break-word}
      .ad-m small{display:block;margin-top:7px;font-size:10.5px;color:var(--ink-3)}
      .ad-ctrl{display:flex;gap:6px;margin-bottom:8px}
      .ad-live{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;border-radius:9px;background:var(--surface);border:1px solid var(--line);color:var(--ink-3);font-size:11.5px;font-weight:600;cursor:pointer;transition:.2s}
      .ad-live.on{background:rgba(74,222,128,.1);border-color:rgba(74,222,128,.3);color:#4ade80}
      .ad-live-d{width:6px;height:6px;border-radius:50%;background:currentColor}
      .ad-live.on .ad-live-d{animation:adp 1.6s ease-in-out infinite}
      @keyframes adp{50%{opacity:.3}}
      .ad-tema{width:34px;flex:0 0 auto;border-radius:9px;background:var(--surface);border:1px solid var(--line);color:var(--ink-2);cursor:pointer;display:grid;place-items:center;transition:.2s}
      .ad-tema:hover{color:var(--v3)}
      .ad-sec{font-family:'Sora',sans-serif;font-size:13.5px;font-weight:600;margin:16px 0 10px;display:flex;align-items:center;gap:7px;color:var(--ink-2)}
      .ad-sec:first-child{margin-top:0}
      .ad-nada{font-size:12.5px;color:var(--ink-3);padding:12px;text-align:center}
      .ad-nlist{display:flex;flex-direction:column;gap:7px}
      .ad-n{padding:12px 14px;background:var(--surface);border:1px solid var(--line);border-radius:10px}
      .ad-n.ok{opacity:.55}
      .ad-n b{font-size:13px;color:var(--ink);margin-right:7px}
      .ad-n p{font-size:12px;color:var(--ink-2);line-height:1.55;margin-top:5px;white-space:pre-wrap}
      .ad-n small{display:block;margin-top:6px;font-size:10.5px;color:var(--ink-3)}
      /* AUX */
      .ad-load{display:grid;place-items:center;padding:60px}
      .ad-load span{width:26px;height:26px;border:2.5px solid rgba(168,85,247,.25);border-top-color:#a855f7;border-radius:50%;animation:asp .7s linear infinite}
      @keyframes asp{to{transform:rotate(360deg)}}
      .ad-vazio{text-align:center;padding:50px;color:var(--ink-3);font-size:13.5px}
      .ad-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:800;background:#1a1230;border:1px solid rgba(168,85,247,.4);color:var(--ink);padding:11px 20px;border-radius:999px;font-size:13px;box-shadow:0 16px 50px rgba(0,0,0,.6);animation:atin .3s}
      @keyframes atin{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}
      /* MOBILE */
      @media(max-width:820px){
        .ad{flex-direction:column}
        .ad-side{width:100%;flex:0 0 auto;flex-direction:row;align-items:center;padding:10px 14px;gap:10px;overflow-x:auto;border-right:none;border-bottom:1px solid rgba(255,255,255,.06)}
        .ad-brand{margin-bottom:0;flex:0 0 auto}
        .ad-brand small{display:none}
        .ad-nav{flex-direction:row;flex:1;gap:2px}
        .ad-nav button{padding:8px 10px;font-size:12px;white-space:nowrap}
        .ad-exit{flex:0 0 auto;padding:8px 10px}
        .ad-main{padding:20px 16px}
        .ad-tr{grid-template-columns:1.6fr 1fr 40px;font-size:12.5px}
        .ad-tr span:nth-child(3),.ad-tr span:nth-child(4){display:none}
        .ad-th span:nth-child(3),.ad-th span:nth-child(4){display:none}
      }
    `}</style>
  );
}

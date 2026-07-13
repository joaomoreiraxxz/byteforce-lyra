import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";
import Saturn from "./Saturn.jsx";
import { I } from "./Icons.jsx";
import { Notas, Agenda, NotesStyles } from "./Notes.jsx";

const FREE_LIMIT = 10;

export default function Chat({ session, status, refreshStatus, onPay, onHome, onAdmin, tema, setTema }) {
  const [convs, setConvs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [tool, setTool] = useState(null);
  const [busca, setBusca] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [novoNome, setNovoNome] = useState("");
  const [editando, setEditando] = useState(null);
  const [textoEdit, setTextoEdit] = useState("");
  const [files, setFiles] = useState([]);
  const [memOpen, setMemOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const [toast, setToast] = useState("");
  const [report, setReport] = useState(null);
  const [banido, setBanido] = useState(null);
  const [vista, setVista] = useState("chat"); // chat | notas | agenda
  const [payOpen, setPayOpen] = useState(false);

  const endRef = useRef(null);
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const abortRef = useRef(null);

  const isPro = status.isPro;
  const count = status.count || 0;
  const remaining = Math.max(0, FREE_LIMIT - count);
  const locked = !isPro && count >= FREE_LIMIT;
  const auth = { Authorization: `Bearer ${session.access_token}` };

  const aviso = (t) => { setToast(t); setTimeout(() => setToast(""), 2600); };

  const loadConvs = useCallback(async () => {
    try {
      const r = await fetch("/api/conversations", { headers: auth });
      const d = await r.json();
      setConvs(d.conversations || []);
    } catch {}
  }, [session]);

  useEffect(() => { loadConvs(); }, [loadConvs]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, streaming]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  // ATALHOS DE TECLADO
  useEffect(() => {
    const h = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "k") { e.preventDefault(); novaConversa(); }
      else if (mod && e.key === "b") { e.preventDefault(); setSidebar(s => !s); }
      else if (mod && e.key === "/") { e.preventDefault(); taRef.current?.focus(); }
      else if (e.key === "Escape") { setSidebar(false); setMemOpen(false); setRenaming(null); setEditando(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  async function openConv(id) {
    setActiveId(id); setSidebar(false); setEditando(null);
    try {
      const r = await fetch(`/api/conversations?id=${id}`, { headers: auth });
      const d = await r.json();
      setMsgs((d.messages || []).map(m => ({ role: m.role, content: m.content, sources: m.sources })));
    } catch { setMsgs([]); }
  }

  function novaConversa() {
    setActiveId(null); setMsgs([]); setSidebar(false); setInput(""); setFiles([]); setEditando(null);
    setTimeout(() => taRef.current?.focus(), 60);
  }

  async function apagar(id, e) {
    e.stopPropagation();
    if (!confirm("Apagar esta conversa?")) return;
    await fetch(`/api/conversations?id=${id}`, { method: "DELETE", headers: auth });
    if (activeId === id) novaConversa();
    loadConvs();
  }

  // RENOMEAR
  function abrirRename(c, e) {
    e.stopPropagation();
    setRenaming(c.id); setNovoNome(c.title);
  }
  async function salvarRename(id) {
    const t = novoNome.trim();
    if (!t) { setRenaming(null); return; }
    await fetch(`/api/conversations?id=${id}`, {
      method: "PATCH", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ title: t }),
    });
    setRenaming(null); loadConvs();
  }

  // ARQUIVOS
  async function addFiles(list) {
    const novos = [];
    for (const f of Array.from(list).slice(0, 4)) {
      if (f.size > 8 * 1024 * 1024) { aviso(`${f.name} é grande demais (máx 8MB)`); continue; }
      const ehImg = f.type.startsWith("image/");
      try {
        if (ehImg) {
          const dataUrl = await lerDataUrl(f);
          novos.push({ tipo: "imagem", nome: f.name, dataUrl });
        } else {
          const texto = await extrairTexto(f);
          if (!texto) { aviso(`Não consegui ler ${f.name}`); continue; }
          novos.push({ tipo: "documento", nome: f.name, texto });
        }
      } catch { aviso(`Falha ao ler ${f.name}`); }
    }
    if (novos.length) setFiles(p => [...p, ...novos].slice(0, 4));
  }

  const lerDataUrl = (f) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

  async function extrairTexto(f) {
    const ext = f.name.split(".").pop().toLowerCase();
    if (ext === "pdf") {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const buf = await f.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      let txt = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 25); i++) {
        const page = await pdf.getPage(i);
        const c = await page.getTextContent();
        txt += c.items.map(x => x.str).join(" ") + "\n\n";
      }
      return txt.trim();
    }
    if (ext === "docx") {
      const mammoth = await import("mammoth");
      const buf = await f.arrayBuffer();
      const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
      return value.trim();
    }
    return (await f.text()).trim(); // txt, md, csv, json, código...
  }

  // PARAR resposta
  function parar() {
    abortRef.current?.abort();
    setStreaming(false); setTool(null);
  }

  // ENVIAR
  async function send(override) {
    const q = (override ?? input).trim();
    if ((!q && !files.length) || streaming || locked) return;
    if (override === undefined) { setInput(""); }
    const anexos = files;
    setFiles([]);

    let convId = activeId;
    if (!convId) {
      try {
        const r = await fetch("/api/conversations", {
          method: "POST", headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({ title: (q || anexos[0]?.nome || "Nova conversa").slice(0, 50) }),
        });
        const d = await r.json();
        convId = d.conversation?.id;
        setActiveId(convId); loadConvs();
      } catch {}
    }

    const userMsg = { role: "user", content: q, anexos: anexos.map(a => ({ tipo: a.tipo, nome: a.nome, dataUrl: a.dataUrl })) };
    const next = [...msgs, userMsg];
    setMsgs([...next, { role: "assistant", content: "", sources: null, pending: true }]);
    setStreaming(true); setTool(null);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { ...auth, "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })).slice(-14),
          conversationId: convId,
          attachments: anexos,
        }),
      });

      if (r.status === 403) {
        const d = await r.json();
        if (d.banido) { setBanido(d.motivo || "Violação dos termos de uso."); setMsgs(next); setStreaming(false); return; }
      }
      if (r.status === 402) { setMsgs(next); await refreshStatus(); setStreaming(false); return; }
      if (!r.ok || !r.body) {
        setMsgs([...next, { role: "assistant", content: "Não consegui responder agora. Tente novamente." }]);
        setStreaming(false); return;
      }

      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "", acc = "", srcs = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const p of parts) {
          const ev = p.match(/^event: (\w+)/)?.[1];
          const dl = p.match(/data: (.*)$/m)?.[1];
          if (!ev || !dl) continue;
          if (ev === "tool") { try { setTool(JSON.parse(dl)); } catch {} }
          else if (ev === "sources") {
            try { srcs = JSON.parse(dl); setTool(null); } catch {}
            setMsgs([...next, { role: "assistant", content: acc, sources: srcs, pending: true }]);
          } else if (ev === "delta") {
            try { acc += JSON.parse(dl); } catch {}
            setTool(null);
            setMsgs([...next, { role: "assistant", content: acc, sources: srcs, pending: true }]);
          } else if (ev === "done") {
            setMsgs([...next, { role: "assistant", content: acc, sources: srcs }]);
          }
        }
      }
      setMsgs([...next, { role: "assistant", content: acc, sources: srcs }]);
      await refreshStatus();
      loadConvs();
    } catch (e) {
      if (e.name === "AbortError") {
        setMsgs(m => m.map((x, i) => i === m.length - 1 && x.pending ? { ...x, pending: false, content: x.content || "_(interrompido)_" } : x));
      } else {
        setMsgs([...next, { role: "assistant", content: "Falha na conexão. Tente novamente." }]);
      }
    } finally {
      setStreaming(false); setTool(null); abortRef.current = null;
    }
  }

  // REGENERAR
  async function regenerar() {
    if (streaming) return;
    const lastUserIdx = [...msgs].map(m => m.role).lastIndexOf("user");
    if (lastUserIdx < 0) return;
    const pergunta = msgs[lastUserIdx].content;
    setMsgs(msgs.slice(0, lastUserIdx));
    setTimeout(() => send(pergunta), 40);
  }

  // EDITAR mensagem enviada
  function abrirEdit(i) { setEditando(i); setTextoEdit(msgs[i].content); }
  async function salvarEdit(i) {
    const t = textoEdit.trim();
    if (!t) { setEditando(null); return; }
    setEditando(null);
    setMsgs(msgs.slice(0, i));
    setTimeout(() => send(t), 40);
  }

  const convsFiltradas = convs.filter(c => c.title.toLowerCase().includes(busca.toLowerCase()));

  const sugestoes = [
    { i: "🌤", t: "Como está o tempo em Cuiabá hoje?" },
    { i: "📰", t: "Quais as notícias mais recentes sobre IA?" },
    { i: "📄", t: "Resuma um documento que vou enviar" },
    { i: "💡", t: "Me ajude a organizar minha semana" },
  ];

  if (banido) {
    return (
      <div className="cg cg-banido">
        <ChatStyles />
        <div className="cg-ban-box">
          <span className="cg-ban-i">{I.lock(38)}</span>
          <h2>Sua conta foi suspensa</h2>
          <p className="cg-ban-m">{banido}</p>
          <p className="cg-ban-s">Se você acredita que isso é um engano, entre em contato pelo Instagram da Byte Force.</p>
          <div className="cg-ban-b">
            <a href="https://www.instagram.com/joao_moreiraxz/" target="_blank" rel="noopener">{I.instagram(16)} Falar com o suporte</a>
            <button onClick={() => supabase.auth.signOut()}>{I.logout(15)} Sair</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cg"
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={e => { if (e.currentTarget === e.target) setDrag(false); }}
      onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
    >
      <ChatStyles />
      <NotesStyles />
      <div className="cg-neb" aria-hidden />
      <div className="cg-stars" aria-hidden />
      <div className="cg-stars b" aria-hidden />
      {drag && <div className="cg-drop"><div>{I.doc(40)}<span>Solte os arquivos aqui</span></div></div>}
      {toast && <div className="cg-toast">{toast}</div>}
      {memOpen && <MemModal auth={auth} onClose={() => setMemOpen(false)} aviso={aviso} />}
      {report && <ReportModal auth={auth} conversationId={report.conversationId} onClose={() => setReport(null)} aviso={aviso} />}
      {payOpen && <PagarModal session={session} onClose={() => setPayOpen(false)} aviso={aviso} refreshStatus={refreshStatus} />}

      {/* SIDEBAR */}
      <aside className={"cg-side" + (sidebar ? " open" : "")}>
        <div className="cg-side-top">
          <div className="cg-vistas">
            <button className={vista === "chat" ? "on" : ""} onClick={() => setVista("chat")}>{I.spark(14)} Chat</button>
            <button className={vista === "notas" ? "on" : ""} onClick={() => setVista("notas")}>{I.note(14)} Notas</button>
            <button className={vista === "agenda" ? "on" : ""} onClick={() => setVista("agenda")}>{I.cal(14)} Agenda</button>
          </div>
          <button className="cg-new" onClick={() => { setVista("chat"); novaConversa(); }}>{I.plus()} Nova conversa</button>
          <div className="cg-find">
            {I.search(14)}
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar conversas…" />
            {busca && <button onClick={() => setBusca("")}>{I.close(13)}</button>}
          </div>
        </div>

        <div className="cg-convs">
          {convsFiltradas.length === 0 && (
            <div className="cg-empty">{busca ? "Nada encontrado" : "Nenhuma conversa ainda"}</div>
          )}
          {convsFiltradas.map(c => (
            <div key={c.id} className={"cg-conv" + (activeId === c.id ? " on" : "")} onClick={() => openConv(c.id)}>
              {renaming === c.id ? (
                <input className="cg-rename" autoFocus value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onBlur={() => salvarRename(c.id)}
                  onKeyDown={e => { if (e.key === "Enter") salvarRename(c.id); if (e.key === "Escape") setRenaming(null); }} />
              ) : (
                <>
                  <span className="cg-conv-t">{c.title}</span>
                  <button className="cg-ico" onClick={e => abrirRename(c, e)} title="Renomear">{I.edit(13)}</button>
                  <button className="cg-ico del" onClick={e => apagar(c.id, e)} title="Apagar">{I.trash(13)}</button>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="cg-side-bot">
          {onAdmin && (
            <button className="cg-adm" onClick={onAdmin}>{I.chart(14)} Painel admin</button>
          )}
          <button className="cg-mem" onClick={() => setMemOpen(true)}>{I.brain(14)} O que a Lyra lembra</button>
          {!isPro && (
            <div className="cg-quota">
              <div className="cg-bar"><i style={{ width: `${Math.min(100, count / FREE_LIMIT * 100)}%` }} /></div>
              <span>{remaining} de {FREE_LIMIT} perguntas grátis</span>
              <button className="cg-upgrade" onClick={() => setPayOpen(true)}>{I.star(13)} Assinar Pro — R$3/mês</button>
            </div>
          )}
          {isPro && <div className="cg-pro">{I.star(13)} Pro ativo</div>}
          <div className="cg-user">
            <span className="cg-uname">{status.username}</span>
            <button onClick={onHome} title="Voltar ao site">{I.home()}</button>
            <button onClick={() => supabase.auth.signOut()} title="Sair">{I.logout()}</button>
          </div>
        </div>
      </aside>
      {sidebar && <div className="cg-scrim" onClick={() => setSidebar(false)} />}

      {/* MAIN */}
      <main className="cg-main">
        <header className="cg-head">
          <button className="cg-burger" onClick={() => setSidebar(true)}>{I.menu()}</button>
          <div className="cg-title">
            <Saturn size={19} glow={.7} float={false} className="cg-sat-h" />
            <span>Lyra</span>
          </div>
          <button className="cg-tema" onClick={() => setTema(tema === "escuro" ? "claro" : "escuro")}
            title={tema === "escuro" ? "Tema claro" : "Tema escuro"}>
            {tema === "escuro" ? I.sun(15) : I.moon(15)}
          </button>
          <div className="cg-model">ByteCore</div>
        </header>

        <div className="cg-body">
          {vista === "notas" ? <Notas auth={auth} aviso={aviso} />
           : vista === "agenda" ? <Agenda auth={auth} aviso={aviso} />
           : msgs.length === 0 ? (
            <div className="cg-welcome">
              <div className="cg-sat-w"><Saturn size={76} glow={1.4} /></div>
              <h1>Olá, {status.username}</h1>
              <p>Sou a Lyra, a IA da Byte Force. Como posso ajudar hoje?</p>
              <div className="cg-sugs">
                {sugestoes.map(s => (
                  <button key={s.t} className="cg-sug" onClick={() => { setInput(s.t); taRef.current?.focus(); }}>
                    <span className="cg-sug-i">{s.i}</span>{s.t}
                  </button>
                ))}
              </div>
              <div className="cg-hints">
                <kbd>Ctrl</kbd>+<kbd>K</kbd> nova conversa · <kbd>Ctrl</kbd>+<kbd>/</kbd> focar · <kbd>Ctrl</kbd>+<kbd>B</kbd> menu
              </div>
            </div>
          ) : (
            <div className="cg-msgs">
              {msgs.map((m, i) => (
                <Msg key={i} m={m} i={i} username={status.username}
                  editando={editando === i} textoEdit={textoEdit} setTextoEdit={setTextoEdit}
                  onEdit={() => abrirEdit(i)} onSalvarEdit={() => salvarEdit(i)} onCancelEdit={() => setEditando(null)}
                  aviso={aviso}
                  ultima={i === msgs.length - 1}
                  onRegen={regenerar}
                  streaming={streaming}
                  onReport={() => setReport({ conversationId: activeId })}
                />
              ))}
              {tool && streaming && (
                <div className="cg-tool">
                  <span className="cg-pulse" />
                  {tool === "tempo" ? "Consultando a previsão do tempo…" : "Buscando na web…"}
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {vista === "chat" && <div className="cg-input-wrap">
          {locked ? (
            <div className="cg-locked">
              <b>Você usou suas {FREE_LIMIT} perguntas grátis</b>
              <p>Assine o Byte Force Pro por R$3/mês e converse sem limites.</p>
              <button className="cg-upgrade big" onClick={() => setPayOpen(true)}>{I.star(15)} Assinar Pro</button>
            </div>
          ) : (
            <>
              {files.length > 0 && (
                <div className="cg-files">
                  {files.map((f, i) => (
                    <div key={i} className="cg-file">
                      {f.tipo === "imagem"
                        ? <img src={f.dataUrl} alt="" />
                        : <span className="cg-file-i">{I.doc(15)}</span>}
                      <span className="cg-file-n">{f.nome}</span>
                      <button onClick={() => setFiles(p => p.filter((_, x) => x !== i))}>{I.close(12)}</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="cg-input">
                <button className="cg-clip" onClick={() => fileRef.current?.click()} title="Anexar arquivo">
                  {I.clip()}
                </button>
                <input ref={fileRef} type="file" multiple hidden
                  accept="image/*,.pdf,.docx,.txt,.md,.csv,.json"
                  onChange={e => { addFiles(e.target.files); e.target.value = ""; }} />

                <textarea ref={taRef} value={input}
                  onChange={e => setInput(e.target.value)}
                  onPaste={e => { const f = e.clipboardData.files; if (f.length) { e.preventDefault(); addFiles(f); } }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Pergunte qualquer coisa à Lyra…" rows={1} disabled={streaming} />

                {streaming ? (
                  <button className="cg-send stop" onClick={parar} title="Parar">{I.stop()}</button>
                ) : (
                  <button className="cg-send" onClick={() => send()} disabled={!input.trim() && !files.length}>
                    {I.send()}
                  </button>
                )}
              </div>
              <div className="cg-foot">A Lyra busca na web, vê imagens, lê documentos e cuida das suas notas.</div>
            </>
          )}
        </div>}
      </main>
    </div>
  );
}

function Msg({ m, username, editando, textoEdit, setTextoEdit, onEdit, onSalvarEdit, onCancelEdit, aviso, ultima, onRegen, streaming, onReport }) {
  const me = m.role === "user";
  const [copied, setCopied] = useState(false);

  const copiar = () => {
    navigator.clipboard.writeText(m.content);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={"cg-msg " + (me ? "me" : "bot")}>
      <div className="cg-av">
        {me ? <span className="cg-av-u">{(username?.[0] || "U").toUpperCase()}</span>
            : <Saturn size={17} glow={.6} float={false} className="cg-sat-a" />}
      </div>

      <div className="cg-content">
        {/* anexos enviados */}
        {m.anexos?.length > 0 && (
          <div className="cg-att">
            {m.anexos.map((a, i) => a.tipo === "imagem"
              ? <img key={i} src={a.dataUrl} alt={a.nome} className="cg-att-img" />
              : <span key={i} className="cg-att-doc">{I.doc(13)} {a.nome}</span>
            )}
          </div>
        )}

        {/* fontes da busca */}
        {m.sources?.length > 0 && (
          <div className="cg-sources">
            <div className="cg-sources-t">{I.search(12)} Fontes</div>
            <div className="cg-source-list">
              {m.sources.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener" className="cg-source">
                  <span className="cg-source-n">{i + 1}</span>
                  <span className="cg-source-x">{s.titulo}</span>
                  {I.link(11)}
                </a>
              ))}
            </div>
          </div>
        )}

        {editando ? (
          <div className="cg-edit">
            <textarea value={textoEdit} onChange={e => setTextoEdit(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSalvarEdit(); } }} />
            <div className="cg-edit-btns">
              <button className="ok" onClick={onSalvarEdit}>Enviar</button>
              <button onClick={onCancelEdit}>Cancelar</button>
            </div>
          </div>
        ) : m.content ? (
          <Markdown text={m.content} />
        ) : m.pending ? (
          <span className="cg-typing"><i /><i /><i /></span>
        ) : null}

        {/* ações */}
        {!editando && m.content && !m.pending && (
          <div className="cg-acts">
            {me ? (
              <button onClick={onEdit} title="Editar">{I.edit(13)} Editar</button>
            ) : (
              <>
                <button onClick={copiar} title="Copiar">
                  {copied ? <>{I.check(13)} Copiado</> : <>{I.copy(13)} Copiar</>}
                </button>
                {ultima && !streaming && (
                  <button onClick={onRegen} title="Gerar outra resposta">{I.refresh(13)} Regenerar</button>
                )}
                <button onClick={onReport} title="Denunciar esta resposta">{I.flag(13)} Denunciar</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MODAL DE MEMÓRIA ──
function MemModal({ auth, onClose, aviso }) {
  const [mems, setMems] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/memories", { headers: auth });
      const d = await r.json();
      setMems(d.memories || []);
    } catch { setMems([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function apagar(id) {
    await fetch(`/api/memories?id=${id}`, { method: "DELETE", headers: auth });
    setMems(m => m.filter(x => x.id !== id));
  }
  async function apagarTudo() {
    if (!confirm("Apagar tudo o que a Lyra lembra de você?")) return;
    await fetch("/api/memories?all=1", { method: "DELETE", headers: auth });
    setMems([]); aviso("Memória apagada");
  }

  return (
    <div className="cg-ovl" onClick={onClose}>
      <div className="cg-modal" onClick={e => e.stopPropagation()}>
        <button className="cg-x" onClick={onClose}>{I.close()}</button>
        <h3>{I.brain(18)} O que a Lyra lembra de você</h3>
        <p className="cg-modal-sub">Ela usa isso para te conhecer melhor entre as conversas.</p>

        {mems === null ? (
          <div className="cg-mem-load">Carregando…</div>
        ) : mems.length === 0 ? (
          <div className="cg-mem-empty">
            <span>{I.brain(30)}</span>
            <p>Ainda não há memórias. Conte algo sobre você e ela vai lembrar.</p>
          </div>
        ) : (
          <>
            <div className="cg-mem-list">
              {mems.map(m => (
                <div key={m.id} className="cg-mem-item">
                  <span>{m.fato}</span>
                  <button onClick={() => apagar(m.id)} title="Esquecer">{I.trash(13)}</button>
                </div>
              ))}
            </div>
            <button className="cg-mem-clear" onClick={apagarTudo}>{I.trash(13)} Apagar tudo</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── PAGAMENTO PIX (dentro do chat, sem sair) ──
function PagarModal({ session, onClose, aviso, refreshStatus }) {
  const [fase, setFase] = useState("email"); // email | gerando | pix | pago | erro
  const [email, setEmail] = useState("");
  const [pix, setPix] = useState(null);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [resta, setResta] = useState(null);
  const pollRef = useRef(null);

  const auth = { Authorization: `Bearer ${session.access_token}` };
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && !email.trim().endsWith(".local");

  useEffect(() => () => clearInterval(pollRef.current), []);

  // contagem regressiva de expiração
  useEffect(() => {
    if (!pix?.expira) return;
    const iv = setInterval(() => {
      const ms = new Date(pix.expira) - Date.now();
      if (ms <= 0) { setResta("expirado"); clearInterval(iv); return; }
      const m = Math.floor(ms / 60000), sg = Math.floor((ms % 60000) / 1000);
      setResta(`${m}:${String(sg).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(iv);
  }, [pix]);

  async function gerar() {
    if (!emailOk) return;
    setFase("gerando"); setErro("");
    try {
      const r = await fetch("/api/pix", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setErro(d.error || "Não foi possível gerar o Pix."); setFase("erro"); return; }
      setPix(d); setFase("pix"); vigiar(d.id);
    } catch {
      setErro("Falha na conexão."); setFase("erro");
    }
  }

  // fica checando se o Pix caiu
  function vigiar(id) {
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/pix?id=${id}`, { headers: auth });
        const d = await r.json();
        if (d.status === "approved") {
          clearInterval(pollRef.current);
          setFase("pago");
          await refreshStatus();
        }
      } catch {}
    }, 4000);
    setTimeout(() => clearInterval(pollRef.current), 12 * 60 * 1000);
  }

  const copiar = () => {
    if (!pix?.qr_code) return;
    navigator.clipboard.writeText(pix.qr_code);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2200);
  };

  return (
    <div className="cg-ovl" onClick={fase === "pago" ? onClose : undefined}>
      <div className="cg-modal cg-pay" onClick={e => e.stopPropagation()}>
        <button className="cg-x" onClick={onClose}>{I.close()}</button>

        {fase === "email" && (
          <>
            <div className="cg-pay-sat"><Saturn size={50} glow={1.2} /></div>
            <h3 style={{ justifyContent: "center" }}>Byte Force Pro</h3>
            <p className="cg-modal-sub" style={{ textAlign: "center" }}>Converse sem limites com a Lyra.</p>

            <div className="cg-pay-c">
              <div className="cg-pay-p">R$3<small>/mês</small></div>
              <ul>
                {["Perguntas ilimitadas por 30 dias", "Notas e agenda sem limite", "Busca na web e leitura de arquivos", "Pagamento via Pix"].map(f => (
                  <li key={f}><span>{I.check(11)}</span>{f}</li>
                ))}
              </ul>
            </div>

            <label className="cg-pay-l">Seu email</label>
            <input className="cg-pay-i" type="email" value={email} autoFocus
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && emailOk && gerar()}
              placeholder="voce@email.com" autoCapitalize="none" />
            <p className="cg-pay-h">Usamos apenas para enviar o comprovante.</p>

            <button className="cg-rsend" onClick={gerar} disabled={!emailOk}>
              {I.pix(15)} Gerar Pix de R$3
            </button>
          </>
        )}

        {fase === "gerando" && (
          <div className="cg-pay-load">
            <span className="cg-spin" />
            <p>Gerando seu Pix…</p>
          </div>
        )}

        {fase === "pix" && pix && (
          <>
            <h3 style={{ justifyContent: "center" }}>{I.pix(18)} Pague com Pix</h3>
            <p className="cg-modal-sub" style={{ textAlign: "center" }}>
              R$3 · liberação automática
              {resta && resta !== "expirado" && <span className="cg-pay-t"> · expira em {resta}</span>}
            </p>

            {resta === "expirado" ? (
              <div className="cg-pay-exp">
                <p>Este Pix expirou.</p>
                <button className="cg-rsend" onClick={() => { setPix(null); setFase("email"); }}>Gerar outro</button>
              </div>
            ) : (
              <>
                <div className="cg-pay-step">1 · Escaneie no app do seu banco</div>
                {pix.qr_code_base64 && (
                  <div className="cg-qr"><img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR code Pix" /></div>
                )}

                <div className="cg-pay-step">2 · Ou copie a chave</div>
                <div className="cg-pay-copy">
                  <input readOnly value={pix.qr_code || ""} onClick={e => e.target.select()} />
                  <button onClick={copiar}>{copiado ? <>{I.check(12)} Copiado</> : <>{I.copy(12)} Copiar</>}</button>
                </div>

                <div className="cg-pay-wait">
                  <span className="cg-pulse" />
                  Aguardando o pagamento cair…
                </div>
                <p className="cg-pay-h" style={{ textAlign: "center" }}>
                  Pode deixar esta janela aberta. Seu Pro libera sozinho.
                </p>
              </>
            )}
          </>
        )}

        {fase === "pago" && (
          <div className="cg-pay-ok">
            <div className="cg-pay-sat"><Saturn size={54} glow={1.5} /></div>
            <h3 style={{ justifyContent: "center" }}>Pagamento confirmado</h3>
            <p>Seu Byte Force Pro está ativo por 30 dias. Aproveite as perguntas ilimitadas.</p>
            <button className="cg-rsend" onClick={onClose}>Voltar para a Lyra</button>
          </div>
        )}

        {fase === "erro" && (
          <div className="cg-pay-ok">
            <span className="cg-pay-x">{I.alert(34)}</span>
            <h3 style={{ justifyContent: "center" }}>Não deu certo</h3>
            <p>{erro}</p>
            <button className="cg-rsend" onClick={() => { setFase("email"); setErro(""); }}>Tentar de novo</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DENÚNCIA ──
function ReportModal({ auth, conversationId, onClose, aviso }) {
  const [motivo, setMotivo] = useState("");
  const [detalhe, setDetalhe] = useState("");
  const [busy, setBusy] = useState(false);

  const motivos = [
    "Resposta incorreta ou enganosa",
    "Conteúdo ofensivo",
    "Conteúdo perigoso",
    "A Lyra não entendeu",
    "Outro",
  ];

  async function enviar() {
    if (!motivo) return;
    setBusy(true);
    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, motivo, detalhe }),
      });
      aviso("Denúncia enviada. Obrigado!");
      onClose();
    } catch { aviso("Falha ao enviar"); }
    finally { setBusy(false); }
  }

  return (
    <div className="cg-ovl" onClick={onClose}>
      <div className="cg-modal" onClick={e => e.stopPropagation()}>
        <button className="cg-x" onClick={onClose}>{I.close()}</button>
        <h3>{I.flag(17)} Denunciar resposta</h3>
        <p className="cg-modal-sub">Nos ajude a melhorar a Lyra. O que houve de errado?</p>

        <div className="cg-rmotivos">
          {motivos.map(m => (
            <button key={m} className={"cg-rmot" + (motivo === m ? " on" : "")} onClick={() => setMotivo(m)}>
              {m}
            </button>
          ))}
        </div>

        <textarea className="cg-rdet" value={detalhe} onChange={e => setDetalhe(e.target.value)}
          placeholder="Conte mais detalhes (opcional)…" />

        <button className="cg-rsend" onClick={enviar} disabled={!motivo || busy}>
          {busy ? "Enviando…" : "Enviar denúncia"}
        </button>
      </div>
    </div>
  );
}

// ── MARKDOWN ──
function Markdown({ text }) {
  const blocks = [];
  const re = /```(\w+)?\n([\s\S]*?)```/g;
  let last = 0, mm;
  while ((mm = re.exec(text))) {
    if (mm.index > last) blocks.push({ t: "md", v: text.slice(last, mm.index) });
    blocks.push({ t: "code", lang: mm[1] || "", v: mm[2] });
    last = mm.index + mm[0].length;
  }
  if (last < text.length) blocks.push({ t: "md", v: text.slice(last) });

  return (
    <>
      {blocks.map((b, i) =>
        b.t === "code"
          ? <CodeBlock key={i} lang={b.lang} code={b.v} />
          : <div key={i} className="cg-md" dangerouslySetInnerHTML={{ __html: mdToHtml(b.v) }} />
      )}
    </>
  );
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="cg-code">
      <div className="cg-code-h">
        <span>{lang || "código"}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>
          {copied ? <>{I.check(12)} Copiado</> : <>{I.copy(12)} Copiar</>}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function mdToHtml(src) {
  let h = esc(src);
  // remove qualquer linha separadora que escape
  h = h.replace(/^\s*([-_*])\1{2,}\s*$/gm, "");
  h = h.replace(/`([^`\n]+)`/g, '<code class="inl">$1</code>');
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  h = h.replace(/_([^_\n]+)_/g, "<em>$1</em>");
  h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  h = h.replace(/^#{1,3} (.*)$/gm, "<h3>$1</h3>");
  h = h.replace(/(?:^[-*+] .*(?:\n|$))+/gm, m =>
    "<ul>" + m.trim().split("\n").map(l => "<li>" + l.replace(/^[-*+]\s*/, "") + "</li>").join("") + "</ul>");
  h = h.replace(/(?:^\d+\. .*(?:\n|$))+/gm, m =>
    "<ol>" + m.trim().split("\n").map(l => "<li>" + l.replace(/^\d+\.\s*/, "") + "</li>").join("") + "</ol>");
  h = h.split(/\n{2,}/).map(p =>
    /^<(h3|ul|ol|pre)/.test(p.trim()) ? p : (p.trim() ? "<p>" + p.replace(/\n/g, "<br/>") + "</p>" : "")
  ).join("");
  return h;
}

function ChatStyles() {
  return (
    <style>{`
      .cg{position:fixed;inset:0;display:flex;color:var(--ink);font-family:'Inter',sans-serif;z-index:500;
        background:var(--bg);
        background-image:
          radial-gradient(ellipse 120% 70% at 50% -20%,rgba(109,40,217,.16),transparent 55%),
          radial-gradient(ellipse 70% 50% at 85% 20%,rgba(192,132,252,.055),transparent 60%),
          radial-gradient(ellipse 60% 45% at 10% 85%,rgba(99,102,241,.045),transparent 60%)}
      /* nebulosa suave, girando bem devagar */
      .cg-neb{position:absolute;inset:-30%;pointer-events:none;z-index:0;opacity:.5;
        background:
          radial-gradient(ellipse 30% 22% at 28% 32%,rgba(168,85,247,.09),transparent 70%),
          radial-gradient(ellipse 24% 30% at 72% 62%,rgba(240,171,252,.055),transparent 70%),
          radial-gradient(ellipse 34% 20% at 55% 18%,rgba(124,58,237,.06),transparent 70%);
        filter:blur(38px);animation:neb 70s linear infinite}
      @keyframes neb{to{transform:rotate(360deg)}}
      /* estrelas — 2 camadas com brilhos diferentes */
      .cg-stars{position:absolute;inset:0;pointer-events:none;z-index:0;
        background-image:
          radial-gradient(1.4px 1.4px at 12% 18%,rgba(255,255,255,.55),transparent),
          radial-gradient(1px 1px at 68% 12%,rgba(232,213,255,.42),transparent),
          radial-gradient(1.5px 1.5px at 33% 64%,rgba(255,255,255,.38),transparent),
          radial-gradient(1px 1px at 84% 52%,rgba(240,171,252,.4),transparent),
          radial-gradient(1.2px 1.2px at 52% 86%,rgba(255,255,255,.3),transparent),
          radial-gradient(1px 1px at 22% 42%,rgba(192,132,252,.35),transparent),
          radial-gradient(1.3px 1.3px at 91% 28%,rgba(255,255,255,.33),transparent),
          radial-gradient(1px 1px at 44% 8%,rgba(255,255,255,.28),transparent);
        animation:tw 9s ease-in-out infinite}
      .cg-stars.b{opacity:.55;animation-duration:13s;animation-delay:3s;
        background-image:
          radial-gradient(.9px .9px at 18% 28%,rgba(255,255,255,.4),transparent),
          radial-gradient(1.1px 1.1px at 58% 44%,rgba(240,171,252,.32),transparent),
          radial-gradient(.9px .9px at 78% 74%,rgba(255,255,255,.32),transparent),
          radial-gradient(1.2px 1.2px at 36% 92%,rgba(192,132,252,.3),transparent),
          radial-gradient(.9px .9px at 94% 62%,rgba(255,255,255,.26),transparent)}
      @keyframes tw{0%,100%{opacity:.5}50%{opacity:.95}}
      [data-tema="claro"] .cg-stars,[data-tema="claro"] .cg-neb{opacity:.2}
      [data-tema="claro"] .cg{background-image:radial-gradient(ellipse 120% 70% at 50% -20%,rgba(168,85,247,.1),transparent 55%)}
      .cg *{box-sizing:border-box}
      .saturn{display:grid;place-items:center;pointer-events:none;flex:0 0 auto}
      .sat-float{animation:satbob 6s ease-in-out infinite}
      @keyframes satbob{50%{transform:translateY(-9px)}}
      /* SIDEBAR */
      .cg-side{width:276px;flex:0 0 276px;position:relative;z-index:2;display:flex;flex-direction:column;
        background:var(--surface-2);backdrop-filter:blur(22px) saturate(150%);border-right:1px solid var(--line);
        transition:transform .32s cubic-bezier(.22,.61,.36,1)}
      .cg-side-top{padding:14px;border-bottom:1px solid var(--line)}
      .cg-new{width:100%;padding:12px;border-radius:12px;background:linear-gradient(120deg,var(--v1),var(--v2));color:#fff;border:none;font-weight:600;font-size:14px;cursor:pointer;transition:.2s;box-shadow:0 4px 18px rgba(139,92,246,.4);display:flex;align-items:center;justify-content:center;gap:7px}
      .cg-new:hover{transform:translateY(-1px);box-shadow:0 8px 26px rgba(139,92,246,.6)}
      .cg-find{display:flex;align-items:center;gap:8px;margin-top:10px;padding:9px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line);color:var(--ink-3);transition:.2s}
      .cg-find:focus-within{border-color:rgba(168,85,247,.5);color:var(--v3)}
      .cg-find input{flex:1;background:none;border:none;outline:none;color:var(--ink);font-size:13px;font-family:inherit;min-width:0}
      .cg-find input::placeholder{color:var(--ink-3)}
      .cg-find button{background:none;border:none;color:var(--ink-3);cursor:pointer;display:grid;place-items:center;padding:0}
      .cg-convs{flex:1;overflow-y:auto;padding:10px}
      .cg-convs::-webkit-scrollbar{width:5px}.cg-convs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
      .cg-empty{padding:24px 12px;font-size:12.5px;color:var(--ink-3);text-align:center}
      .cg-conv{display:flex;align-items:center;gap:4px;padding:10px 10px 10px 12px;border-radius:10px;cursor:pointer;font-size:13.5px;color:var(--ink-2);transition:.15s;margin-bottom:2px}
      .cg-conv:hover{background:var(--surface-2);color:var(--ink)}
      .cg-conv.on{background:rgba(168,85,247,.13);color:var(--ink);position:relative}
      .cg-conv.on::before{content:"";position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:18px;border-radius:0 3px 3px 0;background:linear-gradient(180deg,#a855f7,#f0abfc)}
      .cg-conv-t{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .cg-ico{opacity:0;background:none;border:none;color:var(--ink-3);cursor:pointer;padding:4px;border-radius:6px;display:grid;place-items:center;transition:.15s}
      .cg-conv:hover .cg-ico{opacity:1}
      .cg-ico:hover{background:rgba(255,255,255,.1);color:var(--ink)}
      .cg-ico.del:hover{color:#f87171;background:rgba(248,113,113,.12)}
      .cg-rename{width:100%;background:rgba(255,255,255,.08);border:1px solid rgba(168,85,247,.5);border-radius:7px;padding:5px 8px;color:var(--ink);font-size:13px;font-family:inherit;outline:none}
      .cg-side-bot{padding:14px;border-top:1px solid var(--line)}
      .cg-adm{width:100%;padding:10px;border-radius:10px;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.28);color:#60a5fa;font-size:12.5px;font-weight:600;cursor:pointer;transition:.2s;display:flex;align-items:center;justify-content:center;gap:7px;margin-bottom:8px}
      .cg-adm:hover{background:rgba(96,165,250,.2)}
      .cg-mem{width:100%;padding:10px;border-radius:10px;background:var(--surface);border:1px solid var(--line);color:var(--ink-2);font-size:12.5px;font-weight:500;cursor:pointer;transition:.2s;display:flex;align-items:center;justify-content:center;gap:7px;margin-bottom:12px}
      .cg-mem:hover{background:rgba(168,85,247,.12);border-color:rgba(168,85,247,.3);color:var(--v3)}
      .cg-quota{margin-bottom:12px}
      .cg-bar{height:5px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:7px}
      .cg-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--v2),var(--pink));box-shadow:0 0 10px rgba(168,85,247,.6);transition:width .4s}
      .cg-quota span{font-size:11.5px;color:var(--ink-3);display:block;margin-bottom:10px}
      .cg-upgrade{width:100%;padding:10px;border-radius:10px;background:rgba(168,85,247,.14);border:1px solid rgba(168,85,247,.35);color:var(--v3);font-weight:600;font-size:12.5px;cursor:pointer;transition:.2s;display:flex;align-items:center;justify-content:center;gap:6px}
      .cg-upgrade:hover{background:rgba(168,85,247,.25)}
      .cg-upgrade.big{width:auto;display:inline-flex;padding:12px 26px;font-size:14px;background:linear-gradient(120deg,var(--v1),var(--v2));color:#fff;border:none;box-shadow:0 4px 20px rgba(139,92,246,.5)}
      .cg-pro{font-size:12.5px;color:var(--v3);font-weight:600;margin-bottom:12px;padding:9px;background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.2);border-radius:9px;display:flex;align-items:center;justify-content:center;gap:6px}
      .cg-user{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink-2)}
      .cg-uname{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
      .cg-user button{background:none;border:none;color:var(--ink-3);cursor:pointer;padding:7px;border-radius:8px;transition:.2s;display:grid;place-items:center}
      .cg-user button:hover{color:var(--ink);background:rgba(255,255,255,.07)}
      .cg-scrim{display:none}
      /* MAIN */
      .cg-main{flex:1;display:flex;flex-direction:column;min-width:0;position:relative;z-index:1}
      .cg-head{display:flex;align-items:center;gap:12px;padding:13px 20px;border-bottom:1px solid var(--line);background:var(--surface);backdrop-filter:blur(16px) saturate(140%)}
      .cg-burger{display:none;background:none;border:none;color:var(--ink);cursor:pointer;padding:2px}
      .cg-title{display:flex;align-items:center;gap:2px;font-family:'Sora',sans-serif;font-weight:700;font-size:15.5px;flex:1;letter-spacing:-.01em}
      .cg-sat-h{margin:-11px -9px -11px -12px}
      .cg-sat-a{margin:-9px}
      .cg-model{font-size:11px;color:#8b83a3;background:var(--surface-2);padding:5px 11px;border-radius:999px;border:1px solid var(--line);font-weight:500;letter-spacing:.02em}
      .cg-body{flex:1;overflow-y:auto}
      .cg-body::-webkit-scrollbar{width:7px}.cg-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
      /* WELCOME */
      .cg-welcome{max-width:600px;margin:0 auto;padding:60px 24px;text-align:center}
      .cg-sat-w{display:grid;place-items:center;margin-bottom:14px}
      .cg-welcome h1{font-family:'Sora',sans-serif;font-size:29px;font-weight:700;letter-spacing:-.035em;margin-bottom:10px;background:linear-gradient(180deg,#fff,#b9b2ce);-webkit-background-clip:text;background-clip:text;color:transparent}
      .cg-welcome p{color:var(--ink-2);font-size:14.5px;margin-bottom:34px}
      .cg-sugs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:26px}
      @media(max-width:600px){.cg-sugs{grid-template-columns:1fr}}
      .cg-sug{display:flex;align-items:center;gap:11px;padding:14px 15px;border-radius:14px;background:var(--surface);border:1px solid var(--line);color:var(--ink-2);font-size:13px;text-align:left;cursor:pointer;transition:.24s cubic-bezier(.22,.61,.36,1);line-height:1.45}
      .cg-sug:hover{background:rgba(168,85,247,.1);border-color:rgba(168,85,247,.28);color:var(--ink);transform:translateY(-2px);box-shadow:0 8px 24px rgba(139,92,246,.12)}
      .cg-sug-i{font-size:17px;flex:0 0 auto}
      .cg-hints{font-size:11px;color:var(--ink-3)}
      .cg-hints kbd{background:rgba(255,255,255,.07);border:1px solid var(--line-2);border-radius:4px;padding:2px 5px;font-family:ui-monospace,monospace;font-size:10px;color:#8b83a3}
      /* MESSAGES */
      .cg-msgs{max-width:748px;margin:0 auto;padding:32px 24px 24px}
      .cg-msg{display:flex;gap:13px;margin-bottom:28px;animation:msgin .35s cubic-bezier(.22,.61,.36,1)}
      @keyframes msgin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      .cg-av{width:29px;height:29px;flex:0 0 auto;display:grid;place-items:center;margin-top:1px}
      .cg-av-u{width:29px;height:29px;border-radius:9px;background:linear-gradient(140deg,var(--v1),var(--v2));color:#fff;display:grid;place-items:center;font-size:11.5px;font-weight:700;box-shadow:0 3px 12px rgba(139,92,246,.35)}
      .cg-content{flex:1;min-width:0;font-size:15px;line-height:1.78;letter-spacing:-.003em}
      /* mensagem do usuário: bolha discreta */
      .cg-msg.me .cg-content{background:var(--surface);border:1px solid var(--line);border-radius:4px 16px 16px 16px;padding:12px 16px;color:#dcd8e8}
      .cg-msg.me .cg-md p{margin-bottom:0}
      .cg-md p{margin:0 0 13px}.cg-md p:last-child{margin-bottom:0}
      .cg-md h3{font-family:'Sora',sans-serif;font-size:16.5px;font-weight:700;margin:18px 0 9px;color:#fff}
      .cg-md ul,.cg-md ol{margin:0 0 12px;padding-left:22px}
      .cg-md li{margin-bottom:7px}
      .cg-md strong{font-weight:700;color:#fff}
      .cg-md em{color:var(--ink-2)}
      .cg-md a{color:var(--v3);text-decoration:none;border-bottom:1px solid rgba(192,132,252,.4)}
      .cg-md a:hover{border-color:var(--v3)}
      .cg-md code.inl{background:rgba(168,85,247,.14);padding:2.5px 6px;border-radius:6px;font-family:ui-monospace,monospace;font-size:12.5px;color:#e9b8ff;border:1px solid rgba(168,85,247,.16)}
      .cg-code{margin:15px 0;border-radius:13px;overflow:hidden;border:1px solid var(--line);background:#06040c;box-shadow:0 6px 24px rgba(0,0,0,.3)}
      .cg-code-h{display:flex;justify-content:space-between;align-items:center;padding:9px 14px;background:var(--surface);font-size:11.5px;color:var(--ink-3);border-bottom:1px solid var(--line)}
      .cg-code-h button{background:none;border:none;color:var(--ink-2);font-size:11.5px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:5px;transition:.2s}
      .cg-code-h button:hover{color:var(--v3)}
      .cg-code pre{margin:0;padding:14px;overflow-x:auto}
      .cg-code code{font-family:ui-monospace,monospace;font-size:13px;line-height:1.65;color:#e9d5ff}
      /* ACOES */
      .cg-acts{display:flex;gap:2px;margin-top:11px;opacity:0;transform:translateY(-3px);transition:.22s cubic-bezier(.22,.61,.36,1)}
      .cg-msg:hover .cg-acts{opacity:1;transform:none}
      .cg-acts button{background:none;border:none;color:var(--ink-3);font-size:11.5px;cursor:pointer;padding:5px 9px;border-radius:7px;display:flex;align-items:center;gap:5px;transition:.16s;font-weight:500}
      .cg-acts button:hover{background:var(--surface-2);color:var(--v3)}
      /* EDITAR */
      .cg-edit textarea{width:100%;background:var(--surface-2);border:1px solid rgba(168,85,247,.5);border-radius:12px;padding:12px 14px;color:var(--ink);font-size:14.5px;font-family:inherit;line-height:1.6;resize:vertical;min-height:70px;outline:none}
      .cg-edit-btns{display:flex;gap:8px;margin-top:9px}
      .cg-edit-btns button{padding:7px 16px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;border:1px solid var(--line-2);background:none;color:var(--ink-2);transition:.2s}
      .cg-edit-btns button:hover{background:rgba(255,255,255,.07)}
      .cg-edit-btns .ok{background:linear-gradient(120deg,var(--v1),var(--v2));color:#fff;border:none}
      /* ANEXOS NA MSG */
      .cg-att{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
      .cg-att-img{max-width:220px;max-height:180px;border-radius:11px;border:1px solid var(--line-2);object-fit:cover}
      .cg-att-doc{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-2);background:var(--surface-2);border:1px solid var(--line-2);padding:7px 11px;border-radius:9px}
      /* SOURCES */
      .cg-sources{margin-bottom:14px;padding:12px 14px;background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.2);border-radius:12px}
      .cg-sources-t{font-size:11.5px;color:var(--v3);font-weight:600;margin-bottom:9px;display:flex;align-items:center;gap:6px}
      .cg-source-list{display:flex;flex-direction:column;gap:7px}
      .cg-source{display:flex;gap:8px;align-items:center;font-size:12.5px;color:var(--ink-2);text-decoration:none;transition:.2s}
      .cg-source:hover{color:var(--ink)}
      .cg-source-n{width:17px;height:17px;border-radius:5px;background:rgba(168,85,247,.28);display:grid;place-items:center;font-size:10px;font-weight:700;color:var(--v3);flex:0 0 auto}
      .cg-source-x{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
      .cg-tool{max-width:760px;margin:0 auto;padding:0 24px 16px;font-size:12.5px;color:var(--v3);display:flex;align-items:center;gap:8px}
      .cg-pulse{width:7px;height:7px;border-radius:50%;background:#c084fc;animation:pls 1.2s ease-in-out infinite}
      @keyframes pls{50%{opacity:.3;transform:scale(.7)}}
      .cg-typing{display:inline-flex;gap:4px;padding-top:6px}
      .cg-typing i{width:6px;height:6px;border-radius:50%;background:#a855f7;animation:blink 1.3s infinite}
      .cg-typing i:nth-child(2){animation-delay:.2s}.cg-typing i:nth-child(3){animation-delay:.4s}
      @keyframes blink{0%,60%,100%{opacity:.25}30%{opacity:1}}
      /* INPUT */
      .cg-input-wrap{padding:14px 24px 18px;border-top:1px solid var(--line);background:var(--surface-2);backdrop-filter:blur(12px)}
      .cg-files{max-width:760px;margin:0 auto 10px;display:flex;flex-wrap:wrap;gap:8px}
      .cg-file{display:flex;align-items:center;gap:8px;background:var(--surface-2);border:1px solid var(--line-2);border-radius:10px;padding:6px 9px;font-size:12px;color:var(--ink-2);max-width:200px}
      .cg-file img{width:30px;height:30px;border-radius:6px;object-fit:cover}
      .cg-file-i{display:grid;place-items:center;width:30px;height:30px;border-radius:6px;background:rgba(168,85,247,.16);color:var(--v3)}
      .cg-file-n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
      .cg-file button{background:none;border:none;color:var(--ink-3);cursor:pointer;display:grid;place-items:center;padding:2px;border-radius:4px}
      .cg-file button:hover{color:#f87171}
      .cg-input{max-width:748px;margin:0 auto;display:flex;gap:6px;align-items:flex-end;background:var(--surface);border:1px solid var(--line-2);border-radius:20px;padding:7px 7px 7px 9px;transition:.24s cubic-bezier(.22,.61,.36,1);box-shadow:0 4px 24px rgba(0,0,0,.25)}
      .cg-input:focus-within{border-color:rgba(168,85,247,.45);box-shadow:0 0 0 3px rgba(168,85,247,.09),0 8px 32px rgba(139,92,246,.14)}
      .cg-clip{width:36px;height:36px;flex:0 0 auto;border-radius:10px;border:none;background:none;color:var(--ink-3);cursor:pointer;display:grid;place-items:center;transition:.2s}
      .cg-clip:hover{background:rgba(255,255,255,.07);color:var(--v3)}
      .cg-input textarea{flex:1;background:none;border:none;outline:none;color:var(--ink);font-size:15px;font-family:inherit;line-height:1.6;resize:none;max-height:200px;padding:8px 0}
      .cg-input textarea::placeholder{color:var(--ink-3)}
      .cg-send{width:38px;height:38px;flex:0 0 auto;border-radius:11px;border:none;background:linear-gradient(120deg,var(--v1),var(--v2));color:#fff;cursor:pointer;display:grid;place-items:center;transition:.2s;box-shadow:0 3px 14px rgba(139,92,246,.45)}
      .cg-send:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(139,92,246,.65)}
      .cg-send:disabled{opacity:.3;cursor:default}
      .cg-send.stop{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);box-shadow:none}
      .cg-send.stop:hover{background:rgba(248,113,113,.18);border-color:rgba(248,113,113,.4);color:#f87171}
      .cg-foot{max-width:760px;margin:10px auto 0;text-align:center;font-size:11px;color:var(--ink-3)}
      .cg-locked{max-width:760px;margin:0 auto;text-align:center;padding:14px}
      .cg-locked b{font-family:'Sora',sans-serif;font-size:15.5px;display:block;margin-bottom:6px}
      .cg-locked p{color:var(--ink-2);font-size:13.5px;margin-bottom:16px}
      /* DROP */
      .cg-drop{position:fixed;inset:0;z-index:600;background:rgba(10,8,18,.9);backdrop-filter:blur(8px);display:grid;place-items:center;pointer-events:none}
      .cg-drop div{display:grid;place-items:center;gap:14px;padding:44px 60px;border:2px dashed rgba(168,85,247,.5);border-radius:22px;color:var(--v3);font-size:15px;font-weight:600}
      /* TOAST */
      .cg-toast{position:fixed;top:22px;left:50%;transform:translateX(-50%);z-index:700;background:#1a1230;border:1px solid rgba(168,85,247,.4);color:var(--ink);padding:11px 20px;border-radius:999px;font-size:13px;box-shadow:0 16px 50px rgba(0,0,0,.6);animation:tin .3s}
      @keyframes tin{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}
      /* MODAL MEMORIA */
      .cg-ovl{position:fixed;inset:0;z-index:650;background:rgba(4,2,10,.8);backdrop-filter:blur(8px);display:grid;place-items:center;padding:20px;animation:tin .25s}
      .cg-modal{width:100%;max-width:440px;background:var(--bg-2);border:1px solid var(--line-2);border-radius:22px;padding:28px;position:relative;box-shadow:0 40px 100px rgba(0,0,0,.8),0 0 60px rgba(139,92,246,.15);max-height:80vh;display:flex;flex-direction:column}
      .cg-x{position:absolute;top:16px;right:16px;background:var(--surface-2);border:1px solid var(--line-2);width:28px;height:28px;border-radius:50%;color:var(--ink-2);cursor:pointer;display:grid;place-items:center;transition:.2s}
      .cg-x:hover{background:rgba(255,255,255,.12);color:#fff}
      .cg-modal h3{font-family:'Sora',sans-serif;font-size:18px;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:9px;color:#fff}
      .cg-modal-sub{color:#8b83a3;font-size:13px;margin-bottom:20px;line-height:1.5}
      .cg-mem-load{text-align:center;padding:30px;color:var(--ink-3);font-size:13px}
      .cg-mem-empty{text-align:center;padding:30px 20px;color:var(--ink-3)}
      .cg-mem-empty span{display:grid;place-items:center;color:var(--ink-3);margin-bottom:14px}
      .cg-mem-empty p{font-size:13px;line-height:1.6}
      .cg-mem-list{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
      .cg-mem-list::-webkit-scrollbar{width:5px}.cg-mem-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
      .cg-mem-item{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--surface);border:1px solid var(--line);border-radius:11px;font-size:13.5px;color:var(--ink-2)}
      .cg-mem-item span{flex:1;line-height:1.5}
      .cg-mem-item button{background:none;border:none;color:var(--ink-3);cursor:pointer;padding:5px;border-radius:6px;display:grid;place-items:center;transition:.2s;flex:0 0 auto}
      .cg-mem-item button:hover{color:#f87171;background:rgba(248,113,113,.12)}
      .cg-mem-clear{width:100%;padding:11px;border-radius:10px;background:none;border:1px solid rgba(248,113,113,.3);color:#f87171;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:.2s}
      .cg-mem-clear:hover{background:rgba(248,113,113,.12)}
      /* VISTAS */
      .cg-vistas{display:flex;gap:2px;padding:3px;background:var(--surface);border:1px solid var(--line);border-radius:11px;margin-bottom:10px}
      .cg-vistas button{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px 4px;border-radius:8px;background:none;border:none;color:var(--ink-2);font-size:11.5px;font-weight:600;cursor:pointer;transition:.16s;font-family:inherit}
      .cg-vistas button:hover{color:var(--ink)}
      .cg-vistas button.on{background:rgba(168,85,247,.18);color:var(--ink)}
      .cg-tema{width:32px;height:32px;border-radius:50%;background:var(--surface-2);border:1px solid var(--line-2);color:var(--ink-2);cursor:pointer;display:grid;place-items:center;transition:.2s;flex:0 0 auto}
      .cg-tema:hover{color:var(--v3);border-color:rgba(168,85,247,.4)}
      /* PAGAMENTO PIX */
      .cg-pay{max-width:400px}
      .cg-pay-sat{display:grid;place-items:center;margin-bottom:4px}
      .cg-pay-l{display:block;font-size:11.5px;color:var(--ink-3);font-weight:600;margin-bottom:7px;text-transform:uppercase;letter-spacing:.05em}
      .cg-pay-i{width:100%;background:var(--surface-2);border:1px solid var(--line-2);border-radius:11px;padding:12px 14px;color:var(--ink);font-size:14.5px;font-family:inherit;outline:none;transition:.2s}
      .cg-pay-i:focus{border-color:var(--v2)}
      .cg-pay-i::placeholder{color:var(--ink-3)}
      .cg-pay-h{font-size:11px;color:var(--ink-3);margin:7px 0 16px;line-height:1.5}
      .cg-pay-load{text-align:center;padding:44px 0}
      .cg-pay-load .cg-spin{width:24px;height:24px;margin:0 auto 14px;border-width:2.5px}
      .cg-pay-load p{color:var(--ink-3);font-size:13.5px}
      .cg-pay-step{font-size:11.5px;color:var(--ink-3);font-weight:600;margin-bottom:9px;text-transform:uppercase;letter-spacing:.04em}
      .cg-qr{background:#fff;padding:12px;border-radius:15px;display:grid;place-items:center;margin-bottom:18px;box-shadow:0 0 40px rgba(168,85,247,.22)}
      .cg-qr img{width:180px;height:180px;display:block}
      .cg-pay-copy{display:flex;gap:7px;margin-bottom:16px}
      .cg-pay-copy input{flex:1;min-width:0;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;color:var(--ink-2);font-size:10.5px;font-family:ui-monospace,monospace;outline:none;cursor:pointer}
      .cg-pay-copy button{border:none;border-radius:10px;background:linear-gradient(120deg,var(--v1),var(--v2));color:#fff;padding:0 15px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap;transition:.2s}
      .cg-pay-copy button:hover{transform:translateY(-1px)}
      .cg-pay-wait{display:flex;align-items:center;justify-content:center;gap:8px;font-size:12.5px;color:var(--v3);background:rgba(168,85,247,.09);border:1px solid rgba(168,85,247,.22);padding:10px;border-radius:10px}
      .cg-pay-t{color:var(--v3);font-weight:600}
      .cg-pay-exp{text-align:center;padding:20px 0}
      .cg-pay-exp p{color:#f87171;font-size:13.5px;margin-bottom:16px}
      .cg-pay-ok{text-align:center;padding:8px 0}
      .cg-pay-ok p{color:var(--ink-2);font-size:13.5px;line-height:1.6;margin:8px 0 20px}
      .cg-pay-x{display:grid;place-items:center;color:#f87171;margin-bottom:6px}
      .cg-pay-c{background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.22);border-radius:15px;padding:20px;margin-bottom:16px}
      .cg-pay-p{font-family:'Sora',sans-serif;font-size:34px;font-weight:800;letter-spacing:-.04em;margin-bottom:14px;text-align:center;color:#fff}
      .cg-pay-p small{font-size:13px;color:var(--ink-2);font-weight:500}
      .cg-pay-c ul{list-style:none;display:flex;flex-direction:column;gap:9px}
      .cg-pay-c li{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--ink-2)}
      .cg-pay-c li span{width:17px;height:17px;border-radius:50%;background:linear-gradient(150deg,#8b5cf6,#a855f7);display:grid;place-items:center;flex:0 0 auto;color:#fff}
      .cg-pay-e{color:#f87171;font-size:12.5px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.25);padding:10px 12px;border-radius:9px;margin-bottom:12px}
      .cg-pay-s{font-size:11px;color:var(--ink-3);text-align:center;margin-top:12px;line-height:1.5}
      /* DENÚNCIA */
      .cg-rmotivos{display:flex;flex-direction:column;gap:7px;margin-bottom:14px}
      .cg-rmot{padding:11px 14px;border-radius:10px;background:var(--surface);border:1px solid var(--line);color:var(--ink-2);font-size:13px;text-align:left;cursor:pointer;transition:.18s;font-family:inherit}
      .cg-rmot:hover{background:rgba(255,255,255,.07)}
      .cg-rmot.on{background:rgba(168,85,247,.15);border-color:rgba(168,85,247,.45);color:var(--ink)}
      .cg-rdet{width:100%;background:var(--surface-2);border:1px solid var(--line-2);border-radius:11px;padding:11px 13px;color:var(--ink);font-size:13.5px;font-family:inherit;line-height:1.5;resize:vertical;min-height:70px;outline:none;margin-bottom:14px}
      .cg-rdet:focus{border-color:rgba(168,85,247,.5)}
      .cg-rsend{width:100%;padding:12px;border-radius:11px;background:linear-gradient(120deg,var(--v1),var(--v2));border:none;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:.2s;font-family:inherit}
      .cg-rsend:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 22px rgba(139,92,246,.5)}
      .cg-rsend:disabled{opacity:.4;cursor:default}
      /* BANIDO */
      .cg-banido{display:grid;place-items:center;padding:24px}
      .cg-ban-box{max-width:420px;text-align:center;background:rgba(255,255,255,.03);border:1px solid rgba(248,113,113,.25);border-radius:22px;padding:40px 32px;position:relative;z-index:2;backdrop-filter:blur(16px)}
      .cg-ban-i{display:grid;place-items:center;width:70px;height:70px;border-radius:20px;background:rgba(248,113,113,.12);color:#f87171;margin:0 auto 20px}
      .cg-ban-box h2{font-family:'Sora',sans-serif;font-size:22px;font-weight:700;margin-bottom:12px}
      .cg-ban-m{color:#f87171;font-size:14px;background:rgba(248,113,113,.09);border:1px solid rgba(248,113,113,.2);padding:12px 14px;border-radius:11px;margin-bottom:14px;line-height:1.5}
      .cg-ban-s{color:var(--ink-2);font-size:13px;line-height:1.6;margin-bottom:22px}
      .cg-ban-b{display:flex;gap:9px;justify-content:center;flex-wrap:wrap}
      .cg-ban-b a,.cg-ban-b button{display:inline-flex;align-items:center;gap:7px;padding:11px 18px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;transition:.2s;font-family:inherit}
      .cg-ban-b a{background:linear-gradient(120deg,var(--v1),var(--v2));color:#fff;border:none}
      .cg-ban-b a:hover{transform:translateY(-1px)}
      .cg-ban-b button{background:var(--surface-2);border:1px solid var(--line-2);color:var(--ink-2)}
      .cg-ban-b button:hover{background:rgba(255,255,255,.1)}
      /* MOBILE */
      @media(max-width:880px){
        .cg-side{position:fixed;left:0;top:0;bottom:0;z-index:20;transform:translateX(-100%);box-shadow:0 0 60px rgba(0,0,0,.7)}
        .cg-side.open{transform:none}
        .cg-burger{display:grid;place-items:center}
        .cg-scrim{display:block;position:fixed;inset:0;z-index:15;background:rgba(0,0,0,.65);backdrop-filter:blur(3px)}
        .cg-msgs,.cg-tool,.cg-foot{padding-left:16px;padding-right:16px}
        .cg-input-wrap{padding:12px 16px 16px}
        .cg-welcome{padding:36px 20px}
        .cg-acts{opacity:1}
        .cg-att-img{max-width:160px}
      }
      @media(max-width:480px){
        .cg-welcome h1{font-size:25px}
        .cg-sug{font-size:12.5px;padding:12px 14px}
        .cg-hints{display:none}
        .cg-model{display:none}
      }
      @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
    `}</style>
  );
}

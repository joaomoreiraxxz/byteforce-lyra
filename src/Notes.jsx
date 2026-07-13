import { useState, useEffect, useCallback } from "react";
import { I } from "./Icons.jsx";

const CORES = {
  roxo: "#a855f7", rosa: "#f0abfc", azul: "#60a5fa",
  verde: "#4ade80", amarelo: "#fbbf24", vermelho: "#f87171",
};

const fmt = (s) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const dia = (s) => new Date(s).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

// ═══ NOTAS ═══
export function Notas({ auth, aviso }) {
  const [notas, setNotas] = useState(null);
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notes?tipo=notas", { headers: auth });
      const d = await r.json();
      setNotas(d.itens || []);
    } catch { setNotas([]); }
  }, [auth]);
  useEffect(() => { load(); }, [load]);

  const salvar = async (n) => {
    const novo = !n.id;
    await fetch(`/api/notes?tipo=notas${n.id ? `&id=${n.id}` : ""}`, {
      method: novo ? "POST" : "PATCH",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: n.titulo, conteudo: n.conteudo, cor: n.cor }),
    });
    setEdit(null); load(); aviso(novo ? "Nota criada" : "Nota salva");
  };

  const apagar = async (id) => {
    if (!confirm("Apagar esta nota?")) return;
    await fetch(`/api/notes?tipo=notas&id=${id}`, { method: "DELETE", headers: auth });
    setEdit(null); load(); aviso("Nota apagada");
  };

  const fixar = async (n) => {
    await fetch(`/api/notes?tipo=notas&id=${n.id}`, {
      method: "PATCH", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ fixada: !n.fixada }),
    });
    load();
  };

  if (!notas) return <div className="nt-load"><span /></div>;

  return (
    <div className="nt">
      <div className="nt-head">
        <div><h2>{I.note(20)} Notas</h2><p>{notas.length} nota{notas.length !== 1 ? "s" : ""}</p></div>
        <button className="nt-add" onClick={() => setEdit({ titulo: "", conteudo: "", cor: "roxo" })}>
          {I.plus(15)} Nova nota
        </button>
      </div>

      {notas.length === 0 ? (
        <div className="nt-vazio">
          <span>{I.note(34)}</span>
          <p>Nenhuma nota ainda.</p>
          <small>Crie uma aqui, ou peça à Lyra: "anota que preciso comprar pão".</small>
        </div>
      ) : (
        <div className="nt-grid">
          {notas.map(n => (
            <div key={n.id} className="nt-card" style={{ "--c": CORES[n.cor] || CORES.roxo }} onClick={() => setEdit(n)}>
              <div className="nt-card-h">
                <b>{n.titulo}</b>
                <button className={"nt-pin" + (n.fixada ? " on" : "")}
                  onClick={e => { e.stopPropagation(); fixar(n); }} title="Fixar">{I.pin(13)}</button>
              </div>
              <p>{n.conteudo}</p>
              <div className="nt-card-f">
                {n.criada_por === "lyra" && <em className="nt-by">criada pela Lyra</em>}
                <small>{fmt(n.updated_at)}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <div className="nt-ovl" onClick={() => setEdit(null)}>
          <div className="nt-modal" onClick={e => e.stopPropagation()}>
            <button className="nt-x" onClick={() => setEdit(null)}>{I.close()}</button>
            <input className="nt-t" value={edit.titulo} autoFocus placeholder="Título da nota"
              onChange={e => setEdit({ ...edit, titulo: e.target.value })} />
            <textarea className="nt-c" value={edit.conteudo} placeholder="Escreva aqui…"
              onChange={e => setEdit({ ...edit, conteudo: e.target.value })} />
            <div className="nt-cores">
              {Object.entries(CORES).map(([nome, cor]) => (
                <button key={nome} className={"nt-cor" + (edit.cor === nome ? " on" : "")}
                  style={{ background: cor }} onClick={() => setEdit({ ...edit, cor: nome })} />
              ))}
            </div>
            <div className="nt-btns">
              {edit.id && <button className="nt-del" onClick={() => apagar(edit.id)}>{I.trash(14)} Apagar</button>}
              <button className="nt-save" onClick={() => salvar(edit)} disabled={!edit.titulo.trim()}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ AGENDA ═══
export function Agenda({ auth, aviso }) {
  const [evs, setEvs] = useState(null);
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notes?tipo=eventos", { headers: auth });
      const d = await r.json();
      setEvs(d.itens || []);
    } catch { setEvs([]); }
  }, [auth]);
  useEffect(() => { load(); }, [load]);

  const salvar = async (e) => {
    const novo = !e.id;
    await fetch(`/api/notes?tipo=eventos${e.id ? `&id=${e.id}` : ""}`, {
      method: novo ? "POST" : "PATCH",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: e.titulo, detalhe: e.detalhe, quando: e.quando }),
    });
    setEdit(null); load(); aviso(novo ? "Compromisso criado" : "Compromisso salvo");
  };

  const concluir = async (e) => {
    await fetch(`/api/notes?tipo=eventos&id=${e.id}`, {
      method: "PATCH", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ concluido: !e.concluido }),
    });
    load();
  };

  const apagar = async (id) => {
    if (!confirm("Apagar este compromisso?")) return;
    await fetch(`/api/notes?tipo=eventos&id=${id}`, { method: "DELETE", headers: auth });
    setEdit(null); load(); aviso("Compromisso apagado");
  };

  if (!evs) return <div className="nt-load"><span /></div>;

  const agora = new Date();
  const proximos = evs.filter(e => !e.concluido && new Date(e.quando) >= agora);
  const passados = evs.filter(e => e.concluido || new Date(e.quando) < agora);

  // agrupa por dia
  const grupos = {};
  proximos.forEach(e => {
    const k = dia(e.quando);
    (grupos[k] = grupos[k] || []).push(e);
  });

  const agora16 = () => {
    const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="nt">
      <div className="nt-head">
        <div><h2>{I.cal(20)} Agenda</h2><p>{proximos.length} compromisso{proximos.length !== 1 ? "s" : ""} à frente</p></div>
        <button className="nt-add" onClick={() => setEdit({ titulo: "", detalhe: "", quando: agora16() })}>
          {I.plus(15)} Novo compromisso
        </button>
      </div>

      {evs.length === 0 ? (
        <div className="nt-vazio">
          <span>{I.cal(34)}</span>
          <p>Agenda vazia.</p>
          <small>Crie um aqui, ou peça à Lyra: "me lembra de pagar o boleto sexta às 10h".</small>
        </div>
      ) : (
        <>
          {Object.entries(grupos).map(([d, lista]) => (
            <div key={d} className="nt-dia">
              <div className="nt-dia-t">{d}</div>
              {lista.map(e => (
                <div key={e.id} className="nt-ev" onClick={() => setEdit({ ...e, quando: e.quando.slice(0, 16) })}>
                  <button className="nt-check" onClick={ev => { ev.stopPropagation(); concluir(e); }} />
                  <div className="nt-ev-c">
                    <b>{e.titulo}</b>
                    {e.detalhe && <p>{e.detalhe}</p>}
                    {e.criado_por === "lyra" && <em className="nt-by">criado pela Lyra</em>}
                  </div>
                  <span className="nt-ev-h">{new Date(e.quando).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          ))}

          {passados.length > 0 && (
            <div className="nt-dia">
              <div className="nt-dia-t off">Concluídos e passados</div>
              {passados.slice(0, 20).map(e => (
                <div key={e.id} className="nt-ev off" onClick={() => setEdit({ ...e, quando: e.quando.slice(0, 16) })}>
                  <button className={"nt-check" + (e.concluido ? " on" : "")}
                    onClick={ev => { ev.stopPropagation(); concluir(e); }}>
                    {e.concluido && I.check(11)}
                  </button>
                  <div className="nt-ev-c"><b>{e.titulo}</b></div>
                  <span className="nt-ev-h">{fmt(e.quando)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {edit && (
        <div className="nt-ovl" onClick={() => setEdit(null)}>
          <div className="nt-modal" onClick={e => e.stopPropagation()}>
            <button className="nt-x" onClick={() => setEdit(null)}>{I.close()}</button>
            <input className="nt-t" value={edit.titulo} autoFocus placeholder="O que é o compromisso?"
              onChange={e => setEdit({ ...edit, titulo: e.target.value })} />
            <label className="nt-l">Quando</label>
            <input className="nt-d" type="datetime-local" value={edit.quando}
              onChange={e => setEdit({ ...edit, quando: e.target.value })} />
            <label className="nt-l">Detalhes (opcional)</label>
            <textarea className="nt-c sm" value={edit.detalhe || ""} placeholder="Anotações…"
              onChange={e => setEdit({ ...edit, detalhe: e.target.value })} />
            <div className="nt-btns">
              {edit.id && <button className="nt-del" onClick={() => apagar(edit.id)}>{I.trash(14)} Apagar</button>}
              <button className="nt-save" onClick={() => salvar(edit)} disabled={!edit.titulo.trim() || !edit.quando}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function NotesStyles() {
  return (
    <style>{`
      .nt{max-width:820px;margin:0 auto;padding:28px 24px}
      .nt-load{display:grid;place-items:center;padding:60px}
      .nt-load span{width:24px;height:24px;border:2.5px solid rgba(168,85,247,.25);border-top-color:#a855f7;border-radius:50%;animation:ntsp .7s linear infinite}
      @keyframes ntsp{to{transform:rotate(360deg)}}
      .nt-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;gap:14px;flex-wrap:wrap}
      .nt-head h2{font-family:'Sora',sans-serif;font-size:22px;font-weight:700;letter-spacing:-.03em;display:flex;align-items:center;gap:9px;color:var(--ink)}
      .nt-head p{color:var(--ink-3);font-size:13px;margin-top:3px}
      .nt-add{display:inline-flex;align-items:center;gap:7px;padding:10px 17px;border-radius:10px;background:linear-gradient(120deg,var(--v1),var(--v2));border:none;color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:.2s;font-family:inherit;box-shadow:0 3px 14px rgba(139,92,246,.35)}
      .nt-add:hover{transform:translateY(-1px);box-shadow:0 6px 22px rgba(139,92,246,.5)}
      .nt-vazio{text-align:center;padding:60px 20px;color:var(--ink-3)}
      .nt-vazio span{display:grid;place-items:center;color:var(--ink-3);opacity:.5;margin-bottom:16px}
      .nt-vazio p{font-size:15px;margin-bottom:6px;color:var(--ink-2)}
      .nt-vazio small{font-size:12.5px;line-height:1.6}
      /* NOTAS */
      .nt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
      .nt-card{background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--c);border-radius:13px;padding:16px;cursor:pointer;transition:.2s}
      .nt-card:hover{transform:translateY(-2px);border-color:var(--c);box-shadow:0 10px 30px rgba(0,0,0,.2)}
      .nt-card-h{display:flex;align-items:flex-start;gap:8px;margin-bottom:8px}
      .nt-card-h b{flex:1;font-size:14px;font-weight:600;color:var(--ink);line-height:1.4}
      .nt-pin{background:none;border:none;color:var(--ink-3);cursor:pointer;padding:2px;opacity:.4;transition:.2s;display:grid;place-items:center}
      .nt-pin:hover,.nt-pin.on{opacity:1;color:var(--v3)}
      .nt-card p{font-size:13px;color:var(--ink-2);line-height:1.6;white-space:pre-wrap;max-height:110px;overflow:hidden;margin-bottom:10px}
      .nt-card-f{display:flex;align-items:center;gap:8px}
      .nt-card-f small{margin-left:auto;font-size:10.5px;color:var(--ink-3)}
      .nt-by{font-size:10px;font-style:normal;color:var(--v3);background:rgba(168,85,247,.12);padding:2px 7px;border-radius:999px;font-weight:600}
      /* AGENDA */
      .nt-dia{margin-bottom:22px}
      .nt-dia-t{font-size:12px;font-weight:600;color:var(--v3);text-transform:capitalize;margin-bottom:9px;letter-spacing:.02em}
      .nt-dia-t.off{color:var(--ink-3)}
      .nt-ev{display:flex;align-items:center;gap:12px;padding:13px 15px;background:var(--surface);border:1px solid var(--line);border-radius:12px;margin-bottom:7px;cursor:pointer;transition:.18s}
      .nt-ev:hover{border-color:var(--v2);transform:translateX(2px)}
      .nt-ev.off{opacity:.5}
      .nt-check{width:19px;height:19px;flex:0 0 auto;border-radius:6px;border:1.8px solid var(--line-2);background:none;cursor:pointer;display:grid;place-items:center;color:#fff;transition:.2s}
      .nt-check:hover{border-color:var(--v2)}
      .nt-check.on{background:var(--v2);border-color:var(--v2)}
      .nt-ev-c{flex:1;min-width:0}
      .nt-ev-c b{font-size:14px;font-weight:600;color:var(--ink);display:block}
      .nt-ev-c p{font-size:12.5px;color:var(--ink-2);margin-top:3px;line-height:1.5}
      .nt-ev-h{font-size:12.5px;color:var(--v3);font-weight:600;white-space:nowrap}
      .nt-ev.off .nt-ev-h{color:var(--ink-3)}
      /* MODAL */
      .nt-ovl{position:fixed;inset:0;z-index:650;background:rgba(4,2,10,.75);backdrop-filter:blur(8px);display:grid;place-items:center;padding:20px;animation:ntf .25s}
      @keyframes ntf{from{opacity:0}to{opacity:1}}
      .nt-modal{width:100%;max-width:430px;background:var(--bg-2);border:1px solid var(--line-2);border-radius:20px;padding:26px;position:relative;box-shadow:0 40px 100px rgba(0,0,0,.6)}
      .nt-x{position:absolute;top:15px;right:15px;background:var(--surface-2);border:1px solid var(--line);width:28px;height:28px;border-radius:50%;color:var(--ink-2);cursor:pointer;display:grid;place-items:center;transition:.2s}
      .nt-x:hover{color:var(--ink)}
      .nt-t{width:100%;background:none;border:none;outline:none;color:var(--ink);font-family:'Sora',sans-serif;font-size:18px;font-weight:700;margin-bottom:14px;padding-right:30px}
      .nt-t::placeholder{color:var(--ink-3)}
      .nt-l{display:block;font-size:11.5px;color:var(--ink-3);font-weight:600;margin-bottom:7px;text-transform:uppercase;letter-spacing:.05em}
      .nt-c{width:100%;background:var(--surface);border:1px solid var(--line);border-radius:11px;padding:12px 14px;color:var(--ink);font-size:14px;font-family:inherit;line-height:1.65;resize:vertical;min-height:130px;outline:none;margin-bottom:14px}
      .nt-c.sm{min-height:70px}
      .nt-c:focus,.nt-d:focus{border-color:var(--v2)}
      .nt-c::placeholder{color:var(--ink-3)}
      .nt-d{width:100%;background:var(--surface);border:1px solid var(--line);border-radius:11px;padding:11px 14px;color:var(--ink);font-size:14px;font-family:inherit;outline:none;margin-bottom:14px;color-scheme:dark}
      [data-tema="claro"] .nt-d{color-scheme:light}
      .nt-cores{display:flex;gap:8px;margin-bottom:18px}
      .nt-cor{width:26px;height:26px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:.2s}
      .nt-cor:hover{transform:scale(1.15)}
      .nt-cor.on{border-color:var(--ink);transform:scale(1.15)}
      .nt-btns{display:flex;gap:9px}
      .nt-save{flex:1;padding:11px;border-radius:10px;background:linear-gradient(120deg,var(--v1),var(--v2));border:none;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:.2s;font-family:inherit}
      .nt-save:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(139,92,246,.5)}
      .nt-save:disabled{opacity:.4;cursor:default}
      .nt-del{padding:11px 16px;border-radius:10px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);color:#f87171;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:.2s;font-family:inherit}
      .nt-del:hover{background:rgba(248,113,113,.2)}
      @media(max-width:600px){.nt{padding:20px 16px}.nt-grid{grid-template-columns:1fr}}
    `}</style>
  );
}

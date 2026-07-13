import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, toEmail } from "./supabase.js";
import Chat from "./Chat.jsx";
import Saturn from "./Saturn.jsx";
import Admin from "./Admin.jsx";
import { I } from "./Icons.jsx";
import { aplicarTema, temaSalvo } from "./theme.js";

const FREE_LIMIT = 10;
const LAUNCH = new Date(2026, 5, 21, 0, 0, 0);

export default function App() {
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [status, setStatus] = useState({ count: 0, isPro: false, username: "", proUntil: null });
  const [toast, setToast] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [tema, setTema] = useState(temaSalvo);

  useEffect(() => { aplicarTema(tema); }, [tema]);

  useEffect(() => {
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
    window.scrollTo(0, 0);
  }, []);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!session) { setStatus({ count: 0, isPro: false, username: "", proUntil: null }); return; }
    try {
      const r = await fetch("/api/status", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (r.ok) setStatus(await r.json());
    } catch {}
  }, [session]);
  useEffect(() => { refreshStatus(); }, [refreshStatus]);


  // Painel administrativo
  if (adminOpen && session && status.isAdmin) {
    return <Admin session={session} onExit={() => setAdminOpen(false)} tema={tema} setTema={setTema} />;
  }

  // Chat em tela cheia (estilo ChatGPT)
  if (chatOpen && session) {
    return (
      <>
        <Styles />
        {payOpen && <PayModal session={session} onClose={() => setPayOpen(false)} />}
        <Chat
          session={session}
          status={status}
          refreshStatus={refreshStatus}
          onPay={() => setPayOpen(true)}
          onHome={() => setChatOpen(false)}
          onAdmin={status.isAdmin ? () => { setChatOpen(false); setAdminOpen(true); } : null}
          tema={tema}
          setTema={setTema}
        />
      </>
    );
  }

  return (
    <>
      <Styles />
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <linearGradient id="vg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a78bfa" /><stop offset="1" stopColor="#f0abfc" /></linearGradient>
        </defs>
      </svg>
      <div className="bg" aria-hidden><span className="b1" /><span className="b2" /><span className="b3" /><div className="neb" /><div className="grid-lines" /><div className="stars" /><div className="stars s2" /><div className="noise" /></div>

      {toast && <div className="toast">{toast}</div>}

      <Nav session={session} status={status} onLogin={() => setAuthOpen(true)} onLogout={() => supabase.auth.signOut()} onAdmin={status.isAdmin ? () => setAdminOpen(true) : null} tema={tema} setTema={setTema} />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {payOpen && <PayModal session={session} onClose={() => setPayOpen(false)} />}

      <Hero onTalk={() => (session ? setChatOpen(true) : setAuthOpen(true))} />
      <Marquee />
      <Counter />
      <Features />
      <Differential />
      <Demo session={session} status={status} onNeedLogin={() => setAuthOpen(true)} onOpenChat={() => setChatOpen(true)} />
      <Plans session={session} status={status} onNeedLogin={() => setAuthOpen(true)} onPay={() => setPayOpen(true)} />
      <Founder />
      <Story />
      <CTA onStart={() => (session ? setChatOpen(true) : setAuthOpen(true))} />
      <Footer />
      <Reveal />
    </>
  );
}
const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

function Styles() {
  return (
    <style>{`
      *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
      html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
      :root{
        --ease:cubic-bezier(.22,.61,.36,1);--maxw:1120px;
        --glass:var(--surface);--glass-2:var(--surface-2);
      }
      body{font-family:'Inter',-apple-system,sans-serif;color:var(--ink);background:var(--bg);overflow-x:hidden;line-height:1.5;-webkit-font-smoothing:antialiased}
      .head{font-family:'Sora',sans-serif}
      a{text-decoration:none;color:inherit}
      button{font-family:inherit}
      ::selection{background:rgba(168,85,247,.35)}
      /* BG */
      .bg{position:fixed;inset:0;z-index:-2;overflow:hidden;background:var(--bg)}
      [data-tema="escuro"] .bg{background:radial-gradient(ellipse 90% 60% at 50% -10%,#1b1030 0%,var(--bg) 60%)}
      [data-tema="claro"] .bg{background:radial-gradient(ellipse 90% 60% at 50% -10%,#ede4ff 0%,var(--bg) 60%)}
      [data-tema="claro"] .bg span{mix-blend-mode:multiply;opacity:.5}
      [data-tema="claro"] .stars,[data-tema="claro"] .neb{opacity:.25}
      [data-tema="claro"] .grid-lines{background-image:linear-gradient(rgba(124,58,237,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.06) 1px,transparent 1px)}
      [data-tema="claro"] .noise{opacity:.25}
      .bg span{position:absolute;border-radius:50%;filter:blur(110px)}
      .b1{width:620px;height:620px;background:rgba(139,92,246,.2);top:-190px;left:-150px;animation:f1 20s var(--ease) infinite alternate}
      .b2{width:540px;height:540px;background:rgba(240,171,252,.11);top:32%;right:-190px;animation:f2 25s var(--ease) infinite alternate}
      .b3{width:660px;height:660px;background:rgba(96,165,250,.08);bottom:-270px;left:24%;animation:f1 29s var(--ease) infinite alternate-reverse}
      .neb{position:absolute;inset:-25%;opacity:.55;filter:blur(45px);animation:nebr 80s linear infinite;
        background:
          radial-gradient(ellipse 28% 20% at 30% 28%,rgba(168,85,247,.08),transparent 70%),
          radial-gradient(ellipse 22% 28% at 70% 58%,rgba(240,171,252,.05),transparent 70%),
          radial-gradient(ellipse 32% 18% at 52% 80%,rgba(124,58,237,.055),transparent 70%)}
      @keyframes nebr{to{transform:rotate(360deg)}}
      @keyframes f1{to{transform:translate(70px,-50px) scale(1.12)}}
      @keyframes f2{to{transform:translate(-60px,60px) scale(1.06)}}
      .grid-lines{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(ellipse 80% 60% at 50% 0%,#000 20%,transparent 75%)}
      .stars{position:absolute;inset:0;pointer-events:none;
        background-image:
          radial-gradient(1.5px 1.5px at 8% 12%,rgba(255,255,255,.7),transparent),
          radial-gradient(1.2px 1.2px at 24% 32%,rgba(232,213,255,.5),transparent),
          radial-gradient(1.8px 1.8px at 62% 8%,rgba(255,255,255,.6),transparent),
          radial-gradient(1.1px 1.1px at 82% 22%,rgba(240,171,252,.55),transparent),
          radial-gradient(1.4px 1.4px at 44% 52%,rgba(255,255,255,.45),transparent),
          radial-gradient(1.2px 1.2px at 92% 62%,rgba(192,132,252,.5),transparent),
          radial-gradient(1.6px 1.6px at 16% 72%,rgba(255,255,255,.4),transparent),
          radial-gradient(1px 1px at 70% 88%,rgba(232,213,255,.45),transparent),
          radial-gradient(1.3px 1.3px at 36% 92%,rgba(255,255,255,.35),transparent);
        animation:twk 8s ease-in-out infinite}
      .stars.s2{animation-delay:2.5s;animation-duration:11s;opacity:.6;
        background-image:
          radial-gradient(1px 1px at 18% 24%,rgba(255,255,255,.5),transparent),
          radial-gradient(1.3px 1.3px at 54% 18%,rgba(240,171,252,.4),transparent),
          radial-gradient(1px 1px at 76% 44%,rgba(255,255,255,.4),transparent),
          radial-gradient(1.4px 1.4px at 30% 62%,rgba(192,132,252,.45),transparent),
          radial-gradient(1px 1px at 88% 78%,rgba(255,255,255,.35),transparent)}
      @keyframes twk{0%,100%{opacity:.4}50%{opacity:.9}}
      .noise{position:absolute;inset:0;opacity:.55;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.045'/%3E%3C/svg%3E")}
      .wrap{max-width:var(--maxw);margin:0 auto;padding:0 22px;position:relative;z-index:1}
      .reveal{opacity:0;transform:translateY(28px);transition:opacity .9s var(--ease),transform .9s var(--ease)}
      .reveal.in{opacity:1;transform:none}
      /* NAV */
      nav{position:sticky;top:0;z-index:100;padding-top:14px}
      .navbar{max-width:var(--maxw);margin:0 auto;padding:0 8px 0 20px;height:56px;display:flex;align-items:center;justify-content:space-between;background:var(--surface-2);backdrop-filter:saturate(160%) blur(22px);-webkit-backdrop-filter:saturate(160%) blur(22px);border:1px solid var(--line);border-radius:999px;box-shadow:var(--shadow)}
      .brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:19px;letter-spacing:-.02em;cursor:pointer}
      .brand .mark{width:26px;height:26px;border-radius:50%;background:conic-gradient(from 180deg,var(--v1),var(--pink),var(--blue),var(--v1));box-shadow:0 0 22px rgba(168,85,247,.75);animation:spin 8s linear infinite}
      @keyframes spin{to{transform:rotate(360deg)}}
      .navlinks{display:flex;gap:26px;align-items:center}
      .navlinks a{color:var(--ink-2);font-size:13.5px;font-weight:500;transition:.2s;cursor:pointer}
      .navlinks a:hover{color:var(--ink)}
      .navcta{font-size:13px;font-weight:600;color:#fff;padding:10px 20px;border-radius:999px;background:linear-gradient(120deg,var(--v1),var(--v2));transition:.25s var(--ease);box-shadow:0 4px 24px rgba(139,92,246,.5);border:none;cursor:pointer}
      .navcta:hover{transform:translateY(-1px);box-shadow:0 8px 32px rgba(139,92,246,.7)}
      .navuser{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:var(--v3)}
      .navtema{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:var(--surface-2);border:1px solid var(--line);color:var(--ink-2);cursor:pointer;transition:.2s}
      .navtema:hover{color:var(--v3);border-color:var(--v2)}
      .navadm{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#60a5fa;background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.3);padding:6px 12px;border-radius:999px;cursor:pointer;transition:.2s;margin-right:4px}
      .navadm:hover{background:rgba(96,165,250,.22)}
      .navuser .logout{color:var(--ink-3);cursor:pointer;font-size:12.5px}
      .navuser .logout:hover{color:var(--ink)}
      @media(max-width:820px){.navlinks .nlink{display:none}}
      /* HERO */
      .hero{text-align:center;padding:76px 0 20px}
      .pill{display:inline-flex;align-items:center;gap:9px;font-size:12.5px;font-weight:600;color:var(--v3);background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.25);padding:8px 18px;border-radius:999px;margin-bottom:28px}
      .pill .live{width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 10px #4ade80;animation:pulse 2s infinite}
      @keyframes pulse{50%{opacity:.4}}
      h1{font-family:'Sora',sans-serif;font-size:clamp(46px,8.6vw,92px);font-weight:800;letter-spacing:-.045em;line-height:.98}
      h1 .grad{background:linear-gradient(110deg,var(--v3) 0%,var(--pink) 45%,var(--blue) 100%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shine 7s linear infinite;filter:drop-shadow(0 0 40px rgba(192,132,252,.35))}
      @keyframes shine{to{background-position:200% center}}
      .hero .sub{font-size:clamp(16.5px,2.1vw,20px);color:var(--ink-2);max-width:560px;margin:26px auto 36px;line-height:1.6}
      .btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
      .btn{font-size:15.5px;font-weight:600;padding:14px 28px;border-radius:999px;transition:.28s var(--ease);border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:9px}
      .btn-p{background:linear-gradient(120deg,var(--v1),var(--v2));color:#fff;box-shadow:0 6px 26px rgba(139,92,246,.42);position:relative;overflow:hidden}
      .btn-p::after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent,rgba(255,255,255,.18),transparent);transform:translateX(-100%);transition:.6s var(--ease)}
      .btn-p:hover::after{transform:translateX(100%)}
      .btn-p:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(139,92,246,.65)}
      .btn-g{background:var(--glass-2);color:var(--ink);border:1px solid var(--line-2);backdrop-filter:blur(10px)}
      .btn-g:hover{transform:translateY(-2px);border-color:var(--v2)}
      .btn:disabled{opacity:.5;cursor:default;transform:none}
      .stage{height:430px;position:relative;perspective:1200px}
      .ring{position:absolute;top:50%;left:50%;border-radius:50%;border:1px solid rgba(192,132,252,.22);transform:translate(-50%,-50%) rotateX(74deg)}
      .r1{width:380px;height:380px;animation:rot 18s linear infinite;box-shadow:0 0 40px rgba(168,85,247,.18)}
      .r2{width:530px;height:530px;border-color:rgba(192,132,252,.13);animation:rot 28s linear infinite reverse}
      .r3{width:680px;height:680px;border-color:rgba(192,132,252,.07);animation:rot 40s linear infinite}
      @keyframes rot{to{transform:translate(-50%,-50%) rotateX(74deg) rotateZ(360deg)}}
      .saturn{display:grid;place-items:center;pointer-events:none}
      .sat-float{animation:satbob 6s ease-in-out infinite}
      @keyframes satbob{50%{transform:translateY(-14px)}}
      .sat-hero{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);filter:drop-shadow(0 0 70px rgba(168,85,247,.5))}
      .sat-diff{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);filter:drop-shadow(0 0 50px rgba(168,85,247,.45))}
      .chat-cta-sat{display:grid;place-items:center;margin:0 auto 8px}
      .chip{position:absolute;background:rgba(255,255,255,.05);backdrop-filter:blur(16px);border:1px solid var(--line-2);border-radius:14px;padding:10px 15px;box-shadow:0 12px 40px rgba(0,0,0,.5);font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:8px;animation:bob 6s ease-in-out infinite;color:var(--ink)}
      .chip i{width:7px;height:7px;border-radius:50%;background:linear-gradient(120deg,var(--v2),var(--pink));box-shadow:0 0 8px var(--v2)}
      .c1{top:8%;left:2%;animation-delay:.3s}.c2{top:16%;right:0;animation-delay:1.1s}
      .c3{bottom:14%;left:4%;animation-delay:.7s}.c4{bottom:6%;right:2%;animation-delay:1.5s}
      @keyframes bob{50%{transform:translateY(-16px)}}
      @media(max-width:900px){.stage{height:380px}.sat-hero>.saturn{transform:scale(.85)}}
      @media(max-width:640px){.stage{height:300px}.sat-hero>.saturn{transform:scale(.62)}.c1,.c2{top:0}.c3{bottom:6%}.c4{bottom:0}.chip{font-size:11px;padding:7px 11px}.r2,.r3{display:none}}
      @media(max-width:400px){.stage{height:260px}.sat-hero>.saturn{transform:scale(.52)}.chip{font-size:10.5px}}
      /* MARQUEE */
      .marquee{overflow:hidden;padding:18px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--surface);-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
      .marquee .track{display:flex;white-space:nowrap;animation:slide 26s linear infinite;width:max-content}
      .marquee span{font-family:'Sora',sans-serif;font-size:14px;font-weight:600;color:var(--ink-3);display:inline-flex;align-items:center;gap:44px;padding-right:44px}
      .marquee b{color:var(--v3);font-weight:600}
      @keyframes slide{to{transform:translateX(-50%)}}
      /* SECTIONS */
      section{padding:88px 0;position:relative}
      .eyebrow{text-align:center;font-size:12.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--v3);margin-bottom:14px}
      h2{font-family:'Sora',sans-serif;text-align:center;font-size:clamp(30px,4.6vw,46px);font-weight:800;letter-spacing:-.04em;line-height:1.07;color:var(--ink)}
      [data-tema="escuro"] h2{background:linear-gradient(180deg,#fff 30%,#b9b2ce);-webkit-background-clip:text;background-clip:text;color:transparent}
      .lead{text-align:center;color:var(--ink-2);font-size:clamp(15.5px,1.9vw,18px);max-width:560px;margin:18px auto 0;line-height:1.6}
      .panel-c{background:var(--glass);border:1px solid var(--line);border-radius:28px;backdrop-filter:blur(20px);box-shadow:0 20px 60px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.05)}
      .counter-card{padding:46px 38px;text-align:center}
      .counter-card .tag{font-size:12px;font-weight:700;color:var(--v3);letter-spacing:.14em;margin-bottom:10px}
      .counter-card h3{font-family:'Sora',sans-serif;font-size:clamp(21px,3vw,28px);font-weight:700;letter-spacing:-.02em;margin-bottom:6px}
      .counter-card .since{color:var(--ink-3);font-size:13.5px;margin-bottom:30px}
      .clock{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
      .unit{min-width:94px;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px 10px}
      .unit .n{font-family:'Sora',sans-serif;font-size:clamp(28px,5vw,42px);font-weight:800;letter-spacing:-.03em;line-height:1;background:linear-gradient(180deg,var(--v3),var(--v1));-webkit-background-clip:text;background-clip:text;color:transparent;font-variant-numeric:tabular-nums}
      .unit .l{font-size:10.5px;color:var(--ink-3);margin-top:9px;text-transform:uppercase;letter-spacing:.12em;font-weight:600}
      @media(max-width:540px){.unit{min-width:72px;padding:14px 6px}}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:52px}
      @media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:560px){.grid{grid-template-columns:1fr}}
      .card{background:var(--glass);border:1px solid var(--line);border-radius:20px;padding:26px;transition:.38s var(--ease);position:relative;overflow:hidden;backdrop-filter:blur(16px)}
      .card::before{content:"";position:absolute;inset:0;background:radial-gradient(400px circle at 50% 0%,rgba(168,85,247,.1),transparent 70%);opacity:0;transition:.4s}
      .card:hover{transform:translateY(-5px);border-color:rgba(168,85,247,.3);box-shadow:0 22px 55px rgba(0,0,0,.45),0 0 36px rgba(168,85,247,.09)}
      .card:hover::before{opacity:1}
      .ic{width:46px;height:46px;border-radius:13px;margin-bottom:18px;display:grid;place-items:center;position:relative;z-index:1;background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.25);box-shadow:0 0 24px rgba(168,85,247,.15)}
      .ic svg{width:23px;height:23px;stroke:url(#vg);stroke-width:1.7;fill:none;stroke-linecap:round;stroke-linejoin:round}
      .card h3{font-family:'Sora',sans-serif;font-size:17.5px;font-weight:700;letter-spacing:-.02em;margin-bottom:8px;position:relative;z-index:1}
      .card p{color:var(--ink-2);font-size:14px;line-height:1.6;position:relative;z-index:1}
      .diff-card{padding:54px}
      .diff-row{display:grid;grid-template-columns:1.05fr .95fr;gap:46px;align-items:center}
      @media(max-width:860px){.diff-card{padding:34px 26px}.diff-row{grid-template-columns:1fr;gap:34px}}
      .diff-row .eyebrow,.diff-row h2{text-align:left}
      .diff-row h2{font-size:clamp(27px,3.8vw,38px)}
      .diff-row .lead{text-align:left;margin-left:0}
      .dlist{list-style:none;margin-top:26px;display:flex;flex-direction:column;gap:16px}
      .dlist li{display:flex;gap:13px;align-items:flex-start}
      .check{flex:0 0 auto;width:25px;height:25px;border-radius:50%;background:linear-gradient(150deg,var(--v1),var(--v2));display:grid;place-items:center;margin-top:1px;box-shadow:0 0 18px rgba(139,92,246,.5)}
      .check svg{width:12px;height:12px;stroke:#fff;stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round}
      .dlist b{font-family:'Sora',sans-serif;font-size:15.5px;font-weight:700;display:block}
      .dlist span small{color:var(--ink-2);font-size:13.5px;display:block;margin-top:3px}
      .diff-visual{height:300px;position:relative}
      @media(max-width:640px){.diff-visual{height:240px}.sat-diff>.saturn{transform:scale(.78)}}
      .fpanel{position:absolute;background:rgba(255,255,255,.05);backdrop-filter:blur(16px);border:1px solid var(--line-2);border-radius:15px;padding:12px 15px;box-shadow:0 16px 44px rgba(0,0,0,.55);font-size:12px;animation:bob 6.5s ease-in-out infinite}
      .fpanel b{display:block;font-size:12.5px;margin-bottom:3px}.fpanel small{color:var(--ink-2)}
      .fpanel.p1{top:2%;right:0;animation-delay:.5s}.fpanel.p2{bottom:4%;left:0;animation-delay:1.3s}
      /* CHAT CTA */
      .chat-cta{max-width:620px;margin:44px auto 0;text-align:center;padding:48px 32px;background:var(--glass);border:1px solid var(--line);border-radius:28px;backdrop-filter:blur(20px);box-shadow:0 30px 80px rgba(0,0,0,.5),0 0 60px rgba(139,92,246,.12)}
      .chat-cta-orb{width:72px;height:72px;border-radius:50%;margin:0 auto 22px;background:radial-gradient(circle at 34% 28%,#fff,#e9d5ff 18%,var(--v3) 45%,#6d28d9);box-shadow:0 0 60px rgba(168,85,247,.6),inset -10px -10px 26px rgba(76,29,149,.6);animation:bob 6s ease-in-out infinite}
      .chat-cta h3{font-family:'Sora',sans-serif;font-size:24px;font-weight:800;letter-spacing:-.03em;margin-bottom:8px}
      .chat-cta p{color:var(--ink-2);font-size:15px;margin-bottom:26px}
      .chat-cta-tags{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:26px}
      .chat-cta-tags span{font-size:11.5px;color:var(--ink-3);background:rgba(255,255,255,.04);border:1px solid var(--line);padding:7px 13px;border-radius:999px}
      @media(max-width:560px){.chat-cta{padding:36px 22px}}
      /* PIX MODAL */
      .pm-sat{display:grid;place-items:center;margin-bottom:4px}
      .pm-c{background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.22);border-radius:15px;padding:20px;margin-bottom:18px}
      .pm-p{font-family:'Sora',sans-serif;font-size:34px;font-weight:800;letter-spacing:-.04em;margin-bottom:14px;text-align:center;color:var(--ink)}
      .pm-p small{font-size:13px;color:var(--ink-3);font-weight:500}
      .pm-c ul{list-style:none;display:flex;flex-direction:column;gap:9px}
      .pm-c li{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--ink-2)}
      .pm-c li span{width:17px;height:17px;border-radius:50%;background:linear-gradient(150deg,var(--v1),var(--v2));display:grid;place-items:center;flex:0 0 auto}
      .pm-c li span svg{width:9px;height:9px;stroke:#fff;stroke-width:3;fill:none}
      .pm-h{font-size:11px;color:var(--ink-3);margin:-8px 0 16px;line-height:1.5}
      .pm-step{font-size:11.5px;color:var(--ink-3);font-weight:600;margin-bottom:9px;text-transform:uppercase;letter-spacing:.04em}
      .pm-qr{background:#fff;padding:12px;border-radius:15px;display:grid;place-items:center;margin-bottom:18px;box-shadow:0 0 40px rgba(168,85,247,.2)}
      .pm-qr img{width:180px;height:180px;display:block}
      .pm-copy{display:flex;gap:7px;margin-bottom:16px}
      .pm-copy input{flex:1;min-width:0;margin:0;font-size:10.5px;font-family:ui-monospace,monospace;cursor:pointer;padding:10px 12px}
      .pm-copy button{border:none;border-radius:10px;background:linear-gradient(120deg,var(--v1),var(--v2));color:#fff;padding:0 16px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}
      .pm-wait{display:flex;align-items:center;justify-content:center;gap:8px;font-size:12.5px;color:var(--v3);background:rgba(168,85,247,.09);border:1px solid rgba(168,85,247,.22);padding:10px;border-radius:10px}
      .pm-d{width:7px;height:7px;border-radius:50%;background:var(--v3);animation:pmp 1.2s ease-in-out infinite}
      @keyframes pmp{50%{opacity:.3;transform:scale(.7)}}
      /* PLANS */
      .plans{display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:780px;margin:52px auto 0}
      @media(max-width:640px){.plans{grid-template-columns:1fr}}
      .plan{background:var(--glass);border:1px solid var(--line);border-radius:24px;padding:32px;backdrop-filter:blur(16px)}
      .plan.pro{background:linear-gradient(165deg,rgba(168,85,247,.14),rgba(255,255,255,.03));border-color:rgba(168,85,247,.4);position:relative;box-shadow:0 30px 80px rgba(139,92,246,.18),0 0 60px rgba(168,85,247,.12)}
      .plan .tag{font-size:12.5px;font-weight:600;color:var(--v3);margin-bottom:10px;letter-spacing:.04em}
      .plan .price{font-family:'Sora',sans-serif;font-size:42px;font-weight:800;letter-spacing:-.04em}
      .plan .price small{font-size:14.5px;color:var(--ink-3);font-weight:500}
      .plan .note{color:var(--ink-3);font-size:12.5px;margin:4px 0 20px}
      .plan ul{list-style:none;display:flex;flex-direction:column;gap:11px;margin-bottom:24px}
      .plan li{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--ink-2)}
      .plan li .tick{width:19px;height:19px;border-radius:50%;background:linear-gradient(150deg,var(--v1),var(--v2));display:grid;place-items:center;flex:0 0 auto;box-shadow:0 0 12px rgba(139,92,246,.4)}
      .plan li .tick svg{width:10px;height:10px;stroke:#fff;stroke-width:3;fill:none}
      .badge{position:absolute;top:20px;right:20px;font-size:10.5px;font-weight:700;color:#fff;background:linear-gradient(120deg,var(--v1),var(--v2));padding:5px 12px;border-radius:999px;letter-spacing:.06em;box-shadow:0 0 20px rgba(139,92,246,.5)}
      .full{width:100%;justify-content:center}
      .paynote{max-width:780px;margin:20px auto 0;text-align:center;font-size:12.5px;color:var(--ink-3);line-height:1.6}
      /* FOUNDER */
      .founder{padding:50px;display:grid;grid-template-columns:auto 1fr;gap:44px;align-items:center;margin-top:48px}
      @media(max-width:760px){.founder{grid-template-columns:1fr;text-align:center;padding:36px 24px;gap:28px}}
      .avatar{width:140px;height:140px;border-radius:32px;justify-self:center;display:grid;place-items:center;background:radial-gradient(circle at 32% 28%,#fff,var(--v3) 45%,#6d28d9);box-shadow:0 0 60px rgba(168,85,247,.5),inset -14px -14px 34px rgba(76,29,149,.6),inset 12px 12px 26px rgba(255,255,255,.4)}
      .avatar span{font-family:'Sora',sans-serif;font-size:48px;font-weight:800;color:#fff;text-shadow:0 2px 16px rgba(76,29,149,.6)}
      .chip{color:var(--ink)}
      .founder .eyebrow,.founder h2{text-align:left}
      .founder h2{font-size:clamp(26px,3.6vw,36px)}
      .founder .who{font-size:13px;color:var(--v3);font-weight:600;margin-top:8px}
      @media(max-width:760px){.founder .eyebrow,.founder h2{text-align:center}}
      .founder p{color:var(--ink-2);font-size:15px;line-height:1.7;margin-top:16px}
      .facts{display:flex;gap:12px;margin-top:26px;flex-wrap:wrap}
      @media(max-width:760px){.facts{justify-content:center}}
      .flink{display:inline-flex;align-items:center;gap:8px;color:#fff;padding:11px 20px;border-radius:999px;font-size:14px;font-weight:600;transition:.25s var(--ease);background:linear-gradient(120deg,var(--v1),var(--v2));box-shadow:0 4px 24px rgba(139,92,246,.45)}
      .flink:hover{transform:translateY(-2px);box-shadow:0 10px 34px rgba(139,92,246,.65)}

      .iglink{display:inline-flex;align-items:center;gap:8px;color:#fff;padding:11px 20px;border-radius:999px;font-size:14px;font-weight:600;transition:.25s var(--ease);background:linear-gradient(120deg,#feda75,#fa7e1e 28%,#d62976 58%,#962fbf 80%,#4f5bd5)}
      .iglink:hover{transform:translateY(-2px);box-shadow:0 10px 34px rgba(214,41,118,.45)}

      .fstats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:24px}
      @media(max-width:560px){.fstats{grid-template-columns:1fr}}
      .fstat{background:var(--glass);border:1px solid var(--line);border-radius:18px;padding:24px 18px;text-align:center;backdrop-filter:blur(14px)}
      .fstat .n{font-family:'Sora',sans-serif;font-size:clamp(26px,4vw,34px);font-weight:800;background:linear-gradient(135deg,var(--v3),var(--pink));-webkit-background-clip:text;background-clip:text;color:transparent}
      .fstat .t{color:var(--ink-3);font-size:12.5px;margin-top:6px}
      /* STORY */
      .story-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;margin-top:14px}
      @media(max-width:860px){.story-grid{grid-template-columns:1fr}}
      .story,.values{padding:32px}
      .story h3,.values h3{font-family:'Sora',sans-serif;font-size:19px;font-weight:700;margin-bottom:14px}
      .story p{color:var(--ink-2);font-size:14.5px;line-height:1.75;margin-bottom:14px}.story p:last-child{margin-bottom:0}
      .vlist{list-style:none;display:flex;flex-direction:column;gap:16px}
      .vlist li{display:flex;gap:13px;align-items:flex-start}
      .vlist .vi{flex:0 0 auto;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.25)}
      .vlist .vi svg{width:17px;height:17px;stroke:url(#vg);stroke-width:1.7;fill:none;stroke-linecap:round;stroke-linejoin:round}
      .vlist b{font-weight:700;display:block;font-size:14.5px}.vlist small{color:var(--ink-2);font-size:13px;display:block;margin-top:3px;line-height:1.5}
      .cta-sec{text-align:center;padding:100px 0}.cta-sec .pill{margin-bottom:24px}.cta-sec h2{margin-bottom:16px}
      footer{border-top:1px solid var(--line);padding:36px 0;color:var(--ink-3);font-size:12.5px}
      footer .wrap{display:flex;justify-content:space-between;flex-wrap:wrap;gap:14px;align-items:center}
      footer a{color:var(--ink-3);transition:.2s}footer a:hover{color:var(--ink)}
      footer .flinks{display:flex;gap:22px;align-items:center}
      .bf{font-weight:700;color:var(--ink-2)}
      /* MODAL */
      .ovl{position:fixed;inset:0;z-index:200;background:rgba(10,5,25,.6);backdrop-filter:blur(10px);display:grid;place-items:center;padding:20px;animation:fade .25s;overflow-y:auto}
      @keyframes fade{from{opacity:0}to{opacity:1}}
      .modal{width:100%;max-width:430px;background:var(--bg-2);border:1px solid var(--line-2);border-radius:26px;padding:34px;position:relative;box-shadow:0 50px 120px rgba(0,0,0,.8),0 0 80px rgba(139,92,246,.15),inset 0 1px 0 rgba(255,255,255,.07);margin:auto;animation:pop .35s var(--ease)}
      @keyframes pop{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}
      .modal .x{position:absolute;top:18px;right:18px;background:rgba(255,255,255,.06);border:1px solid var(--line);width:30px;height:30px;border-radius:50%;font-size:16px;color:var(--ink-2);cursor:pointer;line-height:1;display:grid;place-items:center;transition:.2s}
      .modal .x:hover{background:rgba(255,255,255,.12);color:var(--ink)}
      .modal .mark{width:46px;height:46px;border-radius:50%;background:conic-gradient(from 180deg,var(--v1),var(--pink),var(--blue),var(--v1));margin-bottom:18px;box-shadow:0 0 30px rgba(168,85,247,.6)}
      .modal h3{font-family:'Sora',sans-serif;font-size:22px;font-weight:800;margin-bottom:7px;letter-spacing:-.02em}
      .modal .msub{color:var(--ink-2);font-size:14px;margin-bottom:24px;line-height:1.55}
      .modal label{font-size:12.5px;color:var(--ink-3);display:block;margin-bottom:7px;font-weight:500}
      .modal input{width:100%;background:rgba(255,255,255,.05);border:1px solid var(--line-2);border-radius:12px;padding:12px 15px;font-size:14.5px;color:var(--ink);outline:none;margin-bottom:16px;transition:.2s}
      .modal input::placeholder{color:var(--ink-3)}
      .modal input:focus{border-color:rgba(168,85,247,.6);box-shadow:0 0 0 3px rgba(168,85,247,.12)}
      .modal .swap{text-align:center;font-size:13.5px;color:var(--ink-3);margin-top:20px}
      .modal .swap button{background:none;border:none;color:var(--v3);font-weight:600;cursor:pointer;font-size:13.5px}
      .modal .err{color:#f87171;font-size:13px;margin-bottom:14px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.25);padding:10px 12px;border-radius:10px}
      .pay-card{background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.22);border-radius:18px;padding:22px;margin-bottom:20px}
      .pay-price{font-family:'Sora',sans-serif;font-size:38px;font-weight:800;letter-spacing:-.04em;margin-bottom:16px}
      .pay-price small{font-size:14px;color:var(--ink-3);font-weight:500}
      .pay-list{list-style:none;display:flex;flex-direction:column;gap:10px}
      .pay-list li{display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--ink-2)}
      .pay-list .tick{width:18px;height:18px;border-radius:50%;background:linear-gradient(150deg,var(--v1),var(--v2));display:grid;place-items:center;flex:0 0 auto}
      .pay-list .tick svg{width:10px;height:10px;stroke:#fff;stroke-width:3;fill:none}
      .pay-safe{font-size:11.5px;color:var(--ink-3);text-align:center;margin-top:16px;line-height:1.6}
      .toast{position:fixed;top:84px;left:50%;transform:translateX(-50%);z-index:300;background:var(--bg-2);border:1px solid rgba(168,85,247,.4);color:var(--ink);padding:14px 22px;border-radius:999px;font-size:13.5px;font-weight:500;box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 40px rgba(168,85,247,.25);animation:toastIn .4s var(--ease);max-width:90vw;text-align:center}
      @keyframes toastIn{from{opacity:0;transform:translate(-50%,-16px)}to{opacity:1;transform:translate(-50%,0)}}
      .spin-i{display:inline-block;animation:spin 1s linear infinite}
      .result{text-align:center;padding:14px 0}
      .result .emo{font-size:42px;margin-bottom:10px}
      .result h4{font-family:'Sora',sans-serif;font-size:19px;margin-bottom:8px}
      .result p{color:var(--ink-2);font-size:14px;margin-bottom:22px;line-height:1.6}
      @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.reveal{opacity:1;transform:none}}
    `}</style>
  );
}

const Ico = {
  send: <svg viewBox="0 0 24 24" width="17" height="17" style={{ stroke: "#fff", strokeWidth: 2, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>,
  lock: <svg viewBox="0 0 24 24" width="26" height="26" style={{ stroke: "url(#vg)", strokeWidth: 1.7, fill: "none" }}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>,
  check: <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>,
};

function Nav({ session, status, onLogin, onLogout, onAdmin, tema, setTema }) {
  return (
    <nav><div className="navbar">
      <div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><span className="mark" />Lyra</div>
      <div className="navlinks">
        <a className="nlink" href="#recursos">Recursos</a>
        <a className="nlink" href="#diferencial">Diferencial</a>
        <a className="nlink" href="#demo">Conversar</a>
        <a className="nlink" href="#planos">Planos</a>
        <button className="navtema" onClick={() => setTema(tema === "escuro" ? "claro" : "escuro")}
          title={tema === "escuro" ? "Tema claro" : "Tema escuro"}>
          {tema === "escuro" ? I.sun(15) : I.moon(15)}
        </button>
        {session
          ? <span className="navuser">
              {onAdmin && <button className="navadm" onClick={onAdmin} title="Painel admin">{I.chart(14)} Admin</button>}
              {status.isPro ? "★ " : ""}{status.username}
              <span className="logout" onClick={onLogout}>sair</span>
            </span>
          : <button className="navcta" onClick={onLogin}>Entrar</button>}
      </div>
    </div></nav>
  );
}

function Hero({ onTalk }) {
  return (
    <header className="hero"><div className="wrap">
      <div className="pill reveal"><span className="live" />Disponível agora · por Byte Force</div>
      <h1 className="head reveal">A IA que<br /><span className="grad">entende você.</span></h1>
      <p className="sub reveal">Inteligência que sente o contexto, lembra do que importa e responde com a clareza de uma conversa de verdade. O maior projeto da Byte Force até hoje.</p>
      <div className="btns reveal">
        <button className="btn btn-p" onClick={onTalk}>Conversar com a Lyra {I.arrow()}</button>
        <a href="#recursos" className="btn btn-g">Ver recursos</a>
      </div>
    </div>
      <div className="stage" aria-hidden>
        <div className="ring r3" /><div className="ring r2" />
        <div className="chip c1"><i />Memória</div><div className="chip c2"><i />Busca na web</div>
        <div className="chip c3"><i />Previsão do tempo</div><div className="chip c4"><i />Tempo real</div>
        <div className="sat-hero"><Saturn size={190} glow={1.5} /></div>
      </div>
    </header>
  );
}

function Marquee() {
  const items = ["Memória de verdade", "Motor ByteCore", "Busca na web", "Previsão do tempo", "Feito no Brasil", "Respostas na hora"];
  const row = <span>{items.map((t, i) => <b key={i}>{t}</b>)}</span>;
  return <div className="marquee"><div className="track">{row}{row}</div></div>;
}

function Counter() {
  const [t, setT] = useState({ d: 0, h: "00", m: "00", s: "00" });
  useEffect(() => {
    const tick = () => {
      let diff = Math.max(0, Date.now() - LAUNCH.getTime());
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      setT({ d, h: String(h).padStart(2, "0"), m: String(m).padStart(2, "0"), s: String(s).padStart(2, "0") });
    };
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv);
  }, []);
  return (
    <section id="evolucao"><div className="wrap"><div className="panel-c counter-card reveal">
      <div className="tag">EM EVOLUÇÃO CONSTANTE</div>
      <h3 className="head">Quanto tempo a Lyra já evoluiu</h3>
      <p className="since">Contando desde o lançamento — 21 de junho de 2026</p>
      <div className="clock">
        {[[t.d, "dias"], [t.h, "horas"], [t.m, "min"], [t.s, "seg"]].map(([n, l]) => (
          <div className="unit" key={l}><div className="n">{n}</div><div className="l">{l}</div></div>
        ))}
      </div>
    </div></div></section>
  );
}

function Features() {
  const items = [
    ["Memória de verdade", "Ela lembra de você entre conversas — sua cidade, seus gostos, seus projetos. Nunca repita tudo de novo.", <path d="M12 3a4 4 0 0 0-4 4 4 4 0 0 0-1 7.9V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-4.1A4 4 0 0 0 16 7a4 4 0 0 0-4-4Z M12 8v6 M9 11h6" />],
    ["Voz natural", "As respostas soam humanas, sem aquele tom robótico. Uma conversa de verdade.", <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>],
    ["Busca na web", "Quando precisa de algo atual, ela busca na internet e mostra as fontes.", <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m7 14 3-3 3 3 2-2 2 2" /><circle cx="9" cy="9.5" r="1.3" /></>],
    ["Privacidade real", "Seus dados ficam com você. Sua conta é protegida e o respeito vem em primeiro lugar.", <><path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>],
    ["Cria por você", "Textos, ideias, explicações e código prontos a partir de uma frase simples.", <path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" />],
    ["Previsão do tempo", "Pergunte o clima de qualquer cidade e ela traz a previsão dos próximos dias.", <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M11 8v3l2 2" /></>],
    ["Sempre em português", "Feita para o público brasileiro, com naturalidade, tom e contexto local.", <><path d="M4 5h11M4 12h16M4 19h9" /><path d="M18 7v10l3-3M18 17l-3-3" /></>],
    ["Aprende seu estilo", "Responde do seu jeito — tom, vocabulário e ritmo parecidos com os seus.", <path d="M4 20 14 10M12.5 5.5l3 3M14 4l6 6-9.5 9.5L4 21l1.5-6.5L14 4Z" />],
    ["Tempo real", "Movida pelo motor ByteCore — respostas em instantes, sem espera.", <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />],
  ];
  return (
    <section id="recursos"><div className="wrap">
      <div className="eyebrow reveal">O que ela faz</div>
      <h2 className="head reveal">Pensada para acompanhar você.</h2>
      <p className="lead reveal">Cada recurso tira o atrito do caminho. Você fala naturalmente — a Lyra cuida do resto.</p>
      <div className="grid">
        {items.map(([t, d, p]) => (
          <div className="card reveal" key={t}>
            <div className="ic"><svg viewBox="0 0 24 24">{p}</svg></div>
            <h3>{t}</h3><p>{d}</p>
          </div>
        ))}
      </div>
    </div></section>
  );
}

function Differential() {
  return (
    <section id="diferencial"><div className="wrap"><div className="panel-c diff-card reveal"><div className="diff-row">
      <div>
        <div className="eyebrow">O diferencial</div>
        <h2 className="head">Não é mais um chatbot.</h2>
        <p className="lead">A maioria das IAs responde perguntas. A Lyra entende intenção — percebe o que você quer antes de você terminar de explicar.</p>
        <ul className="dlist">
          <li><span className="check">{Ico.check}</span><span><b>Antecipa necessidades</b><small>Sugere o próximo passo com base no contexto.</small></span></li>
          <li><span className="check">{Ico.check}</span><span><b>Personalidade que se adapta</b><small>Formal no trabalho, leve no dia a dia.</small></span></li>
          <li><span className="check">{Ico.check}</span><span><b>Feita com carinho</b><small>Cada detalhe pensado para a melhor experiência.</small></span></li>
        </ul>
      </div>
      <div className="diff-visual" aria-hidden>
        <div className="sat-diff"><Saturn size={130} glow={1.2} /></div>
        <div className="fpanel p1"><b>Entendi seu contexto</b><small>Já preparei o resumo pra você.</small></div>
        <div className="fpanel p2"><b>Pronto antes de pedir</b><small>Tudo organizado num instante.</small></div>
      </div>
    </div></div></div></section>
  );
}

const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return ""; } };

function Demo({ session, status, onNeedLogin, onOpenChat }) {
  const isPro = status.isPro, count = status.count || 0;
  const remaining = Math.max(0, FREE_LIMIT - count);
  return (
    <section id="demo"><div className="wrap">
      <div className="eyebrow reveal">Converse agora</div>
      <h2 className="head reveal">Fale com a Lyra.</h2>
      <p className="lead reveal">
        {!session ? "Crie uma conta e ganhe 10 perguntas grátis."
          : isPro ? `Plano Pro ativo até ${fmtDate(status.proUntil)} — perguntas ilimitadas.`
          : `Você tem ${remaining} de ${FREE_LIMIT} perguntas grátis restantes.`}
      </p>
      <div className="chat-cta reveal">
        <div className="chat-cta-sat"><Saturn size={72} glow={1.3} /></div>
        <h3 className="head">Abra a Lyra</h3>
        <p>Conversas salvas, busca na web e respostas em tempo real.</p>
        <button className="btn btn-p" onClick={() => (session ? onOpenChat() : onNeedLogin())}>
          {session ? "Abrir conversa" : "Entrar e conversar"}
        </button>
        <div className="chat-cta-tags">
          <span>Histórico salvo</span>
          <span>Busca na web</span>
          <span>Previsão do tempo</span>
          <span>Memória</span>
        </div>
      </div>
    </div></section>
  );
}

function Plans({ session, status, onNeedLogin, onPay }) {
  const act = () => (session ? onPay() : onNeedLogin());
  return (
    <section id="planos"><div className="wrap">
      <div className="eyebrow reveal">Planos</div>
      <h2 className="head reveal">Simples e acessível.</h2>
      <p className="lead reveal">Comece de graça. Se gostar, o Pro custa menos que um café por mês.</p>
      <div className="plans">
        <div className="plan reveal">
          <div className="tag">Grátis</div><div className="price">R$0</div><div className="note">para começar</div>
          <ul>
            {["10 perguntas para a Lyra", "Motor ByteCore", "Conta com usuário e senha"].map(f =>
              <li key={f}><span className="tick">{Ico.check}</span>{f}</li>)}
          </ul>
        </div>
        <div className="plan pro reveal">
          <span className="badge">★ PRO</span>
          <div className="tag">Byte Force Pro</div><div className="price">R$3<small>/mês</small></div><div className="note">renove quando quiser</div>
          <ul>
            {["Perguntas ilimitadas por 30 dias", "Pagamento via Pix", "Acesso prioritário a novidades", "Apoie o desenvolvimento da Lyra"].map(f =>
              <li key={f}><span className="tick">{Ico.check}</span>{f}</li>)}
          </ul>
          <button className="btn btn-p full" onClick={act}>{status.isPro ? "Renovar assinatura" : "Assinar o Pro"}</button>
        </div>
      </div>
      <p className="paynote reveal">Pagamento via Pix — QR code na hora, direto no site.<br />Processado com segurança pelo Mercado Pago.</p>
    </div></section>
  );
}

function Founder() {
  return (
    <section id="bastidores"><div className="wrap">
      <div className="eyebrow reveal">Conheça os bastidores</div>
      <h2 className="head reveal">Quem está por trás da Byte Force.</h2>
      <p className="lead reveal">Uma pessoa, uma visão e o maior projeto criado até hoje.</p>
      <div className="panel-c founder reveal">
        <div className="avatar"><span>JM</span></div>
        <div>
          <div className="eyebrow">Fundador</div>
          <h2 className="head">João Moreira.</h2>
          <div className="who">Fundador & desenvolvedor · Byte Force</div>
          <p>Sou o João Moreira, criador da Byte Force. Comecei a programar movido por uma ideia simples: tecnologia só vale a pena quando deixa a vida das pessoas mais leve. A Lyra é o ponto mais alto dessa jornada — o maior e mais ambicioso projeto que já coloquei no mundo.</p>
          <div className="facts">
            <a className="flink" href="https://moreiraxxz.vercel.app" target="_blank" rel="noopener">Ver portfólio {I.link()}</a>
            <a className="iglink" href="https://www.instagram.com/joao_moreiraxz/" target="_blank" rel="noopener">{I.instagram()} Instagram</a>
          </div>
        </div>
      </div>
      <div className="fstats">
        {[["1", "fundador, infinita dedicação"], ["+6", "meses construindo a Lyra"], ["#1", "maior projeto da Byte Force"]].map(([n, t]) =>
          <div className="fstat reveal" key={t}><div className="n">{n}</div><div className="t">{t}</div></div>)}
      </div>
    </div></section>
  );
}

function Story() {
  return (
    <section><div className="wrap"><div className="story-grid">
      <div className="panel-c story reveal">
        <h3 className="head">A história da Byte Force</h3>
        <p>A Byte Force começou como projetos pessoais nas madrugadas — sites, apps e experimentos feitos pelo prazer de construir. Com o tempo virou uma marca: um lugar para transformar ideias grandes em produtos reais, com foco e capricho em cada detalhe.</p>
        <p>A Lyra é a materialização dessa filosofia. Meses de pesquisa, design e código para criar uma IA que não parece uma ferramenta fria, mas uma companhia que entende você.</p>
      </div>
      <div className="panel-c values reveal">
        <h3 className="head">O que move a Byte Force</h3>
        <ul className="vlist">
          <li><span className="vi"><svg viewBox="0 0 24 24"><path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" /></svg></span><span><b>Simplicidade primeiro</b><small>Menos é mais. Cada tela tem que ser óbvia.</small></span></li>
          <li><span className="vi"><svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /></svg></span><span><b>Respeito ao usuário</b><small>Seus dados são seus. Sempre.</small></span></li>
          <li><span className="vi"><svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></svg></span><span><b>Velocidade real</b><small>Produtos leves que rodam em qualquer lugar.</small></span></li>
        </ul>
      </div>
    </div></div></section>
  );
}

function CTA({ onStart }) {
  return (
    <section className="cta-sec" id="acesso"><div className="wrap">
      <div className="pill reveal"><span className="live" />Disponível agora</div>
      <h2 className="head reveal">Comece a conversar com a Lyra.</h2>
      <p className="lead reveal">Crie sua conta, ganhe 10 perguntas grátis e conheça a IA da Byte Force.</p>
      <div className="btns reveal" style={{ marginTop: 30 }}><button className="btn btn-p" onClick={onStart}>Começar agora</button></div>
    </div></section>
  );
}

function Footer() {
  return (
    <footer><div className="wrap">
      <div>Lyra © 2026 · um produto <span className="bf">Byte Force</span></div>
      <div className="flinks">
        <a href="https://moreiraxxz.vercel.app" target="_blank" rel="noopener">Portfólio</a>
        <a href="#recursos">Recursos</a>
        <a href="https://www.instagram.com/joao_moreiraxz/" target="_blank" rel="noopener" aria-label="Instagram" style={{ display: "inline-flex" }}>{I.instagram()}</a>
      </div>
    </div></footer>
  );
}

function AuthModal({ onClose }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState(""), [password, setPassword] = useState("");
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function submit() {
    setErr(""); setBusy(true);
    const u = username.trim();
    if (u.length < 3) { setErr("Usuário precisa de ao menos 3 caracteres."); setBusy(false); return; }
    if (password.length < 6) { setErr("Senha precisa de ao menos 6 caracteres."); setBusy(false); return; }
    try {
      const email = toEmail(u);
      const { error } = mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { data: { username: u } } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onClose();
    } catch (e) {
      const m = String(e.message || "");
      if (m.includes("already registered")) setErr("Esse usuário já existe. Tente entrar.");
      else if (m.includes("Invalid login")) setErr("Usuário ou senha incorretos.");
      else setErr("Não deu certo. Confira os dados e tente de novo.");
    } finally { setBusy(false); }
  }
  return (
    <div className="ovl" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="x" onClick={onClose}>×</button>
        <div className="mark" />
        <h3 className="head">{mode === "login" ? "Entrar" : "Criar conta"}</h3>
        <p className="msub">{mode === "login" ? "Bom te ver de volta 💜" : "Crie sua conta e ganhe 10 perguntas grátis."}</p>
        <label>Usuário</label>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="seu_usuario" autoCapitalize="none" />
        <label>Senha</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" onKeyDown={e => e.key === "Enter" && submit()} />
        {err && <div className="err">{err}</div>}
        <button className="btn btn-p full" onClick={submit} disabled={busy}>{busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}</button>
        <div className="swap">
          {mode === "login" ? "Ainda não tem conta? " : "Já tem conta? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }}>{mode === "login" ? "Criar conta" : "Entrar"}</button>
        </div>
      </div>
    </div>
  );
}

function PayModal({ session, onClose, onPaid }) {
  const [fase, setFase] = useState("email");
  const [email, setEmail] = useState("");
  const [pix, setPix] = useState(null);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const pollRef = useRef(null);

  const auth = { Authorization: `Bearer ${session.access_token}` };
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && !email.trim().endsWith(".local");

  useEffect(() => () => clearInterval(pollRef.current), []);

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
    } catch { setErro("Falha na conexão."); setFase("erro"); }
  }

  function vigiar(id) {
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/pix?id=${id}`, { headers: auth });
        const d = await r.json();
        if (d.status === "approved") { clearInterval(pollRef.current); setFase("pago"); onPaid(); }
      } catch {}
    }, 4000);
    setTimeout(() => clearInterval(pollRef.current), 12 * 60 * 1000);
  }

  const copiar = () => {
    if (!pix?.qr_code) return;
    navigator.clipboard.writeText(pix.qr_code);
    setCopiado(true); setTimeout(() => setCopiado(false), 2200);
  };

  return (
    <div className="ovl" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <button className="x" onClick={onClose}>×</button>

        {fase === "email" && (
          <>
            <div className="pm-sat"><Saturn size={48} glow={1.2} /></div>
            <h3 className="head" style={{ textAlign: "center" }}>Byte Force Pro</h3>
            <p className="msub" style={{ textAlign: "center" }}>Converse sem limites com a Lyra.</p>

            <div className="pm-c">
              <div className="pm-p">R$3<small>/mês</small></div>
              <ul>
                {["Perguntas ilimitadas por 30 dias", "Notas e agenda sem limite", "Busca na web e leitura de arquivos", "Pagamento via Pix"].map(f => (
                  <li key={f}><span>{Ico.check}</span>{f}</li>
                ))}
              </ul>
            </div>

            <label>Seu email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && emailOk && gerar()}
              placeholder="voce@email.com" autoCapitalize="none" autoFocus />
            <p className="pm-h">Usamos apenas para enviar o comprovante.</p>

            <button className="btn btn-p full" onClick={gerar} disabled={!emailOk}>Gerar Pix de R$3</button>
          </>
        )}

        {fase === "gerando" && (
          <div style={{ textAlign: "center", padding: "44px 0", color: "var(--ink-3)", fontSize: 14 }}>
            <span className="spin-i" style={{ fontSize: 22 }}>◠</span>
            <div style={{ marginTop: 12 }}>Gerando seu Pix…</div>
          </div>
        )}

        {fase === "pix" && pix && (
          <>
            <h3 className="head" style={{ textAlign: "center" }}>Pague com Pix</h3>
            <p className="msub" style={{ textAlign: "center" }}>R$3 · liberação automática</p>

            <div className="pm-step">1 · Escaneie no app do seu banco</div>
            {pix.qr_code_base64 && (
              <div className="pm-qr"><img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR code Pix" /></div>
            )}

            <div className="pm-step">2 · Ou copie a chave</div>
            <div className="pm-copy">
              <input readOnly value={pix.qr_code || ""} onClick={e => e.target.select()} />
              <button onClick={copiar}>{copiado ? "Copiado!" : "Copiar"}</button>
            </div>

            <div className="pm-wait"><span className="pm-d" /> Aguardando o pagamento cair…</div>
            <p className="pm-h" style={{ textAlign: "center", marginTop: 12 }}>
              Pode deixar esta janela aberta. Seu Pro libera sozinho.
            </p>
          </>
        )}

        {fase === "pago" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div className="pm-sat"><Saturn size={52} glow={1.5} /></div>
            <h3 className="head">Pagamento confirmado</h3>
            <p className="msub">Seu Byte Force Pro está ativo por 30 dias.</p>
            <button className="btn btn-p full" onClick={onClose}>Voltar para a Lyra</button>
          </div>
        )}

        {fase === "erro" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>😕</div>
            <p className="msub">{erro}</p>
            <button className="btn btn-g full" onClick={() => { setFase("email"); setErro(""); }}>Tentar de novo</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Reveal() {
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach((e, i) => {
      if (e.isIntersecting) { e.target.style.transitionDelay = Math.min(i, 4) * 60 + "ms"; e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: .12 });
    document.querySelectorAll(".reveal").forEach(n => io.observe(n));
    return () => io.disconnect();
  }, []);
  return null;
}

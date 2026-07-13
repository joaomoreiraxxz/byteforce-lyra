// ─────────────────────────────────────────────────────────────
//  /api/chat — Lyra (motor ByteCore)
//  Streaming + Busca na web + Previsão do tempo + MEMÓRIA
//  Vercel env: GROQ_API_KEY, TAVILY_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
// ─────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "edge" };

const FREE_LIMIT = 10;
const MODEL = "openai/gpt-oss-120b";                             // texto (rápido)
const MODEL_VISION = "meta-llama/llama-4-scout-17b-16e-instruct"; // quando tem imagem

function systemPrompt(username, memorias) {
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const mem = memorias.length
    ? `\n\nO QUE VOCÊ LEMBRA SOBRE ${username.toUpperCase()}:\n${memorias.map(m => `- ${m}`).join("\n")}\nUse isso naturalmente, sem anunciar que "lembrou". Nunca invente memórias.`
    : "";

  return `Você é a Lyra, a inteligência artificial da Byte Force. Hoje é ${hoje}.
Você está conversando com ${username}.

QUEM TE CRIOU:
- Criada por João Moreira, desenvolvedor de Cuiabá-MT e fundador da Byte Force.
- Você é o maior e mais ambicioso projeto da Byte Force.
- Portfólio do criador: https://moreiraxxz.vercel.app

SEU MOTOR:
- Você roda no "ByteCore", motor de inteligência próprio da Byte Force.
- Se perguntarem sua tecnologia, modelo ou provedor, responda SEMPRE que é o ByteCore, da Byte Force.
- NUNCA cite empresas de IA, provedores externos, modelos de terceiros ou APIs. Obrigatório.

SUAS FERRAMENTAS:
- buscar_web: use para fatos atuais, notícias, tendências, preços, eventos, ou o que você não sabe.
- previsao_tempo: use SEMPRE que perguntarem sobre clima, tempo, temperatura, chuva ou previsão de alguma cidade.
- lembrar: use quando a pessoa contar algo duradouro sobre ela (nome real, cidade, profissão, gostos, objetivos, projetos). Não guarde coisas triviais ou passageiras.
- criar_nota: quando ela pedir para anotar, salvar ou guardar alguma informação.
- criar_compromisso: quando ela pedir para lembrar de algo em uma data/hora. Converta expressões como "amanhã às 15h" ou "sexta que vem" para a data real, usando a data de hoje como referência.
- ver_agenda: quando ela perguntar o que tem anotado, agendado ou marcado.

ANEXOS:
- A pessoa pode enviar documentos e imagens. Se vier um documento, o conteúdo aparece no texto. Se vier imagem, você a enxerga.
- Analise o anexo e responda com base nele.

FORMATAÇÃO — REGRAS RÍGIDAS:
- NUNCA use linhas separadoras. É PROIBIDO usar "---", "___", "***" ou qualquer linha horizontal.
- Organize com parágrafos, **negrito** e listas quando fizer sentido.
- Nada de excesso de títulos. Texto fluido é melhor.
- Use blocos de código com a linguagem quando mostrar código.

COMO RESPONDER:
- Português brasileiro natural, acolhedor, claro e direto.
- Respostas proporcionais à pergunta. Sem enrolação.
- Se não souber, diga com naturalidade.${mem}`;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "buscar_web",
      description: "Busca informações atuais na internet: notícias, tendências, preços, eventos, dados recentes.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "O que buscar, em poucas palavras" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "previsao_tempo",
      description: "Consulta a previsão do tempo e temperatura de uma cidade.",
      parameters: {
        type: "object",
        properties: { cidade: { type: "string", description: "Nome da cidade, ex: Cuiabá" } },
        required: ["cidade"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_nota",
      description: "Cria uma nota para a pessoa. Use quando ela pedir para anotar, salvar ou guardar algo.",
      parameters: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Título curto da nota" },
          conteudo: { type: "string", description: "O conteúdo da nota" },
        },
        required: ["titulo", "conteudo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_compromisso",
      description: "Agenda um compromisso ou lembrete. Use quando a pessoa pedir para lembrar de algo em uma data/hora.",
      parameters: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "O que é o compromisso" },
          quando: { type: "string", description: "Data e hora em formato ISO 8601, ex: 2026-07-15T14:30:00" },
          detalhe: { type: "string", description: "Detalhes extras (opcional)" },
        },
        required: ["titulo", "quando"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ver_agenda",
      description: "Consulta as notas e os compromissos da pessoa. Use quando ela perguntar o que tem anotado ou agendado.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["notas", "compromissos", "ambos"], description: "O que consultar" },
        },
        required: ["tipo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lembrar",
      description: "Guarda um fato duradouro sobre a pessoa para lembrar em conversas futuras.",
      parameters: {
        type: "object",
        properties: { fato: { type: "string", description: "O fato, curto e em terceira pessoa. Ex: 'Mora em Cuiabá-MT'" } },
        required: ["fato"],
      },
    },
  },
];

async function tavily(query) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return { erro: "busca indisponível", results: [] };
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query, max_results: 5, search_depth: "basic", include_answer: true }),
    });
    const d = await r.json();
    if (!r.ok) return { erro: "falha na busca", results: [] };
    return {
      resumo: d.answer || "",
      results: (d.results || []).map(x => ({ titulo: x.title, url: x.url, trecho: x.content })),
    };
  } catch { return { erro: "falha na busca", results: [] }; }
}

// Previsão do tempo — Open-Meteo (gratuito, sem chave)
async function tempo(cidade) {
  try {
    const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`);
    const gd = await g.json();
    const loc = gd?.results?.[0];
    if (!loc) return { erro: "cidade não encontrada" };

    const w = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=auto&forecast_days=4`
    );
    const wd = await w.json();
    const cod = {
      0: "céu limpo", 1: "predominantemente limpo", 2: "parcialmente nublado", 3: "nublado",
      45: "névoa", 48: "névoa com geada", 51: "garoa fraca", 53: "garoa", 55: "garoa forte",
      61: "chuva fraca", 63: "chuva moderada", 65: "chuva forte", 71: "neve fraca", 73: "neve",
      75: "neve forte", 80: "pancadas de chuva", 81: "pancadas fortes", 82: "pancadas muito fortes",
      95: "tempestade", 96: "tempestade com granizo", 99: "tempestade forte com granizo",
    };
    const c = wd.current, dl = wd.daily;
    return {
      cidade: `${loc.name}${loc.admin1 ? ", " + loc.admin1 : ""}`,
      agora: {
        temperatura: `${Math.round(c.temperature_2m)}°C`,
        condicao: cod[c.weather_code] || "—",
        umidade: `${c.relative_humidity_2m}%`,
        vento: `${Math.round(c.wind_speed_10m)} km/h`,
      },
      proximos_dias: (dl?.time || []).map((d, i) => ({
        data: new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "numeric" }),
        min: `${Math.round(dl.temperature_2m_min[i])}°C`,
        max: `${Math.round(dl.temperature_2m_max[i])}°C`,
        condicao: cod[dl.weather_code[i]] || "—",
        chance_chuva: `${dl.precipitation_probability_max[i] ?? 0}%`,
      })),
    };
  } catch { return { erro: "falha ao consultar o tempo" }; }
}

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const groqKey = process.env.GROQ_API_KEY;
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_KEY;
  if (!groqKey || !sbUrl || !sbKey) return json({ error: "Servidor não configurado." }, 500);

  const admin = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

  try {
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "Faça login para conversar." }, 401);
    const { data: ud, error: ue } = await admin.auth.getUser(token);
    if (ue || !ud?.user) return json({ error: "Sessão inválida." }, 401);
    const uid = ud.user.id;

    const { messages = [], conversationId = null, attachments = [] } = await req.json();

    // Perfil + limite
    const { data: prof } = await admin.from("profiles").select("pro_until, username, banned, banned_reason").eq("id", uid).single();

    // BANIDO? bloqueia
    if (prof?.banned) {
      return json({ error: "banido", banido: true, motivo: prof.banned_reason || "Violação dos termos de uso." }, 403);
    }

    const isPro = !!prof?.pro_until && new Date(prof.pro_until) > new Date();
    const username = prof?.username || "você";
    if (!isPro) {
      const { count } = await admin.from("questions").select("*", { count: "exact", head: true }).eq("user_id", uid);
      if ((count || 0) >= FREE_LIMIT) return json({ error: "limit", limitReached: true }, 402);
    }

    // MEMÓRIA: carrega o que a Lyra lembra
    const { data: memRows } = await admin
      .from("memories").select("fato").eq("user_id", uid)
      .order("created_at", { ascending: false }).limit(30);
    const memorias = (memRows || []).map(m => m.fato);

    const lastUser = [...messages].reverse().find(m => m.role === "user");

    // FLAG automática: marca perguntas suspeitas para o painel admin
    try {
      const txt = (lastUser?.content || "").toLowerCase();
      const sinais = [
        { p: /\b(bomba|explosivo|dinamite|c4|artefato explosiv)/i, m: "possível conteúdo explosivo" },
        { p: /\b(matar|assassinar|envenenar)\s+(alguém|uma pessoa|meu|minha|ele|ela)/i, m: "possível violência" },
        { p: /\b(hackear|invadir|roubar senha|crackear|ddos)\b/i, m: "possível uso malicioso" },
        { p: /\b(suicídio|me matar|acabar com minha vida|tirar minha vida)\b/i, m: "possível autolesão" },
        { p: /\b(drogas|cocaína|metanfetamina|sintetizar droga)\b/i, m: "possível conteúdo sobre drogas" },
        { p: /\b(pornô|pornografia)\s*(infantil|criança)/i, m: "CRÍTICO: possível abuso infantil" },
      ];
      for (const s of sinais) {
        if (s.p.test(txt)) {
          await admin.from("flags").insert({
            user_id: uid,
            conversation_id: conversationId,
            trecho: (lastUser?.content || "").slice(0, 300),
            motivo: s.m,
          });
          break;
        }
      }
    } catch {}

    // Anexos: imagens vão como image_url; documentos entram como texto
    const imgs = attachments.filter(a => a.tipo === "imagem");
    const docs = attachments.filter(a => a.tipo === "documento");
    const temImagem = imgs.length > 0;

    let convo = [
      { role: "system", content: systemPrompt(username, memorias) },
      ...messages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
    ];

    // última mensagem do usuário (com anexos, se houver)
    let textoUser = lastUser?.content || "";
    if (docs.length) {
      const conteudo = docs.map(d =>
        `\n\n[Documento anexado: ${d.nome}]\n${String(d.texto || "").slice(0, 12000)}`
      ).join("");
      textoUser += conteudo;
    }

    if (temImagem) {
      convo.push({
        role: "user",
        content: [
          { type: "text", text: textoUser || "O que você vê nesta imagem?" },
          ...imgs.map(im => ({ type: "image_url", image_url: { url: im.dataUrl } })),
        ],
      });
    } else {
      convo.push({ role: "user", content: textoUser });
    }

    // Loop de ferramentas (até 3 rodadas). Com imagem, sem ferramentas.
    let sources = [];
    let usedTool = null;
    const modelo = temImagem ? MODEL_VISION : MODEL;
    for (let round = 0; round < (temImagem ? 0 : 3); round++) {
      const resp = await callGroq(groqKey, convo, TOOLS, false, modelo);
      const msg = resp?.choices?.[0]?.message;
      if (!msg?.tool_calls?.length) break;

      convo.push(msg);
      for (const tc of msg.tool_calls) {
        let args = {};
        try { args = JSON.parse(tc.function.arguments || "{}"); } catch {}
        const name = tc.function.name;
        let result;

        if (name === "buscar_web") {
          usedTool = "busca";
          result = await tavily(args.query || lastUser?.content || "");
          sources = (result.results || []).slice(0, 5);
        } else if (name === "previsao_tempo") {
          usedTool = "tempo";
          result = await tempo(args.cidade || "");
        } else if (name === "criar_nota") {
          usedTool = "nota";
          const { data: nova } = await admin.from("notes").insert({
            user_id: uid,
            titulo: String(args.titulo || "Nota").slice(0, 120),
            conteudo: String(args.conteudo || "").slice(0, 5000),
            criada_por: "lyra",
          }).select().single();
          result = { ok: true, nota: nova?.titulo };
        } else if (name === "criar_compromisso") {
          usedTool = "agenda";
          let quando = args.quando;
          try { quando = new Date(quando).toISOString(); } catch { quando = null; }
          if (!quando) { result = { erro: "data inválida" }; }
          else {
            const { data: novo } = await admin.from("events").insert({
              user_id: uid,
              titulo: String(args.titulo || "Compromisso").slice(0, 120),
              detalhe: String(args.detalhe || "").slice(0, 500),
              quando,
              criado_por: "lyra",
            }).select().single();
            result = { ok: true, compromisso: novo?.titulo, quando };
          }
        } else if (name === "ver_agenda") {
          usedTool = "agenda";
          const t = args.tipo || "ambos";
          const out = {};
          if (t === "notas" || t === "ambos") {
            const { data } = await admin.from("notes").select("titulo, conteudo, updated_at")
              .eq("user_id", uid).order("updated_at", { ascending: false }).limit(20);
            out.notas = data || [];
          }
          if (t === "compromissos" || t === "ambos") {
            const { data } = await admin.from("events").select("titulo, detalhe, quando, concluido")
              .eq("user_id", uid).gte("quando", new Date(Date.now() - 864e5).toISOString())
              .order("quando", { ascending: true }).limit(20);
            out.compromissos = data || [];
          }
          result = out;
        } else if (name === "lembrar") {
          const fato = String(args.fato || "").trim().slice(0, 200);
          if (fato) {
            const jaTem = memorias.some(m => m.toLowerCase() === fato.toLowerCase());
            if (!jaTem) {
              await admin.from("memories").insert({ user_id: uid, fato });
              memorias.push(fato);
            }
          }
          result = { ok: true };
        } else {
          result = { erro: "ferramenta desconhecida" };
        }

        convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }

    // Resposta final em streaming
    const stream = await callGroq(groqKey, convo, null, true, modelo);
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    let full = "";

    const out = new ReadableStream({
      async start(ctrl) {
        if (usedTool) ctrl.enqueue(enc.encode(`event: tool\ndata: ${JSON.stringify(usedTool)}\n\n`));
        if (sources.length) ctrl.enqueue(enc.encode(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`));

        const reader = stream.body.getReader();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const d = line.slice(6).trim();
            if (d === "[DONE]") continue;
            try {
              const j = JSON.parse(d);
              const delta = j.choices?.[0]?.delta?.content;
              if (delta) {
                full += delta;
                ctrl.enqueue(enc.encode(`event: delta\ndata: ${JSON.stringify(delta)}\n\n`));
              }
            } catch {}
          }
        }

        // limpa qualquer linha separadora que escape
        full = full.replace(/^\s*([-_*])\1{2,}\s*$/gm, "").replace(/\n{3,}/g, "\n\n").trim();

        try {
          await admin.from("questions").insert({ user_id: uid, prompt: (lastUser?.content || "").slice(0, 500) });
          if (conversationId) {
            const anexoNota = attachments.length
              ? "\n\n📎 " + attachments.map(a => a.nome).join(", ")
              : "";
            await admin.from("messages").insert([
              { conversation_id: conversationId, user_id: uid, role: "user", content: (lastUser?.content || "") + anexoNota },
              { conversation_id: conversationId, user_id: uid, role: "assistant", content: full, sources: sources.length ? sources : null },
            ]);
            await admin.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
          }
        } catch {}

        ctrl.enqueue(enc.encode(`event: done\ndata: {}\n\n`));
        ctrl.close();
      },
    });

    return new Response(out, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch {
    return json({ error: "Falha ao falar com a Lyra." }, 500);
  }
}

async function callGroq(key, messages, tools, stream, model = MODEL) {
  const body = { model, messages, temperature: 0.7, max_tokens: 1800, stream: !!stream };
  if (tools) { body.tools = tools; body.tool_choice = "auto"; }
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  return stream ? r : r.json();
}

const json = (o, s) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

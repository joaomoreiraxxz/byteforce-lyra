// Tema claro/escuro. Padrão: escuro (roxo).
// A escolha fica salva no navegador da pessoa.

export const TEMAS = {
  escuro: {
    "--bg": "#08060f",
    "--bg-2": "#0d0a18",
    "--surface": "rgba(255,255,255,.035)",
    "--surface-2": "rgba(255,255,255,.06)",
    "--ink": "#f4f1fb",
    "--ink-2": "#a49fb8",
    "--ink-3": "#6e6885",
    "--line": "rgba(255,255,255,.09)",
    "--line-2": "rgba(255,255,255,.14)",
    "--v1": "#8b5cf6",
    "--v2": "#a855f7",
    "--v3": "#c084fc",
    "--pink": "#f0abfc",
    "--blue": "#60a5fa",
    "--shadow": "0 20px 60px rgba(0,0,0,.4)",
    "--star": "255,255,255",
  },
  claro: {
    "--bg": "#faf8ff",
    "--bg-2": "#f2edfd",
    "--surface": "rgba(255,255,255,.75)",
    "--surface-2": "rgba(255,255,255,.9)",
    "--ink": "#1a1230",
    "--ink-2": "#5b5473",
    "--ink-3": "#8b83a3",
    "--line": "rgba(26,18,48,.1)",
    "--line-2": "rgba(26,18,48,.16)",
    "--v1": "#7c3aed",
    "--v2": "#9333ea",
    "--v3": "#a855f7",
    "--pink": "#d946ef",
    "--blue": "#4f46e5",
    "--shadow": "0 20px 60px rgba(124,58,237,.12)",
    "--star": "124,58,237",
  },
};

export function aplicarTema(nome) {
  const t = TEMAS[nome] || TEMAS.escuro;
  const raiz = document.documentElement;
  Object.entries(t).forEach(([k, v]) => raiz.style.setProperty(k, v));
  raiz.setAttribute("data-tema", nome);
  document.body.style.background = t["--bg"];
  try { localStorage.setItem("lyra-tema", nome); } catch {}
}

export function temaSalvo() {
  try { return localStorage.getItem("lyra-tema") || "escuro"; } catch { return "escuro"; }
}

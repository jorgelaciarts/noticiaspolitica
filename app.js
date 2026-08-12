const DATA_URL = "data/news.json";
const POLL_MS = 3 * 60 * 1000; // revisa si hay novedades cada 3 minutos
const LAST_VISIT_KEY = "boletin-politico:last-visit";

const feedEl = document.getElementById("feed");
const emptyEl = document.getElementById("empty");
const chipsEl = document.getElementById("chips");
const searchEl = document.getElementById("search");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

let allItems = [];
let activeCategoria = null;
let lastVisit = Number(localStorage.getItem(LAST_VISIT_KEY) || 0);

function relativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

function formatClock(iso) {
  const d = new Date(iso);
  return d.toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function buildChips(categorias) {
  chipsEl.innerHTML = "";
  const todas = document.createElement("button");
  todas.className = "chip";
  todas.textContent = "Todas";
  todas.setAttribute("aria-pressed", String(activeCategoria === null));
  todas.addEventListener("click", () => setActiveCategoria(null));
  chipsEl.appendChild(todas);

  categorias.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = cat;
    btn.setAttribute("aria-pressed", String(activeCategoria === cat));
    btn.addEventListener("click", () => setActiveCategoria(cat));
    chipsEl.appendChild(btn);
  });
}

function setActiveCategoria(cat) {
  activeCategoria = cat;
  [...chipsEl.children].forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.textContent === (cat ?? "Todas")));
  });
  render();
}

function render() {
  const query = searchEl.value.trim().toLowerCase();

  const filtrados = allItems.filter((item) => {
    if (activeCategoria && !item.categorias.includes(activeCategoria)) return false;
    if (!query) return true;
    const haystack = `${item.titulo} ${item.resumen} ${item.fuente}`.toLowerCase();
    return haystack.includes(query);
  });

  feedEl.innerHTML = "";

  if (filtrados.length === 0) {
    emptyEl.textContent = allItems.length === 0
      ? "Todavía no hay noticias capturadas. El boletín se actualiza automáticamente cada 30 minutos."
      : "Sin resultados para este filtro o búsqueda.";
    feedEl.appendChild(emptyEl);
    return;
  }

  const frag = document.createDocumentFragment();
  filtrados.forEach((item) => {
    const li = document.createElement("article");
    li.className = "item" + (new Date(item.fecha).getTime() > lastVisit ? " is-new" : "");

    li.innerHTML = `
      <div class="item__meta">
        <span class="item__time" title="${formatClock(item.fecha)}">${relativeTime(item.fecha)}</span>
        <span class="item__source">${item.fuente}</span>
      </div>
      <div class="item__body">
        <h2 class="item__headline"><a href="${item.link}" target="_blank" rel="noopener">${item.titulo}</a></h2>
        ${item.resumen ? `<p class="item__summary">${item.resumen}</p>` : ""}
        <div class="item__tags">${item.categorias.map((c) => `<span class="stamp">${c}</span>`).join("")}</div>
      </div>
    `;
    frag.appendChild(li);
  });
  feedEl.appendChild(frag);
}

function setStatus(state, text) {
  statusDot.className = "masthead__dot" + (state === "ok" ? "" : ` ${state}`);
  statusText.textContent = text;
}

async function load({ silent = false } = {}) {
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allItems = data.items || [];

    const categorias = [...new Set(allItems.flatMap((i) => i.categorias))].sort();
    if (!silent) buildChips(categorias);

    render();
    setStatus("ok", `actualizado ${relativeTime(data.actualizado)} · ${data.total} noticias`);
  } catch (err) {
    setStatus("error", "no se pudo cargar data/news.json");
    if (!silent) console.error(err);
  }
}

searchEl.addEventListener("input", render);

load().then(() => {
  localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
});

setInterval(() => load({ silent: true }), POLL_MS);

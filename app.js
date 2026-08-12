const DATA_URL = "data/news.json";
const POLL_MS = 3 * 60 * 1000; // revisa si hay novedades cada 3 minutos
const LAST_VISIT_KEY = "clipping-politico:last-visit";

// lista fija, así los chips siempre se ven aunque todavía no haya noticias de esa categoría
const CATEGORIAS_FIJAS = [
  "Presidente", "Partidos políticos", "Candidatos", "Senadores", "Diputados",
  "Gobernadores regionales", "Concejales", "Alcaldes", "Consejeros regionales",
  "Elecciones", "Servicio Electoral",
];

const feedEl = document.getElementById("feed");
const emptyEl = document.getElementById("empty");
const chipsEl = document.getElementById("chips");
const regionSelectEl = document.getElementById("regionSelect");
const searchEl = document.getElementById("search");
const printBtn = document.getElementById("printBtn");
const printDateEl = document.getElementById("printDate");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

let allItems = [];
let activeCategoria = null;
let activeRegion = null;
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

function formatHour(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function dayKey(iso) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD, agrupa por día calendario UTC
}

function formatDayLabel(iso) {
  const d = new Date(iso);
  const label = d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
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

function setActiveRegion(region) {
  activeRegion = region;
  render();
}

function render() {
  const query = searchEl.value.trim().toLowerCase();

  const filtrados = allItems.filter((item) => {
    if (activeCategoria && !item.categorias.includes(activeCategoria)) return false;
    if (activeRegion && (item.region || "Nacional") !== activeRegion) return false;
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

  // agrupar por día calendario, manteniendo el orden (más reciente primero)
  const grupos = new Map();
  filtrados.forEach((item) => {
    const key = dayKey(item.fecha);
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(item);
  });

  const frag = document.createDocumentFragment();
  for (const [, items] of grupos) {
    const daySection = document.createElement("section");
    daySection.className = "day";
    daySection.innerHTML = `<h2 class="day__label">${formatDayLabel(items[0].fecha)}</h2>`;

    items.forEach((item) => {
      const clip = document.createElement("article");
      clip.className = "clip" + (new Date(item.fecha).getTime() > lastVisit ? " is-new" : "");
      clip.innerHTML = `
        <div class="clip__masthead">
          <span class="clip__source">${item.fuente}${item.region ? ` · ${item.region}` : ""}</span>
          <span class="clip__time" title="${formatClock(item.fecha)}">${formatHour(item.fecha)} · ${relativeTime(item.fecha)}</span>
        </div>
        <h3 class="clip__headline"><a href="${item.link}" target="_blank" rel="noopener">${item.titulo}</a></h3>
        ${item.resumen ? `<p class="clip__summary">${item.resumen}</p>` : ""}
        <div class="clip__tags">${item.categorias.map((c) => `<span class="stamp">${c}</span>`).join("")}</div>
      `;
      daySection.appendChild(clip);
    });

    frag.appendChild(daySection);
  }
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

    render();
    setStatus("ok", `actualizado ${relativeTime(data.actualizado)} · ${data.total} noticias`);
  } catch (err) {
    setStatus("error", "no se pudo cargar data/news.json");
    if (!silent) console.error(err);
  }
}

searchEl.addEventListener("input", render);

buildChips(CATEGORIAS_FIJAS);

regionSelectEl.addEventListener("change", () => {
  setActiveRegion(regionSelectEl.value || null);
});

printBtn.addEventListener("click", () => {
  printDateEl.textContent = new Date().toLocaleString("es-CL", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  window.print();
});

load().then(() => {
  localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
});

setInterval(() => load({ silent: true }), POLL_MS);

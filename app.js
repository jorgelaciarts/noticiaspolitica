const DATA_URL = "data/news.json";
const POLL_MS = 3 * 60 * 1000; // revisa si hay novedades cada 3 minutos
const LAST_VISIT_KEY = "clipping-politico:last-visit";

const feedEl = document.getElementById("feed");
const emptyEl = document.getElementById("empty");
const chipsEl = document.getElementById("chips");
const searchEl = document.getElementById("search");
const printBtn = document.getElementById("printBtn");
const printDateEl = document.getElementById("printDate");
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
    btn.setAttribute("aria-pressed", String(btn.textContent === (cat ??

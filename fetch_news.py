#!/usr/bin/env python3
"""
Descarga noticias desde feeds RSS de medios chilenos, filtra las que
mencionan partidos políticos, candidatos, presidente, senadores, diputados,
gobernadores regionales, concejales, alcaldes o consejeros regionales,
y actualiza data/news.json (acumulando lo nuevo, sin duplicar).

Pensado para correr periódicamente vía GitHub Actions, pero también
funciona corriéndolo a mano: python3 scripts/fetch_news.py
"""
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

import feedparser
import requests

ROOT = Path(__file__).resolve().parent.parent
FEEDS_FILE = ROOT / "scripts" / "feeds.json"
KEYWORDS_FILE = ROOT / "scripts" / "keywords.json"
OUTPUT_FILE = ROOT / "data" / "news.json"

MAX_ITEMS = 500          # cuántas noticias como máximo se guardan en total
REQUEST_TIMEOUT = 20      # segundos por feed
USER_AGENT = "Mozilla/5.0 (compatible; PoliticaChileNewsBot/1.0; +https://github.com)"


def normalize(text: str) -> str:
    """minusculas y sin tildes, para poder comparar sin preocuparse de acentos"""
    if not text:
        return ""
    text = text.lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return text


def load_json(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            print(f"[aviso] no se pudo leer {path}, se usa valor por defecto", file=sys.stderr)
    return default


def parse_date(entry) -> str:
    """Devuelve fecha ISO 8601 en UTC. Si no hay fecha, usa el momento actual."""
    for key in ("published", "updated", "created"):
        raw = entry.get(key)
        if raw:
            try:
                dt = parsedate_to_datetime(raw)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc).isoformat()
            except Exception:
                pass
    return datetime.now(timezone.utc).isoformat()


def match_categories(title: str, summary: str, categorias: dict) -> list:
    haystack = normalize(f"{title} {summary}")
    matched = []
    for categoria, palabras in categorias.items():
        for palabra in palabras:
            palabra_norm = normalize(palabra).strip()
            if not palabra_norm:
                continue
            # \b = límite de palabra: evita que "udi" matchee dentro de "estudio", por ejemplo
            patron = r"\b" + re.escape(palabra_norm) + r"\b"
            if re.search(patron, haystack):
                matched.append(categoria)
                break
    return matched


def contains_exclusion(title: str, summary: str, exclusiones: list) -> bool:
    haystack = normalize(f"{title} {summary}")
    for palabra in exclusiones:
        palabra_norm = normalize(palabra).strip()
        if not palabra_norm:
            continue
        patron = r"\b" + re.escape(palabra_norm) + r"\b"
        if re.search(patron, haystack):
            return True
    return False


def fetch_feed(nombre: str, url: str):
    try:
        resp = requests.get(url, timeout=REQUEST_TIMEOUT, headers={"User-Agent": USER_AGENT})
        resp.raise_for_status()
        parsed = feedparser.parse(resp.content)
        if parsed.bozo and not parsed.entries:
            print(f"[aviso] {nombre}: feed no pudo parsearse ({parsed.bozo_exception})", file=sys.stderr)
        return parsed.entries
    except Exception as exc:
        print(f"[error] {nombre} ({url}): {exc}", file=sys.stderr)
        return []


def main():
    feeds = load_json(FEEDS_FILE, {"feeds": []})["feeds"]
    keywords_data = load_json(KEYWORDS_FILE, {"categorias": {}, "exclusiones": []})
    categorias = keywords_data.get("categorias", {})
    exclusiones = keywords_data.get("exclusiones", [])
    existentes = load_json(OUTPUT_FILE, {"items": []}).get("items", [])
    vistos = {item["link"] for item in existentes if item.get("link")}

    nuevos = []
    for feed in feeds:
        nombre = feed.get("nombre", feed.get("url", "fuente"))
        url = feed["url"]
        region = feed.get("region", "Nacional")
        entries = fetch_feed(nombre, url)
        for entry in entries:
            link = entry.get("link")
            if not link or link in vistos:
                continue
            title = entry.get("title", "").strip()
            summary = re.sub("<[^<]+?>", "", entry.get("summary", entry.get("description", ""))).strip()
            if contains_exclusion(title, summary, exclusiones):
                continue  # ej: noticias deportivas que colaron por coincidencia de texto
            categorias_encontradas = match_categories(title, summary, categorias)
            if not categorias_encontradas:
                continue  # no habla de política/candidatos/autoridades: se descarta
            nuevos.append({
                "titulo": title,
                "link": link,
                "fuente": nombre,
                "region": region,
                "resumen": summary[:400],
                "categorias": categorias_encontradas,
                "fecha": parse_date(entry),
            })
            vistos.add(link)

    todos = nuevos + existentes
    # ordenar por fecha descendente y limitar el total guardado
    todos.sort(key=lambda x: x.get("fecha", ""), reverse=True)
    todos = todos[:MAX_ITEMS]

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(
            {
                "actualizado": datetime.now(timezone.utc).isoformat(),
                "total": len(todos),
                "items": todos,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Listo: {len(nuevos)} noticias nuevas agregadas, {len(todos)} en total.")


if __name__ == "__main__":
    main()

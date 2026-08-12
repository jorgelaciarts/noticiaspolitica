# Clipping de Prensa Política — Chile

Esta es una página web que junta sola las noticias políticas de varios
medios chilenos (presidente, senadores, diputados, alcaldes, partidos,
candidatos, etc.) y las muestra agrupadas por día, como un clipping de
prensa. Se actualiza sola cada 30 minutos, sin que tengas que hacer nada.

No necesitas saber programar para dejarla funcionando. Sigue estos pasos
en orden.

---

## Parte 1: Subir los archivos a GitHub

1. Entra a [github.com](https://github.com) e inicia sesión (o crea una
   cuenta gratis si no tienes).
2. Arriba a la derecha, apreta el botón verde **"New"** (o el símbolo `+`
   → "New repository") para crear un repositorio nuevo.
3. Ponle un nombre, por ejemplo `clipping-politico`. Déjalo en **público**.
   No marques ninguna casilla de "Add README" ni "Add .gitignore".
4. Apreta **"Create repository"**.
5. En la página que se abre, busca el link que dice **"uploading an
   existing file"** (o el botón "Add file" → "Upload files").
6. Descomprime el archivo `politica-chile-news.zip` que te pasé, en tu
   computador. Adentro vas a ver varias carpetas y archivos:
   `index.html`, `style.css`, `app.js`, `README.md`, y las carpetas
   `scripts`, `data` y `.github`.
7. Arrastra **todo el contenido** de esa carpeta (todos los archivos y
   carpetas juntos, no la carpeta contenedora) a la zona de subida de
   GitHub.
8. Abajo, donde dice "Commit changes", apreta el botón verde para
   confirmar la subida.

> 💡 Si prefieres hacerlo desde la terminal en vez de arrastrar archivos,
> al final de este documento están los comandos de `git`.

---

## Parte 2: Activar la página web (GitHub Pages)

1. Dentro de tu repositorio, ve a la pestaña **"Settings"** (arriba).
2. En el menú de la izquierda, busca **"Pages"**.
3. Donde dice "Source", elige **"Deploy from a branch"**.
4. Donde dice "Branch", elige **`main`** y la carpeta **`/ (root)`**.
5. Apreta **"Save"**.
6. Espera 1 o 2 minutos. Arriba te va a aparecer un link parecido a:
   `https://tu-usuario.github.io/clipping-politico/` — esa es tu página.

---

## Parte 3: Darle permiso para que se actualice sola

Para que el robot que busca noticias pueda guardar lo que encuentra,
necesitas darle permiso de escritura:

1. Sigue en **"Settings"**.
2. En el menú de la izquierda, ve a **"Actions" → "General"**.
3. Baja hasta donde dice **"Workflow permissions"**.
4. Marca la opción **"Read and write permissions"**.
5. Apreta **"Save"**.

---

## Parte 4: Correrlo por primera vez

Por defecto, el robot revisa las noticias cada 30 minutos, pero la primera
vez conviene activarlo a mano para comprobar que funciona:

1. Ve a la pestaña **"Actions"** (arriba, junto a "Settings").
2. En la lista de la izquierda, apreta **"Actualizar noticias políticas"**.
3. A la derecha va a aparecer un botón **"Run workflow"** → apriétalo →
   confirma con el botón verde.
4. Espera 1 o 2 minutos y recarga la página. Debería aparecer un ✅ verde,
   señal de que corrió bien.
5. Entra a tu página (el link de la Parte 2) y recárgala: ya deberían
   aparecer noticias.

Si el ✅ sale en rojo (❌), entra a ese registro y revisa el mensaje de
error; lo más común es que alguna fuente de noticias (feed RSS) cambió su
dirección. Se puede corregir editando `scripts/feeds.json` (ver más abajo).

---

## Listo — ¿y ahora?

No tienes que hacer nada más. El robot va a seguir revisando las noticias
cada 30 minutos y agregándolas solo a tu página, para siempre, gratis.

---

## Cómo cambiar cosas (opcional)

Todo se edita directamente en GitHub, sin instalar nada: entra al archivo
que quieras cambiar dentro de tu repositorio, apreta el lápiz ✏️ ("Edit"),
haz el cambio, y abajo confirma con "Commit changes".

- **¿De qué medios saca las noticias?** → edita `scripts/feeds.json`.
  Cada fuente tiene un nombre y una dirección (URL) de feed RSS. Puedes
  agregar o borrar líneas.
- **¿Qué palabras usa para saber si una noticia es "política"?** → edita
  `scripts/keywords.json`. Ahí puedes agregar nombres de candidatos,
  partidos, comunas, etc. que quieras que detecte.
- **¿Cada cuánto se actualiza?** → en el archivo
  `.github/workflows/update-news.yml`, la línea que dice
  `cron: "*/30 * * * *"` controla la frecuencia (ahora mismo: cada 30
  minutos).
- **¿Cuántas noticias guarda como máximo?** → en `scripts/fetch_news.py`,
  la línea `MAX_ITEMS = 500`.

---

## Comandos de git (alternativa a arrastrar archivos)

Si prefieres usar la terminal en vez de subir los archivos a mano desde el
navegador:

```bash
cd politica-chile-news
git init
git add .
git commit -m "Clipping de prensa inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

Después sigue igual desde la Parte 2 de este documento (activar GitHub
Pages y los permisos).

## Probarlo en tu computador antes de subirlo (opcional, para curiosos)

```bash
pip install feedparser requests
python3 scripts/fetch_news.py
python3 -m http.server 8000
```

Y luego abres `http://localhost:8000` en el navegador.

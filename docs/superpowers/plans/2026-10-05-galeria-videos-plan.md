# Guia de Iniciantes — Galeria de Vídeos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, zero-backend GitHub Pages site where visitors browse and search a gallery of YouTube videos (thumbnail + title), watch them in an in-page lightbox, and only a repository collaborator (the "master") can add a video — by editing a data file and committing, never through a password on the site.

**Architecture:** Plain HTML/CSS/vanilla JS, no build step, no npm, no framework. All video data lives in `assets/videos.js` (`window.VIDEOS = [...]`), loaded with a plain `<script>` tag so the page works both from `file://` and from GitHub Pages. Pure, testable logic (URL parsing, search normalization, sorting, HTML escaping, generating/parsing the data file) lives in `assets/lib.js` and is covered by browser-run assertions in `test.html`. `index.html` + `assets/app.js` render the public gallery. `admin.html` + `assets/admin.js` is a separate, unlinked local tool that turns pasted YouTube links into the `videos.js` text you paste back into the repo — it has no write access and no password, because it has no power to misuse.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript (ES2020+, no transpilation). No Node.js dependency in the shipped site — Node is used only as a scripting convenience *during implementation* to verify `assets/lib.js` from the command line without a browser; it is never referenced by any shipped file.

**Spec:** `docs/superpowers/specs/2026-10-05-galeria-videos-design.md`

## Global Constraints

- Hospedagem: GitHub Pages estático. Sem backend, sem banco de dados, sem build/bundler/npm no site publicado.
- "Usuário master" = quem tem permissão de push no repositório GitHub. Não existe login, senha, ou conta de usuário dentro do site.
- `assets/videos.js` deve terminar esta implementação como `window.VIDEOS = [];` — lista vazia. Nenhum vídeo de teste pode permanecer no commit final.
- Título da página / `<h1>`: exatamente **"Guia de Iniciantes"**.
- Thumbnail de cada vídeo: `https://i.ytimg.com/vi/<id>/hqdefault.jpg` — sem fallback (hqdefault existe para todo vídeo público; é por isso que foi escolhida).
- Player embutido: `https://www.youtube-nocookie.com/embed/<id>?autoplay=1`, e o `<iframe>` só é criado no momento do clique (nunca na carga inicial da página).
- Busca: compara `titulo` e `canal`, normalizando acento e caixa (NFD + remoção de diacríticos + minúsculas), atualizando a cada tecla digitada.
- Ordenação da grade: por `adicionado` desc (mais recente primeiro); em caso de empate de data, mantém a ordem em que aparecem em `videos.js` (ordenação estável).
- Paleta/tipografia copiadas verbatim de `exemplo/`: `--bg:#080c10; --gold:#d4b47d; --bright:#eddbb7; --muted:#a4a5a6`; títulos em Cinzel, corpo em Manrope, via Google Fonts (`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap')`).
- Lightbox usa `<dialog>` nativo com a mesma mecânica do `exemplo/.../script.js.download`: `showModal()`/`close()`, Esc fecha, clique fora do conteúdo fecha, foco retorna ao elemento que abriu o diálogo.
- `admin.html` não é linkado a partir de `index.html`, não tem senha, e nunca escreve em nenhum lugar — só gera texto que o usuário copia manualmente.
- Todo JS é vanilla, carregado via `<script>` comum (sem `type="module"`, sem bundler). `node --check` e `node -e` são usados apenas como ferramenta de verificação durante a implementação.

---

## Task 1: `lib.js` — extração de id do YouTube e normalização de busca (TDD)

**Files:**
- Create: `assets/lib.js`
- Create: `test.html`

**Interfaces:**
- Produces: `window.Lib.extractYouTubeId(url: string): string|null`, `window.Lib.normalizeForSearch(text: string): string`

- [ ] **Step 1: Create the stub implementation**

Create `assets/lib.js`:

```js
window.Lib = {};
```

- [ ] **Step 2: Create the browser test harness with the first assertions (failing)**

Create `test.html`:

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Testes — lib.js</title>
  <style>
    body { font-family: monospace; background: #111; color: #eee; padding: 20px; }
    li.pass { color: #7ee787; }
    li.fail { color: #ff7b72; font-weight: bold; }
    #summary { font-size: 16px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>Testes — assets/lib.js</h1>
  <p id="summary">Executando…</p>
  <ul id="results"></ul>

  <script src="assets/lib.js"></script>
  <script>
    (function () {
      'use strict';
      let pass = 0, fail = 0;
      const results = document.getElementById('results');

      function assertEqual(actual, expected, message) {
        const ok = JSON.stringify(actual) === JSON.stringify(expected);
        const li = document.createElement('li');
        li.className = ok ? 'pass' : 'fail';
        li.textContent = (ok ? 'PASS' : 'FAIL') + ' — ' + message +
          (ok ? '' : ` (esperado ${JSON.stringify(expected)}, recebido ${JSON.stringify(actual)})`);
        results.appendChild(li);
        ok ? pass++ : fail++;
      }

      assertEqual(window.Lib.extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ', 'extractYouTubeId: link watch simples');
      assertEqual(window.Lib.extractYouTubeId('https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ&t=30s'), 'dQw4w9WgXcQ', 'extractYouTubeId: link watch com parametros extras');
      assertEqual(window.Lib.extractYouTubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ', 'extractYouTubeId: link curto youtu.be');
      assertEqual(window.Lib.extractYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=5'), 'dQw4w9WgXcQ', 'extractYouTubeId: link curto com parametro');
      assertEqual(window.Lib.extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ', 'extractYouTubeId: link de shorts');
      assertEqual(window.Lib.extractYouTubeId('https://example.com/video'), null, 'extractYouTubeId: link invalido retorna null');
      assertEqual(window.Lib.extractYouTubeId(''), null, 'extractYouTubeId: string vazia retorna null');

      assertEqual(window.Lib.normalizeForSearch('Dungeão Final'), 'dungeao final', 'normalizeForSearch: remove acento e vira minusculas');
      assertEqual(window.Lib.normalizeForSearch('  ESPAÇO  '), 'espaco', 'normalizeForSearch: remove espacos nas pontas');
      assertEqual(window.Lib.normalizeForSearch(undefined), '', 'normalizeForSearch: valor nao-string retorna vazio');

      // INSERIR_TESTES_AQUI

      document.getElementById('summary').textContent = `${pass} PASS / ${fail} FAIL`;
    })();
  </script>
</body>
</html>
```

- [ ] **Step 3: Run the Node verification to confirm it fails**

Run:

```bash
node -e "globalThis.window = {}; eval(require('fs').readFileSync('assets/lib.js', 'utf8')); const assert = require('assert'); assert.strictEqual(window.Lib.extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ'); console.log('OK');"
```

Expected: fails with `TypeError: window.Lib.extractYouTubeId is not a function`.

- [ ] **Step 4: Implement the real functions**

Replace the entire content of `assets/lib.js` with:

```js
window.Lib = (() => {
  'use strict';

  function extractYouTubeId(url) {
    if (typeof url !== 'string') return null;
    const trimmed = url.trim();
    const patterns = [
      /(?:youtube\.com\/watch\?[^#]*\bv=)([A-Za-z0-9_-]{11})/,
      /youtu\.be\/([A-Za-z0-9_-]{11})/,
      /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  function normalizeForSearch(text) {
    if (typeof text !== 'string') return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  return {
    extractYouTubeId,
    normalizeForSearch,
  };
})();
```

- [ ] **Step 5: Run the Node verification to confirm it passes**

Run:

```bash
node -e "globalThis.window = {}; eval(require('fs').readFileSync('assets/lib.js', 'utf8')); const assert = require('assert'); assert.strictEqual(window.Lib.extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ'); assert.strictEqual(window.Lib.extractYouTubeId('https://example.com/video'), null); assert.strictEqual(window.Lib.normalizeForSearch('Dungeão Final'), 'dungeao final'); console.log('OK');"
```

Expected: prints `OK`.

Also open `test.html` in a browser and confirm the summary reads `10 PASS / 0 FAIL`.

- [ ] **Step 6: Commit**

```bash
git add assets/lib.js test.html
git commit -m "feat: extrai id do YouTube e normaliza texto de busca

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: `lib.js` — helpers da galeria: escapeHtml, ordenação, busca, URLs (TDD)

**Files:**
- Modify: `assets/lib.js`
- Modify: `test.html`

**Interfaces:**
- Consumes: `window.Lib.normalizeForSearch` (Task 1)
- Produces: `window.Lib.escapeHtml(text: string): string`, `window.Lib.sortVideosByDate(videos: Array): Array`, `window.Lib.filterVideos(videos: Array, query: string): Array`, `window.Lib.thumbnailUrl(id: string): string`, `window.Lib.embedUrl(id: string): string`

- [ ] **Step 1: Add the failing assertions**

In `test.html`, replace:

```js
      // INSERIR_TESTES_AQUI
```

with:

```js
      const videosParaOrdenar = [
        { id: 'a', titulo: 'A', canal: 'C', adicionado: '2026-01-01' },
        { id: 'b', titulo: 'B', canal: 'C', adicionado: '2026-03-01' },
        { id: 'c', titulo: 'C', canal: 'C', adicionado: '2026-02-01' },
        { id: 'd', titulo: 'D', canal: 'C', adicionado: '2026-03-01' },
      ];
      assertEqual(
        window.Lib.sortVideosByDate(videosParaOrdenar).map(v => v.id),
        ['b', 'd', 'c', 'a'],
        'sortVideosByDate: mais recente primeiro, mantem ordem original em empate'
      );

      const videosParaFiltrar = [
        { id: '1', titulo: 'Dungeão Final', canal: 'Ally Octans', adicionado: '2026-01-01' },
        { id: '2', titulo: 'Guia de Classes', canal: 'Outro Canal', adicionado: '2026-01-02' },
      ];
      assertEqual(window.Lib.filterVideos(videosParaFiltrar, 'dungeao').map(v => v.id), ['1'], 'filterVideos: busca por titulo ignora acento/caixa');
      assertEqual(window.Lib.filterVideos(videosParaFiltrar, 'outro canal').map(v => v.id), ['2'], 'filterVideos: busca por canal');
      assertEqual(window.Lib.filterVideos(videosParaFiltrar, '').length, 2, 'filterVideos: busca vazia retorna todos');
      assertEqual(window.Lib.filterVideos(videosParaFiltrar, 'inexistente').length, 0, 'filterVideos: sem resultado retorna lista vazia');

      assertEqual(window.Lib.thumbnailUrl('abc123'), 'https://i.ytimg.com/vi/abc123/hqdefault.jpg', 'thumbnailUrl: monta URL da miniatura');
      assertEqual(window.Lib.embedUrl('abc123'), 'https://www.youtube-nocookie.com/embed/abc123?autoplay=1', 'embedUrl: monta URL do player sem cookies');

      assertEqual(window.Lib.escapeHtml(`<b>&"'`), '&lt;b&gt;&amp;&quot;&#39;', 'escapeHtml: escapa caracteres especiais');

      // INSERIR_TESTES_AQUI
```

- [ ] **Step 2: Run the Node verification to confirm it fails**

```bash
node -e "globalThis.window = {}; eval(require('fs').readFileSync('assets/lib.js', 'utf8')); const assert = require('assert'); assert.deepStrictEqual(window.Lib.sortVideosByDate([{id:'a',adicionado:'2026-01-01'},{id:'b',adicionado:'2026-03-01'}]).map(v=>v.id), ['b','a']); console.log('OK');"
```

Expected: fails with `TypeError: window.Lib.sortVideosByDate is not a function`.

- [ ] **Step 3: Implement the functions**

In `assets/lib.js`, replace:

```js
  return {
    extractYouTubeId,
    normalizeForSearch,
  };
})();
```

with:

```js
  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sortVideosByDate(videos) {
    return videos
      .map((video, index) => ({ video, index }))
      .sort((a, b) => {
        if (a.video.adicionado === b.video.adicionado) return a.index - b.index;
        return a.video.adicionado < b.video.adicionado ? 1 : -1;
      })
      .map(entry => entry.video);
  }

  function filterVideos(videos, query) {
    const normalizedQuery = normalizeForSearch(query);
    if (!normalizedQuery) return videos.slice();
    return videos.filter(video =>
      normalizeForSearch(video.titulo).includes(normalizedQuery) ||
      normalizeForSearch(video.canal).includes(normalizedQuery)
    );
  }

  function thumbnailUrl(id) {
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }

  function embedUrl(id) {
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
  }

  return {
    extractYouTubeId,
    normalizeForSearch,
    escapeHtml,
    sortVideosByDate,
    filterVideos,
    thumbnailUrl,
    embedUrl,
  };
})();
```

- [ ] **Step 4: Run the Node verification to confirm it passes**

```bash
node -e "globalThis.window = {}; eval(require('fs').readFileSync('assets/lib.js', 'utf8')); const assert = require('assert'); assert.deepStrictEqual(window.Lib.sortVideosByDate([{id:'a',adicionado:'2026-01-01'},{id:'b',adicionado:'2026-03-01'}]).map(v=>v.id), ['b','a']); assert.strictEqual(window.Lib.thumbnailUrl('abc'), 'https://i.ytimg.com/vi/abc/hqdefault.jpg'); assert.strictEqual(window.Lib.escapeHtml('<b>'), '&lt;b&gt;'); console.log('OK');"
```

Expected: prints `OK`. Also open `test.html` and confirm `19 PASS / 0 FAIL`.

- [ ] **Step 5: Commit**

```bash
git add assets/lib.js test.html
git commit -m "feat: adiciona helpers de ordenacao, busca e escape de HTML

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `lib.js` — gerar e ler o conteúdo de `videos.js` (TDD)

**Files:**
- Modify: `assets/lib.js`
- Modify: `test.html`

**Interfaces:**
- Produces: `window.Lib.generateVideosJsSource(videos: Array): string`, `window.Lib.parseVideosJsSource(sourceText: string): Array`

- [ ] **Step 1: Add the failing assertions**

In `test.html`, replace:

```js
      // INSERIR_TESTES_AQUI
```

with:

```js
      assertEqual(window.Lib.generateVideosJsSource([]), 'window.VIDEOS = [];\n', 'generateVideosJsSource: lista vazia');

      const videoExemplo = [{ id: 'dQw4w9WgXcQ', titulo: 'Como comecar', canal: 'Ally Octans', adicionado: '2026-01-01' }];
      const fonteGerada = window.Lib.generateVideosJsSource(videoExemplo);
      assertEqual(
        fonteGerada,
        'window.VIDEOS = [\n  { id: "dQw4w9WgXcQ", titulo: "Como comecar", canal: "Ally Octans", adicionado: "2026-01-01" },\n];\n',
        'generateVideosJsSource: um video'
      );

      assertEqual(window.Lib.parseVideosJsSource(''), [], 'parseVideosJsSource: string vazia retorna lista vazia');
      assertEqual(window.Lib.parseVideosJsSource(fonteGerada), videoExemplo, 'parseVideosJsSource: ida e volta preserva os dados');

      // INSERIR_TESTES_AQUI
```

- [ ] **Step 2: Run the Node verification to confirm it fails**

```bash
node -e "globalThis.window = {}; eval(require('fs').readFileSync('assets/lib.js', 'utf8')); const assert = require('assert'); assert.strictEqual(window.Lib.generateVideosJsSource([]), 'window.VIDEOS = [];\n'); console.log('OK');"
```

Expected: fails with `TypeError: window.Lib.generateVideosJsSource is not a function`.

- [ ] **Step 3: Implement the functions**

In `assets/lib.js`, replace:

```js
  return {
    extractYouTubeId,
    normalizeForSearch,
    escapeHtml,
    sortVideosByDate,
    filterVideos,
    thumbnailUrl,
    embedUrl,
  };
})();
```

with:

```js
  function generateVideosJsSource(videos) {
    if (videos.length === 0) return 'window.VIDEOS = [];\n';
    const lines = videos.map(video => {
      const id = JSON.stringify(video.id);
      const titulo = JSON.stringify(video.titulo);
      const canal = JSON.stringify(video.canal);
      const adicionado = JSON.stringify(video.adicionado);
      return `  { id: ${id}, titulo: ${titulo}, canal: ${canal}, adicionado: ${adicionado} },`;
    });
    return `window.VIDEOS = [\n${lines.join('\n')}\n];\n`;
  }

  function parseVideosJsSource(sourceText) {
    if (!sourceText || !sourceText.trim()) return [];
    const sandbox = {};
    const run = new Function('window', `${sourceText}\nreturn window.VIDEOS;`);
    const result = run(sandbox);
    return Array.isArray(result) ? result : [];
  }

  return {
    extractYouTubeId,
    normalizeForSearch,
    escapeHtml,
    sortVideosByDate,
    filterVideos,
    thumbnailUrl,
    embedUrl,
    generateVideosJsSource,
    parseVideosJsSource,
  };
})();
```

- [ ] **Step 4: Run the Node verification to confirm it passes**

```bash
node -e "globalThis.window = {}; eval(require('fs').readFileSync('assets/lib.js', 'utf8')); const assert = require('assert'); const src = window.Lib.generateVideosJsSource([{id:'x',titulo:'T',canal:'C',adicionado:'2026-01-01'}]); assert.deepStrictEqual(window.Lib.parseVideosJsSource(src), [{id:'x',titulo:'T',canal:'C',adicionado:'2026-01-01'}]); console.log('OK');"
```

Expected: prints `OK`. Also open `test.html` and confirm `23 PASS / 0 FAIL`.

- [ ] **Step 5: Commit**

```bash
git add assets/lib.js test.html
git commit -m "feat: gera e le o conteudo de videos.js

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Galeria pública — assets visuais, `index.html` e `app.js` (render + busca)

**Files:**
- Create: `assets/style.css`
- Create: `assets/favicon.svg`
- Create: `assets/videos.js`
- Copy: `assets/octans-emblema.jpg` (de `exemplo/Ally Octans — Sua aliança em Aika Online_files/octans-emblema.jpg`)
- Create: `index.html`
- Create: `assets/app.js`

**Interfaces:**
- Consumes: `window.Lib.sortVideosByDate`, `window.Lib.filterVideos`, `window.Lib.thumbnailUrl`, `window.Lib.escapeHtml` (Tasks 1–2), `window.VIDEOS` (global array from `assets/videos.js`)
- Produces: DOM elements `#video-grid`, `#search-input`, `#result-count`, `#lightbox` (markup only, wired in Task 5)

- [ ] **Step 1: Copy the emblem image from the example**

```bash
cp "exemplo/Ally Octans — Sua aliança em Aika Online_files/octans-emblema.jpg" "assets/octans-emblema.jpg"
```

- [ ] **Step 2: Create the favicon**

Create `assets/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#080c10"/><path d="M9 6.5v11l9-5.5-9-5.5Z" fill="#d4b47d"/></svg>
```

- [ ] **Step 3: Create the empty data file**

Create `assets/videos.js`:

```js
window.VIDEOS = [];
```

- [ ] **Step 4: Create the stylesheet**

Create `assets/style.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

:root {
  color-scheme: dark;
  --bg: #080c10;
  --gold: #d4b47d;
  --bright: #eddbb7;
  --muted: #a4a5a6;
  --text: #f4f0e8;
}

* { box-sizing: border-box; }
html { background: var(--bg); }
body {
  margin: 0;
  color: var(--text);
  font-family: Manrope, "Segoe UI", sans-serif;
  background: var(--bg);
}
img { max-width: 100%; }

a { color: inherit; text-decoration: none; }
button { font: inherit; color: inherit; cursor: pointer; background: none; border: none; }
a:focus-visible, button:focus-visible, input:focus-visible {
  outline: 2px solid var(--bright);
  outline-offset: 3px;
}

.skip {
  position: fixed;
  top: -100px;
  left: 20px;
  padding: 12px;
  background: var(--bright);
  color: #111;
  z-index: 20;
}
.skip:focus { top: 12px; }

.shell {
  max-width: 1180px;
  margin: auto;
  padding: 0 clamp(22px, 5vw, 70px);
  min-height: 100svh;
  display: flex;
  flex-direction: column;
}

.site-header {
  display: flex;
  align-items: center;
  min-height: 82px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: Cinzel, Georgia, serif;
  font-size: 15px;
  letter-spacing: .13em;
  font-weight: 600;
}
.brand img {
  border-radius: 50%;
  width: 40px;
  height: 40px;
  border: 1px solid #d4b47d44;
}
.brand small {
  display: block;
  font-family: Manrope, "Segoe UI", sans-serif;
  font-size: 7px;
  font-weight: 500;
  letter-spacing: .22em;
  margin-top: 5px;
  color: #b5b1ab;
}

.content { flex: 1; padding: 40px 0 60px; }

.intro { margin-bottom: 30px; }
.eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: .2em;
  color: var(--gold);
  margin: 0 0 14px;
}
.intro h1 {
  font-family: Cinzel, Georgia, serif;
  font-weight: 400;
  font-size: clamp(32px, 4.5vw, 54px);
  letter-spacing: -.03em;
  margin: 0 0 12px;
}
.intro p { font-size: 12px; line-height: 1.8; color: #b5b2ab; margin: 0; }

.search-bar { margin-bottom: 10px; }
.search-bar label { display: block; font-size: 11px; color: var(--muted); margin-bottom: 8px; }
#search-input {
  width: 100%;
  max-width: 420px;
  padding: 12px 16px;
  border: 1px solid #d4b47d3b;
  border-radius: 8px;
  background: #0d1217;
  color: var(--text);
  font-size: 14px;
}
#search-input::placeholder { color: #70706a; }
.result-count {
  display: block;
  margin-top: 10px;
  font-size: 11px;
  color: var(--muted);
  min-height: 1.4em;
}

.video-grid {
  list-style: none;
  margin: 24px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.empty-state {
  grid-column: 1 / -1;
  font-size: 13px;
  color: var(--muted);
  padding: 40px 0;
  text-align: center;
}

.video-card {
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid #d4b47d30;
  border-radius: 8px;
  background: #0d1115;
  overflow: hidden;
  transition: border-color .2s, transform .15s;
}
.video-thumb {
  position: relative;
  display: block;
  aspect-ratio: 16 / 9;
  background: #000;
  overflow: hidden;
}
.video-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.play-badge {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--gold);
  background: radial-gradient(circle, #00000055 40%, transparent 70%);
  opacity: 1;
}
.video-info {
  display: block;
  padding: 14px 16px 16px;
}
.video-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-family: Cinzel, Georgia, serif;
  font-size: 13px;
  line-height: 1.4;
  color: var(--bright);
  margin-bottom: 6px;
}
.video-channel {
  display: block;
  font-size: 10px;
  color: var(--muted);
}

@media (hover: hover) and (pointer: fine) {
  .play-badge { opacity: 0; transition: opacity .2s; }
  .video-card:hover { border-color: #b7a27380; transform: translateY(-2px); }
  .video-card:hover .play-badge { opacity: 1; }
}

#lightbox {
  width: min(90vw, 960px);
  max-height: 94svh;
  padding: 0;
  border: 1px solid #d4b47d55;
  background: var(--bg);
  border-radius: 8px;
  overflow: auto;
}
#lightbox::backdrop { background: #000d; backdrop-filter: blur(8px); }
.lightbox-video-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
}
.lightbox-video-wrap iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.close-lightbox {
  position: absolute;
  right: 8px;
  top: 8px;
  border: 1px solid #fff5;
  background: #000c;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  font-size: 19px;
  z-index: 2;
}
.lightbox-footer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 20px;
}
.lightbox-footer h2 { font-size: 14px; margin: 0; font-weight: 500; color: var(--bright); }
.lightbox-footer span { font-size: 10px; color: var(--muted); }

.site-footer {
  padding: 20px 0;
  min-height: 54px;
  display: flex;
  align-items: center;
  font-size: 8px;
  color: #a39f98;
}

@media (max-width: 900px) {
  .video-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .video-grid { grid-template-columns: 1fr; }
  .intro h1 { font-size: 30px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; }
}
```

- [ ] **Step 5: Create the gallery page**

Create `index.html`:

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#080c10">
  <meta name="description" content="Guia de Iniciantes: vídeos para começar bem em Aika Online, organizados pela comunidade Ally Octans.">
  <title>Guia de Iniciantes — Ally Octans</title>
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <a class="skip" href="#video-grid">Ir para os vídeos</a>
  <div class="shell">
    <header class="site-header">
      <span class="brand"><img src="assets/octans-emblema.jpg" alt="" width="40" height="40"><span>GUIA DE INICIANTES<small>AIKA ONLINE · ALLY OCTANS</small></span></span>
    </header>
    <main class="content">
      <section class="intro">
        <p class="eyebrow"><span aria-hidden="true">✦</span> PARA QUEM ESTÁ COMEÇANDO</p>
        <h1>Guia de Iniciantes</h1>
        <p>Vídeos selecionados pela comunidade para quem está começando em Aika Online.</p>
      </section>
      <div class="search-bar">
        <label for="search-input">Buscar vídeo</label>
        <input type="search" id="search-input" placeholder="Buscar por título ou canal…" autocomplete="off">
        <span class="result-count" id="result-count" aria-live="polite"></span>
      </div>
      <ul class="video-grid" id="video-grid" aria-label="Vídeos do guia"></ul>
    </main>
    <footer class="site-footer">
      <span>Comunidade independente de Aika Online.</span>
    </footer>
  </div>

  <dialog id="lightbox">
    <button class="close-lightbox" type="button" aria-label="Fechar vídeo">×</button>
    <div class="lightbox-video-wrap" id="lightbox-video-wrap"></div>
    <div class="lightbox-footer">
      <h2 id="lightbox-title"></h2>
      <span id="lightbox-channel"></span>
    </div>
  </dialog>

  <script src="assets/lib.js"></script>
  <script src="assets/videos.js"></script>
  <script src="assets/app.js"></script>
</body>
</html>
```

- [ ] **Step 6: Create the render + search script**

Create `assets/app.js`:

```js
(function () {
  'use strict';

  const grid = document.getElementById('video-grid');
  const searchInput = document.getElementById('search-input');
  const resultCount = document.getElementById('result-count');

  const allVideos = window.Lib.sortVideosByDate(window.VIDEOS || []);

  function videoCardHtml(video) {
    const titulo = window.Lib.escapeHtml(video.titulo);
    const canal = window.Lib.escapeHtml(video.canal);
    const thumb = window.Lib.thumbnailUrl(video.id);
    return `
      <li class="video-card-item">
        <button class="video-card" type="button" data-id="${video.id}" data-titulo="${titulo}" data-canal="${canal}" aria-haspopup="dialog" aria-label="Assistir: ${titulo} — ${canal}">
          <span class="video-thumb">
            <img src="${thumb}" alt="" loading="lazy" width="320" height="180">
            <span class="play-badge" aria-hidden="true">►</span>
          </span>
          <span class="video-info">
            <span class="video-title">${titulo}</span>
            <span class="video-channel">${canal}</span>
          </span>
        </button>
      </li>`;
  }

  function renderGrid(videos) {
    if (allVideos.length === 0) {
      resultCount.textContent = '';
      grid.innerHTML = '<p class="empty-state">Nenhum vídeo cadastrado ainda. Volte em breve!</p>';
      return;
    }
    if (videos.length === 0) {
      resultCount.textContent = 'Nenhum vídeo encontrado.';
      grid.innerHTML = `<p class="empty-state">Nenhum vídeo encontrado para "${window.Lib.escapeHtml(searchInput.value)}".</p>`;
      return;
    }
    resultCount.textContent = videos.length === 1 ? '1 vídeo encontrado' : `${videos.length} vídeos encontrados`;
    grid.innerHTML = videos.map(videoCardHtml).join('');
  }

  searchInput.addEventListener('input', () => {
    renderGrid(window.Lib.filterVideos(allVideos, searchInput.value));
  });

  renderGrid(allVideos);
})();
```

- [ ] **Step 7: Verify syntax automatically**

```bash
node --check assets/lib.js
node --check assets/app.js
```

Expected: both commands exit with no output (no syntax errors).

- [ ] **Step 8: Verify the empty state manually**

Open `index.html` directly in a browser (double-click). Confirm:
- Dark background (`#080c10`), gold accents, heading "Guia de Iniciantes" in the Cinzel font.
- Pressing Tab once focuses the "Ir para os vídeos" skip link, visible at the top-left.
- The grid area shows "Nenhum vídeo cadastrado ainda. Volte em breve!" and no errors appear in the browser DevTools console.

- [ ] **Step 9: Verify rendering and search manually with temporary data**

Temporarily replace the content of `assets/videos.js` with:

```js
window.VIDEOS = [
  { id: "dQw4w9WgXcQ", titulo: "Como começar em Aika Online", canal: "Ally Octans", adicionado: "2026-01-01" },
  { id: "jNQXAC9IVRw", titulo: "Guia de Classes para Novatos", canal: "Outro Canal", adicionado: "2026-02-01" },
  { id: "9bZkp7q19f0", titulo: "Dungeão Final explicado", canal: "Ally Octans", adicionado: "2026-03-01" },
];
```

Reload `index.html` in the browser and confirm:
- 3 cards render in a 3-column grid, most recent first (Dungeão Final, then Guia de Classes, then Como começar), each with a loaded thumbnail image, a 2-line-max title, and the channel name below it.
- The result text reads "3 vídeos encontrados".
- Typing `dungeao` (no accent, lowercase) in the search box live-filters down to just the "Dungeão Final explicado" card, and the count updates to "1 vídeo encontrado".
- Clearing the search box restores all 3 cards.
- Typing `zzz` shows "Nenhum vídeo encontrado." and the empty-state message naming `zzz`.

- [ ] **Step 10: Revert the temporary data**

Restore `assets/videos.js` to:

```js
window.VIDEOS = [];
```

- [ ] **Step 11: Commit**

```bash
git add assets/style.css assets/favicon.svg assets/videos.js assets/octans-emblema.jpg index.html assets/app.js
git commit -m "feat: galeria publica com grade e busca de videos

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Lightbox — reproduzir o vídeo embutido

**Files:**
- Modify: `assets/app.js`

**Interfaces:**
- Consumes: `window.Lib.embedUrl`, `window.Lib.escapeHtml` (Task 2); DOM elements `#lightbox`, `#lightbox-video-wrap`, `#lightbox-title`, `#lightbox-channel`, `.close-lightbox` (Task 4, already present in `index.html`)

- [ ] **Step 1: Add the dialog wiring**

In `assets/app.js`, replace:

```js
  const allVideos = window.Lib.sortVideosByDate(window.VIDEOS || []);
```

with:

```js
  const allVideos = window.Lib.sortVideosByDate(window.VIDEOS || []);
  const dialog = document.getElementById('lightbox');
  const lightboxVideoWrap = document.getElementById('lightbox-video-wrap');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxChannel = document.getElementById('lightbox-channel');
  const closeButton = dialog.querySelector('.close-lightbox');
  let opener = null;

  function openLightbox(button) {
    opener = button;
    const id = button.dataset.id;
    const titulo = button.dataset.titulo;
    const canal = button.dataset.canal;
    lightboxTitle.textContent = titulo;
    lightboxChannel.textContent = canal;
    lightboxVideoWrap.innerHTML = `<iframe src="${window.Lib.embedUrl(id)}" title="${window.Lib.escapeHtml(titulo)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    dialog.showModal();
  }

  function closeLightbox() {
    dialog.close();
  }

  grid.addEventListener('click', event => {
    const button = event.target.closest('.video-card');
    if (button) openLightbox(button);
  });

  closeButton.addEventListener('click', closeLightbox);

  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right &&
                   event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) closeLightbox();
  });

  dialog.addEventListener('close', () => {
    lightboxVideoWrap.innerHTML = '';
    opener?.focus();
  });
```

- [ ] **Step 2: Verify syntax automatically**

```bash
node --check assets/app.js
```

Expected: no output (no syntax errors).

- [ ] **Step 3: Verify the lightbox manually**

Temporarily replace `assets/videos.js` with the same 3-video list from Task 4 Step 9. Open `index.html` and confirm:
- Clicking a card opens a dark dialog with an embedded YouTube player that starts loading, plus the video's title and channel shown below the player.
- Pressing Esc closes the dialog; opening DevTools → Elements shows `#lightbox-video-wrap` is now empty (the iframe was removed, so the video stops); the card that was clicked is visibly focused (gold outline) again.
- Clicking a different card, then clicking on the dark backdrop outside the dialog box, closes it.
- Clicking the `×` button closes it.

- [ ] **Step 4: Revert the temporary data**

Restore `assets/videos.js` to:

```js
window.VIDEOS = [];
```

- [ ] **Step 5: Commit**

```bash
git add assets/app.js
git commit -m "feat: abre o video no lightbox ao clicar no card

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: `admin.html` — colar links, buscar título, revisar

**Files:**
- Create: `admin.html`
- Create: `assets/admin.js`
- Modify: `assets/style.css`

**Interfaces:**
- Consumes: `window.Lib.extractYouTubeId`, `window.Lib.thumbnailUrl`, `window.Lib.escapeHtml` (Tasks 1–2)
- Produces: DOM elements `#links-input`, `#process-links`, `#preview-list`, `#existing-videos`, `#generate-output`, `#output`, `#copy-output`, `#copy-status` (markup only; `#existing-videos`/`#generate-output`/`#output`/`#copy-output` wired in Task 7); in-memory array `pending` of `{ id, titulo, canal, adicionado }` objects

- [ ] **Step 1: Add the admin-specific styles**

Append to the end of `assets/style.css`:

```css

.admin-step {
  margin-bottom: 36px;
  padding-bottom: 28px;
  border-bottom: 1px solid #d4b47d22;
}
.admin-step h2 {
  font-family: Cinzel, Georgia, serif;
  font-size: 15px;
  color: var(--bright);
  margin: 0 0 12px;
}
.admin-step p { font-size: 12px; line-height: 1.7; color: #b5b2ab; margin: 0 0 12px; }
.admin-step textarea {
  width: 100%;
  min-height: 90px;
  padding: 12px;
  border: 1px solid #d4b47d3b;
  border-radius: 8px;
  background: #0d1217;
  color: var(--text);
  font-family: ui-monospace, Consolas, monospace;
  font-size: 12px;
  resize: vertical;
}
.admin-step button {
  margin-top: 10px;
  padding: 10px 18px;
  border: 1px solid var(--gold);
  border-radius: 6px;
  background: #d4b47d14;
  color: var(--bright);
  font-size: 12px;
  letter-spacing: .03em;
}
.admin-step button:hover { background: #d4b47d28; }
.admin-step button:disabled { opacity: .5; cursor: default; }
#copy-status { margin-left: 10px; font-size: 11px; color: var(--gold); }

.preview-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.preview-item {
  display: grid;
  grid-template-columns: 160px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 10px;
  border: 1px solid #d4b47d30;
  border-radius: 8px;
  background: #0d1115;
}
.preview-item img { width: 100%; border-radius: 4px; display: block; }
.preview-fields { display: grid; gap: 8px; }
.preview-fields label { display: block; font-size: 10px; color: var(--muted); }
.preview-fields input {
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 8px 10px;
  border: 1px solid #d4b47d3b;
  border-radius: 6px;
  background: #0d1217;
  color: var(--text);
  font-size: 12px;
}
.preview-id { display: block; margin-top: 4px; font-size: 9px; color: #70706a; }
.remove-preview {
  border: 1px solid #d4647055;
  border-radius: 6px;
  background: #d4647014;
  color: #e3a2a2;
  padding: 8px 12px;
  font-size: 11px;
  align-self: start;
}
@media (max-width: 680px) {
  .preview-item { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Create the admin page**

Create `admin.html`:

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin — Guia de Iniciantes</title>
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <div class="shell">
    <header class="site-header">
      <span class="brand"><img src="assets/octans-emblema.jpg" alt="" width="40" height="40"><span>CADASTRO DE VÍDEOS<small>FERRAMENTA LOCAL</small></span></span>
    </header>
    <main class="content">
      <section class="intro">
        <h1>Adicionar vídeos</h1>
        <p>Cole links do YouTube, confira os títulos e gere o conteúdo para colar em <code>assets/videos.js</code>. Esta página não salva nada — só gera texto.</p>
      </section>

      <section class="admin-step">
        <h2>1. Cole os links (um por linha)</h2>
        <textarea id="links-input" rows="5" placeholder="https://www.youtube.com/watch?v=..."></textarea>
        <button type="button" id="process-links">Processar links</button>
      </section>

      <section class="admin-step">
        <h2>2. Confira e edite</h2>
        <ul id="preview-list" class="preview-list"></ul>
      </section>

      <section class="admin-step">
        <h2>3. Vídeos já existentes (opcional)</h2>
        <p>Cole aqui o conteúdo atual de <code>assets/videos.js</code> para mesclar com os novos. Deixe em branco se for a primeira vez.</p>
        <textarea id="existing-videos" rows="6" placeholder="window.VIDEOS = [...]"></textarea>
      </section>

      <section class="admin-step">
        <h2>4. Gerar e copiar</h2>
        <button type="button" id="generate-output">Gerar videos.js</button>
        <textarea id="output" rows="10" readonly></textarea>
        <button type="button" id="copy-output">Copiar</button>
        <span id="copy-status" role="status"></span>
      </section>
    </main>
  </div>

  <script src="assets/lib.js"></script>
  <script src="assets/admin.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create the admin script (paste → extract → fetch title → preview)**

Create `assets/admin.js`:

```js
(function () {
  'use strict';

  const linksInput = document.getElementById('links-input');
  const processButton = document.getElementById('process-links');
  const previewList = document.getElementById('preview-list');

  let pending = [];

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  async function fetchTitleAndChannel(id) {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}&format=json`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('oEmbed falhou');
      const data = await response.json();
      return { titulo: data.title || '', canal: data.author_name || '' };
    } catch {
      return { titulo: '', canal: '' };
    }
  }

  function renderPreview() {
    previewList.innerHTML = pending.map((video, index) => `
      <li class="preview-item" data-index="${index}">
        <img src="${window.Lib.thumbnailUrl(video.id)}" alt="" width="160" height="90">
        <div class="preview-fields">
          <label>Título<input type="text" class="field-titulo" value="${window.Lib.escapeHtml(video.titulo)}"></label>
          <label>Canal<input type="text" class="field-canal" value="${window.Lib.escapeHtml(video.canal)}"></label>
          <span class="preview-id">${video.id}</span>
        </div>
        <button type="button" class="remove-preview" aria-label="Remover">Remover</button>
      </li>`).join('');
  }

  processButton.addEventListener('click', async () => {
    const lines = linksInput.value.split('\n').map(line => line.trim()).filter(Boolean);
    processButton.disabled = true;
    processButton.textContent = 'Buscando títulos…';
    for (const line of lines) {
      const id = window.Lib.extractYouTubeId(line);
      if (!id) continue;
      if (pending.some(video => video.id === id)) continue;
      const info = await fetchTitleAndChannel(id);
      pending.push({ id, titulo: info.titulo, canal: info.canal, adicionado: todayIso() });
    }
    linksInput.value = '';
    processButton.disabled = false;
    processButton.textContent = 'Processar links';
    renderPreview();
  });

  previewList.addEventListener('click', event => {
    const button = event.target.closest('.remove-preview');
    if (!button) return;
    const item = button.closest('.preview-item');
    const index = Number(item.dataset.index);
    pending.splice(index, 1);
    renderPreview();
  });

  previewList.addEventListener('input', event => {
    const item = event.target.closest('.preview-item');
    if (!item) return;
    const index = Number(item.dataset.index);
    if (event.target.classList.contains('field-titulo')) pending[index].titulo = event.target.value;
    if (event.target.classList.contains('field-canal')) pending[index].canal = event.target.value;
  });
})();
```

- [ ] **Step 4: Verify syntax automatically**

```bash
node --check assets/admin.js
```

Expected: no output (no syntax errors).

- [ ] **Step 5: Verify the paste/fetch/preview flow manually**

Open `admin.html` in a browser. Paste these two real links (two different formats) into the textarea:

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://youtu.be/jNQXAC9IVRw
```

Click **Processar links** and confirm:
- The button briefly shows "Buscando títulos…" then returns to "Processar links".
- Two preview cards appear, each with a loaded thumbnail, a title input pre-filled with the real fetched title, a channel input pre-filled with the real channel name, the 11-character id shown below, and a "Remover" button.
- Editing a title input updates that field's value (visible as you type).
- Clicking "Remover" on one card removes only that card, leaving the other.
- Pasting `https://example.com/not-a-video` together with a valid link and clicking "Processar links" again produces a preview card only for the valid link — no error in the console, the invalid one is silently skipped.

- [ ] **Step 6: Commit**

```bash
git add assets/style.css admin.html assets/admin.js
git commit -m "feat: ferramenta admin para colar links e revisar titulos

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: `admin.js` — mesclar, gerar `videos.js` e copiar

**Files:**
- Modify: `assets/admin.js`

**Interfaces:**
- Consumes: `window.Lib.generateVideosJsSource`, `window.Lib.parseVideosJsSource` (Task 3); DOM elements `#existing-videos`, `#generate-output`, `#output`, `#copy-output`, `#copy-status` (Task 6, already present in `admin.html`); `pending` array (Task 6)

- [ ] **Step 1: Add the merge/generate/copy wiring**

In `assets/admin.js`, replace:

```js
  const linksInput = document.getElementById('links-input');
  const processButton = document.getElementById('process-links');
  const previewList = document.getElementById('preview-list');
```

with:

```js
  const linksInput = document.getElementById('links-input');
  const processButton = document.getElementById('process-links');
  const previewList = document.getElementById('preview-list');
  const existingInput = document.getElementById('existing-videos');
  const generateButton = document.getElementById('generate-output');
  const output = document.getElementById('output');
  const copyButton = document.getElementById('copy-output');
  const copyStatus = document.getElementById('copy-status');
```

Then, right before the final `})();`, add:

```js

  generateButton.addEventListener('click', () => {
    const existing = window.Lib.parseVideosJsSource(existingInput.value);
    const merged = existing.filter(video => !pending.some(p => p.id === video.id)).concat(pending);
    output.value = window.Lib.generateVideosJsSource(merged);
    copyStatus.textContent = '';
  });

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(output.value);
      copyStatus.textContent = 'Copiado!';
    } catch {
      output.select();
      copyStatus.textContent = 'Selecionado — use Ctrl+C para copiar.';
    }
  });
```

- [ ] **Step 2: Verify syntax automatically**

```bash
node --check assets/admin.js
```

Expected: no output (no syntax errors).

- [ ] **Step 3: Verify the merge/generate/copy flow manually**

With `admin.html` open and at least one preview card present (repeat the paste flow from Task 6 Step 5 if needed):

1. Leave "Vídeos já existentes" blank and click **Gerar videos.js**. Confirm the output textarea now contains a well-formed `window.VIDEOS = [ { id: ..., titulo: ..., canal: ..., adicionado: "<hoje>" }, ... ];` matching the preview card(s).
2. Click **Copiar**, then paste (Ctrl+V) into a plain text editor and confirm it matches the output textarea exactly. If the browser blocks clipboard access, confirm the status text instead reads "Selecionado — use Ctrl+C para copiar." and the textarea content is selected.
3. Paste this into "Vídeos já existentes":
   ```
   window.VIDEOS = [{ id: "abc12345678", titulo: "Antigo", canal: "Canal X", adicionado: "2025-01-01" }];
   ```
   Click **Gerar videos.js** again and confirm the output now contains BOTH the "Antigo" entry and the new preview entries.
4. Change the pasted "existentes" text so its `id` matches one of the current preview cards' ids, click **Gerar videos.js** again, and confirm the output contains only one entry for that id (the new/edited one), not a duplicate.

- [ ] **Step 4: Commit**

```bash
git add assets/admin.js
git commit -m "feat: mescla, gera e copia o conteudo final de videos.js

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: `README.md` e verificação final

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

Create `README.md`:

```markdown
# Guia de Iniciantes — Ally Octans

Galeria de vídeos do YouTube para quem está começando em Aika Online. Site estático, hospedado de graça no GitHub Pages — sem backend, sem banco de dados, sem login.

## Como funciona

A lista de vídeos vive em `assets/videos.js`. A página (`index.html`) lê esse arquivo no navegador e monta a grade com thumbnail, título e busca. Qualquer visitante pode ver e buscar os vídeos; só quem tem permissão de escrita neste repositório consegue adicionar um vídeo novo (é um commit, não uma senha no site).

## Publicar no GitHub Pages

1. Crie um repositório público no GitHub e envie estes arquivos para a branch `main`.
2. No repositório: **Settings → Pages → Build and deployment → Deploy from a branch** → selecione `main` e a pasta `/ (root)`.
3. Em cerca de 1 minuto o site fica disponível em `https://<seu-usuario>.github.io/<nome-do-repositorio>/`.
4. (Opcional) Para usar um domínio próprio, crie um arquivo `CNAME` na raiz com o domínio desejado e configure o DNS do domínio para apontar para o GitHub Pages.

## Como adicionar um vídeo

1. Abra `admin.html` no seu navegador (duplo clique no arquivo funciona, não precisa de servidor).
2. Cole um ou mais links do YouTube na primeira caixa (um por linha) e clique em **Processar links**.
3. Confira o título e o canal que foram buscados automaticamente para cada vídeo; edite se quiser um título mais claro, ou remova o que não quiser adicionar.
4. Abra o arquivo `assets/videos.js` deste repositório (pelo GitHub, direto no navegador) e cole o conteúdo dele na caixa **"3. Vídeos já existentes"** do `admin.html`.
5. Clique em **Gerar videos.js** e depois em **Copiar**.
6. Volte para `assets/videos.js` no GitHub, substitua todo o conteúdo pelo texto copiado, e comite ("Commit changes…").
7. Em cerca de 1 minuto o GitHub Pages republica o site com o vídeo novo.

`admin.html` não salva nada em lugar nenhum — ele só gera o texto que você cola manualmente. Por isso não tem (e não precisa de) senha.

## Testes

Abra `test.html` no navegador para rodar as verificações automáticas das funções em `assets/lib.js` (extração de id do YouTube, busca sem acento, ordenação, geração/leitura do `videos.js`). O resumo no topo da página mostra quantos testes passaram.

## Estrutura de arquivos

```
index.html       galeria pública
admin.html       ferramenta local para gerar o conteúdo de videos.js
assets/
  style.css      estilo (paleta e tipografia da Ally Octans)
  lib.js         funções puras: extrair id do YouTube, busca, ordenação, geração/leitura de videos.js
  app.js         monta a grade, busca e o player em destaque (lightbox) de index.html
  admin.js       lógica de admin.html
  videos.js      a lista de vídeos — o único arquivo que você edita para adicionar um vídeo
  octans-emblema.jpg
  favicon.svg
test.html        roda os testes de lib.js no navegador
```
```

- [ ] **Step 2: Run the full automated check**

```bash
node --check assets/lib.js && node --check assets/app.js && node --check assets/admin.js
node -e "globalThis.window = {}; eval(require('fs').readFileSync('assets/lib.js', 'utf8')); console.log(Object.keys(window.Lib).join(', '));"
```

Expected: no syntax errors, and the printed list is exactly `extractYouTubeId, normalizeForSearch, escapeHtml, sortVideosByDate, filterVideos, thumbnailUrl, embedUrl, generateVideosJsSource, parseVideosJsSource`.

- [ ] **Step 3: Final manual pass**

- Open `test.html`: confirm the summary reads `23 PASS / 0 FAIL`.
- Open `index.html`: confirm it shows the empty state ("Nenhum vídeo cadastrado ainda. Volte em breve!") — this confirms `assets/videos.js` was left empty as required.
- Confirm `cat assets/videos.js` (or open it) shows exactly `window.VIDEOS = [];`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: adiciona instrucoes de publicacao e de cadastro de video

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

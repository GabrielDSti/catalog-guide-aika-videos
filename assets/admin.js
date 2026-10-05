(function () {
  'use strict';

  const linksInput = document.getElementById('links-input');
  const processButton = document.getElementById('process-links');
  const previewList = document.getElementById('preview-list');
  const existingInput = document.getElementById('existing-videos');
  const generateButton = document.getElementById('generate-output');
  const output = document.getElementById('output');
  const copyButton = document.getElementById('copy-output');
  const copyStatus = document.getElementById('copy-status');

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
})();

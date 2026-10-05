(function () {
  'use strict';

  const grid = document.getElementById('video-grid');
  const searchInput = document.getElementById('search-input');
  const resultCount = document.getElementById('result-count');

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

  searchInput.addEventListener('input', () => {
    renderGrid(window.Lib.filterVideos(allVideos, searchInput.value));
  });

  renderGrid(allVideos);
})();

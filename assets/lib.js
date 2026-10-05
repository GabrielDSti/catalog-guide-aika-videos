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

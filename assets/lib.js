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
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  return {
    extractYouTubeId,
    normalizeForSearch,
  };
})();

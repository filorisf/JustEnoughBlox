(() => {
  const RL = (window.RL = window.RL || {});
  const cache = new Map();
  const TTL = 5 * 60 * 1000;

  async function forList(list, { force = false, limit = 10 } = {}) {
    const ids = [...new Set((list?.games || []).map(game => String(game.placeId)).filter(id => /^\d+$/.test(id)))];
    if (!ids.length) return [];

    const locale = RL.i18n?.robloxLocaleTag?.() || 'en-US';
    const key = `${locale}|${ids.slice().sort().join(',')}|${limit}`;
    const cached = cache.get(key);
    if (!force && cached && Date.now() - cached.at < TTL) return cached.data;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'JEB_GET_LIST_RECOMMENDATIONS',
        placeIds: ids,
        locale,
        limit
      });
      if (!response?.ok) throw new Error(response?.error || 'Recommendations unavailable.');
      const data = Array.isArray(response.data) ? response.data : [];
      cache.set(key, { at: Date.now(), data });
      return data;
    } catch (error) {
      console.warn('[JustEnoughBlox] Recommendations unavailable.', error);
      throw error;
    }
  }

  function clear() {
    cache.clear();
  }

  RL.recommendations = { forList, clear };
})();

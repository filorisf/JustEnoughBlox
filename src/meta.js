(() => {
  const RL = (window.RL = window.RL || {});
  const cache = new Map();
  const TTL = 30 * 1000;

  async function getGames(placeIds, { force = false } = {}) {
    const ids = [...new Set((placeIds || []).map(String).filter(id => /^\d+$/.test(id)))];
    const now = Date.now();
    const locale = RL.i18n?.robloxLocaleTag?.() || 'en-US';
    const result = {};
    const missing = [];

    for (const id of ids) {
      const cacheKey = `${locale}|${id}`;
      const cached = cache.get(cacheKey);
      if (!force && cached && now - cached.at < TTL) result[id] = cached.value;
      else missing.push(id);
    }

    if (missing.length) {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'JEB_GET_GAME_METADATA', placeIds: missing, locale });
        if (response?.ok && response.data) {
          for (const [id, value] of Object.entries(response.data)) {
            cache.set(`${locale}|${id}`, { value, at: now });
            result[id] = value;
          }
        }
      } catch (error) {
        console.warn('[JustEnoughBlox] Metadata unavailable.', error);
      }
    }

    return result;
  }

  async function getFriendsPlaying() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'JEB_GET_FRIENDS_PLAYING' });
      return response?.ok && response.data ? response.data : {};
    } catch (error) {
      console.warn('[JustEnoughBlox] Friend presence unavailable.', error);
      return {};
    }
  }

  RL.meta = { getGames, getFriendsPlaying };
})();

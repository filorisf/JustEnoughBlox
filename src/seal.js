(() => {
  const RL = (window.RL = window.RL || {});
  const U = RL.utils;
  const I = RL.i18n;
  let clientCache = { at: 0, payload: null };
  let syncing = false;
  const CLIENT_TTL = 60 * 1000;

  function asset(path) { return chrome.runtime.getURL(`assets/${path}`); }

  function escapeAttr(value) {
    return U.escapeHtml(String(value ?? '')).replaceAll('`', '&#96;');
  }

  function chartsPage() {
    return /^\/(?:[a-z]{2}(?:-[a-z0-9]{2,3})?\/)?charts(?:\/|$)/i.test(location.pathname);
  }

  async function getFeed(force = false) {
    if (!force && clientCache.payload && Date.now() - clientCache.at < CLIENT_TTL) return clientCache.payload;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'JEB_GET_SEAL_FEED', force });
      const payload = response?.ok ? response : { ok: false, configured: true, error: response?.error || 'Unavailable' };
      clientCache = { at: Date.now(), payload };
      return payload;
    } catch (error) {
      return { ok: false, configured: true, error: error?.message || 'Unavailable' };
    }
  }

  function findChartsHost() {
    const candidates = [
      document.querySelector('main'),
      document.querySelector('#container-main .content'),
      document.querySelector('#content'),
      document.querySelector('.content')
    ].filter(Boolean);
    return candidates.find(el => !el.closest('#rl-page-root') && el.getBoundingClientRect().width > 300) || null;
  }

  function qualityGame(entry, metadata) {
    const meta = metadata?.[String(entry.placeId)] || {};
    return {
      ...entry,
      name: meta.name || entry.title || `Game ${entry.placeId}`,
      creator: meta.creator || entry.creator || '',
      thumbnail: meta.thumbnail || meta.icon || '',
      playing: meta.playing,
      visits: meta.visits,
      universeId: String(meta.universeId || entry.universeId || '')
    };
  }

  function compactNumber(value) {
    if (!Number.isFinite(Number(value))) return '';
    return new Intl.NumberFormat(I.localeTag(), { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value));
  }

  function scoreLabel(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(1) : '—';
  }

  function card(game) {
    const bits = [
      game.creator || '',
      Number.isFinite(game.playing) ? `${compactNumber(game.playing)} ${I.t('playing')}` : ''
    ].filter(Boolean).join(' · ');
    return `
      <article class="jeb-quality-card" data-jeb-quality-place="${escapeAttr(game.placeId)}">
        <a class="jeb-quality-thumb" href="https://www.roblox.com/games/${escapeAttr(game.placeId)}">
          ${game.thumbnail ? `<img src="${escapeAttr(game.thumbnail)}" alt="">` : `<img class="jeb-quality-fallback-logo" src="${asset('brand/jeb-logo.png')}" alt="">`}
          <img class="jeb-quality-seal" src="${asset('brand/jeb-seal.png')}" alt="JEB Seal">
          <span class="jeb-quality-score">${scoreLabel(game.score)}/10</span>
        </a>
        <div class="jeb-quality-card-copy">
          <a href="https://www.roblox.com/games/${escapeAttr(game.placeId)}"><strong>${U.escapeHtml(game.name)}</strong></a>
          <span>${U.escapeHtml(bits)}</span>
          <button class="jeb-quality-details" type="button" data-jeb-quality-details="${escapeAttr(game.placeId)}">${U.escapeHtml(I.t('sealOfQuality'))}</button>
        </div>
      </article>`;
  }

  function setupMessage(section, payload) {
    const body = section.querySelector('[data-jeb-quality-body]');
    if (!body) return;
    body.innerHTML = `<div class="jeb-quality-empty"><strong>${U.escapeHtml(I.t('sealNoGames'))}</strong><span>${U.escapeHtml(payload?.error || I.t('sealNoGamesHelp'))}</span></div>`;
  }

  function criteriaRows(entry) {
    const labels = {
      gameplay: I.t('sealGameplay'),
      polish: I.t('sealPolish'),
      artDirection: I.t('sealArtDirection'),
      originality: I.t('sealOriginality'),
      playerRespect: I.t('sealPlayerRespect')
    };
    const scores = entry?.scores || {};
    return Object.entries(labels).filter(([key]) => Number.isFinite(Number(scores[key]))).map(([key, label]) => `
      <div class="jeb-seal-criterion"><span>${U.escapeHtml(label)}</span><strong>${scoreLabel(scores[key])}</strong></div>`).join('');
  }

  function showDetails(entry, game = {}) {
    document.getElementById('jeb-seal-detail-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'jeb-seal-detail-overlay';
    overlay.className = 'jeb-seal-overlay';
    const tags = Array.isArray(entry.tags) ? entry.tags : [];
    overlay.innerHTML = `
      <section class="jeb-seal-panel" role="dialog" aria-modal="true">
        <button class="jeb-seal-close" type="button" aria-label="${escapeAttr(I.t('close'))}">×</button>
        <img class="jeb-seal-modal-logo" src="${asset('brand/jeb-seal.png')}" alt="JEB Seal">
        <h2>${U.escapeHtml(game.name || entry.title || `Game ${entry.placeId}`)}</h2>
        <div class="jeb-seal-overall"><strong>${scoreLabel(entry.score)}</strong><span>/10</span></div>
        <div class="jeb-seal-label">${U.escapeHtml(I.t('sealOfQuality'))}</div>
        ${entry.awardedAt ? `<div class="jeb-seal-date">${U.escapeHtml(I.t('sealAwarded'))} ${U.escapeHtml(I.date(entry.awardedAt))}</div>` : ''}
        ${criteriaRows(entry) ? `<div class="jeb-seal-criteria">${criteriaRows(entry)}</div>` : ''}
        ${entry.review ? `<p class="jeb-seal-review">${U.escapeHtml(entry.review)}</p>` : ''}
        ${tags.length ? `<div class="jeb-seal-tags">${tags.map(tag => `<span>${U.escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        <a class="jeb-seal-open" href="https://www.roblox.com/games/${escapeAttr(entry.placeId)}">${U.escapeHtml(I.t('sealOpenGame'))}</a>
      </section>`;
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.closest('.jeb-seal-close')) overlay.remove();
    });
    document.documentElement.appendChild(overlay);
  }

  async function renderChartsRail(section, force = false) {
    section.dataset.loading = '1';
    const payload = await getFeed(force);
    if (!document.body.contains(section)) return;
    section.dataset.loading = '0';

    const games = payload?.data?.games || [];
    if (!payload?.ok || !games.length) {
      setupMessage(section, payload);
      return;
    }

    const ids = games.map(game => String(game.placeId)).filter(id => /^\d+$/.test(id));
    const metadata = ids.length ? await RL.meta.getGames(ids) : {};
    if (!document.body.contains(section)) return;
    const hydrated = games.map(game => qualityGame(game, metadata));
    section._jebGames = hydrated;

    const body = section.querySelector('[data-jeb-quality-body]');
    body.innerHTML = `<div class="jeb-quality-track">${hydrated.map(card).join('')}</div>`;
    body.querySelectorAll('[data-jeb-quality-details]').forEach(button => button.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const game = hydrated.find(item => String(item.placeId) === String(button.dataset.jebQualityDetails));
      if (game) showDetails(game, game);
    }));
  }

  async function injectChartsRail() {
    if (!chartsPage()) {
      document.getElementById('jeb-quality-rail')?.remove();
      return;
    }
    if (document.getElementById('jeb-quality-rail')) return;
    const host = findChartsHost();
    if (!host) return;

    const section = document.createElement('section');
    section.id = 'jeb-quality-rail';
    section.className = 'jeb-quality-section';
    section.innerHTML = `
      <div class="jeb-quality-head">
        <div><h2>${U.escapeHtml(I.t('sealOfQuality'))}</h2><p>${U.escapeHtml(I.t('sealChartsSubtitle'))}</p></div>
        <div class="jeb-quality-actions">
          <button type="button" data-jeb-quality-expand>${U.escapeHtml(I.t('sealViewAll'))}</button>
          <button type="button" data-jeb-quality-refresh title="${escapeAttr(I.t('sealRefresh'))}">↻</button>
        </div>
      </div>
      <div data-jeb-quality-body><div class="jeb-quality-empty">${U.escapeHtml(I.t('loading'))}</div></div>`;
    host.prepend(section);

    section.querySelector('[data-jeb-quality-expand]').addEventListener('click', buttonEvent => {
      const expanded = section.classList.toggle('is-expanded');
      buttonEvent.currentTarget.textContent = expanded ? I.t('sealCollapse') : I.t('sealViewAll');
    });
    section.querySelector('[data-jeb-quality-refresh]').addEventListener('click', () => renderChartsRail(section, true));
    renderChartsRail(section);
  }

  async function injectGameBadge(currentGame) {
    const existing = document.getElementById('jeb-seal-game-badge');
    if (!currentGame) {
      existing?.remove();
      return;
    }
    if (existing?.dataset.placeId === String(currentGame.placeId)) return;
    existing?.remove();

    const payload = await getFeed(false);
    if (!payload?.ok || !payload?.data?.games?.length) return;
    const metaMap = await RL.meta.getGames([String(currentGame.placeId)]);
    const meta = metaMap[String(currentGame.placeId)] || {};
    const universeId = String(meta.universeId || '');
    const entry = payload.data.games.find(game =>
      String(game.placeId) === String(currentGame.placeId) ||
      (universeId && String(game.universeId || '') === universeId)
    );
    if (!entry) return;

    const h1 = document.querySelector('h1');
    if (!h1) return;
    const badge = document.createElement('button');
    badge.id = 'jeb-seal-game-badge';
    badge.dataset.placeId = String(currentGame.placeId);
    badge.type = 'button';
    badge.className = 'jeb-seal-game-badge';
    badge.innerHTML = `<img src="${asset('brand/jeb-seal.png')}" alt=""><strong>${scoreLabel(entry.score)}/10</strong><em>${U.escapeHtml(I.t('sealOfQuality'))}</em>`;
    badge.addEventListener('click', () => showDetails(entry, qualityGame(entry, metaMap)));
    h1.insertAdjacentElement('afterend', badge);
  }

  async function sync(currentGame = null) {
    if (syncing) return;
    syncing = true;
    try {
      await injectChartsRail();
      await injectGameBadge(currentGame);
    } finally {
      syncing = false;
    }
  }

  RL.seal = { sync, getFeed, showDetails };
})();

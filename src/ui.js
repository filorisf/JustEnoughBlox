(() => {
  const RL = (window.RL = window.RL || {});
  const U = RL.utils;
  const I = RL.i18n;

  const ROUTE_HOME = '#rl-lists';
  let overlay = null;
  let toastTimer = null;
  let pageRoot = null;
  let importPreviewCache = null;
  let renderToken = 0;
  let lastRouteKey = null;

  function handleAsync(action) {
    return async (...args) => {
      try { return await action(...args); }
      catch (error) { toast(error.message, 'error'); }
    };
  }

  function escapeAttr(value) {
    return U.escapeHtml(String(value || '')).replace(/"/g, '&quot;');
  }

  function asset(path) { return chrome.runtime.getURL(`assets/${path}`); }
  function compactNumber(value) { return I.compact(value); }
  function formatDate(value) { return I.date(value); }
  function gameCount(count) { return `${I.number(count)} ${I.word('game', 'games', count)}`; }
  function listCount(count) { return `${I.number(count)} ${I.word('list', 'listsWord', count)}`; }
  function savedGameCount(count) { return `${I.number(count)} ${I.word('savedGame', 'savedGames', count)}`; }

  function toast(message, tone = 'default') {
    let el = document.getElementById('rl-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rl-toast';
      document.documentElement.appendChild(el);
    }
    el.textContent = message;
    el.dataset.tone = tone;
    el.classList.add('rl-toast-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('rl-toast-visible'), 2400);
  }

  function closeOverlay() {
    overlay?.remove();
    overlay = null;
    document.documentElement.classList.remove('rl-modal-open');
  }

  function shell(title, subtitle = '') {
    closeOverlay();
    overlay = document.createElement('div');
    overlay.className = 'rl-overlay';
    overlay.innerHTML = `
      <section class="rl-panel" role="dialog" aria-modal="true" aria-label="${U.escapeHtml(title)}">
        <header class="rl-panel-header">
          <div><h2>${U.escapeHtml(title)}</h2>${subtitle ? `<p>${U.escapeHtml(subtitle)}</p>` : ''}</div>
          <button class="rl-icon-button" data-rl-close aria-label="${U.escapeHtml(I.t('close'))}">×</button>
        </header>
        <div class="rl-panel-body"></div>
      </section>`;
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.closest('[data-rl-close]')) closeOverlay();
    });
    document.documentElement.appendChild(overlay);
    document.documentElement.classList.add('rl-modal-open');
    return overlay.querySelector('.rl-panel-body');
  }

  function detectUsername() {
    const profileAnchors = [...document.querySelectorAll('a[href*="/users/"][href$="/profile"], a[href^="/users/"]')];
    for (const anchor of profileAnchors) {
      const text = anchor.textContent?.trim().replace(/^@/, '');
      if (text && text.length <= 80 && !/^profile$/i.test(text)) return text;
    }
    for (const selector of ['.age-bracket-label-username', '[data-testid*=username]', '.avatar-name']) {
      const text = document.querySelector(selector)?.textContent?.trim().replace(/^@/, '');
      if (text) return text;
    }
    return I.t('robloxUser');
  }

  function parseRoute() {
    const hash = location.hash || '';
    if (!hash.startsWith(ROUTE_HOME)) return null;
    const parts = hash.slice(ROUTE_HOME.length).replace(/^\//, '').split('/').filter(Boolean).map(decodeURIComponent);
    if (!parts.length) return { view: 'home' };
    if (parts[0] === 'new') return { view: 'new' };
    if (parts[0] === 'import' && parts[1] === 'preview') return { view: 'import-preview' };
    if (parts[0] === 'import') return { view: 'import' };
    if (parts[0] === 'list' && parts[1]) return { view: 'list', listId: parts[1] };
    if (parts[0] === 'share' && parts[1]) return { view: 'share', listId: parts[1] };
    return { view: 'home' };
  }

  function isListsRoute() { return !!parseRoute(); }

  function go(hash) {
    if (location.hash === hash) return syncRoute(true);
    location.hash = hash;
  }

  function openListsHome() { go(ROUTE_HOME); }
  function openListPage(id) { go(`${ROUTE_HOME}/list/${encodeURIComponent(id)}`); }

  function setNavActive(active) {
    document.querySelectorAll('.rl-nav-button').forEach(el => el.classList.toggle('is-active', !!active));
  }

  function findSidebarRight(top) {
    const selectors = ['#navigation', '.rbx-left-col', '.left-col-list', '.left-col-list-wrapper', 'aside', 'nav', '[class*=sidebar]', '[class*=left-col]'];
    const candidates = [...new Set(selectors.flatMap(s => [...document.querySelectorAll(s)]))];
    let best = 0;
    for (const el of candidates) {
      if (el.id === 'rl-page-root' || el.closest('#rl-page-root')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 45 || r.width > 330 || r.height < Math.min(300, innerHeight * .4)) continue;
      if (r.left > 25 || r.right > innerWidth * .42) continue;
      if (r.bottom < top + 180) continue;
      best = Math.max(best, Math.round(r.right));
    }
    return best;
  }

  function applyTheme() {
    if (!pageRoot) return;
    const bg = getComputedStyle(document.body).backgroundColor || '';
    const nums = bg.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [];
    const lum = nums.length === 3 ? (nums[0] * .2126 + nums[1] * .7152 + nums[2] * .0722) : 30;
    pageRoot.dataset.theme = lum > 150 ? 'light' : 'dark';
  }

  function updatePageOffset() {
    if (!pageRoot) return;
    const header = document.querySelector('header, .rbx-header, #header');
    const rect = header?.getBoundingClientRect();
    const top = rect ? Math.max(0, Math.round(rect.bottom)) : 0;
    const left = findSidebarRight(top);
    pageRoot.style.top = `${top}px`;
    pageRoot.style.left = `${left}px`;
    applyTheme();
  }

  function ensurePageRoot() {
    if (pageRoot && document.body.contains(pageRoot)) return pageRoot;
    pageRoot = document.createElement('div');
    pageRoot.id = 'rl-page-root';
    pageRoot.innerHTML = '<main class="rl-page-shell"></main>';
    document.body.appendChild(pageRoot);
    updatePageOffset();
    return pageRoot;
  }

  function destroyPageRoot() {
    pageRoot?.remove();
    pageRoot = null;
  }

  function pageHeader(title, meta, actions = '') {
    return `
      <div class="rl-simple-header">
        <div>
          <h1>${U.escapeHtml(title)}</h1>
          ${meta ? `<div class="rl-page-meta">${meta}</div>` : ''}
        </div>
        <div class="rl-header-actions">${actions}</div>
      </div>`;
  }

  function placeholderThumb(label = '') {
    return `<div class="rl-thumb-placeholder"><span>▦</span><small>${U.escapeHtml(label || I.t('lists'))}</small></div>`;
  }

  function playlistCard(list, cover) {
    const count = list.games.length;
    const created = formatDate(list.createdAt);
    const updated = formatDate(list.updatedAt || list.createdAt);
    return `
      <button class="rl-playlist-card" data-list-id="${escapeAttr(list.id)}">
        <div class="rl-playlist-thumb">
          ${cover ? `<img src="${escapeAttr(cover)}" alt="">` : placeholderThumb(list.name)}
          <span class="rl-count-badge">${gameCount(count)}</span>
        </div>
        <div class="rl-playlist-card-info">
          <strong>${U.escapeHtml(list.name)}</strong>
          <span>${U.escapeHtml(I.t('viewFullList'))}</span>
          <small>${U.escapeHtml(I.t('created'))} ${U.escapeHtml(created)} · ${U.escapeHtml(I.t('updated'))} ${U.escapeHtml(updated)}</small>
        </div>
      </button>`;
  }

  async function renderHomePage(shellEl, token) {
    const [state, customCovers] = await Promise.all([RL.storage.load(), RL.storage.getAllListThumbnails()]);
    if (token !== renderToken) return;

    const firstIds = state.lists.map(l => l.games[0]?.placeId).filter(Boolean);
    const metadata = firstIds.length ? await RL.meta.getGames(firstIds) : {};
    if (token !== renderToken) return;

    const totalGames = state.lists.reduce((sum, list) => sum + list.games.length, 0);
    shellEl.innerHTML = `
      <div class="rl-feature-header">
        ${pageHeader(I.t('lists'), I.t('homeMeta', { lists: listCount(state.lists.length), games: savedGameCount(totalGames) }), `
          <button class="rl-secondary" data-import>${U.escapeHtml(I.t('import'))}</button>
          <button class="rl-primary" data-new-list>+ ${U.escapeHtml(I.t('newList'))}</button>
        `)}
        <img class="rl-feature-mascot rl-feature-mascot-lists" src="${asset('mascot/lists.png')}" alt="" aria-hidden="true">
      </div>
      <section class="rl-playlist-grid">
        ${state.lists.length ? state.lists.map(list => {
          const firstId = list.games[0]?.placeId;
          const cover = customCovers[list.id] || metadata[firstId]?.thumbnail || metadata[firstId]?.icon || '';
          return playlistCard(list, cover);
        }).join('') : `<div class="rl-empty-simple"><strong>${U.escapeHtml(I.t('noListsYet'))}</strong><span>${U.escapeHtml(I.t('noListsHelp'))}</span></div>`}
      </section>`;

    shellEl.querySelector('[data-new-list]')?.addEventListener('click', () => go(`${ROUTE_HOME}/new`));
    shellEl.querySelector('[data-import]')?.addEventListener('click', () => go(`${ROUTE_HOME}/import`));
    shellEl.querySelectorAll('[data-list-id]').forEach(btn => btn.addEventListener('click', () => openListPage(btn.dataset.listId)));
  }

  function renderNewListPage(shellEl, token) {
    if (token !== renderToken) return;
    shellEl.innerHTML = `
      ${pageHeader(I.t('newList'), `<button class="rl-text-link" data-home>${U.escapeHtml(I.t('lists'))}</button>`)}
      <form class="rl-compact-form" data-create-form>
        <label>${U.escapeHtml(I.t('listName'))}<input maxlength="80" autocomplete="off" placeholder="${escapeAttr(I.t('exampleTycoons'))}" autofocus></label>
        <div class="rl-form-actions"><button class="rl-secondary" type="button" data-home>${U.escapeHtml(I.t('cancel'))}</button><button class="rl-primary" type="submit">${U.escapeHtml(I.t('create'))}</button></div>
      </form>`;
    shellEl.querySelectorAll('[data-home]').forEach(el => el.addEventListener('click', openListsHome));
    const input = shellEl.querySelector('input');
    setTimeout(() => input?.focus(), 30);
    shellEl.querySelector('[data-create-form]')?.addEventListener('submit', handleAsync(async e => {
      e.preventDefault();
      try {
        const { result, synced } = await RL.storage.createList(input.value);
        toast(synced ? I.t('listCreated') : I.t('listCreatedLocal'), synced ? 'default' : 'warning');
        openListPage(result.id);
      } catch (error) { toast(error.message, 'error'); }
    }));
  }

  async function resizeCover(file) {
    if (!file?.type?.startsWith('image/')) throw new Error(I.t('chooseImage'));
    if (file.size > 12 * 1024 * 1024) throw new Error(I.t('imageTooLarge'));

    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(I.t('imageReadError')));
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      return canvas.toDataURL('image/jpeg', .82);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function renderFriendsPlaying(friends) {
    if (!Array.isArray(friends) || !friends.length) return '';
    const visible = friends.slice(0, 5);
    const extra = Math.max(0, friends.length - visible.length);
    return `
      <span class="rl-friends-playing" aria-label="Friends playing">
        ${visible.map(friend => {
          const label = friend.displayName && friend.name && friend.displayName !== friend.name
            ? `${friend.displayName} (@${friend.name})`
            : (friend.displayName || friend.name || 'Roblox friend');
          return friend.avatar
            ? `<img class="rl-friend-avatar" src="${escapeAttr(friend.avatar)}" alt="" title="${escapeAttr(label)}">`
            : `<span class="rl-friend-avatar rl-friend-avatar-fallback" title="${escapeAttr(label)}">${U.escapeHtml((friend.displayName || friend.name || '?').slice(0, 1).toUpperCase())}</span>`;
        }).join('')}
        ${extra ? `<span class="rl-friends-extra" title="${escapeAttr(`${friends.length} friends playing`)}">+${extra}</span>` : ''}
      </span>`;
  }

  function renderGameRow(game, meta, index, friends = []) {
    const title = meta?.name || game.title || `Game ${game.placeId}`;
    const players = meta?.playing !== null && meta?.playing !== undefined ? `${compactNumber(meta.playing)} ${I.t('playing')}` : I.t('playersUnavailable');
    const visits = meta?.visits !== null && meta?.visits !== undefined ? `${compactNumber(meta.visits)} ${I.t('visits')}` : '';
    const maxPlayers = meta?.maxPlayers ? `${compactNumber(meta.maxPlayers)} ${I.t('maxPerServer')}` : '';
    const creator = meta?.creator || '';
    const created = meta?.created ? `${I.t('gameCreated')} ${formatDate(meta.created)}` : '';
    const updated = meta?.updated ? `${I.t('gameUpdated')} ${formatDate(meta.updated)}` : '';
    const bits = [creator, players, visits, maxPlayers, created, updated].filter(Boolean);
    return `
      <div class="rl-game-list-row" data-place-id="${escapeAttr(game.placeId)}">
        <div class="rl-row-order">
          <span class="rl-drag-handle" draggable="true" data-drag-game="${escapeAttr(game.placeId)}" title="${escapeAttr(I.t('dragToReorder'))}" aria-label="${escapeAttr(I.t('dragToReorder'))}">⋮⋮</span>
          <span class="rl-row-index">${index + 1}</span>
        </div>
        <a class="rl-game-row-thumb" href="https://www.roblox.com/games/${escapeAttr(game.placeId)}">
          ${meta?.thumbnail ? `<img src="${escapeAttr(meta.thumbnail)}" alt="">` : placeholderThumb(I.t('game'))}
        </a>
        <a class="rl-game-row-copy" href="https://www.roblox.com/games/${escapeAttr(game.placeId)}">
          ${renderFriendsPlaying(friends)}
          <strong>${U.escapeHtml(title)}</strong>
          <span class="rl-game-meta-line">${bits.map(U.escapeHtml).join(' · ')}</span>
        </a>
        <button class="rl-row-menu" data-remove-game="${escapeAttr(game.placeId)}" title="${escapeAttr(I.t('removeFromList'))}">×</button>
      </div>`;
  }


  function recommendationReason(rec) {
    if (Array.isArray(rec?.reasonKeywords) && rec.reasonKeywords.length) {
      return I.t('recommendationSimilar', { terms: rec.reasonKeywords.join(', ') });
    }
    if (rec?.sameGenre) return I.t('recommendationSameGenre');
    if (rec?.sameCreator) return I.t('recommendationSameCreator');
    return I.t('recommendationSuggested');
  }

  function recommendationCard(rec, alreadyAdded = false) {
    const meta = [
      rec.creator || '',
      rec.playing !== null && rec.playing !== undefined ? `${compactNumber(rec.playing)} ${I.t('playing')}` : '',
      rec.visits !== null && rec.visits !== undefined ? `${compactNumber(rec.visits)} ${I.t('visits')}` : ''
    ].filter(Boolean).join(' · ');
    return `
      <article class="rl-recommend-card" data-recommend-place="${escapeAttr(rec.placeId)}">
        <a class="rl-recommend-thumb" href="https://www.roblox.com/games/${escapeAttr(rec.placeId)}">
          ${rec.thumbnail ? `<img src="${escapeAttr(rec.thumbnail)}" alt="">` : placeholderThumb(I.t('game'))}
        </a>
        <div class="rl-recommend-copy">
          <a href="https://www.roblox.com/games/${escapeAttr(rec.placeId)}"><strong>${U.escapeHtml(rec.name || `Game ${rec.placeId}`)}</strong></a>
          <span>${U.escapeHtml(meta)}</span>
          <small>${U.escapeHtml(recommendationReason(rec))}</small>
        </div>
        <button class="${alreadyAdded ? 'rl-secondary' : 'rl-primary'} rl-recommend-add" data-add-recommend="${escapeAttr(rec.placeId)}" ${alreadyAdded ? 'disabled' : ''}>${U.escapeHtml(alreadyAdded ? I.t('recommendationAdded') : I.t('recommendationAdd'))}</button>
      </article>`;
  }

  async function loadRecommendations(shellEl, list, { force = false } = {}) {
    const host = shellEl.querySelector('[data-recommendations-host]');
    const trigger = shellEl.querySelector('[data-load-recommendations]');
    if (!host) return;
    if (!list.games.length) {
      host.innerHTML = `<div class="rl-recommend-empty">${U.escapeHtml(I.t('recommendationsNeedGame'))}</div>`;
      if (trigger) trigger.disabled = true;
      return;
    }

    host.innerHTML = `<div class="rl-recommend-loading">${U.escapeHtml(I.t('recommendationsLoading'))}</div>`;
    if (trigger) trigger.disabled = true;
    try {
      const recommendations = await RL.recommendations.forList(list, { force, limit: 10 });
      const existing = new Set(list.games.map(game => String(game.placeId)));
      host.innerHTML = recommendations.length
        ? `<div class="rl-recommend-list">${recommendations.map(rec => recommendationCard(rec, existing.has(String(rec.placeId)))).join('')}</div>`
        : `<div class="rl-recommend-empty">${U.escapeHtml(I.t('recommendationsEmpty'))}</div>`;

      host.querySelectorAll('[data-add-recommend]').forEach(button => button.addEventListener('click', handleAsync(async () => {
        const placeId = button.dataset.addRecommend;
        const rec = recommendations.find(item => String(item.placeId) === String(placeId));
        if (!rec) return;
        try {
          await RL.storage.addGame(list.id, { placeId: rec.placeId, title: rec.name });
          RL.recommendations.clear();
          button.disabled = true;
          button.classList.remove('rl-primary');
          button.classList.add('rl-secondary');
          button.textContent = I.t('recommendationAdded');
          toast(I.t('addedToList'));
        } catch (error) {
          toast(error.message, 'error');
        }
      })));
    } catch (error) {
      host.innerHTML = `<div class="rl-recommend-empty">${U.escapeHtml(I.t('recommendationError'))}</div>`;
    } finally {
      if (trigger) trigger.disabled = false;
    }
  }

  async function renderListPage(shellEl, listId, token) {
    const [state, customCover] = await Promise.all([RL.storage.load(), RL.storage.getListThumbnail(listId)]);
    if (token !== renderToken) return;
    const list = state.lists.find(x => x.id === listId);
    if (!list) return openListsHome();

    const ids = list.games.map(g => g.placeId);
    const [metadata, friendsPlaying] = ids.length
      ? await Promise.all([RL.meta.getGames(ids), RL.meta.getFriendsPlaying()])
      : [{}, {}];
    if (token !== renderToken) return;
    const firstMeta = ids.length ? metadata[ids[0]] : null;
    const cover = customCover || firstMeta?.thumbnail || firstMeta?.icon || '';
    const totalPlaying = list.games.reduce((sum, g) => sum + (Number(metadata[g.placeId]?.playing) || 0), 0);
    const friendsInList = new Map();
    for (const game of list.games) {
      const universeId = String(metadata[game.placeId]?.universeId || '');
      for (const friend of (friendsPlaying[universeId] || [])) {
        const key = String(friend.userId || friend.id || friend.name || friend.displayName || Math.random());
        if (!friendsInList.has(key)) friendsInList.set(key, friend);
      }
    }
    const friendCount = friendsInList.size;

    shellEl.innerHTML = `
      <button class="rl-back-link" data-home>← ${U.escapeHtml(I.t('lists'))}</button>
      <div class="rl-playlist-layout">
        <aside class="rl-playlist-summary">
          <div class="rl-summary-cover">
            ${cover ? `<img src="${escapeAttr(cover)}" alt="">` : placeholderThumb(list.name)}
            <label class="rl-cover-edit">${U.escapeHtml(I.t('changeThumbnail'))}<input type="file" accept="image/png,image/jpeg,image/webp" data-cover-file></label>
          </div>
          <h1>${U.escapeHtml(list.name)}</h1>
          <div class="rl-summary-meta">${gameCount(list.games.length)}${totalPlaying ? ` · ${compactNumber(totalPlaying)} ${U.escapeHtml(I.t('playingNow'))}` : ''}</div>
          <div class="rl-summary-dates">${U.escapeHtml(I.t('created'))} ${U.escapeHtml(formatDate(list.createdAt))} · ${U.escapeHtml(I.t('updated'))} ${U.escapeHtml(formatDate(list.updatedAt || list.createdAt))}</div>
          <div class="rl-summary-actions">
            <button class="rl-primary rl-wide" data-share>${U.escapeHtml(I.t('share'))}</button>
            <button class="rl-secondary" data-rename>${U.escapeHtml(I.t('rename'))}</button>
            ${customCover ? `<button class="rl-secondary" data-reset-cover>${U.escapeHtml(I.t('resetThumbnail'))}</button>` : ''}
            <button class="rl-danger" data-delete>${U.escapeHtml(I.t('delete'))}</button>
          </div>
        </aside>

        <section class="rl-playlist-games">
          <div class="rl-list-title-row">
            <div class="rl-list-title-main"><h2>${U.escapeHtml(I.t('gamesTitle'))}</h2><span>${I.number(list.games.length)}</span></div>
            ${list.games.length > 1 ? `<div class="rl-mini-feature rl-reorder-feature"><img src="${asset('mascot/reorder.png')}" alt="" aria-hidden="true"><span>${U.escapeHtml(I.t('dragToReorder'))}</span></div>` : ''}
          </div>
          ${friendCount ? `<div class="rl-friends-summary"><img src="${asset('mascot/friends.png')}" alt="" aria-hidden="true"><span>${U.escapeHtml(I.t(friendCount === 1 ? 'friendPlayingInList' : 'friendsPlayingInList', { count: I.number(friendCount) }))}</span></div>` : ''}
          <div class="rl-game-list">
            ${list.games.length ? list.games.map((game, i) => {
              const universeId = String(metadata[game.placeId]?.universeId || '');
              return renderGameRow(game, metadata[game.placeId], i, friendsPlaying[universeId] || []);
            }).join('') : `<div class="rl-empty-simple"><strong>${U.escapeHtml(I.t('emptyList'))}</strong><span>${U.escapeHtml(I.t('emptyListHelp'))}</span></div>`}
          </div>

          <section class="rl-recommend-section">
            <div class="rl-recommend-heading">
              <div class="rl-recommend-heading-copy">
                <img class="rl-section-mascot" src="${asset('mascot/recommendations.png')}" alt="" aria-hidden="true">
                <div>
                  <h2>${U.escapeHtml(I.t('recommendations'))}</h2>
                  <p>${U.escapeHtml(I.t('recommendationsHelp'))}</p>
                </div>
              </div>
              <button class="rl-secondary" data-load-recommendations ${list.games.length ? '' : 'disabled'}>${U.escapeHtml(I.t('findRecommendations'))}</button>
            </div>
            <div data-recommendations-host>
              <div class="rl-recommend-empty">${U.escapeHtml(list.games.length ? I.t('recommendationsHelp') : I.t('recommendationsNeedGame'))}</div>
            </div>
          </section>
        </section>
      </div>`;

    shellEl.querySelector('[data-home]')?.addEventListener('click', openListsHome);
    shellEl.querySelector('[data-share]')?.addEventListener('click', () => go(`${ROUTE_HOME}/share/${encodeURIComponent(list.id)}`));
    shellEl.querySelector('[data-rename]')?.addEventListener('click', handleAsync(async () => {
      const name = prompt(I.t('renameList'), list.name);
      if (name === null) return;
      try { await RL.storage.renameList(list.id, name); toast(I.t('listRenamed')); renderPage(); } catch (e) { toast(e.message, 'error'); }
    }));
    shellEl.querySelector('[data-delete]')?.addEventListener('click', handleAsync(async () => {
      if (!confirm(I.t('deleteConfirm', { name: list.name }))) return;
      await RL.storage.deleteList(list.id);
      toast(I.t('listDeleted'));
      openListsHome();
    }));
    shellEl.querySelector('[data-reset-cover]')?.addEventListener('click', handleAsync(async () => {
      await RL.storage.removeListThumbnail(list.id);
      await RL.storage.touchList(list.id);
      toast(I.t('thumbnailReset'));
      renderPage();
    }));
    shellEl.querySelector('[data-cover-file]')?.addEventListener('change', handleAsync(async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        toast(I.t('savingThumbnail'));
        const dataUrl = await resizeCover(file);
        await RL.storage.setListThumbnail(list.id, dataUrl);
        await RL.storage.touchList(list.id);
        toast(I.t('thumbnailUpdated'));
        renderPage();
      } catch (error) { toast(error.message, 'error'); }
    }));
    shellEl.querySelector('[data-load-recommendations]')?.addEventListener('click', () => loadRecommendations(shellEl, list, { force: true }));

    shellEl.querySelectorAll('[data-remove-game]').forEach(btn => btn.addEventListener('click', handleAsync(async () => {
      await RL.storage.removeGame(list.id, btn.dataset.removeGame);
      toast(I.t('removeFromList'));
      renderPage();
    })));


    // YouTube-style drag & drop ordering. Only the small handle starts a drag,
    // so normal clicks on the thumbnail/title keep behaving like links.
    const gameListEl = shellEl.querySelector('.rl-game-list');
    if (gameListEl && list.games.length > 1) {
      let draggedPlaceId = '';

      const clearDropState = () => {
        gameListEl.querySelectorAll('.rl-game-list-row').forEach(row => {
          row.classList.remove('is-dragging', 'drop-before', 'drop-after');
        });
      };

      gameListEl.querySelectorAll('[data-drag-game]').forEach(handle => {
        handle.addEventListener('dragstart', e => {
          draggedPlaceId = handle.dataset.dragGame || '';
          const row = handle.closest('.rl-game-list-row');
          row?.classList.add('is-dragging');
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedPlaceId);
          }
        });
        handle.addEventListener('dragend', () => {
          draggedPlaceId = '';
          clearDropState();
        });
      });

      gameListEl.querySelectorAll('.rl-game-list-row').forEach(targetRow => {
        targetRow.addEventListener('dragover', e => {
          if (!draggedPlaceId || targetRow.dataset.placeId === draggedPlaceId) return;
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          gameListEl.querySelectorAll('.rl-game-list-row').forEach(row => row.classList.remove('drop-before', 'drop-after'));
          const rect = targetRow.getBoundingClientRect();
          const after = e.clientY > rect.top + rect.height / 2;
          targetRow.classList.add(after ? 'drop-after' : 'drop-before');
        });

        targetRow.addEventListener('drop', handleAsync(async e => {
          if (!draggedPlaceId || targetRow.dataset.placeId === draggedPlaceId) return;
          e.preventDefault();
          const rows = [...gameListEl.querySelectorAll('.rl-game-list-row')];
          const sourceRow = rows.find(row => row.dataset.placeId === draggedPlaceId);
          if (!sourceRow) return;

          const sourceIndex = rows.indexOf(sourceRow);
          const targetIndex = rows.indexOf(targetRow);
          const rect = targetRow.getBoundingClientRect();
          const placeAfter = e.clientY > rect.top + rect.height / 2;
          let newIndex = targetIndex + (placeAfter ? 1 : 0);
          if (sourceIndex < newIndex) newIndex -= 1;

          clearDropState();
          const movingId = draggedPlaceId;
          draggedPlaceId = '';
          if (newIndex === sourceIndex) return;

          try {
            await RL.storage.moveGame(list.id, movingId, newIndex);
            toast(I.t('orderUpdated'));
            renderPage();
          } catch (error) {
            toast(error.message, 'error');
          }
        }));
      });
    }
  }

  async function renderSharePage(shellEl, listId, token) {
    const state = await RL.storage.load();
    if (token !== renderToken) return;
    const list = state.lists.find(x => x.id === listId);
    if (!list) return openListsHome();
    const creator = detectUsername();
    shellEl.innerHTML = `${pageHeader(I.t('shareList'), `<button class="rl-text-link" data-back>${U.escapeHtml(list.name)}</button>`)}<div class="rl-compact-form"><div class="rl-loading">${U.escapeHtml(I.t('generatingShareCode'))}</div></div>`;
    shellEl.querySelector('[data-back]')?.addEventListener('click', () => openListPage(list.id));
    try {
      const code = await RL.share.encodeList(list, creator);
      if (token !== renderToken) return;
      shellEl.innerHTML = `
        ${pageHeader(I.t('shareList'), `<button class="rl-text-link" data-back>${U.escapeHtml(list.name)}</button>`)}
        <div class="rl-compact-form rl-share-form">
          <p>${U.escapeHtml(I.t('shareCodeHelp'))}</p>
          <textarea class="rl-code" readonly>${U.escapeHtml(code)}</textarea>
          <small>${I.number(code.length)} ${U.escapeHtml(I.t('characters'))} · RL1 · ${U.escapeHtml(I.t('checksumProtected'))}</small>
          <div class="rl-form-actions"><button class="rl-secondary" data-back>${U.escapeHtml(I.t('back'))}</button><button class="rl-primary" data-copy>${U.escapeHtml(I.t('copyCode'))}</button></div>
        </div>`;
      shellEl.querySelectorAll('[data-back]').forEach(el => el.addEventListener('click', () => openListPage(list.id)));
      shellEl.querySelector('[data-copy]')?.addEventListener('click', handleAsync(async () => {
        try { await navigator.clipboard.writeText(code); } catch {
          const area = shellEl.querySelector('textarea'); area?.select(); document.execCommand('copy');
        }
        toast(I.t('shareCodeCopied'));
      }));
    } catch (e) { toast(e.message, 'error'); }
  }

  function renderImportPage(shellEl, token) {
    if (token !== renderToken) return;
    shellEl.innerHTML = `
      ${pageHeader(I.t('importList'), `<button class="rl-text-link" data-home>${U.escapeHtml(I.t('lists'))}</button>`)}
      <form class="rl-compact-form" data-import-form>
        <label>${U.escapeHtml(I.t('shareCode'))}<textarea class="rl-code" placeholder="RL1:..." autofocus></textarea></label>
        <div class="rl-form-actions"><button class="rl-secondary" type="button" data-home>${U.escapeHtml(I.t('cancel'))}</button><button class="rl-primary" type="submit">${U.escapeHtml(I.t('preview'))}</button></div>
      </form>`;
    shellEl.querySelectorAll('[data-home]').forEach(el => el.addEventListener('click', openListsHome));
    const area = shellEl.querySelector('textarea'); setTimeout(() => area?.focus(), 30);
    shellEl.querySelector('[data-import-form]')?.addEventListener('submit', handleAsync(async e => {
      e.preventDefault();
      try { importPreviewCache = await RL.share.decodeList(area.value); go(`${ROUTE_HOME}/import/preview`); } catch (error) { toast(error.message, 'error'); }
    }));
  }

  function renderImportPreviewPage(shellEl, token) {
    if (token !== renderToken) return;
    const imported = importPreviewCache;
    if (!imported) return go(`${ROUTE_HOME}/import`);
    shellEl.innerHTML = `
      ${pageHeader(imported.name, `${gameCount(imported.games.length)} · ${U.escapeHtml(I.t('sharedBy'))} ${U.escapeHtml(imported.creator)}`, `<button class="rl-primary" data-import>${U.escapeHtml(I.t('importListButton'))}</button>`)}
      <div class="rl-preview-list">${imported.games.slice(0, 30).map((g, i) => `<div><span>${i + 1}</span><strong>${U.escapeHtml(g.title || `Game ${g.placeId}`)}</strong><small>${U.escapeHtml(g.placeId)}</small></div>`).join('')}</div>`;
    shellEl.querySelector('[data-import]')?.addEventListener('click', handleAsync(async () => {
      try {
        const { result, synced } = await RL.storage.importList(imported);
        importPreviewCache = null;
        toast(synced ? I.t('listImported') : I.t('importedLocal'), synced ? 'default' : 'warning');
        openListPage(result.id);
      } catch (e) { toast(e.message, 'error'); }
    }));
  }

  async function renderPage() {
    try { await renderPageContent(); }
    catch (error) {
      const shellEl = pageRoot?.querySelector('.rl-page-shell');
      if (shellEl) shellEl.textContent = error.message;
      toast(error.message, 'error');
    }
  }

  async function renderPageContent() {

    const route = parseRoute();
    setNavActive(!!route);
    if (!route) return destroyPageRoot();

    closeOverlay();
    const root = ensurePageRoot();
    updatePageOffset();
    const shellEl = root.querySelector('.rl-page-shell');
    const token = ++renderToken;
    shellEl.innerHTML = `<div class="rl-page-loading">${U.escapeHtml(I.t('loading'))}</div>`;

    if (route.view === 'home') return renderHomePage(shellEl, token);
    if (route.view === 'new') return renderNewListPage(shellEl, token);
    if (route.view === 'list') return renderListPage(shellEl, route.listId, token);
    if (route.view === 'share') return renderSharePage(shellEl, route.listId, token);
    if (route.view === 'import') return renderImportPage(shellEl, token);
    if (route.view === 'import-preview') return renderImportPreviewPage(shellEl, token);
    return renderHomePage(shellEl, token);
  }

  function syncRoute(force = false) {
    const routeKey = isListsRoute() ? location.hash : '';
    const hasPage = !!pageRoot;
    if (!force && routeKey === lastRouteKey && ((routeKey && hasPage) || (!routeKey && !hasPage))) {
      setNavActive(!!routeKey);
      updatePageOffset();
      return;
    }
    lastRouteKey = routeKey;
    renderPage();
  }

  async function showAddToList(game) {
    const state = await RL.storage.load();
    const body = shell(I.t('addToList'), game.title);
    body.innerHTML = `
      <div class="rl-add-list-options">
        ${state.lists.length ? state.lists.map(list => {
          const contains = list.games.some(g => String(g.placeId) === String(game.placeId));
          return `<button class="rl-add-list-option ${contains ? 'is-added' : ''}" data-add-list="${escapeAttr(list.id)}" ${contains ? 'disabled' : ''}>
            <span>${U.escapeHtml(list.name)}</span><small>${contains ? U.escapeHtml(I.t('alreadyAdded')) : U.escapeHtml(gameCount(list.games.length))}</small>
          </button>`;
        }).join('') : `<div class="rl-empty-simple"><strong>${U.escapeHtml(I.t('noListsYet'))}</strong><span>${U.escapeHtml(I.t('noListsHelp'))}</span></div>`}
      </div>
      <button class="rl-secondary rl-full" data-create-and-add>${U.escapeHtml(I.t('createNewList'))}</button>`;

    body.querySelectorAll('[data-add-list]').forEach(btn => btn.addEventListener('click', handleAsync(async () => {
      const { synced } = await RL.storage.addGame(btn.dataset.addList, game);
      toast(synced ? I.t('addedToList') : I.t('addedLocal'), synced ? 'default' : 'warning');
      closeOverlay();
    })));
    body.querySelector('[data-create-and-add]')?.addEventListener('click', handleAsync(async () => {
      const name = prompt(I.t('newListName'), I.t('playLater'));
      if (!name) return;
      try {
        const created = await RL.storage.createList(name);
        await RL.storage.addGame(created.result.id, game);
        toast(I.t('listCreatedGameAdded'));
        closeOverlay();
      } catch (error) { toast(error.message, 'error'); }
    }));
  }

  window.addEventListener('hashchange', () => syncRoute(true));
  window.addEventListener('resize', updatePageOffset);
  RL.ui = { toast, showAddToList: handleAsync(showAddToList), closeOverlay, detectUsername, renderListsHome: openListsHome, openListsHome, openListPage, isListsRoute, syncRoute };
})();

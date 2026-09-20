(() => {
  const RL = (window.RL = window.RL || {});
  let lastUrl = location.href;
  const asset = path => chrome.runtime.getURL(`assets/${path}`);

  function currentGame() {
    const match = location.pathname.match(/^\/(?:[a-z]{2}(?:-[a-z0-9]{2,3})?\/)?games\/(\d+)(?:\/|$)/i);
    if (!match) return null;
    const placeId = match[1];
    const h1 = document.querySelector('h1');
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    const title = RL.utils.normalizeTitle(h1?.textContent || ogTitle || document.title);
    return { placeId, title };
  }

  function createNavButton() {
    const wrap = document.createElement('li');
    wrap.id = 'rl-nav-entry';
    wrap.className = 'rl-nav-entry';
    wrap.innerHTML = `<button type="button" class="rl-nav-button"><img class="rl-nav-brand-icon" src="${asset('brand/jeb-logo.png')}" alt=""><span class="rl-nav-label">${RL.utils.escapeHtml(RL.i18n.t('lists'))}</span></button>`;
    wrap.querySelector('button').addEventListener('click', e => {
      e.preventDefault();
      RL.ui.openListsHome();
    });
    return wrap;
  }

  function injectNavButton() {
    if (document.getElementById('rl-nav-entry')) return;

    const anchors = [...document.querySelectorAll('header a[href], nav a[href], .rbx-navbar a[href], #navigation a[href]')];
    const preferred = anchors.find(a => /\/(?:[a-z]{2}(?:-[a-z0-9]{2,3})?\/)?(?:charts|discover|marketplace|catalog)(?:\/|$|\?)/i.test(a.getAttribute('href') || ''));
    let listContainer = preferred?.closest('ul');

    if (!listContainer) {
      listContainer = [...document.querySelectorAll('header ul, nav ul, .rbx-navbar ul')]
        .find(ul => ul.querySelectorAll('a[href]').length >= 2);
    }

    if (listContainer) {
      const item = createNavButton();
      const sampleLi = listContainer.querySelector(':scope > li');
      if (sampleLi) item.className += ` ${sampleLi.className || ''}`;
      listContainer.appendChild(item);
      return;
    }

    const header = document.querySelector('header, .rbx-header, #header');
    if (header) {
      const item = createNavButton();
      item.classList.add('rl-nav-fallback');
      header.appendChild(item);
    }
  }

  function injectGameButton() {
    const game = currentGame();
    if (!game || document.getElementById('rl-add-game-button')) return;

    const button = document.createElement('button');
    button.id = 'rl-add-game-button';
    button.type = 'button';
    button.className = 'rl-game-page-button';
    button.textContent = `+ ${RL.i18n.t('addToList')}`;
    button.addEventListener('click', () => RL.ui.showAddToList(currentGame() || game));

    const labeledButtons = [...document.querySelectorAll('button, a')];
    const favorite = labeledButtons.find(el => /^(favorite|favori|favoris)$/i.test(el.textContent?.trim() || ''));
    const actionRow = favorite?.parentElement;
    if (actionRow) {
      actionRow.appendChild(button);
      return;
    }

    const selectors = [
      '.game-buttons-container',
      '.game-buttons',
      '.favorite-follow-vote-share',
      '[class*=game-details] [class*=button]',
      '[data-testid*=game] [data-testid*=button]'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        el.appendChild(button);
        return;
      }
    }

    const h1 = document.querySelector('h1');
    if (h1?.parentElement) {
      const holder = document.createElement('div');
      holder.className = 'rl-game-button-fallback-holder';
      holder.appendChild(button);
      h1.parentElement.appendChild(holder);
    }
  }

  function refresh() {
    injectNavButton();
    injectGameButton();

    // Only write to the DOM when the translated label actually changed.
    // Reassigning textContent on every MutationObserver callback creates a new
    // childList mutation and can otherwise cause an infinite feedback loop.
    const navButton = document.querySelector('.rl-nav-button');
    const navLabel = RL.i18n.t('lists');
    const navText = navButton?.querySelector('.rl-nav-label');
    if (navText && navText.textContent !== navLabel) navText.textContent = navLabel;

    const addButton = document.getElementById('rl-add-game-button');
    const addLabel = `+ ${RL.i18n.t('addToList')}`;
    if (addButton && addButton.textContent !== addLabel) addButton.textContent = addLabel;

    RL.ui.syncRoute?.();
    RL.seal?.sync?.(currentGame());
  }

  let refreshScheduled = false;
  function scheduleRefresh() {
    if (refreshScheduled) return;
    refreshScheduled = true;
    requestAnimationFrame(() => {
      refreshScheduled = false;
      refresh();
    });
  }

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      document.getElementById('rl-add-game-button')?.remove();
    }
    scheduleRefresh();
  });

  observer.observe(document.documentElement, { subtree: true, childList: true });
  refresh();
  setInterval(scheduleRefresh, 1800);
})();

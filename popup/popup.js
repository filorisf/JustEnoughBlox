(() => {
  const version = chrome.runtime.getManifest().version;
  const versionEl = document.getElementById('version');
  const urlInput = document.getElementById('seal-url');
  const status = document.getElementById('seal-status');
  const save = document.getElementById('save-seal');
  const refresh = document.getElementById('refresh-seal');
  if (versionEl) versionEl.textContent = `v${version}`;

  function setStatus(text, tone = '') {
    status.textContent = text;
    status.dataset.tone = tone;
  }

  function describe(result) {
    if (!result?.configured) return 'Not configured. Add a raw GitHub JSON URL.';
    if (!result?.ok) return result?.error || 'Feed unavailable.';
    const count = result?.data?.games?.length || 0;
    const updated = result?.data?.updatedAt ? ` · feed ${result.data.updatedAt}` : '';
    const stale = result?.stale ? ' · cached copy' : '';
    return `${count} certified game${count === 1 ? '' : 's'}${updated}${stale}`;
  }

  async function load() {
    const urlResult = await chrome.runtime.sendMessage({ type: 'JEB_GET_SEAL_FEED_URL' });
    if (urlResult?.ok) urlInput.value = urlResult.url || '';
    const feed = await chrome.runtime.sendMessage({ type: 'JEB_GET_SEAL_FEED', force: false });
    setStatus(describe(feed), feed?.ok || !feed?.configured ? '' : 'error');
  }

  save.addEventListener('click', async () => {
    save.disabled = true;
    setStatus('Saving…');
    try {
      const result = await chrome.runtime.sendMessage({ type: 'JEB_SET_SEAL_FEED_URL', url: urlInput.value.trim() });
      setStatus(describe(result), result?.ok ? '' : 'error');
    } finally {
      save.disabled = false;
    }
  });

  refresh.addEventListener('click', async () => {
    refresh.disabled = true;
    setStatus('Refreshing…');
    try {
      const result = await chrome.runtime.sendMessage({ type: 'JEB_GET_SEAL_FEED', force: true });
      setStatus(describe(result), result?.ok ? '' : 'error');
    } finally {
      refresh.disabled = false;
    }
  });

  load().catch(error => setStatus(error?.message || 'Unable to load settings.', 'error'));
})();

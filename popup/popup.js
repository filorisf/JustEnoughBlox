(() => {
  const version = chrome.runtime.getManifest().version;
  const versionEl = document.getElementById('version');
  const status = document.getElementById('seal-status');
  const refresh = document.getElementById('refresh-seal');
  if (versionEl) versionEl.textContent = `v${version}`;

  function setStatus(text, tone = '') {
    status.textContent = text;
    status.dataset.tone = tone;
  }

  function describe(result) {
    if (!result?.ok) return result?.error || 'Official Seal feed unavailable.';
    const count = result?.data?.games?.length || 0;
    const updated = result?.data?.updatedAt ? ` · feed ${result.data.updatedAt}` : '';
    const stale = result?.stale ? ' · cached copy' : '';
    return `${count} certified game${count === 1 ? '' : 's'}${updated}${stale}`;
  }

  async function load(force = false) {
    const feed = await chrome.runtime.sendMessage({ type: 'JEB_GET_SEAL_FEED', force });
    setStatus(describe(feed), feed?.ok ? '' : 'error');
  }

  refresh?.addEventListener('click', async () => {
    refresh.disabled = true;
    setStatus('Refreshing…');
    try {
      await load(true);
    } finally {
      refresh.disabled = false;
    }
  });

  load().catch(error => setStatus(error?.message || 'Unable to load the official Seal feed.', 'error'));
})();

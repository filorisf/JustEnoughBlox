const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');

const backgroundSource = readFileSync(new URL('../src/background.js', `file://${__filename.replaceAll('\\', '/')}`), 'utf8');
const sealSource = readFileSync(new URL('../src/seal.js', `file://${__filename.replaceAll('\\', '/')}`), 'utf8');

function extension() {
  let listener;
  let requests = 0;
  let feed = { games: [{ placeId: '123', score: 8 }] };
  let offline = false;
  const saved = {};
  const storageListeners = [];
  const removed = [];
  const chrome = {
    storage: { onChanged: { addListener(fn) { storageListeners.push(fn); } }, local: {
      get: async key => ({ [key]: saved[key] }),
      set: async entry => {
        Object.assign(saved, entry);
        const changes = Object.fromEntries(Object.entries(entry).map(([key, newValue]) => [key, { newValue }]));
        for (const listener of storageListeners) listener(changes, 'local');
      }
    } },
    runtime: {
      onMessage: { addListener: fn => { listener = fn; } },
      sendMessage: message => new Promise(resolve => listener(message, {}, resolve))
    }
  };
  vm.runInNewContext(backgroundSource, {
    chrome, AbortController, setTimeout, clearTimeout,
    fetch: async (url, options) => {
      assert.equal(url, 'https://api.github.com/repos/filorisf/JEB-Seal-of-Quality/contents/seal.json?ref=main');
      assert.equal(options.headers.Accept, 'application/vnd.github.raw+json');
      requests++;
      assert.equal(options.cache, 'no-store');
      if (offline) throw new Error('Offline');
      return { ok: true, json: async () => feed };
    }
  });
  return {
    page() {
      const window = { RL: {} };
      vm.runInNewContext(sealSource, {
        window, chrome, location: { pathname: '/' },
        document: { getElementById: id => ({ remove: () => removed.push(id) }) }
      });
      return window.RL.seal;
    },
    update(value) { feed = value; },
    disconnect() { offline = true; },
    popupRefresh() { return chrome.runtime.sendMessage({ type: 'JEB_GET_SEAL_FEED', force: true }); },
    removed,
    get requests() { return requests; }
  };
}

test('page reload retrieves changed scores and removed games without restarting extension', async () => {
  const app = extension();
  assert.equal((await app.page().getFeed()).data.games[0].score, 8);
  app.update({ games: [{ placeId: '456', score: 9.5 }] });
  const result = await app.page().getFeed();
  assert.equal(result.cached, false);
  assert.equal(result.data.games.length, 1);
  assert.equal(result.data.games[0].placeId, '456');
  assert.equal(result.data.games[0].score, 9.5);
  app.update({ games: [] });
  assert.equal((await app.page().getFeed()).data.games.length, 0);
  assert.equal(app.requests, 3);
});

test('simultaneous consumers share a request; manual refresh still fetches', async () => {
  const app = extension();
  const page = app.page();
  await Promise.all([page.getFeed(), page.getFeed(), page.getFeed()]);
  await page.getFeed();
  assert.equal(app.requests, 1);
  app.update({ games: [{ placeId: '123', score: 9 }] });
  assert.equal((await page.getFeed(true)).data.games[0].score, 9);
  assert.equal(app.requests, 2);
});

test('offline reload preserves the saved feed; no backup returns a handled error', async () => {
  const app = extension();
  await app.page().getFeed();
  app.disconnect();
  const fallback = await app.page().getFeed();
  assert.equal(fallback.ok, true);
  assert.equal(fallback.stale, true);
  assert.equal(fallback.data.games[0].score, 8);
  const empty = extension();
  empty.disconnect();
  const error = await empty.page().getFeed();
  assert.equal(error.ok, false);
  assert.equal(error.error, 'Offline');
});


test('popup refresh invalidates mounted UI and updates an open page cache', async () => {
  const app = extension();
  const page = app.page();
  await page.getFeed();
  app.update({ games: [{ placeId: '789', score: 7.5 }] });
  await app.popupRefresh();
  assert.equal((await page.getFeed()).data.games[0].placeId, '789');
  assert.ok(app.removed.includes('jeb-quality-rail'));
  assert.ok(app.removed.includes('jeb-seal-game-badge'));
  assert.equal(app.requests, 2);
});

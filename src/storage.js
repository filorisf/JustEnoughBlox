(() => {
  const RL = (window.RL = window.RL || {});
  const U = RL.utils;

  const LOCAL_KEY = "roblox_lists_local_v1";
  const SYNC_META_KEY = "roblox_lists_sync_meta_v1";
  const SYNC_CHUNK_PREFIX = "roblox_lists_sync_chunk_v1_";
  const SYNC_CHUNK_SIZE = 7000;
  const THUMBNAILS_KEY = "justenoughblox_list_thumbnails_v1";

  const emptyState = () => ({ version: 1, lists: [], updatedAt: Date.now() });

  const RELOAD_MESSAGE = "JustEnoughBlox was reloaded. Refresh this page to continue.";
  let contextInvalidated = false;

  function isContextInvalidated(error) {
    return contextInvalidated || /extension context invalidated/i.test(error?.message || "");
  }

  async function storageCall(area, method, value) {
    try {
      if (contextInvalidated || !globalThis.chrome?.runtime?.id) {
        throw new Error("Extension context invalidated.");
      }
      return await chrome.storage[area][method](value);
    } catch (error) {
      if (!isContextInvalidated(error)) throw error;
      contextInvalidated = true;
      throw new Error(RELOAD_MESSAGE);
    }
  }

  async function compressState(state) {
    const json = JSON.stringify(state);
    const gz = await U.gzip(U.utf8(json));
    return U.bytesToBase64Url(gz);
  }

  async function decompressState(encoded) {
    const gz = U.base64UrlToBytes(encoded);
    const json = U.fromUtf8(await U.gunzip(gz));
    const parsed = JSON.parse(json);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.lists)) throw new Error("Unsupported storage format.");
    return parsed;
  }

  async function loadFromSync() {
    const metaResult = await storageCall("sync", "get", SYNC_META_KEY);
    const meta = metaResult[SYNC_META_KEY];
    if (!meta || !Number.isInteger(meta.chunks) || meta.chunks < 1) return null;

    const keys = Array.from({ length: meta.chunks }, (_, i) => `${SYNC_CHUNK_PREFIX}${i}`);
    const result = await storageCall("sync", "get", keys);
    let encoded = "";
    for (const key of keys) {
      if (typeof result[key] !== "string") return null;
      encoded += result[key];
    }
    return decompressState(encoded);
  }

  async function saveToSync(state) {
    const encoded = await compressState(state);
    const chunks = [];
    for (let i = 0; i < encoded.length; i += SYNC_CHUNK_SIZE) chunks.push(encoded.slice(i, i + SYNC_CHUNK_SIZE));

    const previous = (await storageCall("sync", "get", SYNC_META_KEY))[SYNC_META_KEY];
    const payload = {
      [SYNC_META_KEY]: { version: 1, chunks: chunks.length, updatedAt: state.updatedAt }
    };
    chunks.forEach((chunk, index) => { payload[`${SYNC_CHUNK_PREFIX}${index}`] = chunk; });
    await storageCall("sync", "set", payload);

    if (previous?.chunks > chunks.length) {
      const stale = [];
      for (let i = chunks.length; i < previous.chunks; i++) stale.push(`${SYNC_CHUNK_PREFIX}${i}`);
      if (stale.length) await storageCall("sync", "remove", stale);
    }
  }


  async function getAllListThumbnails() {
    const result = await storageCall("local", "get", THUMBNAILS_KEY);
    const value = result[THUMBNAILS_KEY];
    return value && typeof value === "object" ? value : {};
  }

  async function getListThumbnail(listId) {
    const thumbs = await getAllListThumbnails();
    return typeof thumbs[listId] === "string" ? thumbs[listId] : "";
  }

  async function setListThumbnail(listId, dataUrl) {
    if (!listId) throw new Error("List not found.");
    if (dataUrl && !/^data:image\/(?:png|jpeg|webp);base64,/i.test(dataUrl)) throw new Error("Unsupported image format.");
    const thumbs = await getAllListThumbnails();
    if (dataUrl) thumbs[listId] = dataUrl;
    else delete thumbs[listId];
    await storageCall("local", "set", { [THUMBNAILS_KEY]: thumbs });
    return dataUrl || "";
  }

  async function removeListThumbnail(listId) {
    return setListThumbnail(listId, "");
  }

  function removeLegacySmartLists(state) {
    if (!state || !Array.isArray(state.lists)) return { state, changed: false };
    const before = state.lists.length;
    state.lists = state.lists.filter(list => list?.type !== 'smart').map(list => {
      if (!list || typeof list !== 'object') return list;
      const { smart, ...clean } = list;
      if (clean.type === 'manual') delete clean.type;
      return clean;
    });
    return { state, changed: before !== state.lists.length || state.lists.some(list => list?.smart) };
  }

  async function load() {
    try {
      const sync = await loadFromSync();
      if (sync) {
        const migrated = removeLegacySmartLists(sync);
        if (migrated.changed) {
          migrated.state.updatedAt = Date.now();
          try { await saveToSync(migrated.state); } catch {}
        }
        await storageCall("local", "set", { [LOCAL_KEY]: migrated.state });
        return migrated.state;
      }
    } catch (error) {
      if (isContextInvalidated(error)) throw error;
      console.warn("[JustEnoughBlox] Sync load failed; using local backup.", error);
    }

    const local = (await storageCall("local", "get", LOCAL_KEY))[LOCAL_KEY];
    const state = local && local.version === 1 && Array.isArray(local.lists) ? local : emptyState();
    const migrated = removeLegacySmartLists(state);
    if (migrated.changed) {
      migrated.state.updatedAt = Date.now();
      await storageCall("local", "set", { [LOCAL_KEY]: migrated.state });
      try { await saveToSync(migrated.state); } catch {}
    }
    return migrated.state;
  }

  async function save(state) {
    state.updatedAt = Date.now();
    await storageCall("local", "set", { [LOCAL_KEY]: state });
    let synced = true;
    try {
      await saveToSync(state);
    } catch (error) {
      if (isContextInvalidated(error)) throw error;
      synced = false;
      console.warn("[JustEnoughBlox] Sync save failed; local backup is safe.", error);
    }
    return { synced };
  }

  async function mutate(mutator) {
    const state = await load();
    const result = await mutator(state);
    const status = await save(state);
    return { state, result, ...status };
  }

  async function createList(name) {
    const clean = String(name || "").trim().slice(0, 80);
    if (!clean) throw new Error("List name is required.");
    return mutate(state => {
      const list = { id: U.randomId(), name: clean, createdAt: Date.now(), updatedAt: Date.now(), games: [] };
      state.lists.unshift(list);
      return list;
    });
  }

  async function renameList(listId, name) {
    const clean = String(name || "").trim().slice(0, 80);
    if (!clean) throw new Error("List name is required.");
    return mutate(state => {
      const list = state.lists.find(x => x.id === listId);
      if (!list) throw new Error("List not found.");
      list.name = clean;
      list.updatedAt = Date.now();
      return list;
    });
  }

  async function deleteList(listId) {
    const result = await mutate(state => {
      state.lists = state.lists.filter(x => x.id !== listId);
    });
    await removeListThumbnail(listId);
    return result;
  }

  async function addGame(listId, game) {
    return mutate(state => {
      const list = state.lists.find(x => x.id === listId);
      if (!list) throw new Error("List not found.");
      const placeId = String(game.placeId);
      if (!/^\d+$/.test(placeId)) throw new Error("Invalid Roblox place ID.");
      const existing = list.games.find(x => String(x.placeId) === placeId);
      if (!existing) {
        list.games.unshift({
          placeId,
          title: U.normalizeTitle(game.title),
          addedAt: Date.now()
        });
      } else if (game.title) {
        existing.title = U.normalizeTitle(game.title);
      }
      list.updatedAt = Date.now();
      return list;
    });
  }

  async function removeGame(listId, placeId) {
    return mutate(state => {
      const list = state.lists.find(x => x.id === listId);
      if (!list) throw new Error("List not found.");
      list.games = list.games.filter(x => String(x.placeId) !== String(placeId));
      list.updatedAt = Date.now();
    });
  }

  async function moveGame(listId, placeId, newIndex) {
    return mutate(state => {
      const list = state.lists.find(x => x.id === listId);
      if (!list) throw new Error("List not found.");
      const sourceIndex = list.games.findIndex(x => String(x.placeId) === String(placeId));
      if (sourceIndex < 0) throw new Error("Game not found.");

      const [game] = list.games.splice(sourceIndex, 1);
      const targetIndex = Math.max(0, Math.min(Number(newIndex) || 0, list.games.length));
      list.games.splice(targetIndex, 0, game);
      list.updatedAt = Date.now();
      return list;
    });
  }


  async function touchList(listId) {
    return mutate(state => {
      const list = state.lists.find(x => x.id === listId);
      if (!list) return null;
      list.updatedAt = Date.now();
      return list;
    });
  }

  async function importList(imported) {
    return mutate(state => {
      const list = {
        id: U.randomId(),
        name: String(imported.name || "Imported list").slice(0, 80),
        createdAt: imported.createdAt || Date.now(),
        importedAt: Date.now(),
        importedFrom: imported.creator || "Unknown",
        updatedAt: Date.now(),
        games: imported.games.map(g => ({
          placeId: String(g.placeId),
          title: U.normalizeTitle(g.title || `Game ${g.placeId}`),
          addedAt: Date.now()
        }))
      };
      state.lists.unshift(list);
      return list;
    });
  }

  RL.storage = {
    load,
    save,
    createList,
    renameList,
    deleteList,
    addGame,
    removeGame,
    moveGame,
    importList,
    getAllListThumbnails,
    getListThumbnail,
    setListThumbnail,
    removeListThumbnail,
    touchList
  };
})();

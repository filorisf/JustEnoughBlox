const universeCache = new Map();
const gameCache = new Map();
const thumbCache = new Map();
const wideThumbCache = new Map();
let friendsPlayingCache = { at: 0, data: {}, userId: null };

const UNIVERSE_TTL = 24 * 60 * 60 * 1000;
const GAME_TTL = 45 * 1000;
const THUMB_TTL = 6 * 60 * 60 * 1000;
const FRIENDS_TTL = 20 * 1000;

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

async function fetchJson(url, locale = '', { credentials = 'omit', method = 'GET', body = null } = {}) {
  const headers = { Accept: 'application/json' };
  if (locale) {
    const safeLocale = String(locale).replace('_', '-');
    const language = safeLocale.split('-')[0];
    headers['Accept-Language'] = `${safeLocale},${language};q=0.9`;
  }
  if (body !== null) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, {
    method,
    credentials,
    headers,
    body: body === null ? undefined : JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Roblox API ${response.status}`);
  return response.json();
}

async function getUniverseId(placeId) {
  const key = String(placeId);
  const cached = universeCache.get(key);
  if (cached && Date.now() - cached.at < UNIVERSE_TTL) return cached.value;

  const data = await fetchJson(`https://apis.roblox.com/universes/v1/places/${encodeURIComponent(key)}/universe`);
  const value = String(data.universeId || data.UniverseId || '');
  if (!/^\d+$/.test(value)) throw new Error('Universe not found');
  universeCache.set(key, { value, at: Date.now() });
  return value;
}

async function getThumbnails(placeIds) {
  const now = Date.now();
  const result = {};
  const missing = [];

  for (const id of placeIds) {
    const cached = thumbCache.get(id);
    if (cached && now - cached.at < THUMB_TTL) result[id] = cached.value;
    else missing.push(id);
  }

  for (const batch of chunk(missing, 50)) {
    try {
      const params = new URLSearchParams({
        placeIds: batch.join(','),
        returnPolicy: 'PlaceHolder',
        size: '150x150',
        format: 'Png',
        isCircular: 'false'
      });
      const data = await fetchJson(`https://thumbnails.roblox.com/v1/places/gameicons?${params}`);
      for (const item of data.data || []) {
        const id = String(item.targetId || item.placeId || '');
        if (!id) continue;
        const value = item.imageUrl || '';
        result[id] = value;
        thumbCache.set(id, { value, at: now });
      }
    } catch (error) {
      console.warn('[JustEnoughBlox] Thumbnail fetch failed', error);
    }
  }

  return result;
}

async function getUniverseThumbnails(universeIds) {
  const now = Date.now();
  const result = {};
  const missing = [];

  for (const id of universeIds) {
    const cached = wideThumbCache.get(id);
    if (cached && now - cached.at < THUMB_TTL) result[id] = cached.value;
    else missing.push(id);
  }

  for (const batch of chunk(missing, 40)) {
    try {
      const params = new URLSearchParams({
        universeIds: batch.join(','),
        countPerUniverse: '1',
        defaults: 'true',
        size: '480x270',
        format: 'Webp',
        isCircular: 'false'
      });
      const data = await fetchJson(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?${params}`);
      for (const item of data.data || []) {
        const universeId = String(item.universeId || '');
        if (!universeId) continue;
        const value = item.thumbnails?.find(t => t?.state === 'Completed' && t.imageUrl)?.imageUrl || '';
        result[universeId] = value;
        wideThumbCache.set(universeId, { value, at: now });
      }
    } catch (error) {
      console.warn('[JustEnoughBlox] Wide thumbnail fetch failed', error);
    }
  }

  return result;
}

async function getGameDetailsByUniverse(universeIds, locale = 'en-US') {
  const now = Date.now();
  const result = {};
  const missing = [];

  for (const id of universeIds) {
    const cacheKey = `${locale}|${id}`;
    const cached = gameCache.get(cacheKey);
    if (cached && now - cached.at < GAME_TTL) result[id] = cached.value;
    else missing.push(id);
  }

  for (const batch of chunk(missing, 50)) {
    try {
      const data = await fetchJson(`https://games.roblox.com/v1/games?universeIds=${batch.map(encodeURIComponent).join(',')}`, locale);
      for (const item of data.data || []) {
        const id = String(item.id || '');
        if (!id) continue;
        result[id] = item;
        gameCache.set(`${locale}|${id}`, { value: item, at: now });
      }
    } catch (error) {
      console.warn('[JustEnoughBlox] Game details fetch failed', error);
    }
  }

  return result;
}

async function getMetadata(placeIds, locale = 'en-US') {
  const ids = [...new Set((placeIds || []).map(String).filter(id => /^\d+$/.test(id)))];
  const thumbnailsPromise = getThumbnails(ids);

  const universePairs = await Promise.all(ids.map(async placeId => {
    try {
      return [placeId, await getUniverseId(placeId)];
    } catch {
      return [placeId, null];
    }
  }));

  const universeIds = [...new Set(universePairs.map(([, universeId]) => universeId).filter(Boolean))];
  const [thumbnails, wideThumbnails, details] = await Promise.all([
    thumbnailsPromise,
    getUniverseThumbnails(universeIds),
    getGameDetailsByUniverse(universeIds, locale)
  ]);

  const out = {};
  for (const [placeId, universeId] of universePairs) {
    const detail = universeId ? details[universeId] : null;
    out[placeId] = {
      placeId,
      universeId,
      thumbnail: (universeId && wideThumbnails[universeId]) || thumbnails[placeId] || '',
      icon: thumbnails[placeId] || '',
      name: detail?.name || '',
      creator: detail?.creator?.name || '',
      creatorType: detail?.creator?.type || '',
      playing: Number.isFinite(detail?.playing) ? detail.playing : null,
      visits: Number.isFinite(detail?.visits) ? detail.visits : null,
      maxPlayers: Number.isFinite(detail?.maxPlayers) ? detail.maxPlayers : null,
      favorites: Number.isFinite(detail?.favoritedCount) ? detail.favoritedCount : null,
      genre: detail?.genre || '',
      created: detail?.created || '',
      updated: detail?.updated || '',
      description: detail?.description || ''
    };
  }
  return out;
}

async function getAuthenticatedUser() {
  try {
    return await fetchJson('https://users.roblox.com/v1/users/authenticated', '', { credentials: 'include' });
  } catch (error) {
    console.warn('[JustEnoughBlox] Authenticated Roblox user unavailable.', error);
    return null;
  }
}

async function getFriends(userId) {
  try {
    const data = await fetchJson(`https://friends.roblox.com/v1/users/${encodeURIComponent(userId)}/friends`);
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    console.warn('[JustEnoughBlox] Friend list unavailable.', error);
    return [];
  }
}

async function getPresences(userIds) {
  const result = [];
  for (const batch of chunk(userIds, 50)) {
    try {
      const data = await fetchJson('https://presence.roblox.com/v1/presence/users', '', {
        credentials: 'include',
        method: 'POST',
        body: { userIds: batch.map(id => Number(id)) }
      });
      result.push(...(data.userPresences || []));
    } catch (error) {
      console.warn('[JustEnoughBlox] Friend presence unavailable.', error);
    }
  }
  return result;
}

async function getAvatarHeadshots(userIds) {
  const result = {};
  for (const batch of chunk(userIds, 100)) {
    try {
      const params = new URLSearchParams({
        userIds: batch.join(','),
        size: '48x48',
        format: 'Png',
        isCircular: 'true'
      });
      const data = await fetchJson(`https://thumbnails.roblox.com/v1/users/avatar-headshot?${params}`);
      for (const item of data.data || []) {
        const id = String(item.targetId || '');
        if (!id) continue;
        result[id] = item.imageUrl || '';
      }
    } catch (error) {
      console.warn('[JustEnoughBlox] Friend avatar thumbnails unavailable.', error);
    }
  }
  return result;
}

async function getFriendsPlaying() {
  const now = Date.now();
  if (now - friendsPlayingCache.at < FRIENDS_TTL) return friendsPlayingCache.data;

  const me = await getAuthenticatedUser();
  const userId = String(me?.id || '');
  if (!/^\d+$/.test(userId)) {
    friendsPlayingCache = { at: now, data: {}, userId: null };
    return {};
  }

  const friends = await getFriends(userId);
  const friendById = new Map();
  for (const friend of friends) {
    const id = String(friend.id || '');
    if (!/^\d+$/.test(id)) continue;
    friendById.set(id, {
      id,
      name: friend.name || '',
      displayName: friend.displayName || friend.name || ''
    });
  }

  const friendIds = [...friendById.keys()];
  if (!friendIds.length) {
    friendsPlayingCache = { at: now, data: {}, userId };
    return {};
  }

  const presences = await getPresences(friendIds);
  const playing = presences.filter(p => Number(p.userPresenceType) === 2 && p.universeId != null);
  const playingIds = playing.map(p => String(p.userId)).filter(id => friendById.has(id));
  const avatars = await getAvatarHeadshots(playingIds);
  const byUniverse = {};

  for (const presence of playing) {
    const id = String(presence.userId || '');
    const friend = friendById.get(id);
    const universeId = String(presence.universeId || '');
    if (!friend || !/^\d+$/.test(universeId)) continue;
    if (!byUniverse[universeId]) byUniverse[universeId] = [];
    byUniverse[universeId].push({
      ...friend,
      avatar: avatars[id] || '',
      placeId: presence.placeId ? String(presence.placeId) : '',
      universeId
    });
  }

  friendsPlayingCache = { at: now, data: byUniverse, userId };
  return byUniverse;
}



const RECOMMEND_TTL = 5 * 60 * 1000;
const recommendationCache = new Map();
const RECOMMEND_STOPWORDS = new Set([
  'the','and','for','with','from','this','that','your','you','are','into','game','games','roblox','official','new','play','playing','experience','experiences',
  'les','des','une','un','pour','avec','dans','sur','jeu','jeux','vous','votre','nouveau','nouvelle',
  'los','las','una','uno','para','con','juego','juegos','nuevo','nueva',
  'der','die','das','und','mit','für','spiel','spiele','neu','neue',
  'uma','um','para','com','jogo','jogos','novo','nova'
]);

function normalizeTokenText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenize(value) {
  const words = normalizeTokenText(value).match(/[a-z0-9]{3,}/g) || [];
  return words.filter(word => !RECOMMEND_STOPWORDS.has(word) && !/^\d+$/.test(word));
}

function addTokenWeights(map, text, weight, maxTokens = 80) {
  const counts = new Map();
  for (const token of tokenize(text).slice(0, maxTokens)) counts.set(token, (counts.get(token) || 0) + 1);
  for (const [token, count] of counts) {
    const bounded = Math.min(count, 3);
    map.set(token, (map.get(token) || 0) + weight * bounded);
  }
}

function buildSeedProfile(seedDetails) {
  const tokens = new Map();
  const genres = new Map();
  const creators = new Map();
  const seedUniverseIds = new Set();
  const seedPlaceIds = new Set();

  for (const detail of seedDetails) {
    if (!detail) continue;
    const universeId = String(detail.id || '');
    const placeId = String(detail.rootPlaceId || '');
    if (/^\d+$/.test(universeId)) seedUniverseIds.add(universeId);
    if (/^\d+$/.test(placeId)) seedPlaceIds.add(placeId);

    addTokenWeights(tokens, detail.name, 5, 20);
    addTokenWeights(tokens, detail.description, 0.8, 90);

    const genre = String(detail.genre || '').trim();
    if (genre && !/^all$/i.test(genre)) {
      genres.set(genre, (genres.get(genre) || 0) + 1);
      addTokenWeights(tokens, genre, 7, 8);
    }

    const creator = String(detail.creator?.name || '').trim();
    if (creator) creators.set(creator, (creators.get(creator) || 0) + 1);
  }

  return { tokens, genres, creators, seedUniverseIds, seedPlaceIds };
}

function topEntries(map, limit) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function buildRecommendationQueries(profile, seedDetails) {
  const topTokens = topEntries(profile.tokens, 8).map(([token]) => token);
  const topGenres = topEntries(profile.genres, 2).map(([genre]) => genre);
  const queries = [];

  if (topTokens.length >= 2) queries.push(`${topTokens[0]} ${topTokens[1]}`);
  if (topTokens.length) queries.push(topTokens[0]);
  if (topGenres.length) queries.push(topGenres[0]);

  // One-game Lists need a little more context. A compacted version of the seed
  // title tends to surface Roblox's own semantically related results.
  if (seedDetails.length === 1) {
    const titleTokens = tokenize(seedDetails[0]?.name || '').slice(0, 4);
    if (titleTokens.length) queries.push(titleTokens.join(' '));
  }

  const repeatedCreator = topEntries(profile.creators, 1)[0];
  if (repeatedCreator && repeatedCreator[1] >= 2) queries.push(repeatedCreator[0]);

  const unique = [];
  const seen = new Set();
  for (const query of queries.map(q => q.trim()).filter(Boolean)) {
    const key = normalizeTokenText(query);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(query);
  }
  return unique.slice(0, 4);
}

function readSearchContents(data) {
  const output = [];
  for (const result of data?.searchResults || []) {
    const contents = Array.isArray(result?.contents) ? result.contents : [];
    for (const content of contents) {
      if (!content || typeof content !== 'object') continue;
      const universeId = String(
        content.universeId ?? content.universeID ?? content.universe?.id ?? content.universe?.universeId ?? ''
      );
      const rootPlaceId = String(
        content.rootPlaceId ?? content.placeId ?? content.rootPlace?.id ?? ''
      );
      if (!/^\d+$/.test(universeId) && !/^\d+$/.test(rootPlaceId)) continue;
      output.push({
        universeId: /^\d+$/.test(universeId) ? universeId : '',
        rootPlaceId: /^\d+$/.test(rootPlaceId) ? rootPlaceId : '',
        name: String(content.name || content.title || ''),
        raw: content
      });
    }
  }
  return output;
}

async function searchExperiences(query, locale = 'en-US') {
  const sessionId = typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const params = new URLSearchParams({
    searchQuery: query,
    sessionId,
    pageType: 'all'
  });
  const data = await fetchJson(`https://apis.roblox.com/search-api/omni-search?${params}`, locale, { credentials: 'omit' });
  return readSearchContents(data);
}

function candidateTokenScore(detail, profile) {
  const candidateTokens = new Set([
    ...tokenize(detail?.name || ''),
    ...tokenize(detail?.description || ''),
    ...tokenize(detail?.genre || '')
  ]);
  let score = 0;
  const overlaps = [];
  for (const token of candidateTokens) {
    const weight = profile.tokens.get(token);
    if (!weight) continue;
    score += weight;
    overlaps.push([token, weight]);
  }
  overlaps.sort((a, b) => b[1] - a[1]);
  return { score, overlaps: overlaps.slice(0, 3).map(([token]) => token) };
}

async function getListRecommendations(placeIds, locale = 'en-US', limit = 10) {
  const seeds = [...new Set((placeIds || []).map(String).filter(id => /^\d+$/.test(id)))].slice(0, 60);
  if (!seeds.length) return [];

  const cacheKey = `${locale}|${seeds.slice().sort().join(',')}|${limit}`;
  const cached = recommendationCache.get(cacheKey);
  if (cached && Date.now() - cached.at < RECOMMEND_TTL) return cached.data;

  const universePairs = await Promise.all(seeds.map(async placeId => {
    try { return [placeId, await getUniverseId(placeId)]; }
    catch { return [placeId, null]; }
  }));
  const seedUniverseIds = [...new Set(universePairs.map(([, u]) => u).filter(Boolean))];
  const seedDetailsMap = await getGameDetailsByUniverse(seedUniverseIds, locale);
  const seedDetails = seedUniverseIds.map(id => seedDetailsMap[id]).filter(Boolean);
  if (!seedDetails.length) return [];

  const profile = buildSeedProfile(seedDetails);
  for (const [placeId] of universePairs) profile.seedPlaceIds.add(String(placeId));
  const queries = buildRecommendationQueries(profile, seedDetails);
  if (!queries.length) return [];

  const candidateMap = new Map();
  for (let qIndex = 0; qIndex < queries.length; qIndex++) {
    let results = [];
    try { results = await searchExperiences(queries[qIndex], locale); }
    catch (error) {
      console.warn('[JustEnoughBlox] Recommendation search failed', error);
      continue;
    }

    for (let rank = 0; rank < Math.min(results.length, 50); rank++) {
      const result = results[rank];
      let universeId = result.universeId;
      if (!universeId && result.rootPlaceId) {
        try { universeId = await getUniverseId(result.rootPlaceId); } catch { universeId = ''; }
      }
      if (!/^\d+$/.test(universeId) || profile.seedUniverseIds.has(universeId)) continue;
      const existing = candidateMap.get(universeId) || { universeId, rootPlaceId: result.rootPlaceId || '', searchScore: 0, queryHits: 0 };
      existing.searchScore = Math.max(existing.searchScore, Math.max(0, 18 - rank) + Math.max(0, 6 - qIndex * 2));
      existing.queryHits += 1;
      if (!existing.rootPlaceId && result.rootPlaceId) existing.rootPlaceId = result.rootPlaceId;
      candidateMap.set(universeId, existing);
    }
  }

  const candidateUniverseIds = [...candidateMap.keys()].slice(0, 120);
  if (!candidateUniverseIds.length) return [];
  const [details, thumbnails] = await Promise.all([
    getGameDetailsByUniverse(candidateUniverseIds, locale),
    getUniverseThumbnails(candidateUniverseIds)
  ]);

  const dominantGenres = new Set(topEntries(profile.genres, 3).map(([genre]) => genre.toLowerCase()));
  const seedCreators = new Set([...profile.creators.keys()].map(v => v.toLowerCase()));
  const scored = [];

  for (const universeId of candidateUniverseIds) {
    const detail = details[universeId];
    if (!detail) continue;
    const candidate = candidateMap.get(universeId);
    const placeId = String(detail.rootPlaceId || candidate?.rootPlaceId || '');
    if (!/^\d+$/.test(placeId) || profile.seedPlaceIds.has(placeId)) continue;

    const tokenMatch = candidateTokenScore(detail, profile);
    const genre = String(detail.genre || '').trim();
    const creator = String(detail.creator?.name || '').trim();
    const sameGenre = genre && dominantGenres.has(genre.toLowerCase());
    const sameCreator = creator && seedCreators.has(creator.toLowerCase());
    const activityBoost = Math.min(5, Math.log10((Number(detail.playing) || 0) + 1));

    let score = tokenMatch.score + (candidate?.searchScore || 0) + (candidate?.queryHits || 0) * 3 + activityBoost;
    if (sameGenre) score += 9;
    if (sameCreator) score += 4;

    scored.push({
      placeId,
      universeId,
      name: detail.name || `Game ${placeId}`,
      creator,
      playing: Number.isFinite(detail.playing) ? detail.playing : null,
      visits: Number.isFinite(detail.visits) ? detail.visits : null,
      genre,
      thumbnail: thumbnails[universeId] || '',
      score,
      reasonKeywords: tokenMatch.overlaps,
      sameGenre: !!sameGenre,
      sameCreator: !!sameCreator
    });
  }

  scored.sort((a, b) => b.score - a.score || (Number(b.playing) || 0) - (Number(a.playing) || 0));
  const data = scored.slice(0, Math.max(1, Math.min(Number(limit) || 10, 20)));
  recommendationCache.set(cacheKey, { at: Date.now(), data });
  return data;
}



// JEB Seal of Quality -------------------------------------------------------
const JEB_SEAL_FEED_URL_KEY = 'jeb_seal_feed_url_v1';
const JEB_SEAL_FEED_CACHE_KEY = 'jeb_seal_feed_cache_v1';
const JEB_SEAL_FEED_TTL = 6 * 60 * 60 * 1000;
const DEFAULT_JEB_SEAL_FEED_URL = '';

function validSealFeedUrl(raw) {
  if (!raw) return '';
  try {
    const url = new URL(String(raw).trim());
    if (url.protocol !== 'https:') return '';
    if (!['raw.githubusercontent.com', 'gist.githubusercontent.com'].includes(url.hostname)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

function normalizeSealFeed(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.games)) throw new Error('Invalid JEB Seal feed.');
  const games = [];
  for (const item of raw.games) {
    if (!item || typeof item !== 'object') continue;
    const placeId = String(item.placeId || item.rootPlaceId || '').trim();
    const universeId = String(item.universeId || '').trim();
    const score = clampScore(item.score);
    if (!/^\d+$/.test(placeId) || score === null) continue;
    const criteria = {};
    for (const key of ['gameplay','polish','artDirection','originality','playerRespect']) {
      const value = clampScore(item.scores?.[key]);
      if (value !== null) criteria[key] = value;
    }
    games.push({
      placeId,
      universeId: /^\d+$/.test(universeId) ? universeId : '',
      score,
      title: String(item.title || '').trim().slice(0, 140),
      creator: String(item.creator || '').trim().slice(0, 100),
      awardedAt: String(item.awardedAt || '').trim().slice(0, 32),
      review: String(item.review || '').trim().slice(0, 800),
      tags: Array.isArray(item.tags) ? item.tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 10) : [],
      scores: criteria
    });
  }
  return {
    version: Number(raw.version) || 1,
    updatedAt: String(raw.updatedAt || '').trim().slice(0, 32),
    games: games.slice(0, 250)
  };
}

async function getSealFeedUrl() {
  const result = await chrome.storage.local.get(JEB_SEAL_FEED_URL_KEY);
  return validSealFeedUrl(result[JEB_SEAL_FEED_URL_KEY] || DEFAULT_JEB_SEAL_FEED_URL);
}

async function saveSealFeedUrl(raw) {
  const cleanRaw = String(raw || '').trim();
  if (!cleanRaw) {
    await chrome.storage.local.remove([JEB_SEAL_FEED_URL_KEY, JEB_SEAL_FEED_CACHE_KEY]);
    return '';
  }
  const url = validSealFeedUrl(cleanRaw);
  if (!url) throw new Error('Use a raw.githubusercontent.com or gist.githubusercontent.com HTTPS JSON URL.');
  await chrome.storage.local.set({ [JEB_SEAL_FEED_URL_KEY]: url });
  const cached = (await chrome.storage.local.get(JEB_SEAL_FEED_CACHE_KEY))[JEB_SEAL_FEED_CACHE_KEY];
  if (cached?.url && cached.url !== url) await chrome.storage.local.remove(JEB_SEAL_FEED_CACHE_KEY);
  return url;
}

async function fetchSealJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, { credentials: 'omit', cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Seal feed HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function getSealFeed(force = false) {
  const url = await getSealFeedUrl();
  if (!url) return { configured: false, data: { version: 1, updatedAt: '', games: [] }, cached: false };

  const cacheResult = await chrome.storage.local.get(JEB_SEAL_FEED_CACHE_KEY);
  const cached = cacheResult[JEB_SEAL_FEED_CACHE_KEY];
  if (!force && cached?.url === url && cached?.data && Date.now() - Number(cached.fetchedAt || 0) < JEB_SEAL_FEED_TTL) {
    return { configured: true, data: cached.data, cached: true, fetchedAt: cached.fetchedAt, url };
  }

  try {
    const raw = await fetchSealJson(url);
    const data = normalizeSealFeed(raw);
    const entry = { url, data, fetchedAt: Date.now() };
    await chrome.storage.local.set({ [JEB_SEAL_FEED_CACHE_KEY]: entry });
    return { configured: true, data, cached: false, fetchedAt: entry.fetchedAt, url };
  } catch (error) {
    if (cached?.url === url && cached?.data) {
      return { configured: true, data: cached.data, cached: true, stale: true, fetchedAt: cached.fetchedAt, url, error: error?.message || 'Feed unavailable.' };
    }
    throw error;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'JEB_GET_GAME_METADATA') {
    getMetadata(message.placeIds, message.locale || 'en-US')
      .then(data => sendResponse({ ok: true, data }))
      .catch(error => sendResponse({ ok: false, error: error?.message || 'Unable to load Roblox game data.' }));
    return true;
  }

  if (message?.type === 'JEB_GET_LIST_RECOMMENDATIONS') {
    getListRecommendations(message.placeIds, message.locale || 'en-US', message.limit || 10)
      .then(data => sendResponse({ ok: true, data }))
      .catch(error => sendResponse({ ok: false, error: error?.message || 'Unable to load recommendations.' }));
    return true;
  }


  if (message?.type === 'JEB_GET_SEAL_FEED') {
    getSealFeed(!!message.force)
      .then(result => sendResponse({ ok: true, ...result }))
      .catch(error => sendResponse({ ok: false, configured: true, error: error?.message || 'Unable to load JEB Seal feed.' }));
    return true;
  }

  if (message?.type === 'JEB_SET_SEAL_FEED_URL') {
    saveSealFeedUrl(message.url)
      .then(async url => {
        if (!url) return sendResponse({ ok: true, url: '', configured: false });
        try {
          const result = await getSealFeed(true);
          sendResponse({ ok: true, url, configured: true, ...result });
        } catch (error) {
          sendResponse({ ok: false, url, configured: true, error: error?.message || 'Could not load this feed.' });
        }
      })
      .catch(error => sendResponse({ ok: false, error: error?.message || 'Invalid feed URL.' }));
    return true;
  }

  if (message?.type === 'JEB_GET_SEAL_FEED_URL') {
    getSealFeedUrl()
      .then(url => sendResponse({ ok: true, url }))
      .catch(error => sendResponse({ ok: false, error: error?.message || 'Unable to read feed URL.' }));
    return true;
  }

  if (message?.type === 'JEB_GET_FRIENDS_PLAYING') {
    getFriendsPlaying()
      .then(data => sendResponse({ ok: true, data }))
      .catch(error => sendResponse({ ok: false, error: error?.message || 'Unable to load friend presence.' }));
    return true;
  }

  return false;
});

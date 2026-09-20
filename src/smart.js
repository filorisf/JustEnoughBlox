(() => {
  const RL = (window.RL = window.RL || {});

  const DEFAULT_SMART = Object.freeze({
    mode: 'all',
    rules: [{ field: 'playing', op: 'gte', value: 1000 }],
    sort: 'playing_desc'
  });

  const NUMBER_FIELDS = new Set(['playing', 'visits', 'maxPlayers', 'friends']);

  function isSmart(list) {
    return list?.type === 'smart';
  }

  function normalizeRule(rule) {
    const field = ['playing', 'visits', 'maxPlayers', 'updated', 'created', 'creator', 'friends'].includes(rule?.field)
      ? rule.field
      : 'playing';

    let allowedOps;
    if (NUMBER_FIELDS.has(field)) allowedOps = ['gte', 'lte'];
    else if (field === 'updated') allowedOps = ['within_days'];
    else if (field === 'created') allowedOps = ['after', 'before'];
    else allowedOps = ['contains', 'equals'];

    const op = allowedOps.includes(rule?.op) ? rule.op : allowedOps[0];
    let value = rule?.value ?? '';
    if (NUMBER_FIELDS.has(field) || field === 'updated') value = Math.max(0, Number(value) || 0);
    else value = String(value || '').slice(0, 120);

    return { field, op, value };
  }

  function normalizeConfig(input) {
    const rules = Array.isArray(input?.rules) && input.rules.length
      ? input.rules.slice(0, 20).map(normalizeRule)
      : DEFAULT_SMART.rules.map(rule => ({ ...rule }));

    const allowedSorts = [
      'playing_desc', 'playing_asc', 'updated_desc', 'created_desc',
      'visits_desc', 'friends_desc', 'name_asc'
    ];

    return {
      mode: input?.mode === 'any' ? 'any' : 'all',
      rules,
      sort: allowedSorts.includes(input?.sort) ? input.sort : DEFAULT_SMART.sort
    };
  }

  function manualLists(state) {
    return (state?.lists || []).filter(list => !isSmart(list));
  }

  function buildCandidateMap(state, friendsPlaying = {}) {
    const map = new Map();

    for (const list of manualLists(state)) {
      for (const game of list.games || []) {
        const placeId = String(game.placeId || '');
        if (!/^\d+$/.test(placeId)) continue;
        const existing = map.get(placeId);
        if (!existing) map.set(placeId, { placeId, title: game.title || '', addedAt: game.addedAt || 0 });
        else if (!existing.title && game.title) existing.title = game.title;
      }
    }

    for (const friends of Object.values(friendsPlaying || {})) {
      for (const friend of friends || []) {
        const placeId = String(friend.placeId || '');
        if (!/^\d+$/.test(placeId) || map.has(placeId)) continue;
        map.set(placeId, { placeId, title: '', addedAt: 0, fromFriendPresence: true });
      }
    }

    return map;
  }

  async function buildContext(state, { force = false } = {}) {
    const friendsPlaying = await RL.meta.getFriendsPlaying();
    const candidateMap = buildCandidateMap(state, friendsPlaying);
    const ids = [...candidateMap.keys()];
    const metadata = ids.length ? await RL.meta.getGames(ids, { force }) : {};

    return {
      candidateMap,
      metadata,
      friendsPlaying,
      candidateCount: ids.length
    };
  }

  function friendsFor(meta, context) {
    const universeId = String(meta?.universeId || '');
    return universeId && Array.isArray(context.friendsPlaying?.[universeId])
      ? context.friendsPlaying[universeId]
      : [];
  }

  function numberCompare(actual, op, expected) {
    if (actual === null || actual === undefined || actual === '') return false;
    const a = Number(actual);
    const b = Number(expected);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return op === 'lte' ? a <= b : a >= b;
  }

  function matchesRule(candidate, meta, friends, rule) {
    const normalized = normalizeRule(rule);
    const { field, op, value } = normalized;

    if (NUMBER_FIELDS.has(field)) {
      const actual = field === 'friends' ? friends.length : meta?.[field];
      return numberCompare(actual, op, value);
    }

    if (field === 'updated') {
      const timestamp = Date.parse(meta?.updated || '');
      if (!Number.isFinite(timestamp)) return false;
      const ageMs = Math.max(0, Date.now() - timestamp);
      return ageMs <= Number(value) * 86400000;
    }

    if (field === 'created') {
      const actual = Date.parse(meta?.created || '');
      const expected = Date.parse(String(value || ''));
      if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
      return op === 'before' ? actual <= expected : actual >= expected;
    }

    if (field === 'creator') {
      const actual = String(meta?.creator || '').trim().toLocaleLowerCase();
      const expected = String(value || '').trim().toLocaleLowerCase();
      if (!expected) return true;
      return op === 'equals' ? actual === expected : actual.includes(expected);
    }

    return false;
  }

  function sortEntries(entries, sort) {
    const timestamp = value => {
      const n = Date.parse(value || '');
      return Number.isFinite(n) ? n : 0;
    };

    const sorters = {
      playing_desc: (a, b) => (Number(b.meta?.playing) || 0) - (Number(a.meta?.playing) || 0),
      playing_asc: (a, b) => (Number(a.meta?.playing) || 0) - (Number(b.meta?.playing) || 0),
      visits_desc: (a, b) => (Number(b.meta?.visits) || 0) - (Number(a.meta?.visits) || 0),
      friends_desc: (a, b) => b.friends.length - a.friends.length,
      updated_desc: (a, b) => timestamp(b.meta?.updated) - timestamp(a.meta?.updated),
      created_desc: (a, b) => timestamp(b.meta?.created) - timestamp(a.meta?.created),
      name_asc: (a, b) => String(a.meta?.name || a.game.title || '').localeCompare(String(b.meta?.name || b.game.title || ''))
    };

    entries.sort(sorters[sort] || sorters.playing_desc);
    return entries;
  }

  function evaluateWithContext(list, context) {
    const config = normalizeConfig(list?.smart);
    const rules = config.rules;
    const entries = [];
    const seenExperiences = new Set();

    for (const [placeId, game] of context.candidateMap.entries()) {
      const meta = context.metadata[placeId] || {};
      const friends = friendsFor(meta, context);
      const checks = rules.map(rule => matchesRule(game, meta, friends, rule));
      const matches = config.mode === 'any' ? checks.some(Boolean) : checks.every(Boolean);
      if (!matches) continue;
      const experienceKey = String(meta?.universeId || placeId);
      if (seenExperiences.has(experienceKey)) continue;
      seenExperiences.add(experienceKey);
      entries.push({ game, meta, friends });
    }

    sortEntries(entries, config.sort);
    const games = entries.map(({ game, meta }) => ({
      placeId: String(game.placeId),
      title: meta?.name || game.title || `Game ${game.placeId}`,
      addedAt: game.addedAt || 0
    }));

    return {
      list,
      config,
      games,
      entries,
      metadata: context.metadata,
      friendsPlaying: context.friendsPlaying,
      candidateCount: context.candidateCount
    };
  }

  async function evaluate(list, state, options = {}) {
    const context = await buildContext(state, options);
    return evaluateWithContext(list, context);
  }

  async function evaluateAll(state, options = {}) {
    const context = await buildContext(state, options);
    const results = {};
    for (const list of state?.lists || []) {
      if (isSmart(list)) results[list.id] = evaluateWithContext(list, context);
    }
    return { context, results };
  }

  RL.smart = {
    DEFAULT_SMART,
    isSmart,
    normalizeRule,
    normalizeConfig,
    buildContext,
    evaluateWithContext,
    evaluate,
    evaluateAll
  };
})();

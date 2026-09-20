(() => {
  const RL = (window.RL = window.RL || {});
  const U = RL.utils;
  const PREFIX = "RL1:";

  function encodeString(value) {
    const bytes = U.utf8(String(value || ""));
    return U.concatBytes(U.writeVarUint(bytes.length), bytes);
  }

  function decodeString(bytes, state) {
    const length = Number(U.readVarUint(bytes, state));
    if (!Number.isSafeInteger(length) || length < 0 || state.offset + length > bytes.length) throw new Error("Invalid string length.");
    const value = U.fromUtf8(bytes.subarray(state.offset, state.offset + length));
    state.offset += length;
    return value;
  }

  async function encodeList(list, creator) {
    const games = Array.isArray(list.games) ? list.games : [];
    const chunks = [
      Uint8Array.of(1),
      U.writeVarUint(Math.floor((list.createdAt || Date.now()) / 1000)),
      encodeString(String(creator || "Unknown").slice(0, 80)),
      encodeString(String(list.name || "Untitled list").slice(0, 80)),
      U.writeVarUint(games.length)
    ];

    for (const game of games) {
      chunks.push(U.writeVarUint(BigInt(String(game.placeId))));
      chunks.push(encodeString(U.normalizeTitle(game.title || "").slice(0, 120)));
    }

    const payload = U.concatBytes(...chunks);
    const crc = U.crc32(payload);
    const crcBytes = new Uint8Array(4);
    new DataView(crcBytes.buffer).setUint32(0, crc, true);
    const packed = U.concatBytes(payload, crcBytes);
    const compressed = await U.gzip(packed);
    return PREFIX + U.bytesToBase64Url(compressed);
  }

  async function decodeList(code) {
    const normalized = String(code || "").trim().replace(/\s+/g, "");
    if (!normalized.startsWith(PREFIX)) throw new Error("This is not an RL1 share code.");

    const compressed = U.base64UrlToBytes(normalized.slice(PREFIX.length));
    const packed = await U.gunzip(compressed);
    if (packed.length < 6) throw new Error("Share code is too short.");

    const payload = packed.subarray(0, packed.length - 4);
    const expected = new DataView(packed.buffer, packed.byteOffset + packed.length - 4, 4).getUint32(0, true);
    const actual = U.crc32(payload);
    if (expected !== actual) throw new Error("Share code is corrupted (checksum mismatch).");

    const state = { offset: 0 };
    const version = Number(payload[state.offset++]);
    if (version !== 1) throw new Error(`Unsupported JustEnoughBlox version: ${version}`);

    const createdAt = Number(U.readVarUint(payload, state)) * 1000;
    const creator = decodeString(payload, state);
    const name = decodeString(payload, state);
    const gameCount = Number(U.readVarUint(payload, state));
    if (!Number.isSafeInteger(gameCount) || gameCount < 0 || gameCount > 5000) throw new Error("Invalid game count.");

    const games = [];
    for (let i = 0; i < gameCount; i++) {
      const placeId = U.readVarUint(payload, state).toString();
      const title = decodeString(payload, state);
      games.push({ placeId, title: U.normalizeTitle(title || `Game ${placeId}`) });
    }

    if (state.offset !== payload.length) throw new Error("Unexpected extra data in share code.");
    return { version, name, creator, createdAt, games };
  }

  RL.share = { PREFIX, encodeList, decodeList };
})();

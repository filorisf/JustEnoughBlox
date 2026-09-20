(() => {
  const RL = (window.RL = window.RL || {});

  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  function randomId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    return [...b].map(x => x.toString(16).padStart(2, "0")).join("");
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function bytesToBase64Url(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
  }

  function base64UrlToBytes(value) {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }

  async function gzip(bytes) {
    if (typeof CompressionStream === "undefined") throw new Error("CompressionStream is not available in this Chrome version.");
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function gunzip(bytes) {
    if (typeof DecompressionStream === "undefined") throw new Error("DecompressionStream is not available in this Chrome version.");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function utf8(value) {
    return textEncoder.encode(String(value));
  }

  function fromUtf8(bytes) {
    return textDecoder.decode(bytes);
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function concatBytes(...arrays) {
    const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const arr of arrays) {
      out.set(arr, offset);
      offset += arr.length;
    }
    return out;
  }

  function writeVarUint(value) {
    let n = BigInt(value);
    if (n < 0n) throw new Error("VarUint cannot encode negative values.");
    const out = [];
    while (n >= 0x80n) {
      out.push(Number((n & 0x7fn) | 0x80n));
      n >>= 7n;
    }
    out.push(Number(n));
    return Uint8Array.from(out);
  }

  function readVarUint(bytes, state) {
    let result = 0n;
    let shift = 0n;
    for (let i = 0; i < 10; i++) {
      if (state.offset >= bytes.length) throw new Error("Unexpected end of share code.");
      const byte = BigInt(bytes[state.offset++]);
      result |= (byte & 0x7fn) << shift;
      if ((byte & 0x80n) === 0n) return result;
      shift += 7n;
    }
    throw new Error("Invalid varint in share code.");
  }

  function nowSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  function normalizeTitle(title) {
    const cleaned = String(title || "").replace(/\s+-\s+Roblox\s*$/i, "").trim();
    return cleaned || "Roblox game";
  }

  RL.utils = {
    randomId,
    escapeHtml,
    bytesToBase64Url,
    base64UrlToBytes,
    gzip,
    gunzip,
    utf8,
    fromUtf8,
    crc32,
    concatBytes,
    writeVarUint,
    readVarUint,
    nowSeconds,
    normalizeTitle
  };
})();

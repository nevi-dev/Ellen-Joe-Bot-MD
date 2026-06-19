import { jidDecode } from '@whiskeysockets/baileys';

class BoundedMap {
  #map = new Map();
  #max;
  #ttl;
  constructor(max, ttlMs = 0) { this.#max = max; this.#ttl = ttlMs; }
  #expired(entry) { return this.#ttl > 0 && Date.now() - entry.ts > this.#ttl; }
  has(key) {
    const entry = this.#map.get(key);
    if (!entry) return false;
    if (this.#expired(entry)) { this.#map.delete(key); return false; }
    return true;
  }
  get(key) {
    const entry = this.#map.get(key);
    if (!entry) return undefined;
    if (this.#expired(entry)) { this.#map.delete(key); return undefined; }
    return entry.value;
  }
  set(key, value) {
    if (this.#map.size >= this.#max) this.#map.delete(this.#map.keys().next().value);
    this.#map.set(key, { value, ts: Date.now() });
  }
}

const groupMetaCache = new Map();
const lidCache = new BoundedMap(2000, 24 * 60 * 60_000);
const META_TTL = 5 * 60_000;

const gcMeta = setInterval(() => {
  const now = Date.now();
  for (const [jid, cached] of groupMetaCache) {
    if (now - cached.ts > META_TTL) groupMetaCache.delete(jid);
  }
}, 10 * 60_000);
gcMeta.unref?.();

export function getCachedMeta(groupJid) {
  const cached = groupMetaCache.get(groupJid);
  if (!cached || Date.now() - cached.ts > META_TTL) return null;
  return cached.metadata;
}

export function setCachedMeta(groupJid, metadata) {
  if (groupJid && metadata) groupMetaCache.set(groupJid, { metadata, ts: Date.now() });
}

export function deleteCachedMeta(groupJid) { groupMetaCache.delete(groupJid); }

export function normalizeJid(raw) {
  if (!raw) return null;
  const value = typeof raw === 'number' ? String(raw) : String(raw).trim();
  if (!value) return null;
  if (value.endsWith('@g.us') || value.endsWith('@newsletter') || value.endsWith('@lid') || value.endsWith('@s.whatsapp.net')) return value;
  if (/:\d+@/i.test(value)) {
    const decoded = jidDecode(value);
    if (decoded?.user && decoded?.server) return `${decoded.user}@${decoded.server}`;
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 4 && digits.length <= 15) return `${digits}@s.whatsapp.net`;
  return value;
}

export function resolveParticipantJid(participant, sock) {
  if (!participant) return null;
  for (const field of ['phoneNumber', 'jid', 'id']) {
    const normalized = normalizeJid(participant[field]);
    if (normalized && !normalized.endsWith('@lid')) return normalized;
  }
  const rawLid = participant.lid || (participant.id?.endsWith('@lid') ? participant.id : null) || (participant.jid?.endsWith('@lid') ? participant.jid : null);
  if (!rawLid) return null;
  if (lidCache.has(rawLid)) return lidCache.get(rawLid);
  if (typeof sock?.findJidByLid === 'function') {
    const found = normalizeJid(sock.findJidByLid(rawLid));
    if (found && !found.endsWith('@lid')) { lidCache.set(rawLid, found); return found; }
  }
  return rawLid;
}

export function resolveParticipants(participants, sock) {
  if (!Array.isArray(participants)) return [];
  return participants.map((participant) => {
    const id = resolveParticipantJid(participant, sock);
    if (!id) return participant;
    const lid = participant.lid || (participant.id?.endsWith('@lid') ? participant.id : undefined) || (participant.jid?.endsWith('@lid') ? participant.jid : undefined);
    return { ...participant, id, jid: id, ...(lid ? { lid } : {}) };
  }).filter((participant) => participant.id);
}

export function resolveJidSync(raw, sock) {
  const normalized = normalizeJid(raw);
  if (!normalized || !normalized.endsWith('@lid')) return normalized;
  if (lidCache.has(normalized)) return lidCache.get(normalized);
  if (typeof sock?.findJidByLid === 'function') {
    const found = normalizeJid(sock.findJidByLid(normalized));
    if (found && !found.endsWith('@lid')) { lidCache.set(normalized, found); return found; }
  }
  return normalized;
}

export async function resolveJidAsync(raw, sock, groupJid) {
  const normalized = resolveJidSync(raw, sock);
  if (!normalized || !normalized.endsWith('@lid') || !groupJid?.endsWith('@g.us')) return normalized;
  let metadata = getCachedMeta(groupJid);
  if (!metadata) {
    metadata = await sock?.groupMetadata?.(groupJid).catch(() => null);
    if (metadata?.participants) setCachedMeta(groupJid, metadata);
  }
  const lidBase = normalized.split('@')[0];
  for (const participant of metadata?.participants || []) {
    const resolved = resolveParticipantJid(participant, sock);
    const lid = participant.lid || (participant.id?.endsWith('@lid') ? participant.id : null) || (participant.jid?.endsWith('@lid') ? participant.jid : null);
    if (lid?.split('@')[0] === lidBase && resolved && !resolved.endsWith('@lid')) {
      lidCache.set(normalized, resolved);
      return resolved;
    }
  }
  return normalized;
}

export function patchGroupMetadata(sock) {
  if (!sock?.groupMetadata || sock.groupMetadataPatched) return;
  sock.groupMetadataPatched = true;
  const original = sock.groupMetadata.bind(sock);
  sock.groupMetadata = async (jid) => {
    const metadata = await original(jid).catch(() => null);
    if (metadata?.participants) {
      metadata.participants = resolveParticipants(metadata.participants, sock);
      setCachedMeta(jid, metadata);
    }
    return metadata;
  };
}

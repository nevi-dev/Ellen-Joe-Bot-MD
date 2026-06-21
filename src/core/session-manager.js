import NodeCache from 'node-cache'

const DEFAULT_CACHE_TTL_SECONDS = 5 * 60
const DEFAULT_GROUP_METADATA_TTL_MS = 60 * 1000
const DEFAULT_GROUP_METADATA_MAX = 500

export class TTLCache {
  constructor(ttlMs = 30_000, maxSize = 500) {
    this.ttlMs = ttlMs
    this.maxSize = maxSize
    this.store = new Map()
  }

  get(key) {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return null
    }
    return entry.value
  }

  set(key, value, ttlOverrideMs) {
    this.clearExpired()
    while (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value
      if (oldestKey === undefined) break
      this.store.delete(oldestKey)
    }
    this.store.set(key, { value, expiresAt: Date.now() + (ttlOverrideMs || this.ttlMs) })
    return value
  }

  delete(key) { return this.store.delete(key) }
  clear() { this.store.clear() }

  clearExpired() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) this.store.delete(key)
    }
  }
}

function createSessionCaches() {
  return {
    msgRetryCounterCache: new NodeCache({ stdTTL: DEFAULT_CACHE_TTL_SECONDS, checkperiod: 120, useClones: false }),
    groupMetadataCache: new TTLCache(DEFAULT_GROUP_METADATA_TTL_MS, DEFAULT_GROUP_METADATA_MAX),
    commandTesterCache: new Map(),
    prefixMatcherCache: new Map(),
  }
}

export function getSessionId(conn = {}) {
  return conn.subBotId || conn.user?.jid || conn.user?.id || conn.authState?.creds?.me?.jid || 'primary'
}

export function attachSessionState(conn, { id, type = 'standard', parentId = null, path = null } = {}) {
  if (!conn) return null
  const previous = conn.session || {}
  conn.session = { ...previous, id: id || previous.id || getSessionId(conn), type: previous.type || type, parentId: previous.parentId ?? parentId, path: previous.path ?? path, createdAt: previous.createdAt || Date.now(), touchedAt: Date.now() }
  conn.__ellenState ||= {}
  conn.__ellenState.caches ||= createSessionCaches()
  conn.__groupMetadataCache = conn.__ellenState.caches.groupMetadataCache
  conn.__commandTesterCache = conn.__ellenState.caches.commandTesterCache
  conn.__prefixMatcherCache = conn.__ellenState.caches.prefixMatcherCache
  return conn.session
}

export function createMessageRetryCache() {
  return new NodeCache({ stdTTL: DEFAULT_CACHE_TTL_SECONDS, checkperiod: 120, useClones: false })
}

export function cleanupSessionState(conn) {
  const caches = conn?.__ellenState?.caches || conn?.__rubyState?.caches
  if (!caches) return
  caches.groupMetadataCache?.clear?.()
  caches.commandTesterCache?.clear?.()
  caches.prefixMatcherCache?.clear?.()
  caches.msgRetryCounterCache?.flushAll?.()
  delete conn.__ellenState
  delete conn.__rubyState
  delete conn.__groupMetadataCache
  delete conn.__commandTesterCache
  delete conn.__prefixMatcherCache
}

export function registerSubBot(registry, id, data) {
  if (!(registry instanceof Map) || !id) return
  const previous = registry.get(id)
  if (previous?.sock && previous.sock !== data?.sock) cleanupSessionState(previous.sock)
  registry.set(id, { ...data, updatedAt: Date.now() })
}

export function getPrefixMatcherCache(ctx) {
  if (!ctx.__prefixMatcherCache) ctx.__prefixMatcherCache = new Map()
  return ctx.__prefixMatcherCache
}

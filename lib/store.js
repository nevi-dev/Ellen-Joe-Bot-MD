import pino from 'pino'
const baileys = await import('baileys')
const makeInMemoryStore = baileys.makeInMemoryStore || baileys.default?.makeInMemoryStore
const proto = baileys.WAProto || baileys.proto || baileys.default?.WAProto || baileys.default?.proto

const GROUP_METADATA_TTL = 12 * 60 * 60 * 1000
const MIN_FETCH_JITTER = 750
const MAX_FETCH_JITTER = 2500
const smartFetchState = new WeakMap()
const STORE_FILE = './src/database/store.json'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const randomJitter = () => MIN_FETCH_JITTER + Math.floor(Math.random() * (MAX_FETCH_JITTER - MIN_FETCH_JITTER + 1))
const cleanJid = (jid = '') => String(jid || '').split(':')[0]

let nativeStore = makeInMemoryStore?.({ logger: pino({ level: 'silent' }) })
const boundConnections = new Set()
const STORE_RESET_INTERVAL = 12 * 60 * 60 * 1000

try {
  nativeStore?.readFromFile?.(STORE_FILE)
} catch (error) {
  console.error('No se pudo cargar store.json:', error)
}

const storeSaveInterval = setInterval(() => {
  try {
    nativeStore?.writeToFile?.(STORE_FILE)
  } catch (error) {
    console.error('No se pudo guardar store.json:', error)
  }
}, 10 * 1000)
storeSaveInterval.unref?.()

const clearCollection = (collection) => {
  if (!collection) return
  if (typeof collection.clear === 'function') return collection.clear()
  if (typeof collection.flush === 'function') return collection.flush()
  if (typeof collection.delete === 'function' && typeof collection.all === 'function') {
    for (const item of collection.all() || []) collection.delete(item?.id || item?.jid || item?.key)
    return
  }
  for (const key of Object.keys(collection)) delete collection[key]
}

function resetNativeStore() {
  try {
    clearCollection(nativeStore?.chats)
    clearCollection(nativeStore?.contacts)
    clearCollection(nativeStore?.messages)
    for (const conn of boundConnections) {
      if (!conn) continue
      conn.chats = {}
      // Bails vuelve a poblar el store con los eventos ya enlazados por store.bind(sock.ev).
      installSmartCache(conn)
    }
    console.log('♻️ Store en memoria limpiado por mantenimiento de 12 horas.')
  } catch (error) {
    console.error('No se pudo limpiar el store en memoria:', error)
  }
}

const storeResetInterval = setInterval(resetNativeStore, STORE_RESET_INTERVAL)
storeResetInterval.unref?.()

const normalizeParticipant = (participant = {}) => {
  const jid = cleanJid(participant.jid || participant.id)
  if (!jid) return null
  return {
    ...participant,
    id: jid,
    jid,
    lid: cleanJid(participant.lid) || undefined,
    admin: participant.admin || undefined,
    name: participant.name || participant.notify || undefined,
  }
}

const normalizeGroupMetadata = (metadata = {}) => {
  const jid = cleanJid(metadata.id || metadata.jid)
  if (!jid) return null
  const participants = Array.isArray(metadata.participants)
    ? metadata.participants.map(normalizeParticipant).filter(Boolean)
    : []
  return {
    id: jid,
    jid,
    subject: metadata.subject || metadata.name || '',
    owner: cleanJid(metadata.owner) || undefined,
    participants,
    participants_count: participants.length || metadata.participants_count || 0,
    updated_at: metadata.updated_at || Date.now(),
  }
}

function getSmartState(conn) {
  let state = smartFetchState.get(conn)
  if (!state) {
    state = { inFlight: new Map(), lastFetchAt: 0 }
    smartFetchState.set(conn, state)
  }
  return state
}

function cacheGroupLocally(conn, metadata) {
  const normalized = normalizeGroupMetadata(metadata)
  if (!normalized) return null
  conn.chats = conn.chats || {}
  const previous = conn.chats[normalized.jid] || { id: normalized.jid }
  conn.chats[normalized.jid] = {
    ...previous,
    id: normalized.jid,
    subject: normalized.subject || previous.subject || '',
    metadata: normalized,
    isChats: true,
    updated_at: Date.now(),
  }
  return normalized
}

function installSmartCache(conn) {
  if (conn.getSmartGroupMetadata) return

  conn.getSmartGroupMetadata = async function getSmartGroupMetadata(jid, { maxAge = GROUP_METADATA_TTL, force = false } = {}) {
    const groupJid = cleanJid(jid)
    if (!groupJid) return null

    const memoryMetadata = this.chats?.[groupJid]?.metadata || nativeStore?.chats?.get?.(groupJid)?.metadata
    if (!force && memoryMetadata?.updated_at && Date.now() - Number(memoryMetadata.updated_at) <= maxAge) {
      return { ...memoryMetadata, fromCache: true }
    }

    const state = getSmartState(this)
    if (state.inFlight.has(groupJid)) return state.inFlight.get(groupJid)

    const fetchPromise = (async () => {
      const elapsed = Date.now() - state.lastFetchAt
      const jitter = randomJitter()
      if (elapsed < jitter) await delay(jitter - elapsed)
      state.lastFetchAt = Date.now()
      const metadata = await this.groupMetadata(groupJid)
      return cacheGroupLocally(this, metadata)
    })().finally(() => state.inFlight.delete(groupJid))

    state.inFlight.set(groupJid, fetchPromise)
    return fetchPromise
  }

  conn.cacheGroupMetadata = function cacheGroupMetadata(metadata) {
    return cacheGroupLocally(this, metadata)
  }
}

function mirrorNativeStore(conn) {
  conn.chats = conn.chats || {}
  const chats = nativeStore?.chats?.all?.() || []
  for (const chat of chats) {
    const id = cleanJid(chat.id)
    if (!id) continue
    conn.chats[id] = { ...(conn.chats[id] || {}), ...chat, id }
  }
}

function bind(conn) {
  // Bails provee el store oficial en memoria; este bind reemplaza el caché manual de WhatsApp.
  boundConnections.add(conn)
  nativeStore?.bind?.(conn.ev)
  installSmartCache(conn)
  if (!conn.chats) conn.chats = {}
  mirrorNativeStore(conn)

  conn.ev.on('contacts.upsert', (contacts) => {
    for (const contact of contacts?.contacts || contacts || []) {
      const id = conn.decodeJid?.(contact.id) || cleanJid(contact.id)
      if (!id || id === 'status@broadcast') continue
      conn.chats[id] = { ...(conn.chats[id] || {}), ...contact, id }
    }
  })

  conn.ev.on('groups.update', (groups) => {
    for (const update of groups || []) {
      const id = conn.decodeJid?.(update.id) || cleanJid(update.id)
      if (!id || !id.endsWith('@g.us')) continue
      cacheGroupLocally(conn, { ...(conn.chats?.[id]?.metadata || {}), ...update, id, jid: id, participants: conn.chats?.[id]?.metadata?.participants || [] })
    }
  })

  conn.ev.on('group-participants.update', ({ id, participants, action }) => {
    id = conn.decodeJid?.(id) || cleanJid(id)
    if (!id || !id.endsWith('@g.us')) return
    const previous = conn.chats?.[id]?.metadata || { id, jid: id, participants: [] }
    const existing = new Map((previous.participants || []).map((p) => [cleanJid(p.jid || p.id), normalizeParticipant(p)]))
    for (const participant of participants || []) {
      const jid = cleanJid(participant.jid || participant.id || participant)
      if (!jid) continue
      if (action === 'remove') existing.delete(jid)
      else existing.set(jid, normalizeParticipant(typeof participant === 'string' ? { jid } : { ...participant, jid }))
    }
    cacheGroupLocally(conn, { ...previous, id, jid: id, participants: [...existing.values()].filter(Boolean) })
  })
}

async function loadMessage(jid, id = null) {
  if (jid && !id) {
    id = jid
    jid = undefined
  }
  jid = jid?.decodeJid?.() || cleanJid(jid)
  let message = jid ? await nativeStore?.loadMessage?.(jid, id) : null

  // Compatibilidad con llamadas legacy por id: buscar en el store nativo sin reintroducir caché propio.
  if (!message && id && nativeStore?.messages) {
    const messageStores = typeof nativeStore.messages.all === 'function'
      ? nativeStore.messages.all()
      : Object.values(nativeStore.messages || {})
    for (const bucket of messageStores || []) {
      const values = typeof bucket?.array === 'function'
        ? bucket.array()
        : typeof bucket?.toJSON === 'function'
          ? bucket.toJSON()
          : Array.isArray(bucket)
            ? bucket
            : Object.values(bucket || {})
      message = values.find?.((item) => item?.key?.id === id || item?.id === id)
      if (message) break
    }
  }

  return message ? proto?.WebMessageInfo?.fromObject?.(message) || message : null
}

const exportedStore = {
  bind,
  loadMessage,
  reset: resetNativeStore,
  readFromFile: (...args) => nativeStore?.readFromFile?.(...args),
  writeToFile: (...args) => nativeStore?.writeToFile?.(...args),
  get chats() { return nativeStore?.chats },
  get contacts() { return nativeStore?.contacts },
  get messages() { return nativeStore?.messages },
}

export default exportedStore

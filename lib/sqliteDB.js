import { dirname, resolve } from 'path'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import Database from 'better-sqlite3'

const STATE_TABLES = Object.freeze(['users', 'chats', 'settings', 'stats'])

const DEFAULT_DATA = Object.freeze({
  users: {},
  chats: {},
  settings: {},
  stats: {},
  msgs: {},
  sticker: {},
})


const normalizeJid = (jid = '') => typeof jid === 'string' ? jid.split(':')[0] : ''
const safeText = (value, maxLength = 256) => {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value.slice(0, maxLength)
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value).slice(0, maxLength)
  try {
    return JSON.stringify(value).slice(0, maxLength)
  } catch {
    return String(value).slice(0, maxLength)
  }
}
const safeInteger = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.trunc(number) : fallback
}
const safeAdmin = (value) => value === 'admin' || value === 'superadmin' ? value : null


export class BetterSQLiteAdapter {
  constructor(filepath, { migrateFrom } = {}) {
    this.file = resolve(filepath)
    this.migrateFrom = migrateFrom ? resolve(migrateFrom) : null
    this.key = 'global'
    this.db = null
    this.stmts = null
    this.maintenanceInterval = null
    this.dirty = Object.fromEntries(STATE_TABLES.map((table) => [table, new Set()]))
    this.lastSerialized = Object.fromEntries(STATE_TABLES.map((table) => [table, new Map()]))
    this.pendingMessages = new Map()
    this.pendingContacts = new Map()
    this.flushTimer = null
  }

  _open() {
    if (this.db) return this.db
    const dir = dirname(this.file)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    this.db = new Database(this.file)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('temp_store = MEMORY')
    this.db.pragma('cache_size = -64000')
    this.db.pragma('busy_timeout = 5000')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        data TEXT
      );

      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        data TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        data TEXT
      );

      CREATE TABLE IF NOT EXISTS stats (
        id TEXT PRIMARY KEY,
        data TEXT
      );

      CREATE TABLE IF NOT EXISTS contacts (
        jid TEXT PRIMARY KEY,
        lid TEXT UNIQUE,
        name TEXT,
        notify TEXT,
        verified_name TEXT,
        raw TEXT,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_contacts_lid ON contacts(lid);
      CREATE INDEX IF NOT EXISTS idx_contacts_updated_at ON contacts(updated_at);

      CREATE TABLE IF NOT EXISTS groups (
        jid TEXT PRIMARY KEY,
        subject TEXT,
        owner TEXT,
        participants_count INTEGER DEFAULT 0,
        raw TEXT,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_groups_updated_at ON groups(updated_at);

      CREATE TABLE IF NOT EXISTS group_participants (
        group_jid TEXT NOT NULL,
        jid TEXT NOT NULL,
        lid TEXT,
        admin TEXT,
        name TEXT,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (group_jid, jid)
      );
      CREATE INDEX IF NOT EXISTS idx_group_participants_lid ON group_participants(lid);
      CREATE INDEX IF NOT EXISTS idx_group_participants_group ON group_participants(group_jid);
      CREATE INDEX IF NOT EXISTS idx_group_participants_jid ON group_participants(jid);

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_jid TEXT NOT NULL,
        sender_jid TEXT,
        participant_jid TEXT,
        message_type TEXT,
        text TEXT,
        timestamp INTEGER NOT NULL,
        raw TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_chat_ts ON messages(chat_jid, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_sender_ts ON messages(sender_jid, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

      CREATE TABLE IF NOT EXISTS gamepvp_players (
        jid TEXT PRIMARY KEY,
        name TEXT,
        suit INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        ties INTEGER NOT NULL DEFAULT 0,
        exp INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_gamepvp_updated_at ON gamepvp_players(updated_at);
    `)
    this._prepareStatements()
    this._startMaintenance()
    return this.db
  }

  _prepareStatements() {
    const readState = Object.fromEntries(STATE_TABLES.map((table) => [table, this.db.prepare(`SELECT id, data FROM ${table}`)]))
    const writeState = Object.fromEntries(STATE_TABLES.map((table) => [table, this.db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`)]))
    this.stmts = {
      readKv: this.db.prepare('SELECT value FROM kv_store WHERE key = ?'),
      readState,
      writeState,
      upsertContact: this.db.prepare(`INSERT INTO contacts (jid, lid, name, notify, verified_name, raw, updated_at) VALUES (@jid, @lid, @name, @notify, @verified_name, @raw, @updated_at) ON CONFLICT(jid) DO UPDATE SET lid = COALESCE(excluded.lid, contacts.lid), name = COALESCE(excluded.name, contacts.name), notify = COALESCE(excluded.notify, contacts.notify), verified_name = COALESCE(excluded.verified_name, contacts.verified_name), raw = COALESCE(excluded.raw, contacts.raw), updated_at = excluded.updated_at`),
      contactByJid: this.db.prepare('SELECT * FROM contacts WHERE jid = ?'),
      contactByLid: this.db.prepare('SELECT * FROM contacts WHERE lid = ?'),
      deleteContactByLid: this.db.prepare('DELETE FROM contacts WHERE lid = ? AND jid != ?'),
      upsertGroup: this.db.prepare(`INSERT INTO groups (jid, subject, owner, participants_count, raw, updated_at) VALUES (@jid, @subject, @owner, @participants_count, @raw, @updated_at) ON CONFLICT(jid) DO UPDATE SET subject = COALESCE(excluded.subject, groups.subject), owner = COALESCE(excluded.owner, groups.owner), participants_count = excluded.participants_count, raw = excluded.raw, updated_at = excluded.updated_at`),
      upsertParticipant: this.db.prepare(`INSERT INTO group_participants (group_jid, jid, lid, admin, name, updated_at) VALUES (@group_jid, @jid, @lid, @admin, @name, @updated_at) ON CONFLICT(group_jid, jid) DO UPDATE SET lid = COALESCE(excluded.lid, group_participants.lid), admin = excluded.admin, name = COALESCE(excluded.name, group_participants.name), updated_at = excluded.updated_at`),
      upsertParticipantAdmin: this.db.prepare(`INSERT INTO group_participants (group_jid, jid, lid, admin, name, updated_at) VALUES (@group_jid, @jid, @lid, @admin, @name, @updated_at) ON CONFLICT(group_jid, jid) DO UPDATE SET lid = COALESCE(excluded.lid, group_participants.lid), admin = excluded.admin, name = COALESCE(excluded.name, group_participants.name), updated_at = excluded.updated_at`),
      participantByLid: this.db.prepare('SELECT * FROM group_participants WHERE lid = ? ORDER BY updated_at DESC LIMIT 1'),
      groupByJid: this.db.prepare('SELECT * FROM groups WHERE jid = ?'),
      participantsByGroup: this.db.prepare('SELECT * FROM group_participants WHERE group_jid = ? ORDER BY updated_at DESC'),
      upsertMessage: this.db.prepare(`INSERT OR REPLACE INTO messages (id, chat_jid, sender_jid, participant_jid, message_type, text, timestamp, raw, created_at) VALUES (@id, @chat_jid, @sender_jid, @participant_jid, @message_type, @text, @timestamp, @raw, @created_at)`),
      ensureGamePvpUser: this.db.prepare(`INSERT INTO gamepvp_players (jid, name, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(jid) DO UPDATE SET name = COALESCE(excluded.name, gamepvp_players.name), updated_at = excluded.updated_at`),
      deleteOldMessages: this.db.prepare('DELETE FROM messages WHERE created_at < ?'),
    }
    this.flushMessageBatch = this.db.transaction((messages, contacts) => {
      for (const message of messages) this.stmts.upsertMessage.run(message)
      for (const contact of contacts) this.stmts.upsertContact.run(contact)
    })
  }

  _startMaintenance() {
    if (this.maintenanceInterval) return
    this.maintenanceInterval = setInterval(() => this.checkpoint(), 12 * 60 * 60 * 1000)
    this.maintenanceInterval.unref?.()
  }

  _readJsonFile() {
    if (!this.migrateFrom || !existsSync(this.migrateFrom)) return null
    try {
      return JSON.parse(readFileSync(this.migrateFrom, 'utf8'))
    } catch (error) {
      console.error('No se pudo migrar la base JSON a SQLite:', error)
      return null
    }
  }

  _emptyData() {
    return Object.fromEntries(Object.entries(DEFAULT_DATA).map(([key, value]) => [key, { ...value }]))
  }

  _readStateTables() {
    const data = this._emptyData()
    let loadedRows = 0
    for (const table of STATE_TABLES) {
      const rows = this.stmts.readState[table].all()
      loadedRows += rows.length
      for (const row of rows) {
        if (!row?.id) continue
        try {
          data[table][row.id] = row.data ? JSON.parse(row.data) : {}
          this.lastSerialized[table].set(row.id, row.data || '{}')
        } catch (error) {
          console.error(`No se pudo parsear ${table}.${row.id} desde SQLite:`, error)
          data[table][row.id] = {}
        }
      }
    }
    return { data, loadedRows }
  }

  _readLegacyState() {
    const row = this.stmts.readKv.get(this.key)
    if (row?.value) return JSON.parse(row.value)
    return this._readJsonFile()
  }

  read() {
    this._open()
    const { data, loadedRows } = this._readStateTables()
    if (loadedRows > 0) return data

    const migrated = this._readLegacyState()
    if (migrated) {
      const normalized = { ...data, ...migrated }
      for (const table of STATE_TABLES) normalized[table] = migrated[table] || data[table]
      this.write(normalized)
      return normalized
    }

    return data
  }

  markDirty(table, id) {
    if (!STATE_TABLES.includes(table) || !id) return
    this.dirty[table].add(id)
  }

  markManyDirty(table, ids = []) {
    if (!STATE_TABLES.includes(table)) return
    for (const id of ids) if (id) this.dirty[table].add(id)
  }

  hasDirtyState() {
    return STATE_TABLES.some((table) => this.dirty[table].size > 0)
  }

  write(data = DEFAULT_DATA, { force = false } = {}) {
    this._open()
    this.flushBatches()
    const source = data || DEFAULT_DATA
    const writeStateTransaction = this.db.transaction(() => {
      for (const table of STATE_TABLES) {
        const rows = source[table] || {}
        const ids = force ? Object.keys(rows) : [...this.dirty[table]]
        for (const id of ids) {
          if (!Object.prototype.hasOwnProperty.call(rows, id)) continue
          const payload = JSON.stringify(rows[id] ?? {})
          if (!force && this.lastSerialized[table].get(id) === payload) continue
          this.stmts.writeState[table].run(id, payload)
          this.lastSerialized[table].set(id, payload)
        }
        if (!force) this.dirty[table].clear()
      }
    })
    writeStateTransaction()
  }

  upsertContact(contact = {}) {
    try {
      this._open()
      const jid = normalizeJid(contact.jid || contact.id)
      if (!jid) return null
      const lid = normalizeJid(contact.lid) || null
      if (lid) this.stmts.deleteContactByLid.run(lid, jid)
      this.stmts.upsertContact.run({ jid, lid, name: safeText(contact.name || contact.pushName), notify: safeText(contact.notify), verified_name: safeText(contact.verifiedName || contact.verified_name), raw: null, updated_at: Date.now() })
      return jid
    } catch (error) {
      console.error('SQLite contact cache error:', error)
      return null
    }
  }

  upsertGroup(metadata = {}) {
    try {
      this._open()
      const jid = normalizeJid(metadata.id || metadata.jid)
      if (!jid) return null
      const participants = Array.isArray(metadata.participants) ? metadata.participants : []
      const now = Date.now()
      const trx = this.db.transaction(() => {
        this.stmts.upsertGroup.run({ jid, subject: safeText(metadata.subject || metadata.name), owner: normalizeJid(metadata.owner) || null, participants_count: safeInteger(metadata.participants_count, participants.length), raw: null, updated_at: now })
        for (const p of participants) {
          const participantJid = normalizeJid(p?.jid || p?.id)
          if (!participantJid) continue
          const lid = normalizeJid(p?.lid) || null
          if (lid) this.stmts.deleteContactByLid.run(lid, participantJid)
          this.stmts.upsertParticipant.run({ group_jid: jid, jid: participantJid, lid, admin: safeAdmin(p?.admin), name: safeText(p?.name || p?.notify), updated_at: now })
          this.stmts.upsertContact.run({ jid: participantJid, lid, name: safeText(p?.name), notify: safeText(p?.notify), verified_name: null, raw: null, updated_at: now })
        }
      })
      trx()
      return jid
    } catch (error) {
      console.error('SQLite group cache error:', error)
      return null
    }
  }

  updateGroupParticipantAdmin(groupJid = '', participant = '', admin = null, extra = {}) {
    try {
      this._open()
      const normalizedGroup = normalizeJid(groupJid)
      const normalizedParticipant = normalizeJid(participant?.jid || participant?.id || participant)
      if (!normalizedGroup || !normalizedParticipant) return null
      const now = Date.now()
      this.stmts.upsertParticipantAdmin.run({
        group_jid: normalizedGroup,
        jid: normalizedParticipant,
        lid: normalizeJid(extra.lid || participant?.lid) || null,
        admin: safeAdmin(admin),
        name: safeText(extra.name || extra.notify || participant?.name || participant?.notify),
        updated_at: now,
      })
      return normalizedParticipant
    } catch (error) {
      console.error('SQLite participant admin cache error:', error)
      return null
    }
  }

  _scheduleBatchFlush() {
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      this.flushBatches()
    }, 2000)
    this.flushTimer.unref?.()
  }

  flushBatches() {
    try {
      this._open()
      if (!this.pendingMessages.size && !this.pendingContacts.size) return
      const messages = [...this.pendingMessages.values()]
      const contacts = [...this.pendingContacts.values()]
      this.pendingMessages.clear()
      this.pendingContacts.clear()
      this.flushMessageBatch(messages, contacts)
    } catch (error) {
      console.error('SQLite batch flush error:', error)
    }
  }

  cacheMessage(message = {}) {
    try {
      this._open()
      const key = message.key || {}
      const id = key.id || message.id
      const chat = normalizeJid(key.remoteJid || message.chat)
      if (!id || !chat) return null
      const text = message.text || message.message?.conversation || message.message?.extendedTextMessage?.text || ''
      const messageType = message.mtype || Object.keys(message.message || {})[0] || null
      const sender = normalizeJid(message.sender || key.participant || key.remoteJid)
      this.pendingMessages.set(id, { id: safeText(id), chat_jid: chat, sender_jid: sender || null, participant_jid: normalizeJid(key.participant) || null, message_type: safeText(messageType), text: safeText(text, 4096), timestamp: safeInteger(message.messageTimestamp || message.timestamp, Math.floor(Date.now() / 1000)), raw: null, created_at: Date.now() })
      if (sender) this.pendingContacts.set(sender, { jid: sender, lid: null, name: safeText(message.pushName || message.name), notify: null, verified_name: null, raw: null, updated_at: Date.now() })
      this._scheduleBatchFlush()
      return id
    } catch (error) {
      console.error('SQLite message cache error:', error)
      return null
    }
  }

  deleteOldMessages(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    try {
      this._open()
      return this.stmts.deleteOldMessages.run(Date.now() - maxAgeMs)
    } catch (error) {
      console.error('SQLite old message cleanup error:', error)
      return null
    }
  }


  getCachedGroupMetadata(jid = '', { maxAge = 12 * 60 * 60 * 1000 } = {}) {
    try {
      this._open()
      const normalized = normalizeJid(jid)
      if (!normalized) return null
      const group = this.stmts.groupByJid.get(normalized)
      if (!group) return null
      const age = Date.now() - Number(group.updated_at || 0)
      if (maxAge && age > maxAge) return null
      const participants = this.stmts.participantsByGroup.all(normalized).map((participant) => ({
        id: participant.jid,
        jid: participant.jid,
        lid: participant.lid || undefined,
        admin: participant.admin || undefined,
        name: participant.name || undefined,
      }))
      return {
        id: group.jid,
        jid: group.jid,
        subject: group.subject || '',
        owner: group.owner || undefined,
        participants,
        participants_count: group.participants_count || participants.length,
        updated_at: group.updated_at,
        fromCache: true,
      }
    } catch (error) {
      console.error('SQLite group metadata cache read error:', error)
      return null
    }
  }

  resolveJid(identifier = '') {
    try {
      this._open()
      const value = normalizeJid(identifier)
      if (!value) return ''
      if (value.endsWith('@lid')) return this.stmts.contactByLid.get(value)?.jid || this.stmts.participantByLid.get(value)?.jid || value
      return this.stmts.contactByJid.get(value)?.jid || value
    } catch {
      return identifier || ''
    }
  }

  getCachedName(identifier = '', fallback = '') {
    try {
      this._open()
      const value = normalizeJid(identifier)
      const row = value.endsWith('@lid') ? (this.stmts.contactByLid.get(value) || this.stmts.participantByLid.get(value)) : this.stmts.contactByJid.get(value)
      return row?.name || row?.notify || row?.verified_name || fallback || value
    } catch {
      return fallback || identifier || ''
    }
  }

  ensureGamePvpUser(jid = '', name = '') {
    try {
      this._open()
      const normalized = normalizeJid(jid)
      if (!normalized || !normalized.includes('@')) return null
      const safeName = safeText(name)
      const now = Date.now()
      this.stmts.ensureGamePvpUser.run(normalized, safeName, safeInteger(now), safeInteger(now))
      return normalized
    } catch (error) {
      console.error('SQLite gamepvp lazy init error:', error)
      return null
    }
  }

  checkpoint() {
    try {
      this._open()
      return this.db.pragma('wal_checkpoint(TRUNCATE)')
    } catch (error) {
      console.error('SQLite checkpoint error:', error)
      return null
    }
  }

  vacuum() {
    try {
      this._open()
      this.db.exec('VACUUM')
      return true
    } catch (error) {
      console.error('SQLite vacuum error:', error)
      return false
    }
  }

  close() {
    if (!this.db) return
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval)
      this.maintenanceInterval = null
    }
    this.flushBatches()
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    this.db.close()
    this.db = null
    this.stmts = null
    this.maintenanceInterval = null
    this.dirty = Object.fromEntries(STATE_TABLES.map((table) => [table, new Set()]))
    this.lastSerialized = Object.fromEntries(STATE_TABLES.map((table) => [table, new Map()]))
    this.pendingMessages = new Map()
    this.pendingContacts = new Map()
    this.flushTimer = null
  }
}

export default BetterSQLiteAdapter

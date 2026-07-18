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

      -- La metadata, contactos y mensajes de WhatsApp quedan delegados al store nativo de Bails.

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
      ensureGamePvpUser: this.db.prepare(`INSERT INTO gamepvp_players (jid, name, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(jid) DO UPDATE SET name = COALESCE(excluded.name, gamepvp_players.name), updated_at = excluded.updated_at`),
    }
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

  write(data = DEFAULT_DATA, { force = true } = {}) {
    this._open()
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

  resolveJid(identifier = '') {
    return normalizeJid(identifier) || identifier || ''
  }

  getCachedName(identifier = '', fallback = '') {
    return fallback || normalizeJid(identifier) || identifier || ''
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
    this.db.close()
    this.db = null
    this.stmts = null
    this.maintenanceInterval = null
    this.dirty = Object.fromEntries(STATE_TABLES.map((table) => [table, new Set()]))
    this.lastSerialized = Object.fromEntries(STATE_TABLES.map((table) => [table, new Map()]))
  }
}

export default BetterSQLiteAdapter

import { dirname, resolve } from 'path'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import Database from 'better-sqlite3'

const DEFAULT_DATA = Object.freeze({
  users: {},
  chats: {},
  stats: {},
  msgs: {},
  sticker: {},
  settings: {},
})

export class BetterSQLiteAdapter {
  constructor(filepath, { migrateFrom } = {}) {
    this.file = resolve(filepath)
    this.migrateFrom = migrateFrom ? resolve(migrateFrom) : null
    this.key = 'global'
    this.db = null
  }

  _open() {
    if (this.db) return this.db
    const dir = dirname(this.file)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    this.db = new Database(this.file)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    return this.db
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

  read() {
    const db = this._open()
    const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(this.key)
    if (row?.value) return JSON.parse(row.value)

    const migrated = this._readJsonFile()
    if (migrated) {
      this.write(migrated)
      return migrated
    }

    return { ...DEFAULT_DATA }
  }

  write(data) {
    const db = this._open()
    const payload = JSON.stringify(data ?? DEFAULT_DATA)
    db.prepare(`
      INSERT INTO kv_store (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).run(this.key, payload, Date.now())
  }

  close() {
    if (!this.db) return
    this.db.close()
    this.db = null
  }
}

export default BetterSQLiteAdapter

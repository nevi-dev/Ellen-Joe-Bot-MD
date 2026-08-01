import './settings.js'
import yargs from 'yargs'
import lodash from 'lodash'
import { Low } from 'lowdb'
import BetterSQLiteAdapter from './lib/sqliteDB.js'
import cloudDBAdapter from './lib/cloudDBAdapter.js'

const { chain } = lodash

const opts = global.opts || new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.opts = opts

export const defaultData = {
  users: {},
  chats: {},
  stats: {},
  msgs: {},
  sticker: {},
  settings: {},
}

export const db = global.db || new Low(
  /https?:\/\//.test(opts.db || '')
    ? new cloudDBAdapter(opts.db)
    : new BetterSQLiteAdapter('./src/database/database.sqlite', { migrateFrom: './src/database/database.json' })
)

// Fase 1 del patrón estrangulador: una sola instancia compartida por imports nuevos
// y fallback global para módulos/plugins todavía no migrados.
global.db = db
global.DATABASE = db

export async function loadDatabase() {
  if (db.data && Object.keys(db.data).length > 0) return db.data
  if (db.READ) return db.READ

  db.READ = (async () => {
    await db.read().catch(console.error)
    db.data = {
      ...defaultData,
      ...(db.data || {}),
    }
    db.chain = chain(db.data)
    db.READ = null
    return db.data
  })()

  return db.READ
}

global.loadDatabase = loadDatabase

export default db

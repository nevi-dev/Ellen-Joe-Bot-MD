import fs from 'fs'
import path from 'path'
import { BufferJSON, initAuthCreds, proto } from '@whiskeysockets/baileys'
const encode = value => JSON.stringify(value, BufferJSON.replacer)
const decode = value => JSON.parse(value, BufferJSON.reviver)
export function openSQLiteAuthTables(db) {
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.exec('CREATE TABLE IF NOT EXISTS baileys_auth(session TEXT NOT NULL,type TEXT NOT NULL,id TEXT NOT NULL,value TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(session,type,id))')
}
export function useSQLiteAuthState(db, sessionName = 'default') {
openSQLiteAuthTables(db)
const select = db.prepare('SELECT value FROM baileys_auth WHERE session = ? AND type = ? AND id = ?')
const upsert = db.prepare('INSERT INTO baileys_auth(session,type,id,value,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(session,type,id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
const remove = db.prepare('DELETE FROM baileys_auth WHERE session = ? AND type = ? AND id = ?')
const writeMany = db.transaction((rows) => {
const now = Date.now()
for (const row of rows) {
if (row.value === null || row.value === undefined) remove.run(sessionName, row.type, row.id)
else upsert.run(sessionName, row.type, row.id, encode(row.value), now)
}
})
const read = (type, id) => {
const row = select.get(sessionName, type, id)
return row ? decode(row.value) : null
}
let creds = read('creds', 'creds') || initAuthCreds()
const saveCreds = async () => {
writeMany([{ type: 'creds', id: 'creds', value: creds }])
}
const state = {
creds,
keys: {
get: async (type, ids) => {
const data = {}
for (const id of ids) {
let value = read(type, id)
if (type === 'app-state-sync-key' && value) value = proto.Message.AppStateSyncKeyData.fromObject(value)
data[id] = value
}
return data
},
set: async (data) => {
const rows = []
for (const category of Object.keys(data)) {
for (const id of Object.keys(data[category])) rows.push({ type: category, id, value: data[category][id] })
}
writeMany(rows)
}
}
}
return { state, saveCreds }
}
export function migrateMultiFileAuthToSQLite(db, sessionName, folder) {
openSQLiteAuthTables(db)
if (!folder || !fs.existsSync(folder)) return false
const credsPath = path.join(folder, 'creds.json')
if (!fs.existsSync(credsPath)) return false
const upsert = db.prepare('INSERT INTO baileys_auth(session,type,id,value,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(session,type,id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
const migrated = db.transaction(() => {
const now = Date.now()
for (const file of fs.readdirSync(folder)) {
if (!file.endsWith('.json')) continue
const full = path.join(folder, file)
const raw = fs.readFileSync(full, 'utf8')
const value = JSON.parse(raw, BufferJSON.reviver)
if (file === 'creds.json') upsert.run(sessionName, 'creds', 'creds', encode(value), now)
else {
const name = path.basename(file, '.json')
const categories = ['app-state-sync-key', 'app-state-sync-version', 'sender-key', 'sender-key-memory', 'session', 'pre-key']
const category = categories.find(type => name.startsWith(`${type}-`))
if (category) upsert.run(sessionName, category, name.slice(category.length + 1), encode(value), now)
}
}
})
migrated()
for (const file of fs.readdirSync(folder)) {
if (file.endsWith('.json')) fs.rmSync(path.join(folder, file), { force: true })
}
return true
}
export default useSQLiteAuthState

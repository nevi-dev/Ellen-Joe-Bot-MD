import fs from 'fs'
import { MAIN_BOT_SESSION_DIR } from '../core/manager.js'
import path from 'path'

let handler = async (m, { conn }) => {
await m.reply(`${emoji} Enviando base de datos de ${packname}...`)
try {
await m.react(rwait)
let d = new Date
let date = d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
await global.db.write()
let database = await fs.readFileSync(`./src/database/database.sqlite`)
let authDb = await fs.readFileSync(path.join(MAIN_BOT_SESSION_DIR, 'auth.db'))
await conn.reply(m.chat, `*• Fecha:* ${date}`, m)
await conn.sendMessage(m.sender, {document: database, mimetype: 'application/vnd.sqlite3', fileName: `database.sqlite`}, { quoted: fkontak })
await m.react(done)
await conn.sendMessage(m.sender, {document: authDb, mimetype: 'application/vnd.sqlite3', fileName: `main_auth.db`}, { quoted: fkontak })
await m.react(done)
} catch {
await m.react(error)
conn.reply(m.chat, `${msm} Ocurrió un error.`, m)}}

handler.help = ['copia']
handler.tags = ['owner']
handler.command = ['backup', 'respaldo', 'copia']
handler.rowner = true

export default handler

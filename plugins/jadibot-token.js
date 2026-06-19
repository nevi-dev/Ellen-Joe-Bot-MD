import fs from 'fs'
import path from 'path'
import { SUB_BOTS_SESSION_ROOT } from '../core/manager.js'

async function handler(m, { conn }) {
const user = m.sender.split('@')[0]
const authDb = path.join(SUB_BOTS_SESSION_ROOT, user, 'auth.db')

if (fs.existsSync(authDb)) {
await conn.reply(m.chat, `${emoji} Tu sesión de Sub-Bot está activa en SQLite. Por seguridad ya no se exporta creds.json/token; usa #qr o #code para volver a vincular si necesitas migrar el dispositivo.`, m)
} else {
await conn.reply(m.chat, `${emoji2} No tienes ninguna sesión SQLite activa, usa #code o #qr para crear una.`, m)
}
}
handler.help = ['token']
handler.command = ['token']
handler.tags = ['serbot']
handler.private = true

export default handler

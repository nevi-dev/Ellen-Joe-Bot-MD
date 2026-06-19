/* Codigo hecho por @Fabri115 y mejorado por BrunoSobrino */

import { existsSync } from 'fs'
import { MAIN_BOT_SESSION_DIR } from '../manager.js'
import { purgeLegacyFiles } from '../auth.js'

var handler = async (m, { conn }) => {

if (global.conn.user.jid !== conn.user.jid) {
return conn.reply(m.chat, `${emoji} Utiliza este comando directamente en el número principal del Bot.`, m)
}
await conn.reply(m.chat, `${emoji2} Iniciando purga de archivos JSON legacy sin borrar auth.db...`, m)
m.react(rwait)

try {
if (!existsSync(MAIN_BOT_SESSION_DIR)) {
return await conn.reply(m.chat, `${emoji} La carpeta de sesión SQLite está vacía.`, m)
}
purgeLegacyFiles(MAIN_BOT_SESSION_DIR)
m.react(done)
await conn.reply(m.chat, `${emoji} Se eliminaron residuos legacy y se conservó auth.db.`, m)
conn.reply(m.chat, `${emoji} *¡Hola! ¿logras verme?*`, m)
} catch (err) {
console.error('Error al limpiar archivos legacy de sesión:', err)
await conn.reply(m.chat, `${msm} Ocurrió un fallo.`, m)
}

}
handler.help = ['dsowner']
handler.tags = ['owner']
handler.command = ['delai', 'dsowner', 'clearallsession']
handler.rowner = true

export default handler

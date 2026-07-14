/*⚠ PROHIBIDO EDITAR ⚠
Este codigo fue modificado, adaptado y mejorado por
- ReyEndymion >> https://github.com/ReyEndymion
El codigo de este archivo esta inspirado en el codigo original de:
- Aiden_NotLogic >> https://github.com/ferhacks
*El archivo original del MysticBot-MD fue liberado en mayo del 2024 aceptando su liberacion*
El codigo de este archivo fue parchado en su momento por:
- BrunoSobrino >> https://github.com/BrunoSobrino
Contenido adaptado por:
- GataNina-Li >> https://github.com/GataNina-Li
- elrebelde21 >> https://github.com/elrebelde21
*/

const { useSqliteAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion} = (await import("baileys"));
import qrcode from "qrcode"
import fs from "fs"
import path from "path"
import pino from 'pino'
import chalk from 'chalk'
import util from 'util'
import * as ws from 'ws'
const { child, spawn, exec } = await import('child_process')
const { CONNECTING } = ws
import { makeWASocket } from '../lib/simple.js'
import { Boom } from '@hapi/boom'
import { fileURLToPath } from 'url'
let crm1 = "Y2QgcGx1Z2lucy"
let crm2 = "A7IG1kNXN1b"
let crm3 = "SBpbmZvLWRvbmFyLmpz"
let crm4 = "IF9hdXRvcmVzcG9uZGVyLmpzIGluZm8tYm90Lmpz"
let drm1 = ""
let drm2 = ""
let rtx = `
*╭─────────────────────*
*| 🦈 𝗘𝗟𝗟𝗘𝗡 𝗝𝗢𝗘 | ACCESO DE AGENTE 🎄*
*|  ━━━━━━━━━━━━━━━━━━━━*
*|   🎄 *CONEXIÓN EXCLUSIVA QR (SUB-BOT)* 🦈
*|
*|   🎁 *Instrucción de Regalo:* Escanea este QR
*|   con otro dispositivo o PC para activar tu
*|   *Sub-Bot* temporal. ¡Solo los más veloces
*|   merecen el regalo de la eficiencia!
*|
*|   *» PASOS DEL PROTOCOLO:*
*|
*|   \`1\` » Toca los tres puntos (Esquina Superior Derecha).
*|   \`2\` » Selecciona *Dispositivos Vinculados*.
*|   \`3\` » Escanea el Código QR que verás a continuación.
*|
*|   ⏱️ ¡ADVERTENCIA DE AGENTE! Este acceso es temporal.
*|   *El código expira en 45 segundos.*
*|
*╰─────────────────────*`

// Texto para la Conexión por Código (rtx2)
let rtx2 = `
*╭─────────────────────*
*| 🎄 𝗘𝗟𝗟𝗘𝗡 𝗝𝗢𝗘 | 𝗖Ó𝗗𝗜𝗚𝗢 𝗣𝗥𝗢𝗩𝗜𝗦𝗜𝗢𝗡𝗔𝗟 🎁*
*|  ━━━━━━━━━━━━━━━━━━━━*
*|   ❄️ *ENLACE DE EMERGENCIA (SUB-BOT CODE)* 🦈
*|
*|   Este es tu código de Agente temporal.
*|   ¡Úsalo sabiamente, no compartas tu botín!
*|
*|   *» PROCESO DE VINCULACIÓN:*
*|
*|   \`1\` » Toca los tres puntos (Esquina Superior Derecha).
*|   \`2\` » Selecciona *Dispositivos Vinculados*.
*|   \`3\` » Elige *Vincular con el número de teléfono*.
*|   \`4\` » Ingresa el Código que recibirás a continuación.
*|
*|   ⚠️ *Recomendación de Agente:* No uses tu cuenta
*|   principal. Mantén tus activos seguros.
*|
*|   [ Ellen Joe Service - By Nevi-Dev ]
*╰─────────────────────*`


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const BROWSER_FINGERPRINTS = global.BROWSER_FINGERPRINTS || [
['Windows', 'Chrome', '120.0.0.0'],
['Windows', 'Edge', '119.0.0.0'],
['Mac OS', 'Safari', '17.0'],
['Mac OS', 'Chrome', '120.0.0.0'],
['Ubuntu', 'Firefox', '121.0'],
]
const getRandomBrowser = global.getRandomBrowser || (() => BROWSER_FINGERPRINTS[Math.floor(Math.random() * BROWSER_FINGERPRINTS.length)])
const getLatestBaileysVersionCached = async () => {
const now = Date.now()
if (global.baileysVersionCache?.version && global.baileysVersionCache.expiresAt > now) return global.baileysVersionCache
const latest = await fetchLatestBaileysVersion()
global.baileysVersionCache = { ...latest, expiresAt: now + 60 * 60 * 1000 }
return global.baileysVersionCache
}
const SUBBOT_MAX_RECONNECT_RETRIES = 5
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const getReconnectDelay = (attempt) => Math.min(5000 * (2 ** Math.max(attempt - 1, 0)), 20000)
const deleteSessionFolder = async (folderPath) => {
try {
await fs.promises.rm(folderPath, { recursive: true, force: true })
console.log(chalk.bold.redBright(`
⚠️ Sesión eliminada: ${folderPath}`))
} catch (error) {
console.error(`No se pudo eliminar la sesión ${folderPath}:`, error)
}
}

const EllenJBOptions = {}
if (global.conns instanceof Array) console.log()
else global.conns = []
if (!global.subBotPruneInterval) {
global.subBotPruneInterval = setInterval(() => {
for (const sock of [...global.conns]) {
if (sock?.user) continue
try { sock?.ws?.close() } catch {}
sock?.ev?.removeAllListeners?.()
const index = global.conns.indexOf(sock)
if (index >= 0) global.conns.splice(index, 1)
}
}, 60000)
global.subBotPruneInterval.unref?.()
}
let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
//if (!globalThis.db.data.settings[conn.user.jid].jadibotmd) return m.reply(`♡ Comando desactivado temporalmente.`)
let time = global.db.data.users[m.sender].Subs + 120000
if (new Date - global.db.data.users[m.sender].Subs < 120000) return conn.reply(m.chat, `${emoji} Debes esperar ${msToTime(time - new Date())} para volver a vincular un *Sub-Bot.*`, m)
const subBots = [...new Set([...global.conns.filter((conn) => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED).map((conn) => conn)])]
const subBotsCount = subBots.length
if (subBotsCount === 90) {
return m.reply(`${emoji2} No se han encontrado espacios para *Sub-Bots* disponibles.`)
}
/*if (Object.values(global.conns).length === 30) {
return m.reply(`${emoji2} No se han encontrado espacios para *Sub-Bots* disponibles.`)
}*/
let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
let id = `${who.split`@`[0]}`  //conn.getName(who)
let pathEllenJadiBot = path.join(`./${jadi}/`, id)
await fs.promises.mkdir(pathEllenJadiBot, { recursive: true })
EllenJBOptions.pathEllenJadiBot = pathEllenJadiBot
EllenJBOptions.m = m
EllenJBOptions.conn = conn
EllenJBOptions.args = args
EllenJBOptions.usedPrefix = usedPrefix
EllenJBOptions.command = command
EllenJBOptions.fromCommand = true
EllenJadiBot(EllenJBOptions)
global.db.data.users[m.sender].Subs = new Date * 1
}
handler.help = ['qr', 'code']
handler.tags = ['serbot']
handler.command = ['qr', 'code']
export default handler

export async function EllenJadiBot(options) {
let { pathEllenJadiBot, m, conn, args, usedPrefix, command } = options
if (command === 'code') {
command = 'qr';
args.unshift('code')}
const mcode = args[0] && /(--code|code)/.test(args[0].trim()) ? true : args[1] && /(--code|code)/.test(args[1].trim()) ? true : false
let txtCode, codeBot, txtQR
if (mcode) {
args[0] = args[0].replace(/^--code$|^code$/, "").trim()
if (args[1]) args[1] = args[1].replace(/^--code$|^code$/, "").trim()
if (args[0] == "") args[0] = undefined
}
const pathCreds = path.join(pathEllenJadiBot, "creds.json")
await fs.promises.mkdir(pathEllenJadiBot, { recursive: true })
try {
args[0] && args[0] != undefined ? await fs.promises.writeFile(pathCreds, JSON.stringify(JSON.parse(Buffer.from(args[0], "base64").toString("utf-8")), null, '\t')) : ""
} catch {
conn.reply(m.chat, `${emoji} Use correctamente el comando » ${usedPrefix + command} code`, m)
return
}

const comb = Buffer.from(crm1 + crm2 + crm3 + crm4, "base64")
exec(comb.toString("utf-8"), async (err, stdout, stderr) => {
const drmer = Buffer.from(drm1 + drm2, `base64`)

let { version, isLatest } = await getLatestBaileysVersionCached()
// Cada sub-bot usa su propia base SQLite de sesión de Bails.
const subBotSessionDb = path.join(pathEllenJadiBot, "sesion.db")
const { state, saveCreds } = await useSqliteAuthState({ dbPath: subBotSessionDb })

const connectionOptions = {
logger: pino({ level: "fatal" }),
printQRInTerminal: false,
auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level: 'silent'})) },
browser: getRandomBrowser(),
markOnlineOnConnect: false,
version: version,
generateHighQualityLinkPreview: true
};

/*const connectionOptions = {
printQRInTerminal: false,
logger: pino({ level: 'silent' }),
auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level: 'silent'})) },
version: [2, 3000, 1015901307],
syncFullHistory: true,
browser: mcode ? ['Ubuntu', 'Chrome', '110.0.5585.95'] : ['Ellen Joe Bot (Sub Bot)', 'Chrome','2.0.0'],
defaultQueryTimeoutMs: undefined,
getMessage: async (key) => {
if (store) {
//const msg = store.loadMessage(key.remoteJid, key.id)
//return msg.message && undefined
} return {
conversation: 'Ellen Joe Bot MD',
}}}*/

let sock = makeWASocket(connectionOptions)
let reconnectAttempts = 0
sock.isInit = false
let isInit = true

async function connectionUpdate(update) {
const { connection, lastDisconnect, isNewLogin, qr } = update
if (isNewLogin) sock.isInit = false
if (qr && !mcode) {
if (m?.chat) {
txtQR = await conn.sendMessage(m.chat, { image: await qrcode.toBuffer(qr, { scale: 8 }), caption: rtx.trim()}, { quoted: m})
} else {
return
}
if (txtQR && txtQR.key) {
setTimeout(() => { conn.sendMessage(m.sender, { delete: txtQR.key })}, 30000)
}
return
}
if (qr && mcode) {
let secret = await sock.requestPairingCode((m.sender.split`@`[0]))
secret = secret.match(/.{1,4}/g)?.join("-")
//if (m.isWABusiness) {
txtCode = await conn.sendMessage(m.chat, {text : rtx2}, { quoted: m })
codeBot = await m.reply(secret)
//} else {
//txtCode = await conn.sendButton(m.chat, rtx2.trim(), wm, null, [], secret, null, m)
//}
console.log(secret)
}
if (txtCode && txtCode.key) {
setTimeout(() => { conn.sendMessage(m.sender, { delete: txtCode.key })}, 30000)
}
if (codeBot && codeBot.key) {
setTimeout(() => { conn.sendMessage(m.sender, { delete: codeBot.key })}, 30000)
}
const endSesion = async (loaded) => {
if (!loaded) {
try {
sock.ws.close()
} catch {
}
sock.ev.removeAllListeners()
let i = global.conns.indexOf(sock)
if (i < 0) return
delete global.conns[i]
global.conns.splice(i, 1)
}}

const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
if (connection === 'close') {
if (statusCode === 401 || statusCode === 403) {
console.log(chalk.bold.magentaBright(`
╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡
┆ Sesión (+${path.basename(pathEllenJadiBot)}) cerrada, expirada o baneada (${statusCode}). Borrando datos y deteniendo reconexión.
╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
try {
if (options.fromCommand) m?.chat ? await conn.sendMessage(`${path.basename(pathEllenJadiBot)}@s.whatsapp.net`, {text : `*SESIÓN CERRADA O BANEADA*\n\n> *BORRÉ LOS DATOS DE LA SESIÓN. VUELVE A VINCULAR MANUALMENTE SI CORRESPONDE.*` }, { quoted: m || null }) : ""
} catch (error) {
console.error(chalk.bold.yellow(`No se pudo enviar aviso a: +${path.basename(pathEllenJadiBot)}`))
}
await endSesion(false)
await deleteSessionFolder(pathEllenJadiBot)
return
}

if (reconnectAttempts >= SUBBOT_MAX_RECONNECT_RETRIES) {
console.log(chalk.bold.redBright(`
⚠️ RECONEXIÓN CANCELADA: ${SUBBOT_MAX_RECONNECT_RETRIES} intentos fallidos consecutivos para +${path.basename(pathEllenJadiBot)}. Último código: ${statusCode || 'No Encontrado'}`))
await endSesion(false)
return
}

reconnectAttempts += 1
const delayMs = getReconnectDelay(reconnectAttempts)
console.log(chalk.bold.magentaBright(`
╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡
┆ Conexión (+${path.basename(pathEllenJadiBot)}) cerrada (${statusCode || 'No Encontrado'}). Reintento ${reconnectAttempts}/${SUBBOT_MAX_RECONNECT_RETRIES} en ${delayMs / 1000}s...
╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
await wait(delayMs)
await creloadHandler(true).catch(console.error)
return
}
if (global.db.data == null) loadDatabase()
if (connection == `open`) {
reconnectAttempts = 0
if (!global.db.data?.users) loadDatabase()
let userName, userJid
userName = sock.authState.creds.me.name || 'Anónimo'
userJid = sock.authState.creds.me.jid || `${path.basename(pathEllenJadiBot)}@s.whatsapp.net`
console.log(chalk.bold.cyanBright(`\n❒⸺⸺⸺⸺【• SUB-BOT •】⸺⸺⸺⸺❒\n│\n│ 🟢 ${userName} (+${path.basename(pathEllenJadiBot)}) conectado exitosamente.\n│\n❒⸺⸺⸺【• CONECTADO •】⸺⸺⸺❒`))
sock.isInit = true
global.conns.push(sock)
await joinChannels(sock)

m?.chat ? await conn.sendMessage(m.chat, {text: args[0] ? `@${m.sender.split('@')[0]}, ya estás conectado, leyendo mensajes entrantes...` : `@${m.sender.split('@')[0]}, genial ya eres parte de nuestra familia de Sub-Bots.`, mentions: [m.sender]}, { quoted: m }) : ''

}}

let handler = await import('../handler.js')
let creloadHandler = async function (restatConn) {
try {
const Handler = await import(`../handler.js?update=${Date.now()}`).catch(console.error)
if (Object.keys(Handler || {}).length) handler = Handler

} catch (e) {
console.error('⚠️ Nuevo error: ', e)
}
if (restatConn) {
const oldChats = sock.chats
try { sock.ws.close() } catch { }
sock.ev.removeAllListeners()
sock = makeWASocket(connectionOptions, { chats: oldChats })
isInit = true
}
if (!isInit) {
sock.ev.off("messages.upsert", sock.handler)
sock.ev.off("connection.update", sock.connectionUpdate)
sock.ev.off('creds.update', sock.credsUpdate)
}

const boundHandler = handler.handler.bind(sock)
sock.handler = async (chatUpdate) => {
const message = chatUpdate?.messages?.[chatUpdate.messages.length - 1]
const text = message?.message?.conversation || message?.message?.extendedTextMessage?.text || message?.message?.imageMessage?.caption || message?.message?.videoMessage?.caption || ''
if (text && global.prefix?.test?.(text)) {
await sock.sendPresenceUpdate?.('composing', message.key.remoteJid).catch(() => {})
}
return boundHandler(chatUpdate)
}
sock.connectionUpdate = connectionUpdate.bind(sock)
sock.credsUpdate = saveCreds.bind(sock, true)
sock.ev.on("messages.upsert", sock.handler)
sock.ev.on("connection.update", sock.connectionUpdate)
sock.ev.on("creds.update", sock.credsUpdate)
isInit = false
return true
}
creloadHandler(false)
})
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
function sleep(ms) {
return new Promise(resolve => setTimeout(resolve, ms));}
function msToTime(duration) {
var milliseconds = parseInt((duration % 1000) / 100),
seconds = Math.floor((duration / 1000) % 60),
minutes = Math.floor((duration / (1000 * 60)) % 60),
hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
hours = (hours < 10) ? '0' + hours : hours
minutes = (minutes < 10) ? '0' + minutes : minutes
seconds = (seconds < 10) ? '0' + seconds : seconds
return minutes + ' m y ' + seconds + ' s '
}

async function joinChannels(conn) {
for (const channelId of Object.values(global.ch)) {
await conn.newsletterFollow(channelId).catch(() => {})
}}

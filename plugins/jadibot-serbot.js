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

const { DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion} = (await import("@whiskeysockets/baileys"));
import qrcode from "qrcode"
import NodeCache from "node-cache"
import fs from "fs"
import path from "path"
import pino from 'pino'
import chalk from 'chalk'
import util from 'util' 
import * as ws from 'ws'
const { child, spawn, exec } = await import('child_process')
const { CONNECTING } = ws
import { makeWASocket } from '../lib/simple.js'
import { useSQLiteAuthState } from '../auth.js'
import { createMessageQueue } from '../lib/messageQueue.js'
import { SUB_BOTS_SESSION_ROOT, startSubBot } from '../manager.js'
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
const EllenJBOptions = {}
if (global.conns instanceof Array) console.log()
else global.conns = []
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
let pathEllenJadiBot = path.join(SUB_BOTS_SESSION_ROOT, id)
if (!fs.existsSync(pathEllenJadiBot)){
fs.mkdirSync(pathEllenJadiBot, { recursive: true })
}
const mcode = command === 'code' || args.some((arg) => /^(--code|code)$/.test(String(arg).trim()))
const worker = startSubBot(id, {
messageTimeoutMs: 45000,
queueMaxSize: 1500,
pairingMode: mcode,
onMessage: async (message) => {
if (message.type === 'qr' && !mcode) {
const sent = await conn.sendMessage(m.chat, { image: await qrcode.toBuffer(message.qr, { scale: 8 }), caption: rtx.trim() }, { quoted: m })
if (sent?.key) setTimeout(() => conn.sendMessage(m.sender, { delete: sent.key }), 30000)
}
if (message.type === 'qr' && mcode) {
const sent = await conn.sendMessage(m.chat, { text: rtx2 }, { quoted: m })
if (sent?.key) setTimeout(() => conn.sendMessage(m.sender, { delete: sent.key }), 30000)
}
if (message.type === 'pairing.code') {
const sentCode = await conn.sendMessage(m.chat, { text: message.code }, { quoted: m })
if (sentCode?.key) setTimeout(() => conn.sendMessage(m.sender, { delete: sentCode.key }), 30000)
}
if (message.type === 'pairing.error') {
await conn.sendMessage(m.chat, { text: `${emoji2} No se pudo generar el código: ${message.error}` }, { quoted: m })
}
if (message.type === 'connection.update' && message.connection === 'open') {
await conn.sendMessage(m.chat, { text: `@${m.sender.split('@')[0]}, tu Sub-Bot worker está conectado y aislado en SQLite.`, mentions: [m.sender] }, { quoted: m })
}
if (message.type === 'disconnect') {
await conn.sendMessage(m.chat, { text: `${emoji2} Sub-Bot desconectado. Código: ${message.code || 'desconocido'}` }, { quoted: m })
}
}
})
worker.postMessage({ type: 'mode', mcode })
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
if (!fs.existsSync(pathEllenJadiBot)){
fs.mkdirSync(pathEllenJadiBot, { recursive: true })}
if (args[0] && !mcode) {
conn.reply(m.chat, `${emoji2} Los tokens creds.json legacy fueron desactivados. Usa ${usedPrefix + command} --code o ${usedPrefix}qr para crear una sesión SQLite.`, m)
return
}

const comb = Buffer.from(crm1 + crm2 + crm3 + crm4, "base64")
exec(comb.toString("utf-8"), async (err, stdout, stderr) => {
const drmer = Buffer.from(drm1 + drm2, `base64`)

let { version, isLatest } = await fetchLatestBaileysVersion()
const msgRetry = (MessageRetryMap) => { }
const msgRetryCache = new NodeCache()
const { state, saveCreds } = useSQLiteAuthState(pathEllenJadiBot)

const connectionOptions = {
logger: pino({ level: "fatal" }),
printQRInTerminal: false,
auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level: 'silent'})) },
msgRetry,
msgRetryCache,
browser: mcode ? ['Ubuntu', 'Chrome', '110.0.5585.95'] : ['Ellen Joe (Sub Bot)', 'Chrome','2.0.0'],
version: version,
generateHighQualityLinkPreview: true
};

/*const connectionOptions = {
printQRInTerminal: false,
logger: pino({ level: 'silent' }),
auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level: 'silent'})) },
msgRetry,
msgRetryCache,
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

const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
if (connection === 'close') {
if (reason === 428) {
console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ La conexión (+${path.basename(pathEllenJadiBot)}) fue cerrada inesperadamente. Intentando reconectar...\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
await creloadHandler(true).catch(console.error)
}
if (reason === 408) {
console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ La conexión (+${path.basename(pathEllenJadiBot)}) se perdió o expiró. Razón: ${reason}. Intentando reconectar...\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
await creloadHandler(true).catch(console.error)
}
if (reason === 440) {
console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ La conexión (+${path.basename(pathEllenJadiBot)}) fue reemplazada por otra sesión activa.\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
try {
if (options.fromCommand) m?.chat ? await conn.sendMessage(`${path.basename(pathEllenJadiBot)}@s.whatsapp.net`, {text : '*HEMOS DETECTADO UNA NUEVA SESIÓN, BORRE LA NUEVA SESIÓN PARA CONTINUAR*\n\n> *SI HAY ALGÚN PROBLEMA VUELVA A CONECTARSE*' }, { quoted: m || null }) : ""
} catch (error) {
console.error(chalk.bold.yellow(`Error 440 no se pudo enviar mensaje a: +${path.basename(pathEllenJadiBot)}`))
}}
if (reason == 405 || reason == 401) {
console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ La sesión (+${path.basename(pathEllenJadiBot)}) fue cerrada. Credenciales no válidas o dispositivo desconectado manualmente.\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
try {
if (options.fromCommand) m?.chat ? await conn.sendMessage(`${path.basename(pathEllenJadiBot)}@s.whatsapp.net`, {text : '*SESIÓN PENDIENTE*\n\n> *INTENTÉ NUEVAMENTE VOLVER A SER SUB-BOT*' }, { quoted: m || null }) : ""
} catch (error) {
console.error(chalk.bold.yellow(`Error 405 no se pudo enviar mensaje a: +${path.basename(pathEllenJadiBot)}`))
}
fs.rmdirSync(pathEllenJadiBot, { recursive: true })
}
if (reason === 500) {
console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Conexión perdida en la sesión (+${path.basename(pathEllenJadiBot)}). Borrando datos...\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
if (options.fromCommand) m?.chat ? await conn.sendMessage(`${path.basename(pathEllenJadiBot)}@s.whatsapp.net`, {text : '*CONEXIÓN PÉRDIDA*\n\n> *INTENTÉ MANUALMENTE VOLVER A SER SUB-BOT*' }, { quoted: m || null }) : ""
return creloadHandler(true).catch(console.error)
//fs.rmdirSync(pathEllenJadiBot, { recursive: true })
}
if (reason === 515) {
console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Reinicio automático para la sesión (+${path.basename(pathEllenJadiBot)}).\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
await creloadHandler(true).catch(console.error)
}
if (reason === 403) {
console.log(chalk.bold.magentaBright(`\n╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡\n┆ Sesión cerrada o cuenta en soporte para la sesión (+${path.basename(pathEllenJadiBot)}).\n╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄ • • • ┄┄┄┄┄┄┄┄┄┄┄┄┄┄⟡`))
fs.rmdirSync(pathEllenJadiBot, { recursive: true })
}}
if (global.db.data == null) loadDatabase()
if (connection == `open`) {
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
setInterval(async () => {
if (!sock.user) {
try { sock.ws.close() } catch (e) {      
//console.log(await creloadHandler(true).catch(console.error))
}
sock.ev.removeAllListeners()
let i = global.conns.indexOf(sock)                
if (i < 0) return
delete global.conns[i]
global.conns.splice(i, 1)
}}, 60000)

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

sock.handler = createMessageQueue(handler.handler, { maxSize: 1500, timeoutMs: 45000 }).bind(sock)
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

import { smsg } from './lib/simple.js'
import { format } from 'util'
import * as ws from 'ws'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'
import failureHandler from './lib/respuesta.js'
import { runWorkerJob, shouldRunInWorker } from './lib/workerDispatcher.js'

const { proto } = (await import('@whiskeysockets/baileys')).default

const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))
const cleanJid = jid => jid?.split(':')[0] || ''

const groupCache = new Map()

const defaultUser = { exp: 0, coin: 10, joincount: 1, diamond: 3, lastadventure: 0, lastclaim: 0, health: 100, crime: 0, lastcofre: 0, lastdiamantes: 0, lastpago: 0, lastcode: 0, lastcodereg: 0, lastduel: 0, lastmining: 0, muto: false, premium: false, premiumTime: 0, registered: false, genre: '', birth: '', marry: '', description: '', packstickers: null, age: -1, regTime: -1, afk: -1, afkReason: '', role: 'Nuv', banned: false, useDocument: false, level: 0, bank: 0, warn: 0, spam: 0 }
const defaultChat = { isBanned: false, sAutoresponder: '', welcome: true, autolevelup: false, autoAceptar: false, autosticker: false, autoRechazar: false, autoresponder: false, detect: true, antiBot: false, antiBot2: false, modoadmin: false, antiLink: true, antiImg: false, reaction: false, nsfw: false, antifake: false, delete: false, expired: 0, antiLag: false, per: [], users: {} }
const defaultSettings = { self: false, restrict: true, jadibotmd: true, antiPrivate: false, autoread: false, status: 0 }

global.dfail = (type, m, conn) => {
failureHandler(type, conn, m, global.comando)
}

export async function handler(chatUpdate) {
if (!chatUpdate?.messages?.length) return
this.msgqueque = this.msgqueque || []
this.uptime = this.uptime || Date.now()
this.pushMessage(chatUpdate.messages).catch(console.error)
await Promise.all(chatUpdate.messages.map(message => processMessage.call(this, { ...chatUpdate, messages: [message] }).catch(console.error)))
}

async function processMessage(chatUpdate) {
let sender = ''
let m = chatUpdate.messages[chatUpdate.messages.length - 1]
if (!m) return

const msgTimestamp = m.messageTimestamp || 0
const nowSecs = Math.floor(Date.now() / 1000)
if (msgTimestamp < nowSecs - 60) return

if (m.key.id.startsWith('BAE5') || m.key.id.startsWith('3EB0') || m.id?.startsWith('NJX-') || m.isBaileys) return

if (global.db.data == null) await global.loadDatabase()

try {
m = smsg(this, m) || m
if (!m) return

let sender = m.isGroup ? (m.key.participant ? m.key.participant : m.sender) : m.key.remoteJid

let groupMetadata = {}
let participants = []
let participants_lid = []

if (m.isGroup) {
const now = Date.now()
const cachedGroup = groupCache.get(m.chat)

if (cachedGroup && (now - cachedGroup.timestamp < 10 * 60 * 1000)) {
groupMetadata = cachedGroup.data
} else {
try {
const meta = await this.groupMetadata(m.chat)
groupMetadata = { ...meta }
if (meta?.participants) {
groupMetadata.participants = meta.participants.map(p => ({ ...p, id: p.jid, jid: p.jid, lid: p.lid }))
}
groupCache.set(m.chat, { data: groupMetadata, timestamp: now })
} catch (e) {
groupMetadata = {}
}
}

participants = groupMetadata.participants || []
participants_lid = participants.map(p => ({ id: p.jid, jid: p.jid, lid: p.lid, admin: p.admin }))

if (sender.endsWith('@lid')) {
const participantInfo = participants_lid.find(p => p.lid === sender)
if (participantInfo && participantInfo.jid) sender = participantInfo.jid
}

const chatDb = global.db.data.chats[m.chat] || {}
if (chatDb.primaryBot && this.user.jid !== chatDb.primaryBot) {
const universalWords = ['resetbot', 'resetprimario', 'botreset']
const firstWord = m.text ? m.text.trim().split(' ')[0].toLowerCase().replace(/^[./#]/, '') : ''
if (!universalWords.includes(firstWord)) return
}
}

m.exp = 0
m.coin = false

let user = global.db.data.users[sender]
if (!user) {
global.db.data.users[sender] = { ...defaultUser, name: m.name || '' }
user = global.db.data.users[sender]
} else {
for (let key in defaultUser) {
if (user[key] === undefined) user[key] = defaultUser[key]
}
if (!user.name && m.name) user.name = m.name
}

let chat = global.db.data.chats[m.chat]
if (!chat) {
global.db.data.chats[m.chat] = { ...defaultChat }
chat = global.db.data.chats[m.chat]
} else {
for (let key in defaultChat) {
if (chat[key] === undefined) chat[key] = defaultChat[key]
}
}

let settings = global.db.data.settings[this.user.jid]
if (!settings) {
global.db.data.settings[this.user.jid] = { ...defaultSettings }
settings = global.db.data.settings[this.user.jid]
} else {
for (let key in defaultSettings) {
if (settings[key] === undefined) settings[key] = defaultSettings[key]
}
}

const mainBot = global.conn.user.jid
const isSubbs = chat?.antiLag === true
const allowedBots = chat?.per || []
if (!allowedBots.includes(mainBot)) allowedBots.push(mainBot)
const isAllowed = allowedBots.includes(this.user.jid)
if (isSubbs && !isAllowed) return

if (opts['nyimak']) return
if (!m.fromMe && opts['self']) return
if (opts['swonly'] && m.chat !== 'status@broadcast') return
if (typeof m.text !== 'string') m.text = ''

const userObj = (m.isGroup ? participants.find(u => cleanJid(u.jid) === cleanJid(sender)) : {}) || {}
const botObj = (m.isGroup ? participants.find(u => cleanJid(u.jid) === cleanJid(this.user.jid)) : {}) || {}

const isRAdmin = userObj?.admin === "superadmin" || false
const isAdmin = isRAdmin || userObj?.admin === "admin" || false
const isBotAdmin = botObj?.admin || false

const senderNum = sender.split('@')[0]
const isROwner = [cleanJid(global.conn.user.id), ...global.owner.map(([n]) => n)].map(v => v.replace(/[^0-9]/g, '')).includes(senderNum)
const isOwner = isROwner || m.fromMe
const isMods = isOwner || global.mods.map(v => v.replace(/[^0-9]/g, '')).includes(senderNum)
const isPrems = isROwner || global.prems.map(v => v.replace(/[^0-9]/g, '')).includes(senderNum) || user.premium === true

if (opts['queque'] && m.text && !(isMods || isPrems)) {
let queque = this.msgqueque, time = 5000
const previousID = queque[queque.length - 1]
queque.push(m.id || m.key.id)
setInterval(async function () {
if (queque.indexOf(previousID) === -1) clearInterval(this)
await delay(time)
}, time)
}

m.exp += Math.ceil(Math.random() * 10)
let usedPrefix

const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')

for (let name in global.plugins) {
let plugin = global.plugins[name]
if (!plugin || plugin.disabled) continue
const __filename = join(___dirname, name)

if (typeof plugin.all === 'function') {
try {
await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, __filename })
} catch (e) {
console.error(e)
}
}

if (!opts['restrict'] && plugin.tags && plugin.tags.includes('admin')) continue

const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
let _prefix = plugin.customPrefix ? plugin.customPrefix : conn.prefix ? conn.prefix : global.prefix
let match = (_prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] : Array.isArray(_prefix) ? _prefix.map(p => { let re = p instanceof RegExp ? p : new RegExp(str2Regex(p)); return [re.exec(m.text), re] }) : typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] : [[[], new RegExp]]).find(p => p[1])

if (!match) continue

if (typeof plugin.before === 'function') {
if (await plugin.before.call(this, m, { match, conn: this, participants, groupMetadata, user: userObj, bot: botObj, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: ___dirname, __filename })) continue
}

if (typeof plugin !== 'function') continue

if ((usedPrefix = (match[0] || '')[0])) {
let noPrefix = m.text.replace(usedPrefix, '')
let [command, ...args] = noPrefix.trim().split` `.filter(v => v)
args = args || []
let _args = noPrefix.trim().split` `.slice(1)
let text = _args.join` `
command = (command || '').toLowerCase()
let fail = plugin.fail || global.dfail
let isAccept = plugin.command instanceof RegExp ? plugin.command.test(command) : Array.isArray(plugin.command) ? plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) : typeof plugin.command === 'string' ? plugin.command === command : false

global.comando = command

if (!isAccept) continue
m.plugin = name

if (m.chat in global.db.data.chats || sender in global.db.data.users) {
let chatData = global.db.data.chats[m.chat]
let userData = global.db.data.users[sender]

if (!['grupo-unbanchat.js', 'owner-exec.js', 'owner-exec2.js', 'grupo-delete.js'].includes(name) && chatData?.isBanned && !isROwner) return

if (userData.banned && name !== 'owner-unbanuser.js' && !isROwner) {
if (userData.antispam > 2) return
m.reply(`《✦》Estas baneado/a, no puedes usar comandos en este bot!\n\n${userData.bannedReason ? `✰ *Motivo:* ${userData.bannedReason}` : '✰ *Motivo:* Sin Especificar'}`)
userData.antispam = (userData.antispam || 0) + 1
return
}

if (new Date() - userData.spam < 1500 && !isROwner) return
userData.spam = new Date() * 1
}

let adminMode = global.db.data.chats[m.chat]?.modoadmin
let mini = `${plugin.botAdmin || plugin.admin || plugin.group || plugin.command}`
if (adminMode && !isOwner && !isROwner && m.isGroup && !isAdmin && mini) return

if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) { fail('owner', m, this); continue }
if (plugin.rowner && !isROwner) { fail('rowner', m, this); continue }
if (plugin.owner && !isOwner) { fail('owner', m, this); continue }
if (plugin.mods && !isMods) { fail('mods', m, this); continue }
if (plugin.premium && !isPrems) { fail('premium', m, this); continue }
if (plugin.admin && !isAdmin) { fail('admin', m, this); continue }
if (plugin.botAdmin && !isBotAdmin) { fail('botAdmin', m, this); continue }
if (plugin.private && m.isGroup) { fail('private', m, this); continue }
if (plugin.group && !m.isGroup) { fail('group', m, this); continue }
if (plugin.register == true && user.registered == false) { fail('unreg', m, this); continue }

m.isCommand = true
let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17
if (xp > 200) m.reply('chirrido -_-')
else m.exp += xp

if (!isPrems && plugin.coin && global.db.data.users[sender].coin < plugin.coin * 1) {
conn.reply(m.chat, `❮✦❯ Se agotaron tus monedas`, m)
continue
}

if (plugin.level > user.level) {
conn.reply(m.chat, `❮✦❯ Se requiere el nivel: *${plugin.level}*\n\n• Tu nivel actual es: *${user.level}*\n\n• Usa este comando para subir de nivel:\n*${usedPrefix}levelup*`, m)
continue
}

let extra = { match, usedPrefix, noPrefix, _args, args, command, text, conn: this, participants, groupMetadata, user: userObj, bot: botObj, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: ___dirname, __filename }

try {
if (shouldRunInWorker(plugin, name)) {
const result = await runWorkerJob({ pluginPath: __filename, message: JSON.parse(JSON.stringify(m)), extra: { usedPrefix, noPrefix, _args, args, command, text } }, plugin.workerTimeout || 120000)
for (const reply of result?.replies || []) {
if (reply.type === 'reply') await this.reply(reply.chat || m.chat, reply.text, m)
if (reply.type === 'message') await this.sendMessage(reply.chat || m.chat, reply.content, { quoted: m })
}
} else {
await plugin.call(this, m, extra)
}
if (!isPrems) m.coin = m.coin || plugin.coin || false
} catch (e) {
m.error = e
console.error(e)
if (e) {
let textErr = format(e)
for (let key of Object.values(global.APIKeys || {})) {
textErr = textErr.replace(new RegExp(key, 'g'), 'Administrador')
}
m.reply(textErr)
}
} finally {
if (typeof plugin.after === 'function') {
try {
await plugin.after.call(this, m, extra)
} catch (e) {
console.error(e)
}
}
if (m.coin) conn.reply(m.chat, `❮✦❯ Utilizaste ${+m.coin} monedas`, m)
}
break
}
}
} catch (e) {
console.error(e)
} finally {
if (opts['queque'] && m.text) {
const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id)
if (quequeIndex !== -1) this.msgqueque.splice(quequeIndex, 1)
}

let userStats, stats = global.db.data.stats
if (m) {
const chatObj = global.db.data.chats[m.chat] ?? {};

if (chatObj.users?.[sender]?.mute2) {
const botObjFinal = (m.isGroup ? (groupCache.get(m.chat)?.data?.participants || []).find(u => cleanJid(u.jid) === cleanJid(this.user.jid)) : {}) || {}
if (botObjFinal?.admin) {
await this.sendMessage(m.chat, { delete: m.key }).catch(() => {})
}
return
}

if (sender && (userStats = global.db.data.users[sender])) {
userStats.exp += m.exp
userStats.coin -= (m.coin ? m.coin * 1 : 0)
}

let stat
if (m.plugin) {
let now = +new Date
if (m.plugin in stats) {
stat = stats[m.plugin]
if (!isNumber(stat.total)) stat.total = 1
if (!isNumber(stat.success)) stat.success = m.error != null ? 0 : 1
if (!isNumber(stat.last)) stat.last = now
if (!isNumber(stat.lastSuccess)) stat.lastSuccess = m.error != null ? 0 : now
} else {
stat = stats[m.plugin] = { total: 1, success: m.error != null ? 0 : 1, last: now, lastSuccess: m.error != null ? 0 : now }
}
stat.total += 1
stat.last = now
if (m.error == null) {
stat.success += 1
stat.lastSuccess = now
}
}
}

try {
if (!opts['noprint']) await (await import(`./lib/print.js`)).default(m, this)
} catch (e) {
console.log(m, m.quoted, e)
}

if (opts['autoread']) await this.readMessages([m.key])

if (global.db.data.chats[m.chat]?.reaction && m.text.length > 0) {
const reactionRegex = /(ción|dad|aje|oso|izar|mente|pero|tion|age|ous|ate|and|but|ify|ai|yuki|a|s)/i
if (reactionRegex.test(m.text)) {
const emotList = ["🍟", "😃", "😄", "😁", "😆", "🍓", "😅", "😂", "🤣", "🥲", "☺️", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "🌺", "🌸", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🌟", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "💫", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😶‍🌫️", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭", "🤖", "🍭", "🤫", "🫠", "🤥", "😶", "📇", "😐", "💧", "😑", "🫨", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😮‍💨", "😵", "😵‍💫", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👺", "🧿", "🌩", "👻", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🫶", "👍", "✌️", "🙏", "🫵", "🤏", "🤌", "☝️", "🖕", "🫂", "🐱", "🤹‍♀️", "🤹‍♂️", "🗿", "✨", "⚡", "🔥", "🌈", "🩷", "❤️", "🧡", "💛", "💚", "🩵", "💙", "💜", "🖤", "🩶", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "🚩", "👊", "⚡️", "💋", "🫰", "💅", "👑", "🐣", "🐤", "🐈"]
const emot = emotList[Math.floor(Math.random() * emotList.length)]
if (!m.fromMe) {
this.sendMessage(m.chat, { react: { text: emot, key: m.key } })
}
}
}
}
}

const file = global.__filename(import.meta.url, true)

watchFile(file, async () => {
unwatchFile(file)
console.log(chalk.green('Actualizando "handler.js"'))
if (global.conns && global.conns.length > 0 ) {
const users = [...new Set([...global.conns.filter((conn) => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED).map((conn) => conn)])]
for (const userr of users) {
userr.subreloadHandler(false)
}
}
})

export default { handler }

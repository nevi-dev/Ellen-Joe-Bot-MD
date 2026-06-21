import { smsg } from './lib/simple.js'
import { format } from 'util'
import * as ws from 'ws'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import failureHandler from './lib/respuesta.js'
import {
  buildPermissionContext,
  createParticipantIndex,
  getCachedGroupMetadata,
  commandMatches,
  getPluginDirectory,
  getPrefixMatch,
  hydrateDatabaseForMessage,
  isNumber,
  normalizeLidReferences,
  runMaintenance,
} from './src/core/handler-utils.js'
import { getAntiPrivateState, isChatBannedForBot, normalizeSessionJid } from './src/core/session-utils.js'
import { attachSessionState } from './src/core/session-manager.js'
import messageQueue from './src/core/message-queue.js'

global.uptimeStart ||= Date.now()

const SYSTEM_MESSAGE_MAX_AGE_MS = 60_000
const IGNORED_BAILEYS_IDS = [/^NJX-/, /^BAE5.{12}$/, /^B24E.{16}$/, /^3EB0/]
const UNBAN_COMMAND_FILES = ['grupo-unbanchat.js', 'enable/grupo-unbanchat.js', 'owner-exec.js', 'owner-exec2.js', 'grupo-delete.js']

function getIncomingMessages(chatUpdate) {
  return Array.isArray(chatUpdate?.messages) ? chatUpdate.messages.filter(Boolean) : []
}

function getQueueKey(message) {
  return message?.key?.participant || message?.participant || message?.key?.remoteJid || message?.chat || 'unknown'
}

function isFreshMessage(message) {
  const rawTimestamp = Number(message?.messageTimestamp || 0)
  const messageTime = rawTimestamp > 0 ? rawTimestamp * 1000 : Date.now()
  return Date.now() - messageTime <= SYSTEM_MESSAGE_MAX_AGE_MS
}

function shouldIgnoreBaileysMessage(m) {
  if (!m?.fromMe && !m?.isBaileys) return false
  const id = m?.id || m?.key?.id || ''
  return IGNORED_BAILEYS_IDS.some((pattern) => pattern.test(id))
}

const normalizeConnectionJid = (conn) => normalizeSessionJid(conn)

function parseCommand(text, usedPrefix) {
  const noPrefix = text.replace(usedPrefix, '')
  const parts = noPrefix.trim().split` `.filter(Boolean)
  const [rawCommand, ...args] = parts
  const _args = noPrefix.trim().split` `.slice(1)
  return { noPrefix, args, _args, text: _args.join` `, command: (rawCommand || '').toLowerCase() }
}

async function runPluginHooks(conn, plugin, name, m, context) {
  if (typeof plugin?.all !== 'function') return
  try {
    await plugin.all.call(conn, m, context)
  } catch (error) {
    console.error(`[plugin:all:${name}]`, error?.stack || error)
  }
}

function sanitizeError(error) {
  let text = format(error)
  for (const key of Object.values(global.APIKeys || {})) text = text.replace(new RegExp(key, 'g'), 'Administrador')
  return text
}

async function executePlugin(conn, plugin, name, m, extra, permissionContext, sender) {
  const { isROwner, isOwner, isMods, isPrems, isAdmin, isBotAdmin } = permissionContext
  const fail = plugin.fail || global.dfail
  const chat = global.db?.data?.chats?.[m.chat]
  const user = global.db?.data?.users?.[sender]

  if (m.isGroup && !UNBAN_COMMAND_FILES.includes(name) && isChatBannedForBot(chat, normalizeConnectionJid(conn)) && !isROwner) return true
  if (m.text && user?.banned && name !== 'owner-unbanuser.js' && !isROwner) {
    if (!user.lastBanMsg || Date.now() - user.lastBanMsg > 30_000) {
      await m.reply(`《✦》Estas baneado/a, no puedes usar comandos en este bot!\n\n${user.bannedReason ? `✰ *Motivo:* ${user.bannedReason}` : '✰ *Motivo:* Sin Especificar'}`)
      user.lastBanMsg = Date.now()
    }
    return true
  }

  const adminMode = chat?.modoadmin
  if (adminMode && m.isGroup && !isAdmin && !isOwner && !isROwner) return true
  if (plugin.botAdmin && !isBotAdmin) { fail('botAdmin', m, conn); return false }
  if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) { fail('owner', m, conn); return false }
  if (plugin.rowner && !isROwner) { fail('rowner', m, conn); return false }
  if (plugin.owner && !isOwner) { fail('owner', m, conn); return false }
  if (plugin.mods && !isMods) { fail('mods', m, conn); return false }
  if (plugin.premium && !isPrems) { fail('premium', m, conn); return false }
  if (plugin.admin && !isAdmin) { fail('admin', m, conn); return false }
  if (plugin.private && m.isGroup) { fail('private', m, conn); return false }
  if (plugin.group && !m.isGroup) { fail('group', m, conn); return false }
  if (plugin.register === true && user?.registered === false) { fail('unreg', m, conn); return false }

  m.isCommand = true
  const xp = 'exp' in plugin ? parseInt(plugin.exp) : 17
  if (xp > 200) await m.reply('chirrido -_-')
  else m.exp += xp

  if (!isPrems && plugin.coin && (user?.coin || 0) < plugin.coin * 1) {
    await conn.reply(m.chat, `❮✦❯ Se agotaron tus ${m.moneda}`, m)
    return false
  }
  if (plugin.level > (user?.level || 0)) {
    await conn.reply(m.chat, `❮✦❯ Se requiere el nivel: *${plugin.level}*\n\n• Tu nivel actual es: *${user?.level || 0}*\n\n• Usa este comando para subir de nivel:\n*${extra.usedPrefix}levelup*`, m)
    return false
  }

  try {
    await plugin.call(conn, m, extra)
    if (!isPrems) m.coin = m.coin || plugin.coin || false
  } catch (error) {
    m.error = error
    console.error(`[plugin:${name}]`, error?.stack || error)
    if (error) await m.reply(sanitizeError(error))
  } finally {
    if (typeof plugin.after === 'function') {
      try { await plugin.after.call(conn, m, extra) } catch (error) { console.error(`[plugin:after:${name}]`, error?.stack || error) }
    }
    if (m.coin) await conn.reply(m.chat, `❮✦❯ Utilizaste ${+m.coin} ${m.moneda}`, m)
  }
  return true
}

function isUserMutedInChat(user, chatId) {
  if (!user || !chatId) return false
  if (user.mutedChats?.[chatId] === true) return true
  return user.muto === true && (!user.mutoChat || user.mutoChat === chatId)
}

async function updateStatsAndEconomy(conn, m, sender) {
  const data = global.db?.data
  if (!data || !m) return
  if (m.isGroup && isUserMutedInChat(data.users?.[sender], m.chat)) await conn.sendMessage?.(m.chat, { delete: m.__deleteKey || m.key }).catch(() => {})
  if (sender && data.users?.[sender]) {
    data.users[sender].exp = (Number(data.users[sender].exp) || 0) + (m.exp || 0)
    data.users[sender].coin = (Number(data.users[sender].coin) || 0) - ((m.coin || 0) * 1)
  }
  if (m.plugin) {
    const stats = data.stats ||= {}
    const now = Date.now()
    const stat = stats[m.plugin] ||= { total: 0, success: 0, last: now, lastSuccess: 0 }
    if (!isNumber(stat.total)) stat.total = 0
    if (!isNumber(stat.success)) stat.success = 0
    stat.total += 1
    stat.last = now
    if (m.error == null) {
      stat.success += 1
      stat.lastSuccess = now
    }
  }
  await global.db?.write?.()
}

export async function handler(chatUpdate) {
  try {
    attachSessionState(this)
    runMaintenance(this)
    const messages = getIncomingMessages(chatUpdate).filter(isFreshMessage)
    if (!messages.length) return
    this.pushMessage?.(messages).catch((error) => console.error('[pushMessage]', error?.stack || error))
    if (global.db && global.db.data == null) await global.loadDatabase?.()
    for (const rawMessage of messages) {
      const key = getQueueKey(rawMessage)
      messageQueue.enqueue(key, () => processMessage.call(this, chatUpdate, rawMessage))
    }
  } catch (error) {
    console.error('[handler]', error?.stack || error)
  }
}

async function processMessage(chatUpdate, rawMessage) {
  let m = null
  let sender = null
  try {
    m = smsg(this, rawMessage) || rawMessage
    if (!m || shouldIgnoreBaileysMessage(m)) return
    const opts = this.opts || global.opts || {}
    if (typeof m.text !== 'string') m.text = ''

    if (m.isGroup) {
      const chat = global.db?.data?.chats?.[m.chat]
      const primaryBot = chat?.primaryBot || chat?.botPrimario
      if (primaryBot) {
        const universalWords = ['resetbot', 'resetprimario', 'botreset']
        const firstWord = m.text.trim().split(' ')[0]?.toLowerCase().replace(/^[./#]/, '') || ''
        if (!universalWords.includes(firstWord) && normalizeConnectionJid(this) !== normalizeSessionJid(primaryBot)) return
      }
    }

    sender = m.isGroup ? (m.key?.participant || m.sender) : (m.key?.remoteJid || m.sender)
    if (!sender) return
    m.__deleteKey = m.key ? { ...m.key } : null
    const groupMetadata = m.isGroup ? await getCachedGroupMetadata(this, m.chat) : {}
    const participants = Array.isArray(groupMetadata?.participants) ? groupMetadata.participants : []
    sender = normalizeLidReferences(m, sender, m.isGroup ? createParticipantIndex(participants) : null)

    m.exp = 0
    m.coin = false
    const { settings } = hydrateDatabaseForMessage(this, m, sender)

    if (opts.nyimak) return
    if (!m.fromMe && opts.self) return
    if (opts.swonly && m.chat !== 'status@broadcast') return

    const permissionContext = buildPermissionContext(this, m, sender, participants)
    const { userGroup, botGroup, isRAdmin, isAdmin, isBotAdmin, isROwner, isOwner, isPrems } = permissionContext
    if (!m.isGroup && !isROwner && !isOwner) {
      const botSettings = global.db?.data?.settings?.[normalizeConnectionJid(this)] || settings || {}
      const antiPrivateState = getAntiPrivateState(botSettings)
      if (antiPrivateState === 'ignore') return
      if (antiPrivateState === 'block') {
        await this.updateBlockStatus?.(sender, 'block').catch(() => {})
        return
      }
    }
    m.moneda = settings?.moneda || global.moneda || 'Coins'
    m.exp += Math.ceil(Math.random() * 10)

    const pluginDir = getPluginDirectory()
    for (const name in (global.plugins || {})) {
      const plugin = global.plugins[name]
      if (!plugin || plugin.disabled) continue
      const __filename = join(pluginDir, name)
      const baseContext = { chatUpdate, __dirname: pluginDir, __filename }
      await runPluginHooks(this, plugin, name, m, baseContext)
      if (!opts.restrict && plugin.tags?.includes?.('admin')) continue

      const match = getPrefixMatch(this, plugin, m.text)
      const beforeContext = { match, conn: this, participants, groupMetadata, user: userGroup, bot: botGroup, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: pluginDir, __filename }
      if (typeof plugin.before === 'function') {
        const beforeResult = await plugin.before.call(this, m, beforeContext)
        if (m.__pluginHalt) return
        if (beforeResult) continue
      }
      if (m.__pluginHalt || typeof plugin !== 'function' || !match?.[0]?.[0]) continue

      const usedPrefix = match[0][0]
      const parsed = parseCommand(m.text, usedPrefix)
      if (!commandMatches(plugin.command, parsed.command)) continue
      global.comando = parsed.command
      m.plugin = name
      const chatData = global.db?.data?.chats?.[m.chat] || {}
      if (isChatBannedForBot(chatData, normalizeConnectionJid(this)) && !UNBAN_COMMAND_FILES.includes(name)) return
      const extra = { match, usedPrefix, ...parsed, conn: this, participants, groupMetadata, user: userGroup, bot: botGroup, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: pluginDir, __filename }
      await executePlugin(this, plugin, name, m, extra, permissionContext, sender)
      break
    }
  } catch (error) {
    console.error('[processMessage]', error?.stack || error)
  } finally {
    try { await updateStatsAndEconomy(this, m, sender) } catch (error) { console.error('[stats]', error?.stack || error) }
    try { if (!((this.opts || global.opts || {}).noprint) && m) await (await import('./lib/print.js')).default(m, this) } catch (error) { console.log(chalk.red('Error en print.js'), error) }
    try { if ((this.opts || global.opts || {}).autoread && m?.key) await this.readMessages?.([m.key]) } catch {}
  }
}

global.dfail = (type, m, conn) => { failureHandler(type, conn, m, global.comando) }

const file = typeof global.__filename === 'function' ? global.__filename(import.meta.url, true) : fileURLToPath(import.meta.url)
watchFile(file, async () => {
  unwatchFile(file)
  console.log(chalk.green('Actualizando "handler.js"'))
  if (global.conns?.length > 0) {
    const users = [...new Set(global.conns.filter((conn) => conn.user && conn.ws?.socket && conn.ws.socket.readyState !== ws.CLOSED))]
    for (const userr of users) {
      try { userr.subreloadHandler(false) } catch {}
    }
  }
})

export default { handler }

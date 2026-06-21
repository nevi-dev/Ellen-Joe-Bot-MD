import path from 'path'
import { fileURLToPath } from 'url'
import { normalizeSessionJid } from './session-utils.js'

export const isNumber = (x) => typeof x === 'number' && !Number.isNaN(x)
const str2Regex = (str) => String(str).replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
const cleanJid = (jid = '') => String(jid).split(':')[0]

export function getPluginDirectory() {
  return path.join(path.dirname(fileURLToPath(new URL('../../handler.js', import.meta.url))), './plugins')
}

export function createParticipantIndex(participants = []) {
  const index = new Map()
  for (const p of participants || []) {
    for (const key of [p.id, p.jid, p.lid]) if (key) index.set(key, p)
  }
  return index
}

export function normalizeLidReferences(m, sender, participantIndex) {
  const normalize = (jid) => {
    if (!jid || !participantIndex) return jid
    const hit = participantIndex.get(jid)
    return hit?.jid || hit?.id || jid
  }
  const normalized = normalize(sender)
  if (m && normalized) m.sender = normalized
  if (m?.quoted?.sender) m.quoted.sender = normalize(m.quoted.sender)
  if (Array.isArray(m?.mentionedJid)) m.mentionedJid = m.mentionedJid.map(normalize)
  return normalized
}

export async function getCachedGroupMetadata(conn, chat) {
  if (!chat) return {}
  const cache = conn.__groupMetadataCache
  const cached = cache?.get?.(chat)
  if (cached) return cached
  try {
    const meta = await conn.groupMetadata(chat)
    const normalized = { ...meta, participants: (meta.participants || []).map((p) => ({ ...p, id: p.id || p.jid, jid: p.jid || p.id, lid: p.lid })) }
    cache?.set?.(chat, normalized)
    return normalized
  } catch {
    return {}
  }
}

export function commandMatches(commandDef, command) {
  if (commandDef instanceof RegExp) return commandDef.test(command)
  if (Array.isArray(commandDef)) return commandDef.some((cmd) => cmd instanceof RegExp ? cmd.test(command) : String(cmd).toLowerCase() === command)
  return typeof commandDef === 'string' ? commandDef.toLowerCase() === command : false
}

export function getPrefixMatch(conn, plugin, text = '') {
  const cache = conn.__prefixMatcherCache
  const prefix = plugin.customPrefix || conn.prefix || global.prefix || /^[#/!.]/
  const cacheKey = `${String(prefix)}::${text}`
  if (cache?.has(cacheKey)) return cache.get(cacheKey)
  const candidates = prefix instanceof RegExp
    ? [[prefix.exec(text), prefix]]
    : Array.isArray(prefix)
      ? prefix.map((p) => { const re = p instanceof RegExp ? p : new RegExp(str2Regex(p)); return [re.exec(text), re] })
      : typeof prefix === 'string'
        ? (() => { const re = new RegExp(str2Regex(prefix)); return [[re.exec(text), re]] })()
        : [[[], new RegExp()]]
  const match = candidates.find((p) => p[0]) || null
  cache?.set(cacheKey, match)
  if (cache?.size > 1000) cache.clear()
  return match
}

export function hydrateDatabaseForMessage(conn, m, sender) {
  const data = global.db.data
  data.users ||= {}
  data.chats ||= {}
  data.stats ||= {}
  data.settings ||= {}
  const user = data.users[sender] ||= {}
  const defaults = { exp: 0, coin: 10, joincount: 1, diamond: 3, health: 100, bank: 0, level: 0, warn: 0, spam: 0, banned: false, premium: false, premiumTime: 0, registered: false, afk: -1, afkReason: '', role: 'Nuv' }
  for (const [key, value] of Object.entries(defaults)) if (!(key in user) || (typeof value === 'number' && !isNumber(user[key]))) user[key] = value
  const chat = data.chats[m.chat] ||= {}
  for (const [key, value] of Object.entries({ isBanned: false, welcome: true, autolevelup: false, modoadmin: false, reaction: false, antiLag: false })) if (!(key in chat)) chat[key] = value
  chat.users ||= {}
  const botJid = normalizeSessionJid(conn)
  const settings = data.settings[botJid] ||= { self: false, restrict: true, jadibotmd: true, antiPrivate: false, autoread: false, moneda: 'Coins' }
  return { user, chat, settings }
}

export function buildPermissionContext(conn, m, sender, participants = []) {
  const botJid = normalizeSessionJid(conn)
  const userGroup = m.isGroup ? participants.find((u) => cleanJid(u.jid || u.id) === cleanJid(sender)) || {} : {}
  const botGroup = m.isGroup ? participants.find((u) => cleanJid(u.jid || u.id) === cleanJid(botJid)) || {} : {}
  const senderNum = String(sender || '').split('@')[0].replace(/[^0-9]/g, '')
  const isRAdmin = userGroup?.admin === 'superadmin'
  const isAdmin = isRAdmin || userGroup?.admin === 'admin'
  const isBotAdmin = Boolean(botGroup?.admin)
  const ownerNums = [normalizeSessionJid(global.conn || conn), ...(global.owner || []).map(([n]) => n)].map((v) => String(v).replace(/[^0-9]/g, ''))
  const isROwner = ownerNums.includes(senderNum)
  const isOwner = isROwner || m.fromMe
  const isMods = isOwner || (global.mods || []).map((v) => String(v).replace(/[^0-9]/g, '')).includes(senderNum)
  const isPrems = isROwner || (global.prems || []).map((v) => String(v).replace(/[^0-9]/g, '')).includes(senderNum) || global.db.data.users?.[sender]?.premium === true
  return { userGroup, botGroup, isRAdmin, isAdmin, isBotAdmin, isROwner, isOwner, isMods, isPrems }
}

export function runMaintenance(conn) {
  conn.__groupMetadataCache?.clearExpired?.()
}

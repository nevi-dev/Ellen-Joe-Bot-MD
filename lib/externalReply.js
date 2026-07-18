import fs from 'fs'

export const newsletterJid = global.newsletterJid || global.ch1 || '120363418071540900@newsletter'
export const newsletterName = global.newsletterName || '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice'
export const externalReplyUrl = global.redes || 'https://github.com/nevi-dev'
export const externalReplyTitle = '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊参𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂'

function loadThumbnail(thumbnail = global.icons) {
  if (!thumbnail) return undefined
  if (Buffer.isBuffer(thumbnail)) return thumbnail
  if (typeof thumbnail !== 'string') return undefined
  if (fs.existsSync(thumbnail)) return fs.readFileSync(thumbnail)
  try {
    return Buffer.from(thumbnail, 'base64')
  } catch {
    return undefined
  }
}

export function stripUnsafeExternalAdReply(value = {}) {
  if (!value || typeof value !== 'object') return value
  const clone = { ...value }
  if (clone.contextInfo?.externalAdReply) {
    clone.contextInfo = { ...clone.contextInfo }
    delete clone.contextInfo.externalAdReply
  }
  return clone
}

export async function sendExternalMessage(conn, m, msgText, options = {}) {
  if (!conn || !m) throw new TypeError('sendExternalMessage requiere conn y m')

  const matchedUrl = options.matchedUrl || externalReplyUrl
  const sender = m.sender || m.key?.participant || m.key?.remoteJid
  const name = options.name || await conn.getName?.(sender).catch?.(() => null) || sender || 'Proxy'
  const thumbnailBuffer = loadThumbnail(options.thumbnail)
  const quotedMessage = m.message || m.msg || options.quotedMessage
  const stanzaId = m.id || m.key?.id
  const remoteJid = m.chat || m.key?.remoteJid
  const cleanContextInfo = stripUnsafeExternalAdReply({ contextInfo: options.contextInfo || {} }).contextInfo || {}
  let parsedMentions = []
  if (typeof conn.parseMention === 'function') {
    try {
      const parsed = conn.parseMention(String(msgText || ''))
      parsedMentions = Array.isArray(parsed) ? parsed : await parsed
    } catch {
      parsedMentions = []
    }
  }
  const mentionedJid = [...new Set([...(cleanContextInfo.mentionedJid || []), ...(options.mentions || []), ...(parsedMentions || [])])]

  return conn.relayMessage(remoteJid, {
    extendedTextMessage: {
      text: `${matchedUrl}\n\n${msgText}`,
      matchedText: matchedUrl,
      canonicalUrl: matchedUrl,
      title: options.title || externalReplyTitle,
      description: options.description || `✦ ¿Necesitas algo, ${name}? Date prisa...`,
      previewType: 'shadow',
      ...(thumbnailBuffer ? { jpegThumbnail: thumbnailBuffer } : {}),
      contextInfo: {
        ...(quotedMessage ? { quotedMessage } : {}),
        ...(sender ? { participant: sender } : {}),
        ...(stanzaId ? { stanzaId } : {}),
        ...(remoteJid ? { remoteJid } : {}),
        ...cleanContextInfo,
        ...(mentionedJid.length ? { mentionedJid } : {}),
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: {
          newsletterJid: options.newsletterJid || newsletterJid,
          newsletterName: options.newsletterName || newsletterName,
          serverMessageId: -1
        }
      }
    }
  }, options.relayOptions || {})
}

export function installExternalReply(conn) {
  if (!conn || conn.sendExternalMessage) return conn
  conn.sendExternalMessage = (m, msgText, options = {}) => sendExternalMessage(conn, m, msgText, options)
  return conn
}

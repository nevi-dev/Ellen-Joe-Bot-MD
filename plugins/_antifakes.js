import db from '../database.js'

let handler = m => m

handler.before = async function (m, { conn, isAdmin, isBotAdmin }) {
  const botJid = conn.user.jid
  const sender = m.sender
  const chatId = m.chat
  const isPrivate = !m.isGroup
  const numero = sender.split('@')[0]

  // Prefijos bloqueados: Rusia, India, etc. + todos los países árabes
  const prefijosBloqueados = [
    // países ya considerados antes
    '90', '92', '93', '94', '91', '49', '48', '7',
    // países árabes
    '966', '971', '20', '212', '213', '216', '218', '249',
    '967', '963', '964', '962', '961', '970', '974',
    '973', '968', '965', '222', '252'
  ]

  db.data.settings = db.data.settings || {}
  db.data.settings[botJid] = db.data.settings[botJid] || {}

  if (!isPrivate) {
    let chat = db.data.chats[chatId]
    if (isBotAdmin && chat?.antifake) {
      for (let prefijo of prefijosBloqueados) {
        if (numero.startsWith(prefijo)) {
          db.data.users[sender].block = true
          await conn.groupParticipantsUpdate(chatId, [sender], 'remove')
          await conn.sendMessage(chatId, { text: `🚫 Usuario con prefijo *${prefijo}* eliminado por antifake.` })
          break
        }
      }
    }
  } else {
    let antifakePriv = db.data.settings[botJid].antifakePriv
    if (antifakePriv) {
      for (let prefijo of prefijosBloqueados) {
        if (numero.startsWith(prefijo)) {
          db.data.users[sender].block = true
          try {
            await conn.sendMessage(sender, { text: '🚫 Usuario bloqueado por antifake (número no permitido).' })
          } catch {}
          await conn.chatModify({ clear: { messages: [{ id: m.key.id }] } }, sender)
          await conn.updateBlockStatus(sender, 'block')
          break
        }
      }
    }
  }
}

export default handler
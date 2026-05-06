import { WAMessageStubType } from '@whiskeysockets/baileys'

export async function before(m, { conn, participants, groupMetadata }) {
  try {
    if (!m.isGroup || !m.messageStubType) return true

    let chat = global.db.data.chats[m.chat]
    if (!chat?.welcome) return true 

    const groupName = groupMetadata?.subject || 'Esta Cavidad'
    const currentSize = (participants || []).length

    // --- LÓGICA DE ENTRADA ---
    const welcomeStubs = [WAMessageStubType.GROUP_PARTICIPANT_ADD, 27, 28, 31]
    if (welcomeStubs.includes(m.messageStubType)) {
      const users = m.messageStubParameters || []
      for (const user of users) {
        const jid = user.includes('@') ? user : `${user}@s.whatsapp.net`
        const realSize = currentSize // Ya incluye al que entró generalmente
        
        // Mensaje por defecto de Ellen (si no hay uno personalizado en DB)
        let defaultWelcome = `
> ꒰🦈꒱ ¡𝓞𝐡! 𝓤𝐧 𝐧𝐮𝐞𝐯𝐨 𝐣𝐮𝐠𝐮𝐞𝐭𝐞 𝐬𝐞́ 𝐮𝐧𝐢𝐨́... 𝐪𝐮𝐞́ 𝐦𝐨𝐥𝐞𝐬𝐭𝐢𝐚.
➥ 𝓑𝒊𝒆𝒏𝒗𝒆𝒏𝒊𝒅𝒂/𝒐 𝒂 *#group*

𝓔𝒔𝒑𝒆𝒓𝒂𝒎𝒐𝒔 𝒒𝒖𝒆 𝒕𝒆 𝒔𝒊𝒆𝒏𝒕𝒂𝒔 𝒄𝒐́𝒎𝒐𝒅𝒐, 𝒂𝒖𝒏𝒒𝒖𝒆 𝒔𝒐𝒍𝒐 𝒆𝒓𝒆𝒔 𝒖𝒏 𝒊𝒏𝒕𝒆𝒈𝒓𝒂𝒏𝒕𝒆 𝒎𝒂́𝒔. 𝑵𝒐 𝒆𝒔𝒑𝒆𝒓𝒆𝒔 𝒕𝒓𝒂𝒕𝒐 𝒆𝒔𝒑𝒆𝒄𝒊𝒂𝒍.

∫ 👥 *𝐌𝐢𝐞𝐦𝐛𝐫𝐨𝐬:* #members
∫ 🆔 *𝐈𝐃:* @user

> ꒰💡꒱ ¿𝓝𝐞𝐜𝐞𝐬𝐢𝐭𝐚𝐬 𝐮𝐧 𝐦𝐚𝐧𝐮𝐚𝐥? 𝐔𝐬𝐚 .𝐡𝐞𝐥𝐩... 𝐬𝐢 𝐞𝐬 𝐪𝐮𝐞 𝐬𝐚𝐛𝐞𝐬 𝐜𝐨́𝐦𝐨 𝐭𝐫𝐚𝐭𝐚𝐫 𝐚 𝐞𝐬𝐭𝐞 𝐭𝐢𝐛𝐮𝐫𝐨́𝐧.`.trim()

        let txt = chat.sWelcome || defaultWelcome
        
        // Reemplazo de variables
        txt = txt.replace('@user', `@${jid.split('@')[0]}`)
                 .replace('#group', groupName)
                 .replace('#members', realSize)

        await sendEllenMsg(m, conn, txt, jid, '「 🦈 BIENVENIDO/A 」')
      }
    }

    // --- LÓGICA DE SALIDA ---
    const leaveStubs = [WAMessageStubType.GROUP_PARTICIPANT_LEAVE, WAMessageStubType.GROUP_PARTICIPANT_REMOVE, 32]
    if (leaveStubs.includes(m.messageStubType)) {
      const users = m.messageStubParameters || []
      for (const user of users) {
        const jid = user.includes('@') ? user : `${user}@s.whatsapp.net`
        
        // Calcular tiempo de estadía (opcional si tienes joindate en DB)
        let userData = global.db.data.users[jid]
        let stayTime = userData?.joindate ? clockString(new Date() - userData.joindate) : 'un tiempo desconocido'

        let defaultBye = `
> ⊰🦈⊱ 𝓞𝐡, 𝐬𝐞 𝐟𝐮𝐞. 𝓟𝐟𝐟, 𝐪𝐮𝐞 𝐩𝐞́𝐫𝐝𝐢𝐝𝐚 𝐝𝐞 𝐭𝐢𝐞𝐦𝐩𝐨.

𝓠𝒖𝒆 𝒃𝒖𝒆𝒏𝒐 𝒒𝒖𝒆 𝒕𝒆 𝒇𝒖𝒊𝒔𝒕𝒆, 𝒂𝒔𝒊́ 𝒕𝒖 𝒍𝒖𝒈𝒂𝒓 𝒍𝒐 𝒖𝒔𝒂 𝒂𝒍𝒈𝒖𝒊𝒆𝒏 𝒒𝒖𝒆 𝒔𝒊́ 𝒗𝒂𝒍𝒈𝒂 𝒍𝒂 𝒑𝒆𝒏𝒂. 𝑷𝒐𝒓 𝒄𝒊𝒆𝒓𝒕𝒐, 𝒑𝒆𝒓𝒅𝒊𝒔𝒕𝒆 𝒕𝒐𝒅𝒐 𝒕𝒖 𝒊𝒏𝒗𝒆𝒏𝒕𝒂𝒓𝒊𝒐.
> ⌛ *𝐃𝐮𝐫𝐚𝐜𝐢𝐨́𝐧:* #stay

> ⊰🦈⊱ 𝓨 𝒆𝒔𝒐 𝒆𝒔 𝒕𝒐𝒅𝒐, 𝒏𝒐 𝒎𝒆 𝒎𝒐𝒍𝒆𝒔𝒕𝒆𝒔 𝒔𝒊 𝒏𝒐 𝒆𝒔 𝒂𝒍𝒈𝒐 𝒊𝒎𝒑𝒐𝒓𝒕𝒂𝒏𝒕𝒆.`.trim()

        let txt = chat.sBye || defaultBye
        
        txt = txt.replace('@user', `@${jid.split('@')[0]}`)
                 .replace('#group', groupName)
                 .replace('#stay', stayTime)

        await sendEllenMsg(m, conn, txt, jid, '「 🦈 ADIÓS/BYE 」')
      }
    }

    return true
  } catch (e) {
    console.error('[ERROR]', e)
    return true
  }
}

// --- FUNCIÓN DE ENVÍO CON ESTILO ---
async function sendEllenMsg(m, conn, text, user, title) {
  let pp = 'https://github.com/nevi-dev/nevi-dev/blob/main/src/%E2%98%85%20Ellen%20Joe.jpeg?raw=true'
  try {
    pp = await conn.profilePictureUrl(user, 'image')
  } catch (e) {}

  await conn.sendMessage(m.chat, {
    text: text,
    contextInfo: {
      mentionedJid: [user],
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: '120363418071540900@newsletter',
        newsletterName: '⸙ְ̻࠭ꪆ 🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice',
        serverMessageId: -1
      },
      externalAdReply: {
        title: title,
        body: 'Ellen Joe Service | Descanso...',
        thumbnailUrl: pp,
        sourceUrl: 'https://whatsapp.com/channel/0029VbBw362A2pL9BOnpbP0H',
        renderLargerThumbnail: true,
        mediaType: 1
      }
    }
  }, { quoted: null })
}

function clockString(ms) {
  let d = Math.floor(ms / 86400000)
  let h = Math.floor(ms / 3600000) % 24
  let m = Math.floor(ms / 60000) % 60
  return `${d}d ${h}h ${m}m`
}

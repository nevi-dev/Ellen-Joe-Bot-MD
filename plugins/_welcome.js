import { WAMessageStubType } from 'baileys'
import * as pkg from 'baileys'
const { generateWAMessageContent } = pkg

export async function before(m, { conn, participants, groupMetadata }) {
  try {
    if (!m.isGroup || !m.messageStubType) return true

    let chat = global.db.data.chats[m.chat]
    if (!chat?.welcome) return true

    const groupName = groupMetadata?.subject || 'Esta Cavidad'
    const groupDesc = groupMetadata?.desc?.toString() || 'Sin descripción'
    const currentSize = (participants || []).length

    // --- LÓGICA DE BIENVENIDA ---
    const welcomeStubs = [WAMessageStubType.GROUP_PARTICIPANT_ADD, 27, 28, 31]
    if (welcomeStubs.includes(m.messageStubType)) {
      const users = m.messageStubParameters || []
      for (const user of users) {
        const jid = user.includes('@') ? user : `${user}@s.whatsapp.net`

        let txt = chat.sWelcome || global.welcom1 || `
> ꒰🦈꒱ ¡𝓞𝐡! 𝓤𝐧 𝐧𝐮𝐞𝐯𝐨 𝐣𝐮𝐠𝐮𝐞𝐭𝐞 𝐬𝐞́ 𝐮𝐧𝐢𝐨́... 𝐪𝐮𝐞́ 𝐦𝐨𝐥𝐞𝐬𝐭𝐢𝐚.
➥ 𝓑𝒊𝒆𝒏𝒗𝒆𝒏𝒊𝒅𝒂/𝒐 𝒂 *#group*

𝓔𝒔𝒑𝒆𝒓𝒂𝒎𝒐𝒔 𝒒𝒖𝒆 𝒕𝒆 𝒔𝒊𝒆𝒏𝒕𝒂𝒔 𝒄𝒐́𝒎𝒐𝒅𝒐, 𝒂𝒖𝒏𝒒𝒖𝒆 𝒔𝒐𝒍𝒐 𝒆𝒓𝒆𝒔 𝒖𝒏 𝒊𝒏𝒕𝒆𝒈𝒓𝒂𝒏𝒕𝒆 𝒎𝒂́𝒔. 𝑵𝒐 𝒆𝒔𝒑𝒆𝒓𝒆𝒔 𝒕𝒓𝒂𝒕𝒐 𝒆𝒔𝒑𝒆𝒄𝒊𝒂𝒍.

∫ 👥 *𝐌𝐢𝐞𝐦𝐛𝐫𝐨𝐬:* #members
∫ 🆔 *𝐈𝐃:* @user`.trim()

        txt = txt.replace(/@user/g, `@${jid.split('@')[0]}`)
                 .replace(/#group/g, groupName)
                 .replace(/#desc/g, groupDesc)
                 .replace(/#members/g, currentSize)

        await sendEllenMsg(m, conn, txt, jid, '「 🦈 BIENVENIDO/A 」')
      }
    }

    // --- LÓGICA DE DESPEDIDA ---
    const leaveStubs = [WAMessageStubType.GROUP_PARTICIPANT_LEAVE, WAMessageStubType.GROUP_PARTICIPANT_REMOVE, 32]
    if (leaveStubs.includes(m.messageStubType)) {
      const users = m.messageStubParameters || []
      for (const user of users) {
        const jid = user.includes('@') ? user : `${user}@s.whatsapp.net`

        let userData = global.db.data.users[jid]
        let stayTime = userData?.joindate ? clockString(new Date() - userData.joindate) : 'un tiempo desconocido'

        let txt = chat.sBye || global.welcom2 || `
> ⊰🦈⊱ 𝓞𝐡, 𝐬𝐞 𝐟𝐮𝐞. 𝓟𝐟𝐟, 𝐪𝐮𝐞 𝐩𝐞́𝐫𝐝𝐢𝐝𝐚 𝐝𝐞 𝐭𝐢𝐞 m𝐩𝐨.

𝓠𝒖𝒆 𝒃𝒖𝒆𝒏𝒐 𝒒𝒖𝒆 𝒕𝒆 𝒇𝒖𝒊𝒔𝒕𝒆, 𝒂𝒔𝒊́ 𝒕𝒖 𝒍𝒖𝒈𝒂𝒓 𝒍𝒐 𝒖𝒔𝒂 𝒂𝒍𝒈𝒖𝒊𝒆𝒏 𝒒𝒖𝒆 𝒔𝒊́ 𝒗𝒂𝒍𝒈𝒂 𝒍𝒂 𝒑𝒆𝒏𝒂. 𝑷𝒐𝒓 𝒄𝒊𝒆𝒓𝒕𝒐, 𝒑𝒆𝒓𝒅𝒊𝒔𝒕𝒆 𝒕𝒐𝒅𝒐 𝒕𝒖 𝒊𝒏𝒗𝒆𝒏𝒕𝒂𝒓𝒊𝒐.
> ⌛ *𝐃𝐮𝐫𝐚𝐜𝐢𝐨́𝐧:* #stay`.trim()

        txt = txt.replace(/@user/g, `@${jid.split('@')[0]}`)
                 .replace(/#group/g, groupName)
                 .replace(/#desc/g, groupDesc)
                 .replace(/#stay/g, stayTime)

        await sendEllenMsg(m, conn, txt, jid, '「 🦈 ADIÓS/BYE 」')
      }
    }
    return true
  } catch (e) {
    console.error('[ERROR]', e)
    return true
  }
}

async function sendEllenMsg(m, conn, text, user, title) {
  // Imagen de respaldo oficial de Ellen
  const ellenImg = 'https://raw.githubusercontent.com/nevi-dev/nevi-dev/refs/heads/main/src/%E2%98%85%20Ellen%20Joe.jpeg'
  const githubLink = 'https://github.com/nevi-dev'
  let targetImg = ellenImg

  try {
    // Intentamos obtener la foto del usuario, si no puede, cae al catch
    targetImg = await conn.profilePictureUrl(user, 'image').catch(() => ellenImg)
  } catch (e) {
    targetImg = ellenImg
  }

  try {
    // 1. Buffer para el thumbnail
    const { data: thumb } = await conn.getFile(targetImg)

    // 2. Generamos contenido para subir al servidor de WA y obtener metadatos reales (Nitidez)
    const mediaContent = await generateWAMessageContent(
      { image: { url: targetImg } },
      { upload: conn.waUploadToServer }
    )
    const imageMsg = mediaContent.imageMessage

    // 3. Texto final con el link de GitHub para forzar el tamaño grande
    const finalTxt = `${text}\n\n${githubLink}`

    const content = {
      extendedTextMessage: {
        text: finalTxt,
        matchedText: githubLink,
        description: 'Victoria Housekeeping - Zenless Zone Zero',
        title: title,
        jpegThumbnail: thumb,
        // Inyectamos los datos del servidor de WhatsApp
        thumbnailDirectPath: imageMsg.directPath,
        thumbnailSha256: imageMsg.fileSha256,
        thumbnailEncSha256: imageMsg.fileEncSha256,
        mediaKey: imageMsg.mediaKey,
        mediaKeyTimestamp: imageMsg.mediaKeyTimestamp,
        thumbnailHeight: 720,
        thumbnailWidth: 1280,
        contextInfo: {
          mentionedJid: [user],
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363418071540900@newsletter',
            newsletterName: '⸙ְ̻࠭ꪆ 🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice',
            serverMessageId: -1
          }
        }
      }
    }

    // Enviamos el nodo crudo
    await conn.relayMessage(m.chat, content, { quoted: null })

  } catch (e) {
    console.error('Error en Relay Bienvenida:', e)
    // Fallback por si falla el proceso de metadatos
    await conn.sendMessage(m.chat, {
        text: text + '\n\n' + githubLink,
        contextInfo: { mentionedJid: [user] }
    }, { quoted: null })
  }
}

function clockString(ms) {
  let d = Math.floor(ms / 86400000)
  let h = Math.floor(ms / 3600000) % 24
  let m = Math.floor(ms / 60000) % 60
  return `${d}d ${h}h ${m}m`
}

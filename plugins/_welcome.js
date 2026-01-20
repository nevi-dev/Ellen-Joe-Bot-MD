import { WAMessageStubType } from '@whiskeysockets/baileys'
import axios from 'axios'

export async function before(m, { conn, participants, groupMetadata }) {
  try {
    if (!m.isGroup || !m.messageStubType) return true

    const chat = global.db.data.chats[m.chat]
    if (!chat?.welcome) return true 

    const currentSize = (participants || []).length
    const groupName = groupMetadata?.subject || 'este grupo'
    const apikey = 'causa-ee5ee31dcfc79da4'
    
    // Fotos de Github
    const fondoBase = 'https://github.com/nevi-dev/nevi-dev/blob/main/src/212def85cdf566e3a552971457cb492e.jpg?raw=true'
    const ellenDefault = 'https://github.com/nevi-dev/nevi-dev/blob/main/src/%E2%98%85%20Ellen%20Joe.jpeg?raw=true'

    const users = m.messageStubParameters || []
    for (const user of users) {
      const jid = user.includes('@') ? user : `${user}@s.whatsapp.net`
      const pushName = conn.getName(jid) || 'Recluta'
      
      // Obtener Foto de Perfil
      let pp;
      try {
        pp = await conn.profilePictureUrl(jid, 'image')
      } catch (e) {
        pp = ellenDefault
      }

      // --- 1. LÓGICA DE BIENVENIDA (Stub 27, 31 o ADD) ---
      if (m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_ADD || m.messageStubType === 27 || m.messageStubType === 31) {
        
        const welcomeImg = await generateCanvas(apikey, fondoBase, pp, "BIENVENIDO", pushName);

        const welcomeText = chat.sWelcome || `> ꒰🦈꒱ ¡𝓞𝐡! 𝓤𝐧 𝐧𝐮𝐞𝐯𝐨 𝐣𝐮𝐠𝐮𝐞𝐭𝐞 𝐬𝐞́ 𝐮𝐧𝐢𝐨́, 𝐚 𝐝𝐢𝐯𝐞𝐫𝐭𝐢𝐫𝐦𝐞.                                                                          
➥ 𝓑𝒊𝒆𝒏𝒗𝒆𝒏𝒊𝒅𝒂/𝒐 𝒂 *${groupName}* 𝓔𝒔𝒑𝒆𝒓𝒂𝒎𝒐𝒔 𝒕𝒐𝒅𝒐𝒔 𝒒𝒖𝒆 𝒕𝒆 𝒔𝒊𝒆𝒏𝒕𝒂𝒔 𝒄𝒐́𝒎𝒐𝒅𝒐 𝒂𝒒𝒖𝒊́, 𝒂𝒖𝒏𝒒𝒖𝒆 𝒓𝒆𝒄𝒖𝒆𝒓𝒅𝒂 𝒒𝒖𝒆 𝒔𝒐𝒍𝒐 𝒆𝒓𝒆𝒔 𝒖𝒏 𝒊𝒏𝒕𝒆𝒈𝒓𝒂𝒏𝒕𝒆 𝒎𝒂́𝒔, 𝒑𝒐𝒓 𝒍𝒐 𝒒𝒖𝒆 𝒏𝒐 𝒆𝒔𝒑𝒆𝒓𝒆𝒔 𝒒𝒖𝒆 𝒕𝒆 𝒕𝒓𝒂𝒕𝒆𝒎𝒐𝒔 𝒅𝒆 𝒇𝒐𝒓𝒎𝒂 𝒅𝒊𝒇𝒆𝒓𝒆𝒏𝒕𝒆. 

∫ 👥 *𝐌𝐢𝐞𝐦𝐛𝐫𝐨𝐬:* ${currentSize + 1}

➤ 𝓟𝒖𝒆𝒅𝒆𝒔 𝒆𝒅𝒊𝒕𝒂𝒓 𝒆𝒍 𝒘𝒆𝒍𝒄𝒐𝒎𝒆 𝒄𝒐𝒏 𝒆𝒍 𝒄𝒐𝒎𝒂𝒏𝒅𝒐 .setwelcome 

> ꒰💡꒱ ¿𝓝𝐞𝐜𝐞𝐬𝐢𝐭𝐚𝐬 𝐮𝐧 𝐦𝐚𝐧𝐮𝐚𝐥 𝐝𝐞 𝐢𝐧𝐬𝐭𝐫𝐮𝐜𝐜𝐢𝐨𝐧𝐞𝐬? 𝐔𝐬𝐚 .𝐡𝐞𝐥𝐩 𝐒𝐢 𝐞𝐬 𝐪𝐮 e 𝐬𝐚𝐛𝐞𝐬 𝐜𝐨𝐦𝐨 𝐭𝐫𝐚𝐭𝐚𝐫 𝐚 𝐞𝐬𝐭𝐞 𝐭𝐢𝐛𝐮𝐫𝐨́𝐧.`.trim()

        await conn.sendMessage(m.chat, { image: welcomeImg, caption: welcomeText, mentions: [jid], contextInfo: { forwardedNewsletterMessageInfo: { newsletterJid: '120363418071540900@newsletter', newsletterName: '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice', serverMessageId: -1 } } }, { quoted: m })
      }

      // --- 2. LÓGICA DE DESPEDIDA (Stub 32 o LEAVE/REMOVE) ---
      if (m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_LEAVE || m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_REMOVE || m.messageStubType === 32) {
        
        const byeImg = await generateCanvas(apikey, fondoBase, pp, "ADIOS", pushName);

        const byeText = chat.sBye || `> ⊰🦈⊱ 𝓞𝐡, 𝐬𝐞 𝐟𝐮𝐞. 𝓟𝐟𝐟, 𝐪𝐮𝐞 𝐩𝐞́𝐫𝐝𝐢𝐝𝐚 𝐝𝐞 𝐭𝐢𝐞𝐦𝐩𝐨 𝐟𝐮𝐞 𝐞𝐬𝐚. 

➯ 𝓠𝒖𝒆 𝒃𝒖𝒆𝒏𝒐 𝒒𝒖𝒆 𝒕𝒆 𝒇𝒖𝒊𝒔𝒕𝒆 𝒉𝒂𝒄𝒊 𝒔𝒆 𝒍𝒆 𝒅𝒂𝒓𝒂́ 𝒕𝒖 𝒍𝒖𝒈𝒂𝒓 𝒂 𝒐𝒕𝒓𝒂 𝒑𝒆𝒓𝒔𝒐𝒏𝒂 𝒒𝒖𝒆 𝒔𝒊 𝒍𝒐 𝒗𝒂𝒍𝒐𝒓𝒆, 𝒑𝒆𝒓𝒐 𝒓𝒆𝒄𝒖𝒆𝒓𝒅𝒂 𝒒𝒖𝒆 𝒂𝒍 𝒉𝒂𝒄𝒆𝒓𝒍𝒐 𝒑𝒊𝒆𝒓𝒅𝒆𝒔 𝒕𝒐𝒅𝒐 𝒕𝒖 𝒊𝒏𝒗𝒆𝒏𝒕𝒂𝒓𝒊𝒐.

➥ 𝓢𝒊 𝒏𝒐 𝒕𝒆 𝒈𝒖𝒔𝒕𝒂 𝒆𝒔𝒕𝒂 𝒅𝒆𝒔𝒑𝒆𝒅𝒊𝒅𝒂, 𝒑𝒖𝒆𝒔 𝒉𝒂𝒛 𝒍𝒂 𝒕𝒖𝒚𝒂 𝒄𝒐𝒏 𝒆𝒍 𝒄𝒐𝒎𝒂𝒏𝒅𝒐́ .𝒔𝒆𝒕𝒃𝒚𝒆

> ⊰🦈⊱ 𝓨 𝒆𝒔𝒐 𝒆𝒔 𝒕𝒐𝒅𝒐 𝒑𝒐𝒓 𝒎𝒊 𝒑𝒂𝒓𝒕𝒆, 𝒏𝒐 𝒎𝒆 𝒎𝒐𝒍𝒆𝒔𝒕𝒆𝒔 𝒔𝒊 𝒏𝒐 𝒆𝒔 𝒂𝒍𝒈𝒐 𝒊𝒎𝒑𝒐𝒓𝒕𝒂𝒏𝒕𝒆.

> ꒰💡꒱ ¿𝓝𝐞𝐜𝐞𝐬𝐢𝐭𝐚𝐬 𝒖𝒏 𝒎𝒂𝒏𝒖𝒂𝒍 𝒅𝒆 𝑰𝒏𝒔𝒕𝒓𝒖𝒄𝒄𝒊𝒐𝒏𝒆𝒔? 𝐔𝐬𝐚 .𝐡𝐞𝐥𝐩 𝓢𝐢 𝐞𝐬 𝐪𝐮𝐞 𝐬𝐚𝐛𝐞𝐬 𝐜𝐨𝐦𝐨 𝐭𝐫𝐚𝐭𝐚𝐫 𝐚 𝐞𝐬𝐭𝐞 𝐭𝐢𝐛𝐮𝐫𝐨́𝐧.`.trim()

        await conn.sendMessage(m.chat, { image: byeImg, caption: byeText, mentions: [jid], contextInfo: { forwardedNewsletterMessageInfo: { newsletterJid: '120363418071540900@newsletter', newsletterName: '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice', serverMessageId: -1 } } }, { quoted: m })
      }
    }

    return true
  } catch (e) {
    console.error(e)
    return true
  }
}

// Función auxiliar para llamar a tu API de Canvas
async function generateCanvas(apikey, background, pp, title, name) {
  try {
    const response = await axios.post(`https://api-causas.duckdns.org/api/v1/canvas/custom?apikey=${apikey}`, {
      width: 800,
      height: 400,
      background: background,
      layers: [
        { type: "image", url: pp, x: 300, y: 50, w: 200, h: 200 },
        { type: "text", content: title, font: "bold 50px Arial", color: "#ffffff", x: 400, y: 300, align: "center" },
        { type: "text", content: name, font: "35px Arial", color: "#00f2ff", x: 400, y: 350, align: "center" }
      ]
    }, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch (e) {
    return { url: pp }; // Fallback a la foto de perfil si la API falla
  }
}

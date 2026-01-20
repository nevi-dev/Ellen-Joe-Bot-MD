import { WAMessageStubType } from '@whiskeysockets/baileys'
import axios from 'axios'

export async function before(m, { conn, participants, groupMetadata }) {
  try {
    if (!m.isGroup || !m.messageStubType) return true

    const currentSize = (participants || []).length
    const groupName = groupMetadata?.subject || 'este grupo'
    const apikey = 'causa-ee5ee31dcfc79da4'
    
    // Fotos de Github
    const fondoBase = 'https://github.com/nevi-dev/nevi-dev/blob/main/src/212def85cdf566e3a552971457cb492e.jpg?raw=true'
    const ellenDefault = 'https://github.com/nevi-dev/nevi-dev/blob/main/src/%E2%98%85%20Ellen%20Joe.jpeg?raw=true'

    // Capturamos los usuarios del evento stub
    const users = m.messageStubParameters || []
    
    for (const user of users) {
      const jid = user.includes('@') ? user : `${user}@s.whatsapp.net`
      const pushName = conn.getName(jid) || 'Recluta'
      
      let pp;
      try {
        pp = await conn.profilePictureUrl(jid, 'image')
      } catch (e) {
        pp = ellenDefault
      }

      // --- 1. LÓGICA DE BIENVENIDA (Eventos 27, 28, 31 y ADD) ---
      const welcomeStubs = [WAMessageStubType.GROUP_PARTICIPANT_ADD, 27, 28, 31];
      if (welcomeStubs.includes(m.messageStubType)) {
        
        // Generamos imagen con mejores coordenadas (x: 300 para centrar en 800 de ancho)
        const welcomeImg = await generateCanvas(apikey, fondoBase, pp, "BIENVENIDO", pushName);

        const welcomeText = `> ꒰🦈꒱ ¡𝓞𝐡! 𝓤𝐧 𝐧𝐮𝐞𝐯𝐨 𝐣𝐮𝐠𝐮𝐞𝐭𝐞 𝐬𝐞́ 𝐮𝐧𝐢𝐨́, 𝐚 𝐝𝐢𝐯𝐞𝐫𝐭𝐢𝐫𝐦𝐞.                                                                          
➥ 𝓑𝒊𝒆𝒏𝒗𝒆𝒏𝒊𝒅𝒂/𝒐 𝒂 *${groupName}* 𝓔𝒔𝒑𝒆𝒓𝒂𝒎𝒐𝒔 𝒕𝒐𝒅𝒐𝒔 𝒒𝒖𝒆 𝒕𝒆 𝒔𝒊𝒆𝒏𝒕𝒂𝒔 𝒄𝒐́𝒎𝒐𝒅𝒐 𝒂𝒒𝒖𝒊́, 𝒂𝒖𝒏𝒒𝒖𝒆 𝒓𝒆𝒄𝒖𝒆𝒓𝒅𝒂 𝒒𝒖𝒆 𝒔𝒐𝒍𝒐 𝒆𝒓𝒆𝒔 𝒖𝒏 𝒊𝒏𝒕𝒆𝒈𝒓𝒂𝒏𝒕𝒆 𝒎𝒂́𝒔, 𝒑𝒐𝒓 𝒍𝒐 𝒒𝒖𝒆 𝒏𝒐 𝒆𝒔𝒑𝒆𝒓𝒆𝒔 𝒒𝒖𝒆 𝒕𝒆 𝒕𝒓𝒂𝒕𝒆𝒎𝒐𝒔 𝒅𝒆 𝒇𝒐𝒓𝒎𝒂 𝒅𝒊𝒇𝒆𝒓𝒆𝒏𝒕𝒆. 

∫ 👥 *𝐌𝐢𝐞𝐦𝐛𝐫𝐨𝐬:* ${currentSize}

➤ 𝓟𝒖𝒆𝒅𝒆𝒔 𝒆𝒅𝒊𝒕𝒂𝒓 𝒆𝒍 𝒘𝒆𝒍𝒄𝒐𝒎𝒆 𝒄𝒐𝒏 𝒆𝒍 𝒄𝒐𝒎𝒂𝒏𝒅𝒐 .setwelcome 

> ꒰💡꒱ ¿𝓝𝐞𝐜𝐞𝐬𝐢𝐭𝐚𝐬 𝐮𝐧 𝐦𝐚𝐧𝐮𝐚𝐥 𝐝𝐞 𝐢𝐧𝐬𝐭𝐫ucciones? 𝐔𝐬𝐚 .𝐡𝐞𝐥𝐩 𝐒𝐢 𝒆𝒔 𝒒𝒖𝒆 𝒔𝒂𝒃𝒆𝒔 𝒄𝒐𝒎𝒐 𝒕𝒓𝒂𝒕𝒂𝒓 𝒂 𝒆𝒔𝒕𝒆 𝒕𝒊𝒃𝒖𝒓𝒐́𝒏.`.trim()

        await conn.sendMessage(m.chat, { 
          image: welcomeImg, 
          caption: welcomeText, 
          mentions: [jid], 
          contextInfo: { 
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: { 
              newsletterJid: '120363418071540900@newsletter', 
              newsletterName: '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice', 
              serverMessageId: -1 
            } 
          } 
        }, { quoted: m })
      }

      // --- 2. LÓGICA DE DESPEDIDA (Eventos 32 y REMOVE/LEAVE) ---
      const leaveStubs = [WAMessageStubType.GROUP_PARTICIPANT_LEAVE, WAMessageStubType.GROUP_PARTICIPANT_REMOVE, 32];
      if (leaveStubs.includes(m.messageStubType)) {
        
        const byeImg = await generateCanvas(apikey, fondoBase, pp, "ADIOS", pushName);

        const byeText = `> ⊰🦈⊱ 𝓞𝐡, 𝐬𝐞 𝐟𝐮𝐞. 𝓟𝐟𝐟, 𝐪𝐮𝐞 𝐩𝐞́𝐫𝐝𝐢𝐝𝐚 𝐝𝐞 𝐭𝐢𝐞𝐦𝐩𝐨 𝐟𝐮𝐞 𝐞𝐬𝐚. 

➯ 𝓠𝒖𝒆 𝒃𝒖𝒆𝒏𝒐 𝒒𝒖𝒆 𝒕𝒆 𝒇𝒖𝒊𝒔𝒕𝒆 𝒉𝒂𝒄𝒊 𝒔𝒆 𝒍𝒆 𝒅𝒂𝒓𝒂́ 𝒕𝒖 𝒍𝒖𝒈𝒂𝒓 𝒂 𝒐𝒕𝒓𝒂 𝒑𝒆𝒓𝒔𝒐𝒏𝒂 𝒒𝒖𝒆 𝒔𝒊 𝒍𝒐 𝒗𝒂𝒍𝒐𝒓𝒆, 𝒑𝒆𝒓𝒐 𝒓𝒆𝒄𝒖𝒆𝒓𝒅𝒂 𝒒𝒖𝒆 𝒂𝒍 𝒉𝒂𝒄𝒆𝒓𝒍𝒐 𝒑𝒊𝒆𝒓𝒅𝒆𝒔 𝒕𝒐𝒅𝒐 𝒕𝒖 𝒊𝒏𝒗𝒆𝒏𝒕𝒂𝒓𝒊𝒐.

➥ 𝓢𝒊 𝒏𝒐 𝒕𝒆 𝒈𝒖𝒔𝒕𝒂 𝒆𝒔𝒕𝒂 𝒅𝒆𝒔𝒑𝒆𝒅𝒊𝒅𝒂, 𝒑𝒖𝒆𝒔 𝒉𝒂𝒛 𝒍𝒂 𝒕𝒖𝒚𝒂 𝒄𝒐𝒏 𝒆𝒍 𝒄𝒐𝒎𝒂𝒏𝒅𝒐́ .𝒔𝒆𝒕𝒃𝒚𝒆

> ⊰🦈⊱ 𝓨 𝒆𝒔𝒐 𝒆𝒔 𝒕𝒐𝒅𝒐 𝒑𝒐𝒓 𝒎𝒊 𝒑𝒂𝒓𝒕𝒆, 𝒏𝒐 𝒎𝒆 𝒎𝒐𝒍𝒆𝒔𝒕𝒆𝒔 𝒔𝒊 𝒏𝒐 𝒆𝒔 𝒂𝒍𝒈𝒐 𝒊𝒎𝒑𝒐𝒓𝒕𝒂𝒏𝒕𝒆.

> ꒰💡꒱ ¿𝓝𝐞𝐜𝐞𝐬𝐢𝐭𝐚𝐬 𝒖𝒏 𝒎𝒂𝒏𝒖𝒂𝒍 𝒅𝒆 𝑰𝒏𝒔𝒕𝒓𝒖𝒄𝒄𝒊𝒐𝒏𝒆𝒔? 𝐔𝐬𝐚 .𝐡𝐞𝐥𝐩 𝓢𝐢 𝒆𝒔 𝒒𝒖𝒆 𝒔𝒂𝒃𝒆𝒔 𝒄𝒐𝒎𝒐 𝒕𝒓𝒂𝒕𝒂𝒓 𝒂 𝒆𝒔𝒕𝒆 𝒕𝒊𝒃𝒖𝒓𝒐́𝒏.`.trim()

        await conn.sendMessage(m.chat, { 
          image: byeImg, 
          caption: byeText, 
          mentions: [jid], 
          contextInfo: { 
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: { 
              newsletterJid: '120363418071540900@newsletter', 
              newsletterName: '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice', 
              serverMessageId: -1 
            } 
          } 
        }, { quoted: m })
      }
    }

    return true
  } catch (e) {
    console.error("Error en Welcome/Bye:", e)
    return true
  }
}

async function generateCanvas(apikey, background, pp, title, name) {
  try {
    const response = await axios.post(`https://api-causas.duckdns.org/api/v1/canvas/custom?apikey=${apikey}`, {
      width: 800,
      height: 400,
      background: background,
      layers: [
        // Ajustamos coordenadas para que la imagen se vea profesional
        { type: "image", url: pp, x: 310, y: 45, w: 180, h: 180 }, 
        { type: "text", content: title, font: "bold 55px Arial", color: "#ffffff", x: 400, y: 280, align: "center" },
        { type: "text", content: name, font: "32px Arial", color: "#00f2ff", x: 400, y: 330, align: "center" }
      ]
    }, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch (e) {
    // Si la API falla, devolvemos el objeto con la URL de la foto para no romper el bot
    return { url: pp }; 
  }
}

import { WAMessageStubType } from '@whiskeysockets/baileys'
import fetch from 'node-fetch'

export async function before(m, { conn, participants, groupMetadata }) {
  if (!m.messageStubType || !m.isGroup) return !0;

  let who = m.messageStubParameters[0]
  let taguser = `@${who.split('@')[0]}`
  let chat = global.db.data.chats[m.chat]
  let pp = await conn.profilePictureUrl(m.messageStubParameters[0], 'image').catch(_ => 'https://files.catbox.moe/xr2m6u.jpg')
  let img = await (await fetch(`${pp}`)).buffer()

    // --- 🎄 BIENVENIDA (AÑADIR PARTICIPANTE) ---
    if (chat.welcome && m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_ADD) {
      let bienvenida = `🦈 ¡Alerta de Nuevo Producto! 🎄\n\n`
      bienvenida += `🌟 *Bienvenido/a a ${groupMetadata.subject}, ${taguser}!* 🌟\n`
      bienvenida += `${global.welcom1}\n` // Manteniendo tu variable global
      bienvenida += `\n•(=^●ω●^=)• Soy Ellen Joe. No eres un regalo, así que no esperes tratamiento VIP. Muéstrame tu valor y no te conviertas en un lastre. ¡Ahora, a trabajar!\n`
      bienvenida += `> 💡 ¿Necesitas un manual de instrucciones? Usa *#help* si no eres un inútil total.`
      
      await conn.sendMessage(m.chat, { image: img, caption: bienvenida, mentions: [who] })
    }
       
    // --- 🎁 DESPEDIDA (ABANDONAR GRUPO) ---
    if (chat.welcome && m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_LEAVE) {
      let bye = `🔔 ¡Pérdida de Inventario! 📉\n\n`
      bye += `💔 *Adiós, ${taguser}, desde ${groupMetadata.subject}.* El negocio va mejor sin los débiles.\n`
      bye += `${global.welcom2}\n` // Manteniendo tu variable global
      bye += `\n•(=^●ω●^=)• No te esfuerces en volver; dudo que tu valor suba. ¡Feliz fracaso!\n`
      bye += `> 🎄 ¿Quieres volver a la nómina? *#help* no te salvará ahora.`

      await conn.sendMessage(m.chat, { image: img, caption: bye, mentions: [who] })
    }

    // --- 🔪 EXPULSIÓN (REMOVER PARTICIPANTE) ---
    if (chat.welcome && m.messageStubType === WAMessageStubType.GROUP_PARTICIPANT_REMOVE) { 
      let kick = `🔪 ¡Liquidación por Baja Calidad! 🗑️\n\n`
      kick += `🔥 *¡Fuera de ${groupMetadata.subject}, ${taguser}!* 🔥\n`
      kick += `${global.welcom2}\n` // Manteniendo tu variable global
      kick += `\n•(=^●ω●^=)• Ellen Joe no tolera el inventario defectuoso. Fuiste eliminado. ¡Espero que disfrutes tu baja puntuación de crédito!\n`
      kick += `> 📝 La próxima vez, lee las cláusulas. O usa *#help* en un sitio donde te soporten.`

      await conn.sendMessage(m.chat, { image: img, caption: kick, mentions: [who] })
  }}

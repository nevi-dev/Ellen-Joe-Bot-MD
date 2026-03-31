let handler = async (m, { conn, isOwner }) => {
    // 1. Obtener la base de datos del chat actual
    let chat = global.db.data.chats[m.chat]
    
    // 2. Seguridad: Si no hay nadie advertido en este grupo, mostrar mensaje vacío
    if (!chat || !chat.warnedUsers || Object.keys(chat.warnedUsers).length === 0) {
        return conn.reply(m.chat, `✅ *No hay usuarios con advertencias en este grupo.*`, m)
    }

    // 3. Filtrar solo los usuarios que tienen al menos 1 advertencia en ESTE grupo
    let adv = Object.entries(chat.warnedUsers).filter(([jid, user]) => user.count > 0)

    if (adv.length === 0) {
        return conn.reply(m.chat, `✅ *No hay usuarios con advertencias en este grupo.*`, m)
    }

    // 4. Construir la lista visual con iconos
    let caption = `📋 *USUARIOS ADVERTIDOS* 📋\n` +
                  `*╭•·–––––––––––––––––––·•*\n` +
                  `│ 👤 *Total:* ${adv.length} Usuarios\n` +
                  `│\n` +
                  adv.map(([jid, user], i) => {
                      let name = conn.getName(jid) || 'Usuario desconocido'
                      let tag = `@${jid.split`@`[0]}`
                      return `│ *${i + 1}.* ${name}\n` +
                             `│ 📊 *Warns:* [ ${user.count} / 3 ]\n` +
                             `│ 🆔 ${isOwner ? tag : tag}\n` +
                             `│ - - - - - - - - -`
                  }).join('\n') + 
                  `\n*╰•·–––––––––––––––––––·•*\n\n` +
                  `⚠️ *Nota:* Estas advertencias son locales de este grupo.`

    await conn.reply(m.chat, caption, m, { mentions: conn.parseMention(caption) })
}

handler.help = ['listadv']
handler.tags = ['grupo']
handler.command = ['listadv', 'listaadv', 'advlist', 'advlista']
handler.group = true // Solo funciona en grupos

export default handler

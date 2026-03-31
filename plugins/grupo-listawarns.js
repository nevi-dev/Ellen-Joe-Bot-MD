const handler = async (m, { conn, isOwner, groupMetadata }) => {
    // Accedemos a la base de datos del chat actual
    let chat = global.db.data.chats[m.chat]
    
    // Si no hay usuarios registrados en este chat dentro de la DB, salimos
    if (!chat || !chat.users) {
        return m.reply('*❄️ No hay registros de advertencias en este grupo aún.*')
    }

    // Filtramos solo a los usuarios que tengan al menos 1 advertencia en ESTE grupo
    let adv = Object.entries(chat.users).filter(([jid, user]) => user.warn > 0)

    if (adv.length === 0) {
        return m.reply('*💤 Parece que todos se están portando bien aquí... por ahora.*')
    }

    let caption = `*╭•·──  LISTA DE ADVERTENCIAS  ──·•*\n`
    caption += `│ *Total:* ${adv.length} Usuarios marcados\n`
    caption += `│ *Grupo:* ${groupMetadata.subject}\n`
    caption += `*├•·──–––––––––––––––––──·•*\n`

    let list = adv.map(([jid, user], i) => {
        let name = conn.getName(jid) || 'Usuario desconocido'
        let tag = `@${jid.split('@')[0]}`
        return `│ *${i + 1}.* ${name}\n│ 🚩 Advertencias: *(${user.warn}/3)*\n│ 👤 ID: ${isOwner ? tag : jid}\n│ ──–––––––––––––––––──`.trim()
    }).join('\n')

    caption += list
    caption += `\n*╰•·──–––––––––––––––––──·•*`

    await conn.reply(m.chat, caption, m, { 
        mentions: await conn.parseMention(caption) 
    })
}

handler.help = ['listadv']
handler.tags = ['grupo']
handler.command = ['listadv', 'listaadv', 'advlist', 'advlista']
handler.group = true // Solo tiene sentido en grupos

export default handler

import fetch from 'node-fetch'

let handler = async (m, { conn, command, text, isAdmin, isOwner }) => {
    let who
    if (m.isGroup) {
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : false
    } else {
        who = m.chat
    }

    if (!who) throw `🍬 *Menciona o responde a alguien para ${command === 'mute' ? 'mutar' : 'desmutar'}*`

    // 1. Validaciones de Base de Datos por Grupo
    if (!global.db.data.chats) global.db.data.chats = {}
    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
    let chat = global.db.data.chats[m.chat]
    
    // Creamos la lista de silenciados si no existe
    if (!chat.mutedUsers) chat.mutedUsers = {}

    // 2. Protecciones
    const ownerJid = global.owner[0][0] + '@s.whatsapp.net'
    if (who === ownerJid) throw '🍬 *No puedes mutar al creador del bot*'
    if (who === conn.user.jid) throw '🍭 *No puedes mutar al propio bot*'
    
    const groupMetadata = await conn.groupMetadata(m.chat)
    const groupOwner = groupMetadata.owner || m.chat.split`-`[0] + '@s.whatsapp.net'
    if (who === groupOwner) throw '🍭 *No puedes mutar al creador del grupo*'

    // 3. Lógica de MUTE
    if (command === 'mute') {
        if (chat.mutedUsers[who]) throw '🍭 *Este usuario ya está mutado en este grupo*'
        
        chat.mutedUsers[who] = true
        await conn.reply(m.chat, `✅ *Usuario mutado exitosamente*\n\nSus mensajes serán eliminados automáticamente en este grupo.`, m, { mentions: [who] })
    }

    // 4. Lógica de UNMUTE
    if (command === 'unmute') {
        if (!chat.mutedUsers[who]) throw '🍭 *Este usuario no está mutado en este grupo*'
        
        delete chat.mutedUsers[who]
        await conn.reply(m.chat, `✨ *Usuario desmutado*\n\nYa puede volver a hablar libremente.`, m, { mentions: [who] })
    }
}

handler.help = ['mute', 'unmute']
handler.tags = ['admin']
handler.command = ['mute', 'unmute']
handler.admin = true
handler.botAdmin = true
handler.group = true

export default handler

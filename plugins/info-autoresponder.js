import db from '../database.js'
let handler = async (m, { conn, text, usedPrefix, command, isOwner, isAdmin, isROwner }) => {
if (!(isOwner || isAdmin || isROwner)) {
conn.reply(m.chat, `${emoji2} Lo siento no puedes personalizar el autoresponder en este grupo/chat.`, m)
}
const chatData = db.data.chats[m.chat]
if (text) {
if (chatData.sAutoresponder) return conn.reply(m.chat, `${emoji} Ya hay un prompt en uso, si quieres configurar otro escribe: *${usedPrefix + command}, hazlo sin texto.*`, m)

chatData.sAutoresponder = text
conn.reply(m.chat, `${emoji} Configuración con éxito.\n\n${emoji2} Si el autoresponder está desactivado activalo usando:\n> » *${usedPrefix}autoresponder*`, m)
} else {
if (chatData.sAutoresponder) {
chatData.sAutoresponder = ''
conn.reply(m.chat, "🗑️ Prompt borrado con éxito.", m)
} else {
conn.reply(m.chat, `${emoji2} No hay Prompt personalizado en este chat.\n\n${emoji} Puedes perzonalizar el autoresponder usando:\n> » *${usedPrefix + command} + texto que quieres que lo interactúe.*`, m)
}}
}

handler.tags = ['info']
handler.help = ['editautoresponder']
handler.command = ['editautoresponder', 'autoresponder2']

export default handler
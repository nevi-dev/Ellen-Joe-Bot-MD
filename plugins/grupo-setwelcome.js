let handler = async (m, { conn, text }) => {
  if (!text) return conn.reply(m.chat, '🦈 ¡Oye! Proporciona un mensaje de bienvenida.\n\n*Variables disponibles:*\n#group (Nombre)\n#desc (Descripción)\n#members (Cantidad)\n@user (Mención)', m)
  
  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
  global.db.data.chats[m.chat].sWelcome = text
  
  await conn.reply(m.chat, '✅ Bienvenida guardada correctamente.', m)
}
handler.command = /^setwelcome$/i
handler.admin = true
handler.group = true

export default handler

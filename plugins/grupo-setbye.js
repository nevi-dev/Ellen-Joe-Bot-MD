let handler = async (m, { conn, text }) => {
  if (!text) return conn.reply(m.chat, '🦈 ¡Oye! Proporciona un mensaje de despedida.\n\n*Variables:*\n#group (Nombre)\n#stay (Estadía)\n@user (Mención)', m)
  
  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
  global.db.data.chats[m.chat].sBye = text
  
  await conn.reply(m.chat, '✅ Despedida guardada correctamente.', m)
}
handler.command = /^setbye$/i
handler.admin = true
handler.group = true

export default handler

let handler = async (m, { conn, text }) => {
  if (!text) return conn.reply(m.chat, '🦈 ¡Oye! Pon el mensaje.\nEjemplo: #setbye Adiós @user', m)
  
  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
  global.db.data.chats[m.chat].sBye = text
  
  await conn.reply(m.chat, '✅ Despedida guardada correctamente.', m)
}
handler.command = /^setbye$/i
handler.admin = true
handler.group = true

export default handler

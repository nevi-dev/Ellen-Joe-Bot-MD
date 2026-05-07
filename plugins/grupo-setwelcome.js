let handler = async (m, { conn, text }) => {
  if (!text) return conn.reply(m.chat, '🦈 ¡Oye! Pon el mensaje.\nEjemplo: #setwelcome Hola @user', m)
  
  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
  global.db.data.chats[m.chat].sWelcome = text
  
  await conn.reply(m.chat, '✅ Bienvenida guardada correctamente.', m)
}

handler.command = /^setwelcome$/i // Aquí el RegExp está bien
handler.help = ['setwelcome <texto>'] // Debe ser un Array de Strings
handler.tags = ['admin'] // Debe ser un Array de Strings
handler.admin = true
handler.group = true

export default handler

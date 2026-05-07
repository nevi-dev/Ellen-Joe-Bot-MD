let handler = async (m, { conn, command }) => {
  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
  let chat = global.db.data.chats[m.chat]
  let e = '🦈'

  // Detectamos cuál borrar según el comando que se activó
  let isWelcome = /welcome/i.test(command)
  let type = isWelcome ? 'bienvenida' : 'despedida'
  let dbKey = isWelcome ? 'sWelcome' : 'sBye'

  if (!chat[dbKey]) {
    return m.reply(`${e} No hay un mensaje de ${type} personalizado en este grupo.`)
  }

  delete chat[dbKey]
  
  await m.reply(`${e} *Éxito:* El mensaje de ${type} ha sido eliminado correctamente.`)
}

// Usando solo RegExp como pediste para evitar errores de carga
handler.command = /^(delwelcome|delbye)$/i 

handler.admin = true
handler.group = true

export default handler

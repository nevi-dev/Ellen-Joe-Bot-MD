let handler = async (m, { conn, command }) => {
  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
  let chat = global.db.data.chats[m.chat]
  let e = '🦈'

  // Determinamos qué estamos borrando según el comando usado
  let isWelcome = /welcome/i.test(command)
  let type = isWelcome ? 'bienvenida' : 'despedida'
  let dbKey = isWelcome ? 'sWelcome' : 'sBye'

  if (!chat[dbKey]) {
    return m.reply(`${e} No hay un mensaje de ${type} personalizado configurado en este grupo.`)
  }

  delete chat[dbKey]
  
  await m.reply(`${e} *Éxito:* El mensaje de ${type} ha sido eliminado. Ahora se usará el mensaje predeterminado del bot.`)
}

handler.help = ['delwelcome', 'delbye']
handler.tags = ['admin']
handler.command = ['delwelcome', 'delbye', 'deldespedida'] 

handler.admin = true
handler.group = true

export default handler

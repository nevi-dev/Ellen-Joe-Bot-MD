let handler = async (m, { conn, text }) => {
  // Definimos un emoji por si no tienes la variable global
  let e = '🦈' 
  
  if (!text) return m.reply(`${e} ¡Oye! Proporciona un mensaje de bienvenida.\n\n*Variables disponibles:*\n#group (Nombre)\n#desc (Descripción)\n#members (Cantidad)\n@user (Mención)`);

  // Guardamos en el chat para que sea por grupo y no se borre
  let chat = global.db.data.chats[m.chat]
  chat.sWelcome = text.trim()
  
  m.reply(`${e} *Mensaje de bienvenida actualizado:* \n\n${text}`);
};

handler.help = ['setwelcome'];
handler.tags = ['admin'];
handler.command = ['setwelcome']; // Se activa con #setwelcome
handler.admin = true; // Solo para admins del grupo

export default handler;

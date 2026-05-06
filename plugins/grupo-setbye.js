let handler = async (m, { conn, text }) => {
  let e = '🦈'

  if (!text) return m.reply(`${e} ¡Oye! Proporciona un mensaje de despedida.\n\n*Variables disponibles:*\n#group (Nombre)\n#stay (Tiempo que duró)\n@user (Mención)`);

  let chat = global.db.data.chats[m.chat]
  chat.sBye = text.trim()
  
  m.reply(`${e} *Mensaje de despedida actualizado:* \n\n${text}`);
};

handler.help = ['setbye'];
handler.tags = ['admin'];
handler.command = ['setbye', 'setdespedida']; // Se activa con #setbye o #setdespedida
handler.admin = true;

export default handler;

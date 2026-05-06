let handler = async (m, { conn, text }) => {
  // 1. Forzamos que exista el objeto del chat en la DB
  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
  let chat = global.db.data.chats[m.chat]
  
  // 2. Definimos un emoji local por si falla la variable global
  let e = '🦈'

  if (!text) return m.reply(`${e} ¡Oye! Proporciona un mensaje de despedida.\n\n*Variables:*\n#group (Nombre)\n#stay (Estadía)\n@user (Mención)`);

  // 3. Guardamos en sBye para que la lógica del 'before.js' lo lea
  chat.sBye = text.trim()
  
  m.reply(`${e} *Mensaje de despedida actualizado:* \n\n${text}`);
};

handler.help = ['setbye'];
handler.tags = ['admin'];
handler.command = ['setbye', 'setdespedida']; // Responde a ambos
handler.admin = true;
handler.group = true; // Solo en grupos

export default handler;

let handler = async (m, { conn, text }) => {
  if (!text) return m.reply(`¿Qué mensaje quieres poner?\n\n*Palabras clave:*\n- @user (Mención)\n- #group (Nombre del grupo)\n- #desc (Descripción)\n- #members (Cantidad de miembros)`);

  let chat = global.db.data.chats[m.chat];
  chat.sWelcome = text; // Guardamos en la DB del chat

  m.reply(`✅ *Bienvenida establecida:*\n${text}`);
};

handler.help = ['setwelcome'];
handler.tags = ['admin'];
handler.command = ['setwelcome'];
handler.admin = true;

export default handler;

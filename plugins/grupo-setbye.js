let handler = async (m, { conn, text }) => {
  if (!text) return m.reply(`¿Qué mensaje quieres poner?\n\n*Palabras clave:*\n- @user (Mención)\n- #group (Nombre del grupo)\n- #stay (Tiempo que duró en el grupo)`);

  let chat = global.db.data.chats[m.chat];
  chat.sBye = text;

  m.reply(`✅ *Despedida establecida:*\n${text}`);
};

handler.help = ['setbye'];
handler.tags = ['admin'];
handler.command = ['setbye'];
handler.admin = true;

export default handler;

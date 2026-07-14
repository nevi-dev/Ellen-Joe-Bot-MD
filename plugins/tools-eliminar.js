let handler = async (m, { conn, participants, args }) => {
  const user = m.mentionedJid[0] || (args[0] ? args[0].replace(/[@+]/g, '') + '@s.whatsapp.net' : null);
  if (!user) return m.reply('👤 onichan Menciona al usuario del que quieres borrar los mensajes.\n\nEjemplo:\n.borrarmsg @usuario');

  if (!participants.some(p => p.id === user)) return m.reply('❌ El usuario no está en este grupo.');

  const messages = Object.values(conn.chats[m.chat]?.messages || {})
    .filter(v => v.key?.participant === user && !v.key.fromMe)
    .sort((a, b) => b.messageTimestamp.low - a.messageTimestamp.low)
    .slice(0, 100);

  if (!messages.length) return m.reply('😿 ara ara, No encontré mensajes recientes de ese usuario.');

  for (let msg of messages) {
    try {
      await conn.sendMessage(m.chat, { delete: msg.key });
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (e) {
      console.error('Error al eliminar:', e);
    }
  }

  await m.reply(`✅ oniii-chaaan Se eliminaron ${messages.length} mensajes recientes de @${user.split('@')[0]}.`, null, {
    mentions: [user]
  });
};

handler.help = ['borrarmsg @usuario'];
handler.tags = ['grupo'];
handler.command = ['borrarmsg'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;

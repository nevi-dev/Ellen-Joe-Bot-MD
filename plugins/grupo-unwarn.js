const handler = async (m, { conn, text, command, usedPrefix }) => {
  let who;
  
  // Lógica mejorada para detectar al usuario por respuesta (quoted) o mención
  if (m.isGroup) {
    who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : false;
  } else {
    who = m.chat;
  }

  // Si no se pudo determinar quién es, mandamos el mensaje de ayuda
  const warntext = `⚠️ *Etiqueta a un usuario o responde a su mensaje para quitarle una advertencia.*\n\n📌 *Ejemplo:* ${usedPrefix + command} @user`;
  if (!who) return m.reply(warntext, m.chat, { mentions: conn.parseMention(warntext) });

  // 1. Validaciones de Base de Datos por Grupo (Asegura que no tire error)
  if (!global.db.data.chats) global.db.data.chats = {}; 
  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {};
  
  let chat = global.db.data.chats[m.chat];
  if (!chat.warnedUsers) chat.warnedUsers = {};

  // Evitar que el bot se auto-quite warns
  if (who === conn.user.jid) return;

  // 2. Inicializar al usuario en este grupo si no tiene registro previo
  if (!chat.warnedUsers[who]) chat.warnedUsers[who] = { count: 0 };
  
  let userWarns = chat.warnedUsers[who];

  // 3. Verificar si tiene advertencias
  if (userWarns.count <= 0) {
    return m.reply(`✅ *El usuario @${who.split`@`[0]} ya tiene 0 advertencias en este grupo.*`, null, { mentions: [who] });
  }

  // 4. Restar la advertencia local
  userWarns.count -= 1;

  // 5. Respuesta visual con iconos
  let mensaje = `✨ *¡PERDÓN CONCEDIDO!* ✨\n\n` +
                `👤 *Usuario:* @${who.split`@`[0]}\n` +
                `📉 *Estado:* Se le ha retirado 1 advertencia\n` +
                `📊 *Total ahora:* [ ${userWarns.count} / 3 ]\n\n` +
                `🛡️ *Sistema de Control de Grupo*`;

  await m.reply(mensaje, null, { mentions: [who] });
};

handler.help = ['delwarn @user'];
handler.tags = ['admin'];
handler.command = ['delwarn', 'unwarn', 'quitarwarn', 'borrarwarn'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;

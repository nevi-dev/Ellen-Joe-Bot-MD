const handler = async (m, { conn, text, command, usedPrefix }) => {
    let who;
    if (m.isGroup) {
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text;
    } else {
        who = m.chat;
    }

    // Si no me dices a quién, no pienso mover un dedo
    if (!who) {
        return m.reply(`*⚠️ ¿A quién quieres perdonar? Etiqueta a alguien o responde a su mensaje.*\n*Ejemplo:* ${usedPrefix + command} @usuario`);
    }

    // Accedemos a la base de datos del CHAT actual, no del usuario global
    const chat = global.db.data.chats[m.chat];
    if (!chat.users) chat.users = {}; // Por si acaso no existe la lista de usuarios en el chat
    const userInChat = chat.users[who] || {};

    // No perdono al bot, no ha hecho nada malo (a diferencia de otros)
    if (who === conn.user.jid) return;

    // Si ya está limpio en ESTE grupo, déjalo en paz
    if (!userInChat.warn || userInChat.warn <= 0) {
        return m.reply(`*❄️ El usuario no tiene advertencias en este grupo. Está limpio, como mi paciencia ahora mismo.*`);
    }

    // Bajando el contador solo para este chat
    userInChat.warn -= 1;

    await conn.reply(m.chat, `*♻️ ADVERTENCIA RETIRADA (LOCAL)*\n\nSe le quitó una advertencia a @${who.split`@`[0]} en este grupo.\n*Advertencias aquí:* ${userInChat.warn}/3`, m, { mentions: [who] });

    return !1;
};

handler.command = ['delwarn', 'unwarn'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;

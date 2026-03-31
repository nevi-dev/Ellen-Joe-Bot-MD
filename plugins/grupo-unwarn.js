const handler = async (m, { conn, text, command, usedPrefix }) => {
    let who;
    if (m.isGroup) {
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text;
    } else {
        who = m.chat;
    }

    // Si no me dices a quién, no pienso adivinar
    if (!who) {
        return m.reply(`*⚠️ ¿A quién quieres perdonar? Etiqueta a alguien o responde a su mensaje.*\n*Ejemplo:* ${usedPrefix + command} @usuario`);
    }

    const user = global.db.data.users[who];

    // No perdono al bot, no tiene sentido
    if (who === conn.user.jid) return;

    // Si ya está limpio, déjalo en paz
    if (!user || user.warn <= 0) {
        return m.reply(`*❄️ El usuario no tiene advertencias. Está limpio, como mi paciencia ahora mismo.*`);
    }

    // Bajando el contador...
    user.warn -= 1;

    await conn.reply(m.chat, `*♻️ ADVERTENCIA RETIRADA*\n\nSe le quitó una advertencia a @${who.split`@`[0]}.\n*Advertencias actuales:* ${user.warn}/3`, m, { mentions: [who] });

    return !1;
};

handler.command = ['delwarn', 'unwarn'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;

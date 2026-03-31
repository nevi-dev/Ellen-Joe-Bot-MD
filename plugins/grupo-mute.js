const handler = async (m, { conn, command, text }) => {
    let who;
    if (m.isGroup) {
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text;
    } else {
        who = m.chat;
    }

    if (!who) return m.reply(`*⚠️ ¿A quién quieres silenciar? Etiqueta a alguien o responde a su mensaje.*`);

    // Inicialización forzada en la DB global para evitar errores de undefined
    if (!global.db.data.chats[m.chat].users) global.db.data.chats[m.chat].users = {};
    if (!global.db.data.chats[m.chat].users[who]) global.db.data.chats[m.chat].users[who] = { muto: false };

    // --- MUTE: Acción Directa ---
    if (command === 'mute') {
        // El bot es el único que se salva, porque si no... ¿quién ejecuta el código?
        if (who === conn.user.jid) return m.reply('*❌ No puedo mutearme a mí misma. ¿Quién borraría los mensajes entonces?*');

        if (global.db.data.chats[m.chat].users[who].muto) return m.reply('*🍭 Este usuario ya está en la lista negra de este grupo.*');

        global.db.data.chats[m.chat].users[who].muto = true;
        await conn.reply(m.chat, `*🔇 Silencio Absoluto*\n\n@${who.split`@`[0]} ahora tiene el estado "muto" en la base de datos de este grupo.`, m, { mentions: [who] });
    }

    // --- UNMUTE ---
    if (command === 'unmute') {
        if (!global.db.data.chats[m.chat].users[who].muto) return m.reply('*🍭 Este usuario no tiene restricciones activas aquí.*');

        global.db.data.chats[m.chat].users[who].muto = false;
        await conn.reply(m.chat, `*🔊 Voz Restaurada*\n\nSe ha desactivado el estado "muto" para @${who.split`@`[0]}.`, m, { mentions: [who] });
    }
};

handler.help = ['mute', 'unmute'];
handler.tags = ['admin'];
handler.command = ['mute', 'unmute'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;

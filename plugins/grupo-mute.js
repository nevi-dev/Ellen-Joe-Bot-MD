const handler = async (m, { conn, command, text }) => {
    let who;
    if (m.isGroup) {
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text;
    } else {
        who = m.chat;
    }

    if (!who) return m.reply(`*⚠️ Menciona a alguien o responde a un mensaje para usar ${command}.*`);

    // Inicialización directa en la DB global del chat
    if (!global.db.data.chats[m.chat].users) global.db.data.chats[m.chat].users = {};
    if (!global.db.data.chats[m.chat].users[who]) global.db.data.chats[m.chat].users[who] = { muto: false };

    // --- MUTE: Sin filtros, directo a la DB ---
    if (command === 'mute') {
        // Solo el bot se salva por pura lógica de funcionamiento
        if (who === conn.user.jid) return m.reply('*❌ No voy a auto-mutearme, búscate a otro para tus experimentos.*');
        
        if (global.db.data.chats[m.chat].users[who].muto) return m.reply('*🍭 Este usuario ya tiene el estado "muto" activo aquí.*');

        global.db.data.chats[m.chat].users[who].muto = true;
        await conn.reply(m.chat, `*🔇 Estado: MUTO*\n\n@${who.split`@`[0]} ahora está marcado en la base de datos de este grupo. Tu plugin de borrado ya puede entrar en acción.`, m, { mentions: [who] });
    }

    // --- UNMUTE ---
    if (command === 'unmute') {
        if (!global.db.data.chats[m.chat].users[who].muto) return m.reply('*🍭 Este usuario no está marcado como mutado aquí.*');

        global.db.data.chats[m.chat].users[who].muto = false;
        await conn.reply(m.chat, `*🔊 Estado: LIBRE*\n\nSe ha desactivado el "muto" para @${who.split`@`[0]} en este grupo.`, m, { mentions: [who] });
    }
};

handler.help = ['mute', 'unmute'];
handler.tags = ['admin'];
handler.command = ['mute', 'unmute'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;

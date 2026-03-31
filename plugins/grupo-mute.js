const handler = async (m, { conn, command, text }) => {
    let who;
    if (m.isGroup) {
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text;
    } else {
        who = m.chat;
    }

    if (!who) return m.reply(`*⚠️ Etiqueta a alguien o responde a un mensaje para usar ${command}.*`);

    // --- INICIALIZACIÓN SEGURA ---
    if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
    if (!global.db.data.chats[m.chat].users) global.db.data.chats[m.chat].users = {}
    if (!global.db.data.chats[m.chat].users[who]) global.db.data.chats[m.chat].users[who] = { muto: false }

    if (command === 'mute') {
        if (who === conn.user.jid) return m.reply('*❌ No me voy a auto-mutear.*');
        
        global.db.data.chats[m.chat].users[who].muto = true;
        await conn.reply(m.chat, `*🔇 Estado: MUTO*\n\n@${who.split`@`[0]} ha sido marcado en este grupo. Tu plugin de borrado ya puede actuar.`, m, { mentions: [who] });
    }

    if (command === 'unmute') {
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

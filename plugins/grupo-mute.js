import fetch from 'node-fetch'

const handler = async (m, { conn, command, text, groupMetadata }) => {
    let who;
    if (m.isGroup) {
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text;
    } else {
        who = m.chat;
    }

    // Si no hay objetivo, no hay diversión
    if (!who) return m.reply(`*⚠️ ¿A quién quieres silenciar? Etiqueta a alguien o responde a su mensaje.*`);

    // Accedemos a la base de datos LOCAL del chat
    const chat = global.db.data.chats[m.chat];
    if (!chat.users) chat.users = {};
    if (!chat.users[who]) chat.users[who] = { mauto: false };

    const userInChat = chat.users[who];

    // --- MUTE: Sin piedad ---
    if (command === 'mute') {
        // Solo el bot es intocable porque, bueno, si me muteas a mí... ¿quién va a hacer el trabajo?
        if (who === conn.user.jid) return m.reply('*❌ No puedo mutearme a mí misma, genio. ¿Quién borraría los mensajes entonces?*');
        
        if (userInChat.mauto) return m.reply('*🍭 Este usuario ya está en silencio aquí.*');

        userInChat.mauto = true;
        await conn.reply(m.chat, `*🔇 Silencio Total*\n\n@${who.split`@`[0]} ha sido mutado. No importa quién sea, aquí ya no tiene voz.`, m, { mentions: [who] });
    }

    // --- UNMUTE ---
    if (command === 'unmute') {
        if (!userInChat.mauto) return m.reply('*🍭 Este usuario ya podía hablar. No malgastes mi tiempo.*');

        userInChat.mauto = false;
        await conn.reply(m.chat, `*🔊 Voz Restaurada*\n\n@${who.split`@`[0]} puede volver a hablar... por ahora.`, m, { mentions: [who] });
    }
};

handler.help = ['mute', 'unmute'];
handler.tags = ['admin'];
handler.command = ['mute', 'unmute'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;

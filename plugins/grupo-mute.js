const handler = async (m, { conn, text, command }) => {
    let who;
    if (m.isGroup) {
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text;
    } else {
        who = m.chat;
    }

    if (!who) return m.reply(`*⚠️ Etiqueta o responde a alguien para usar ${command}.*`);

    // Acceso a la DB del grupo
    const chat = global.db.data.chats[m.chat];
    if (!chat.users) chat.users = {}; 
    if (!chat.users[who]) chat.users[who] = { mute2: false };

    // --- LÓGICA DE UNMUTE ---
    if (command === 'unmute') {
        chat.users[who].mute2 = false;
        return m.reply(`*🔊 @${who.split`@`[0]} ya puede volver a hablar.*`, null, { mentions: [who] });
    }

    // --- LÓGICA DE MUTE ---
    chat.users[who].mute2 = true;
    return m.reply(`*🔇 @${who.split`@`[0]} ha sido silenciado en este grupo.*`, null, { mentions: [who] });
};

// --- FILTRO DE BORRADO ---
handler.before = async function (m, { conn, isBotAdmin }) {
    if (!m.isGroup || !isBotAdmin) return;
    
    const chat = global.db.data.chats[m.chat];
    if (chat?.users?.[m.sender]?.mute2) {
        await conn.sendMessage(m.chat, { delete: m.key });
    }
    return;
};

handler.command = ['mute', 'unmute'];
handler.group = true;
handler.admin = true; // Solo administradores pueden ejecutar el comando
handler.botAdmin = true; // El bot necesita ser admin para borrar

export default handler;

const handler = async (m, { conn, text, groupMetadata }) => {
    let who;
    if (m.isGroup) {
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text;
    } else {
        who = m.chat;
    }

    // Si no hay a quién marcar, ni me molesto en levantarme
    if (!who) return m.reply(`*⚠️ ¿A quién se supone que le llame la atención? Etiqueta a alguien o responde a su mensaje.*`);

    // Accedemos a la base de datos del CHAT específico
    const chat = global.db.data.chats[m.chat];
    if (!chat.users) chat.users = {}; 
    if (!chat.users[who]) chat.users[who] = { warn: 0 };
    
    const userInChat = chat.users[who];
    const reason = text || 'Sin motivo especificado';

    // --- SEGURIDAD: Los Intocables ---
    
    // 1. Dueños del bot (Rowners)
    const isRowner = [conn.user.jid, ...global.owner.map(([number]) => number + '@s.whatsapp.net')].includes(who);
    if (isRowner) return m.reply(`*❌ ¿Intentas advertir a mi jefe? Qué pérdida de tiempo.*`);

    // 2. Dueño del grupo
    const groupOwner = groupMetadata.owner || m.chat.split`-`[0] + '@s.whatsapp.net';
    if (who === groupOwner) return m.reply(`*❌ Es el dueño del grupo. No voy a hacer eso, búscate otro problema.*`);

    // --- Lógica de Advertencias (LOCAL) ---
    userInChat.warn = (userInChat.warn || 0) + 1;

    await conn.reply(m.chat, `*⚠️ ADVERTENCIA (LOCAL)*\n\n*Usuario:* @${who.split`@`[0]}\n*Motivo:* ${reason}\n*Advertencias en este grupo:* ${userInChat.warn}/3`, m, { mentions: [who] });

    // Si ya se pasó de la raya en este grupo...
    if (userInChat.warn >= 3) {
        userInChat.warn = 0; // Se resetea localmente
        await conn.reply(m.chat, `*❗ Se acabó el juego.*\n\n@${who.split`@`[0]} acumuló 3 advertencias en este chat. Fuera de aquí.`, m, { mentions: [who] });
        await conn.groupParticipantsUpdate(m.chat, [who], 'remove');
    }
    
    return !1;
};

handler.command = ['advertir', 'advertencia', 'warn', 'warning'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;

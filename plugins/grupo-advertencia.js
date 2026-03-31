const handler = async (m, { conn, text, groupMetadata }) => {
    let who;
    if (m.isGroup) {
        who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text;
    } else {
        who = m.chat;
    }

    // Si no hay a quién marcar, ni me molesto
    if (!who) return m.reply(`*⚠️ ¿A quién se supone que le llame la atención? Etiqueta a alguien o responde a su mensaje.*`);

    const user = global.db.data.users[who];
    const reason = text || 'Sin motivo especificado';

    // --- SEGURIDAD: Los Intocables ---
    
    // 1. Dueños del bot (Rowners)
    const isRowner = [conn.user.jid, ...global.owner.map(([number]) => number + '@s.whatsapp.net')].includes(who);
    if (isRowner) return m.reply(`*❌ ¿Intentas advertir a mi jefe? Qué pérdida de tiempo.*`);

    // 2. Dueño del grupo (El que manda aquí)
    const groupOwner = groupMetadata.owner || m.chat.split`-`[0] + '@s.whatsapp.net';
    if (who === groupOwner) return m.reply(`*❌ Es el dueño del grupo. No voy a hacer eso, búscate otro problema.*`);

    // --- Lógica de Advertencias ---
    user.warn = (user.warn || 0) + 1;

    await conn.reply(m.chat, `*⚠️ ADVERTENCIA*\n\n*Usuario:* @${who.split`@`[0]}\n*Motivo:* ${reason}\n*Advertencias:* ${user.warn}/3`, m, { mentions: [who] });

    // Si ya se pasó de la raya...
    if (user.warn >= 3) {
        user.warn = 0; // Se resetea para la próxima (si es que vuelve)
        await conn.reply(m.chat, `*❗ Se acabó el juego.*\n\n@${who.split`@`[0]} acumuló 3 advertencias. Fuera de aquí.`, m, { mentions: [who] });
        await conn.groupParticipantsUpdate(m.chat, [who], 'remove');
    }
    
    return !1;
};

handler.command = ['advertir', 'advertencia', 'warn', 'warning'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;

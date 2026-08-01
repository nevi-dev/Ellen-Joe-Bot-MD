import db from '../database.js'
let handler = async (m, { conn, text }) => {
    let who;

    if (m.isGroup) {
        if (m.mentionedJid.length > 0) {
            who = m.mentionedJid[0];
        } else if (m.replyMessage && m.replyMessage.sender) {
            who = m.replyMessage.sender;
        } else if (text) {
            who = text.trim();
            if (!who.endsWith('@s.whatsapp.net')) {
                who = `${who}@s.whatsapp.net`;
            }
        } else {
            who = m.sender;
        }
    } else {
        if (text) {
            who = text.trim();
            if (!who.endsWith('@s.whatsapp.net')) {
                who = `${who}@s.whatsapp.net`;
            }
        } else {
            who = m.sender;
        }
    }

    console.log(`Usuario procesado: ${who}`); // Para depuración

    if (!db) db = {};
    if (!db.data) db.data = {};
    if (!db.data.users) db.data.users = {};

    let users = db.data.users;

    if (!users[who]) throw `${emoji2} El usuario no tiene datos para deschetar.`;

    users[who].coin = 0;
    users[who].exp = 0;
    users[who].level = 0;

    await db.write();

    for (let subbot of global.conns) {
        try {
            if (subbot.user) {
                await subbot.sendMessage(m.chat, { text: `/deschetar ${who.split`@`[0]}` });
            }
        } catch (error) {
            console.log(`${msm} Error al deschetar al usuario: ${error.message}`);
        }
    }

    await m.reply(
        `☁️ *¡Usuario descheteado con éxito!*\n\n` +
        `👤 Usuario: @${who.split`@`[0]}\n` +
        `💸 ${moneda}: *0*\n` +
        `✨ Experiencia: *0*\n` +
        `🌟 Nivel: *0*`,
        null,
        { mentions: [who] }
    );
};

handler.help = ['deschetar *@user*', 'deschetar *<número>*'];
handler.tags = ['owner'];
handler.command = ['deschetar'];
handler.register = true;
handler.rowner = true;

export default handler;
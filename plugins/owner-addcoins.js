import db from '../lib/database.js';
import MessageType from 'baileys';

let impts = 0;

let handler = async (m, { conn, text }) => {
    let who;
    if (m.isGroup) {
        if (m.mentionedJid.length > 0) {
            who = m.mentionedJid[0];
        } else {
            const quoted = m.quoted ? m.quoted.sender : null;
            who = quoted ? quoted : m.chat;
        }
    } else {
        who = m.chat;
    }

    if (!who) return m.reply(`${emoji} Por favor, menciona al usuario o cita un mensaje.`);

    let txt = text.replace('@' + who.split`@`[0], '').trim();
    if (!txt) return m.reply(`${emoji} Por favor, ingresa la cantidad que deseas añadir.`);
    if (isNaN(txt)) return m.reply(`${emoji2} sólo números.`);

    let dmt = parseInt(txt);
    let coin = dmt;
    let pjk = Math.ceil(dmt * impts);
    coin += pjk;

    if (coin < 1) return m.reply(`${emoji2} Mínimo es *1*`);

    let users = global.db.data.users;
    users[who].coin += dmt;

    m.reply(`💸 *Añadido:*
» ${dmt} \n@${who.split('@')[0]}, recibiste ${dmt} 💸`, null, { mentions: [who] });
};

handler.help = ['addcoins *<@user>*'];
handler.tags = ['owner'];
handler.command = ['añadircoin', 'addcoin', 'addcoins'];
handler.rowner = true;

export default handler;

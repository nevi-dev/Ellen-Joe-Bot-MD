import db from '../database.js'
const handler = async (m, {text}) => {
const user = db.data.users[m.sender];
user.afk = + new Date;
user.afkReason = text;
conn.reply(m.chat, `${emoji} *El Usuario ${conn.getName(m.sender)} Estará Inactivo*\n\n*Motivo: ${text ? ': ' + text : 'Sin Especificar!'}*
`, m);
};
handler.help = ['afk [alasan]'];
handler.tags = ['main'];
handler.command = ['afk'];
handler.group = true;
handler.register = true;

export default handler;
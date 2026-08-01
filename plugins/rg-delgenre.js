import db from '../database.js'
const handler = async (m, { conn, command, usedPrefix }) => {

const user = db.data.users[m.sender];

if (!user.genre) {
return conn.reply(m.chat, `${emoji2} No tienes un género asignado.`, m)
}

user.genre = '';

return conn.reply(m.chat, `${emoji} Se ha eliminado tu genero.`, m)
};

handler.help = ['delgenre']
handler.tags = ['rg']
handler.command = ['delgenero', 'delgenre']
export default handler;

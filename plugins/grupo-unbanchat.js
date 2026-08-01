import db from '../database.js'
let handler = async (m, { conn, usedPrefix, command, args }) => {
  let botname = global.botname || "Ellen Joe";

  // Verificar si el chat está registrado
  if (!(m.chat in db.data.chats)) {
    return conn.reply(m.chat, `🦈 *Ellen Joe*: Este chat ni siquiera está registrado... *qué flojera*.`, m);
  }

  let chat = db.data.chats[m.chat];

  if (command === 'bot') {
    if (args.length === 0) {
      const estado = chat.isBanned ? '✗ Desactivado' : '✓ Activado';
      const info = `
🦈 *Ellen Joe*:
> Ugh... tengo que explicarlo otra vez... qué fastidio.

Puedes activarme o dejarme dormir así:

✐ ${usedPrefix}bot on — *Me despiertas*
✐ ${usedPrefix}bot off — *Me dejas descansar*

✧ Estado actual » ${estado}
`;
      return conn.reply(m.chat, info.trim(), m);
    }

    let opcion = args[0].toLowerCase();

    if (opcion === 'off') {  
      if (chat.isBanned) {  
        return conn.reply(m.chat, `🦈 *Ellen Joe*: Ya estaba apagada... y yo feliz durmiendo.`, m);  
      }  
      chat.isBanned = true;  
      return conn.reply(m.chat, `🦈 *Ellen Joe*: *Listo...* me voy a dormir. No me despiertes por tonterías.`.trim(), m);  

    } else if (opcion === 'on') {  
      if (!chat.isBanned) {  
        return conn.reply(m.chat, `🦈 *Ellen Joe*: Ya estaba activa... ¿para qué me llamas?`, m);  
      }  
      chat.isBanned = false;  
      return conn.reply(m.chat, `🦈 *Ellen Joe*: *Ugh...* está bien, ya me levanté. ¿Contento?`.trim(), m);  
    } else {
      return conn.reply(m.chat, `🦈 *Ellen Joe*: No entiendo... Usa:\n${usedPrefix}bot on\n${usedPrefix}bot off`, m);
    }
  }
};

handler.help = ['bot'];
handler.tags = ['grupo'];
handler.command = ['bot'];
handler.admin = true;

export default handler;
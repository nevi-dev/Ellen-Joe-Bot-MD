const handler = async (m, { conn, text, command, usedPrefix }) => {
  let who;
  if (m.isGroup) { 
    who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text; 
  } else {
    return !1 // Este comando solo tiene sentido en grupos
  }

  if (!who) {
    const warntext = `⚠️ Etiqueta a alguien o responde a su mensaje para darle una advertencia.`;
    return m.reply(warntext, m.chat, { mentions: conn.parseMention(warntext) });
  }

  // --- PROTECCIÓN PARA EL DUEÑO ---
  const isOwner = [conn.user.jid, ...global.owner.map(([number]) => number + '@s.whatsapp.net')].includes(who);
  if (isOwner) return m.reply(`*Tsk...* 🙄 No puedo advertir al dueño.`);

  // 1. OBTENER LA BASE DE DATOS DEL CHAT (GRUPO)
  let chat = global.db.data.chats[m.chat];
  if (!chat) global.db.data.chats[m.chat] = {};
  
  // 2. CREAR EL OBJETO DE ADVERTENCIAS DENTRO DEL GRUPO SI NO EXISTE
  if (!chat.warnedUsers) chat.warnedUsers = {};
  
  // 3. INICIALIZAR EL CONTADOR DEL USUARIO EN ESTE GRUPO ESPECÍFICO
  if (!chat.warnedUsers[who]) chat.warnedUsers[who] = { count: 0 };

  const dReason = 'Sin motivo';
  const msgtext = text || dReason;
  const sdms = msgtext.replace(/@\d+-?\d* /g, '');

  // SUMAR ADVERTENCIA SOLO EN ESTE GRUPO
  chat.warnedUsers[who].count += 1;
  let conteo = chat.warnedUsers[who].count;
  
  await m.reply(
    `🦈 *¡Advertencia Local!* \n\n` +
    `*Usuario:* *@${who.split`@`[0]}*\n` +
    `*Motivo:* ${sdms}\n` +
    `*Advertencias en este grupo:* ${conteo}/3`, 
    null, { mentions: [who] }
  );

  // Si llegan a 3 en ESTE grupo, expulsión
  if (conteo >= 3) {
    chat.warnedUsers[who].count = 0; // Resetear para ese grupo
    await m.reply(
      `Ya te lo advertí 3 veces. 💢\n` +
      `*@${who.split`@`[0]}* fuera de aquí.`, 
      null, { mentions: [who] }
    );
    
    try {
        await conn.groupParticipantsUpdate(m.chat, [who], 'remove');
    } catch (e) {
        m.reply('❌ Error: No pude eliminar al usuario (quizás es admin o ya no está).');
    }
  }
  
  return !0;
};

handler.help = ['warn *@user*'];
handler.tags = ['admin'];
handler.command = ['advertir', 'warn'];
handler.group = true;    
handler.admin = true;    
handler.botAdmin = true; 

export default handler;

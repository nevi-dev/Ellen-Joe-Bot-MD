const handler = async (m, { conn, text, command, usedPrefix }) => {
  let who;
  if (m.isGroup) { 
    who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text; 
  } else {
    who = m.chat;
  }

  // Si no hay nadie a quien castigar, no me hagas perder el tiempo
  if (!who) {
    const warntext = `${emoji} Etiqueta a alguien o responde a su mensaje para darle un correctivo.`;
    return m.reply(warntext, m.chat, { mentions: conn.parseMention(warntext) });
  }

  // --- PROTECCIÓN PARA EL DUEÑO (ROWNER) ---
  // Intentar darle un warn al jefe es como intentar morder un ancla... patético.
  const isOwner = [conn.user.jid, ...global.owner.map(([number]) => number + '@s.whatsapp.net')].includes(who);
  
  if (isOwner) {
    return m.reply(`*Tsk...* 🙄 Intentas advertir al dueño. ¿De verdad eres así de lento? No voy a mover ni un dedo contra él.`);
  }

  const user = global.db.data.users[who];
  if (!user) return m.reply(`❌ Ese usuario ni siquiera está registrado. Qué pérdida de tiempo.`);

  const dReason = 'Sin motivo';
  const msgtext = text || dReason;
  const sdms = msgtext.replace(/@\d+-?\d* /g, '');

  user.warn += 1;
  
  await m.reply(
    `🦈 *¡Atención!* *@${who.split`@`[0]}* recibió un aviso.\n\n` +
    `*Motivo:* ${sdms}\n` +
    `*Advertencias:* ${user.warn}/3`, 
    null, { mentions: [who] }
  );

  // Si llegan a 3, me encargo de sacarlos a patadas
  if (user.warn >= 3) {
    user.warn = 0; 
    await m.reply(
      `Ya te lo advertí, pero parece que no escuchas. 💢\n` +
      `*@${who.split`@`[0]}* fuera de aquí. No necesitamos gente molesta.`, 
      null, { mentions: [who] }
    );
    await conn.groupParticipantsUpdate(m.chat, [who], 'remove');
  }
  
  return !1;
};

// Documentación para el menú aburrido
handler.help = ['warn *@user*', 'advertir *@user*'];
handler.tags = ['admin'];
handler.command = ['advertir', 'advertencia', 'warn', 'warning'];

handler.group = true;    // Solo en grupos, obvio.
handler.admin = true;    // Solo los admins pueden mandarme.
handler.botAdmin = true; // Si no soy admin, no puedo echar a nadie, genio.

export default handler;

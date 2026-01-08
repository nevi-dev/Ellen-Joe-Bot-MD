let cooldowns = {};

// Configuración de Identidad (Newsletter)
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

let handler = async (m, { conn }) => {
  let users = global.db.data.users;
  let senderId = m.sender;
  let name = conn.getName(senderId);

  let tiempoEspera = 10 * 60; // 10 minutos

  // ContextInfo para estética de canal
  const contextInfo = {
    mentionedJid: [m.sender],
    isForwarded: true,
    forwardingScore: 999,
    forwardedNewsletterMessageInfo: {
      newsletterJid,
      newsletterName,
      serverMessageId: -1
    },
    externalAdReply: {
      title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂',
      body: `— Operación en curso para ${name}`,
      thumbnail: icons, 
      sourceUrl: redes,
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  if (cooldowns[senderId] && Date.now() - cooldowns[senderId] < tiempoEspera * 1000) {
    let tiempoRestante = segundosAHMS(Math.ceil((cooldowns[senderId] + tiempoEspera * 1000 - Date.now()) / 1000));
    return conn.reply(m.chat, `*— (Bostezo)*... Qué molesto. Mis pies aún duelen de la última Cavidad. Espera **${tiempoRestante}** o vete tú solo por ahí.`, m, { contextInfo });
  }

  if (!users[senderId]) {
    users[senderId] = { health: 100, coin: 0, exp: 0 };
  }

  const eventos = [
    { nombre: 'Caza de Etéreos menores', tipo: 'victoria', coin: randomNumber(50, 100), exp: randomNumber(20, 40), health: 0, mensaje: `Encontré unos Etéreos estorbando. Los eliminé rápido para poder seguir descansando.` },
    { nombre: 'Emboscada en la Cavidad', tipo: 'derrota', coin: randomNumber(-50, -20), exp: randomNumber(10, 20), health: randomNumber(-15, -10), mensaje: `Aparecieron de la nada. Tuve que usar mi guadaña y se me arruinó el uniforme. Qué fastidio.` },
    { nombre: 'Suministros de Victoria Housekeeping', tipo: 'victoria', coin: randomNumber(200, 350), exp: randomNumber(80, 120), health: 5, mensaje: `Encontré un cargamento perdido de la empresa. Supongo que puedo quedarme con una parte.` },
    { nombre: 'Distorsión de Datos HDD', tipo: 'derrota', coin: randomNumber(-40, -10), exp: randomNumber(5, 15), health: randomNumber(-10, -5), mensaje: `El sistema de navegación falló. Caminamos en círculos y perdí mis caramelos.` },
    { nombre: 'Encuentro con un Bangboo', tipo: 'victoria', coin: randomNumber(100, 150), exp: randomNumber(40, 60), health: 0, mensaje: `Un pequeño Bangboo me dio unos Dennies por ayudarle. Al menos no fue una pérdida de tiempo.` },
    { nombre: 'Residuo de Corrupción', tipo: 'derrota', coin: 0, exp: randomNumber(15, 30), health: randomNumber(-20, -15), mensaje: `Había demasiado Éter en esa zona. Me siento mareada... necesito un dulce pronto.` },
  ];

  let evento = eventos[Math.floor(Math.random() * eventos.length)];

  // Lógica de recompensas corregida
  if (evento.tipo === 'victoria') {
    users[senderId].coin += evento.coin;
    users[senderId].exp += evento.exp;
    users[senderId].health += (evento.health || 0);
  } else {
    users[senderId].coin += (evento.coin || 0);
    users[senderId].exp += (evento.exp || 0);
    users[senderId].health += (evento.health || 0); // Aquí ya viene negativo del evento
  }

  // Límites
  if (users[senderId].coin < 0) users[senderId].coin = 0;
  if (users[senderId].health > 100) users[senderId].health = 100;
  if (users[senderId].health < 0) users[senderId].health = 0;

  cooldowns[senderId] = Date.now();

  let info = `🦈 **𝐑𝐄𝐏𝐎𝐑𝐓𝐄 𝐃𝐄 𝐄𝐗𝐏𝐋𝐎𝐑𝐀𝐂𝐈𝐎́𝐍: 𝐇𝐎𝐋𝐋𝐎𝐖**

📍 **Incidente:** ${evento.nombre}
💬 **Ellen Joe:** *"${evento.mensaje}"*

💰 **Balance:** ${evento.coin >= 0 ? '+' : ''}${evento.coin} ${moneda}
✨ **Progreso:** +${evento.exp} XP
❤️ **Estado:** ${users[senderId].health} HP

*— Terminé mi ronda. Me voy a la cocina a buscar algo dulce, no me sigas.*`;

  // Envío con la imagen corregida (Buffer directo)
  await conn.sendMessage(m.chat, { 
    image: icons, 
    caption: info, 
    contextInfo 
  }, { quoted: m });

  await global.db.write();
};

handler.tags = ['rpg'];
handler.help = ['gremio'];
handler.command = ['gremio', 'mision', 'caza'];
handler.register = true;
handler.group = true;

export default handler;

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function segundosAHMS(segundos) {
  let minutos = Math.floor(segundos / 60);
  let segundosRestantes = segundos % 60;
  return `${minutos}m y ${segundosRestantes}s`;
}

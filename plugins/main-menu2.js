import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import moment from 'moment-timezone';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';
const packname = '˚🄴🄻🄼🄴🄽-🄹🄾🄴-🄱🄾🅃';
const redes = 'https://github.com/nevi-dev';

let handler = async (m, { conn, usedPrefix, text, command }) => {
  // 1. Lógica de Activación/Desactivación
  let chat = global.db.data.chats[m.chat];
  if (text === 'on') {
    chat.audios = true;
    return m.reply('✅ **Servicio de audios activado.**');
  }
  if (text === 'off') {
    chat.audios = false;
    return m.reply('❌ **Servicio de audios desactivado.**');
  }

  // 2. Carga de Bases de Datos
  let db_audios = [];
  let enlacesMultimedia;
  try {
    const audioPath = path.join(process.cwd(), 'src', 'database', 'audios.json');
    db_audios = JSON.parse(fs.readFileSync(audioPath, 'utf-8'));

    const dbPath = path.join(process.cwd(), 'src', 'database', 'db.json');
    enlacesMultimedia = JSON.parse(fs.readFileSync(dbPath, 'utf-8')).links;
  } catch (e) {
    return conn.reply(m.chat, '❌ Error al cargar las bases de datos.', m);
  }

  // 3. Construcción de la Lista Completa (Sin paginación)
  const listaAudios = db_audios.map((audio, index) => {
    const keys = audio.keywords.join(' / ');
    const icon = audio.convert === false ? '📂' : '🎙️';
    return `*${index + 1}.* ${icon} ${keys}`;
  }).join('\n');

  // 4. Diseño del Mensaje
  const horaRD = moment().tz("America/Santo_Domingo").format('h:mm A');
  const estadoAudios = chat.audios ? '✅ ACTIVO' : '❌ DESACTIVO';
  const sep = '——————————————————';

  const encabezado = `
🦈 **𝐄𝐋𝐋𝐄𝐍 𝐉𝐎𝐄 | 𝐀𝐔𝐃𝐈𝐎 𝐒𝐄𝐑𝐕𝐈𝐂𝐄**
${sep}
*— (Bostezo)... Aquí están mis servicios de voz.*
*No me pidas que cante, solo di la palabra.*

📢 **ESTADO:** ${estadoAudios}
⌚ **HORA:** ${horaRD} (RD)
🎙️ **TOTAL:** ${db_audios.length} Audios
${sep}
⚙️ **CONTROLES:**
| 🔓 \`${usedPrefix}${command} on\`
| 🔒 \`${usedPrefix}${command} off\`
${sep}

${listaAudios}

${sep}
*— Si no respondo, es que estoy en mi descanso.*
*${packname}*`.trim();

  // 5. Multimedia y Envío (Forzado a GIF)
  const videoGifURL = enlacesMultimedia.video[Math.floor(Math.random() * enlacesMultimedia.video.length)];
  const miniaturaRandom = enlacesMultimedia.imagen[Math.floor(Math.random() * enlacesMultimedia.imagen.length)];

  const contextInfo = {
    mentionedJid: [m.sender],
    isForwarded: true,
    forwardingScore: 999,
    forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 },
    externalAdReply: {
      title: '𝐕.𝐇. 𝐀𝐔𝐃𝐈𝐎 𝐒𝐘𝐒𝐓𝐄𝐌',
      body: `Shark Menu | Estado: ${estadoAudios}`,
      thumbnailUrl: miniaturaRandom,
      sourceUrl: redes,
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  try {
    const response = await fetch(videoGifURL);
    if (!response.ok) throw new Error('Error al descargar video');
    const videoBuffer = await response.buffer();
    
    await conn.sendMessage(m.chat, {
      video: videoBuffer,
      gifPlayback: true, // Esto lo manda como GIF obligatoriamente
      caption: encabezado,
      contextInfo
    }, { quoted: m });

  } catch (e) {
    // Si el video falla por alguna razón, manda imagen de respaldo
    await conn.sendMessage(m.chat, { 
      image: { url: miniaturaRandom }, 
      caption: encabezado, 
      contextInfo 
    }, { quoted: m });
  }
};

handler.help = ['menu2', 'audios on', 'audios off'];
handler.tags = ['main'];
handler.command = ['menu2', 'menuaudios', 'audios'];

export default handler;

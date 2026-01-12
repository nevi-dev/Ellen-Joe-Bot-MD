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

  // 3. Configuración de Paginación
  const AUDIOS_PER_PAGE = 10;
  const totalPaginas = Math.ceil(db_audios.length / AUDIOS_PER_PAGE);
  let paginaActual = 1;
  const matchPage = text.match(/(\d+)/);
  if (matchPage) paginaActual = Math.max(1, Math.min(parseInt(matchPage[1]), totalPaginas));

  const startIndex = (paginaActual - 1) * AUDIOS_PER_PAGE;
  const audiosPagina = db_audios.slice(startIndex, startIndex + AUDIOS_PER_PAGE);

  // 4. Construcción de la Lista
  const listaAudios = audiosPagina.map((audio, index) => {
    const keys = audio.keywords.join(' / ');
    const icon = audio.convert === false ? '📂' : '🎙️';
    return `*${startIndex + index + 1}.* ${icon} ${keys}`;
  }).join('\n');

  // 5. Diseño del Mensaje
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
📑 **PÁGINA:** ${paginaActual} / ${totalPaginas}
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

  // 6. Botones de Navegación
  let buttons = [];
  if (paginaActual > 1) {
    buttons.push({ buttonId: `${usedPrefix}${command} ${paginaActual - 1}`, buttonText: { displayText: '⬅️ ANTERIOR' }, type: 1 });
  }
  if (paginaActual < totalPaginas) {
    buttons.push({ buttonId: `${usedPrefix}${command} ${paginaActual + 1}`, buttonText: { displayText: 'SIGUIENTE ➡️' }, type: 1 });
  }

  // 7. Multimedia y Envío
  const videoGifURL = enlacesMultimedia.video[Math.floor(Math.random() * enlacesMultimedia.video.length)];
  const miniaturaRandom = enlacesMultimedia.imagen[Math.floor(Math.random() * enlacesMultimedia.imagen.length)];

  const contextInfo = {
    mentionedJid: [m.sender],
    isForwarded: true,
    forwardingScore: 999,
    forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 },
    externalAdReply: {
      title: '𝐕.𝐇. 𝐀𝐔𝐃𝐈𝐎 𝐒𝐘𝐒𝐓𝐄𝐌',
      body: `Estado: ${estadoAudios} | Pag. ${paginaActual}`,
      thumbnailUrl: miniaturaRandom,
      sourceUrl: redes,
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  try {
    const videoBuffer = await (await fetch(videoGifURL)).buffer();
    await conn.sendMessage(m.chat, {
      video: videoBuffer,
      gifPlayback: true,
      caption: encabezado,
      footer: 'Usa los botones para navegar entre sectores',
      buttons: buttons.length > 0 ? buttons : undefined,
      headerType: 5,
      contextInfo
    }, { quoted: m });
  } catch (e) {
    await conn.sendMessage(m.chat, { 
      image: { url: miniaturaRandom }, 
      caption: encabezado, 
      footer: packname, 
      buttons, 
      contextInfo 
    }, { quoted: m });
  }
};

handler.help = ['audios', 'audios on', 'audios off'];
handler.tags = ['main', 'group'];
handler.command = ['menu2', 'menuaudios'];

export default handler;

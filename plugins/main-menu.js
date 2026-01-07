import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import axios from 'axios';
import moment from 'moment-timezone';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';
const packname = '˚🄴🄻🄼🄴🄽-🄹🄾🄴-🄱🄾🅃';
const redes = 'https://github.com/nevi-dev';

// --- Global variable for repository info ---
const GITHUB_REPO_OWNER = 'nevi-dev';
const GITHUB_REPO_NAME = 'Ellen-Joe-Bot-MD';
const GITHUB_BRANCH = 'main';

const CATEGORY_GROUPS = {
  '🦈 VICTORIA HOUSEKEEPING | OWNER': ['owner'],
  '🔌 CONEXIÓN DE RED | SERBOT': ['serbot'],
  '🔞 ZONA RESTRINGIDA | NSFW': ['nsfw', '+18'],
  '💖 INTERACCIÓN EMOX': ['emox'],
  '⚔️ INCURSIÓN EN CAVIDAD | RPG': ['rpg'],
  '📝 REGISTRO DE CIUDADANO': ['rg'],
  '🎲 SINTONIZACIÓN | GACHA': ['gacha', 'waifus'], 
  '🏙️ NEW ERIDU | PRINCIPAL': ['main'],
  '⚙️ PROTOCOLO DE ADMIN': ['admin', 'mods'],
  '🛠️ SOPORTE TÉCNICO | TOOLS': ['tools', 'herramientas', 'transformador', 'info', 'economy', 'economia', 'premium', 'bot'],
  '🧠 INTELIGENCIA ARTIFICIAL': ['ai', 'search'],
  '🕹️ ENTRETENIMIENTO | FUN': ['fun', 'game', 'games'], 
  '🖼️ CONTENIDO VISUAL | PIC': ['image', 'sticker'],
  '⬇️ DESCARGAS | DOWNLOADS': ['downloads', 'dl', 'buscador', 'internet'],
  '👥 GESTIÓN DE FACCIÓN | GRUPOS': ['group'],
  '✨ ARCHIVOS MULTIMEDIA': ['anime', 'audio'],
  '❓ OTROS SECTORES': ['nable'], 
};

const TAG_TO_GROUP = {};
for (const [groupName, tags] of Object.entries(CATEGORY_GROUPS)) {
  for (const tag of tags) { TAG_TO_GROUP[tag] = groupName; }
}

let handler = async (m, { conn, usedPrefix, text }) => {
  let enlacesMultimedia;
  try {
    const dbPath = path.join(process.cwd(), 'src', 'database', 'db.json');
    enlacesMultimedia = JSON.parse(fs.readFileSync(dbPath)).links;
  } catch (e) {
    return conn.reply(m.chat, 'Error al leer la base de datos.', m);
  }

  let nombre = await conn.getName(m.sender);
  const horaSantoDomingo = moment().tz("America/Santo_Domingo").format('h:mm A');

  // Datos del Bot
  const esPrincipal = conn.user.jid === global.conn.user.jid;
  const numeroPrincipal = global.conn?.user?.jid?.split('@')[0] || "Desconocido";
  const totalComandos = Object.keys(global.plugins || {}).length;
  const tiempoActividad = clockString(process.uptime() * 1000);
  const totalRegistros = Object.keys(global.db?.data?.users || {}).length;

  const videoGifURL = enlacesMultimedia.video[Math.floor(Math.random() * enlacesMultimedia.video.length)];
  const miniaturaRandom = enlacesMultimedia.imagen[Math.floor(Math.random() * enlacesMultimedia.imagen.length)];

  // Paginación
  const CATEGORIES_PER_PAGE = 3;
  let comandosPorGrupo = {};
  for (let plugin of Object.values(global.plugins || {})) {
    if (!plugin.help || !plugin.tags) continue;
    const tagsArray = Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags];
    for (let tag of tagsArray) {
      const groupName = TAG_TO_GROUP[tag] || '❓ OTROS SECTORES';
      if (!comandosPorGrupo[groupName]) comandosPorGrupo[groupName] = new Set();
      const helpArray = Array.isArray(plugin.help) ? plugin.help : [plugin.help];
      for (let help of helpArray) {
        if (/^\$|^=>|^>/.test(help)) continue;
        comandosPorGrupo[groupName].add(`${usedPrefix}${help}`);
      }
    }
  }

  for (let groupName in comandosPorGrupo) {
    comandosPorGrupo[groupName] = Array.from(comandosPorGrupo[groupName]).sort();
  }

  const allGroupNames = Object.keys(comandosPorGrupo).sort();
  const totalPaginas = Math.ceil(allGroupNames.length / CATEGORIES_PER_PAGE);
  let paginaActual = 1;
  const match = text.match(/pagina (\d+)/i);
  if (match) {
    const requestedPage = parseInt(match[1]);
    if (requestedPage >= 1 && requestedPage <= totalPaginas) paginaActual = requestedPage;
  }

  const startIndex = (paginaActual - 1) * CATEGORIES_PER_PAGE;
  const gruposPagina = allGroupNames.slice(startIndex, startIndex + CATEGORIES_PER_PAGE);

  const secciones = gruposPagina.map(groupName => {
    const title = `\n🔷 **${groupName}**\n`;
    const commandList = comandosPorGrupo[groupName].map(cmd => `  ○ ${cmd}`).join('\n');
    return title + commandList;
  }).join('\n');

  // Versión Check
  let localVersion = '1.0.0'; 
  let serverVersion = '1.0.0';
  let updateStatus = 'Sincronizado';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    localVersion = pkg.version;
    const res = await axios.get(`https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/package.json`);
    serverVersion = res.data.version;
    updateStatus = localVersion === serverVersion ? '✅ Operativo' : '⚠️ Actualización disponible';
  } catch (e) {}

  const sep = '——————————————————';
  
  const encabezado = `
🦈 **𝐄𝐋𝐋𝐄𝐍 𝐉𝐎𝐄 | 𝐒𝐄𝐑𝐕𝐈𝐂𝐄 𝐌𝐄𝐍𝐔**
${sep}
*— (Bostezo)... Bienvenid@ a New Eridu.*
*Dime qué quieres rápido, mi turno termina pronto.*

👤 **Proxy:** ${nombre}
⌚ **Hora:** ${horaSantoDomingo} (RD)
${sep}
⚙️ **𝐒𝐘𝐒𝐓𝐄𝐌 𝐈𝐍𝐅𝐎**
| 🛠️ **Build:** v${localVersion}
| 🔔 **Status:** ${updateStatus}
| ⏳ **Uptime:** ${tiempoActividad}
| 🏙️ **Usuarios:** ${totalRegistros}
| 📑 **Comandos:** ${totalComandos}
${sep}
📑 **𝐒𝐄𝐂𝐓𝐎𝐑:** ${paginaActual} / ${totalPaginas}
${sep}`.trim();

  const textoFinal = `${encabezado}\n${secciones}\n\n*— No me pidas nada más fuera de mi horario.*\n*${packname}*`;

  let botones = [];
  if (paginaActual > 1) {
    botones.push({ buttonId: `${usedPrefix}menu pagina ${paginaActual - 1}`, buttonText: { displayText: '⬅️ ANTERIOR' }, type: 1 });
  }
  if (paginaActual < totalPaginas) {
    botones.push({ buttonId: `${usedPrefix}menu pagina ${paginaActual + 1}`, buttonText: { displayText: 'SIGUIENTE ➡️' }, type: 1 });
  }

  let videoBuffer;
  try {
    const response = await fetch(videoGifURL);
    videoBuffer = await response.buffer();
  } catch (e) {}

  const contextInfo = {
    mentionedJid: [m.sender],
    isForwarded: true,
    forwardingScore: 999,
    forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 },
    externalAdReply: {
      title: '𝐕𝐈𝐂𝐓𝐎𝐑𝐈𝐀 𝐇𝐎𝐔𝐒𝐄𝐊𝐄𝐄𝐏𝐈𝐍𝐆 𝐂𝐎.',
      body: `Página ${paginaActual} de ${totalPaginas} | Shark Service`,
      thumbnailUrl: miniaturaRandom,
      sourceUrl: redes,
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  if (videoBuffer) {
    await conn.sendMessage(m.chat, {
      video: videoBuffer,
      gifPlayback: true,
      caption: textoFinal,
      buttons: botones.length > 0 ? botones : undefined,
      headerType: 5,
      contextInfo
    }, { quoted: m });
  } else {
    await conn.reply(m.chat, textoFinal, m, { contextInfo });
  }
};

handler.help = ['menu'];
handler.tags = ['main'];
handler.command = ['menu', 'menú', 'help'];

export default handler;

function clockString(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

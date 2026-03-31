//nevi-dev
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import axios from 'axios';
import moment from 'moment-timezone';
import phoneNumber from 'awesome-phonenumber'; // <-- Importado para la hora

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';
const packname = '˚🄴🄻🄼🄴🄽-🄹🄾🄴-🄱🄾🅃';
const redes = 'https://github.com/nevi-dev';

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
  '⚙️ configuracion': ['nable'], 
};

const TAG_TO_GROUP = {};
for (const [groupName, tags] of Object.entries(CATEGORY_GROUPS)) {
  for (const tag of tags) { TAG_TO_GROUP[tag] = groupName; }
}

let handler = async (m, { conn, usedPrefix, text }) => {
  let enlacesMultimedia;
  try {
    const dbPath = path.join(process.cwd(), 'src', 'database', 'db.json');
    enlacesMultimedia = JSON.parse(fs.readFileSync(dbPath, 'utf-8')).links;
  } catch (e) {
    return conn.reply(m.chat, '❌ Error al leer la base de datos de enlaces.', m);
  }

  let nombre = await conn.getName(m.sender);

  // --- NUEVA LÓGICA DE HORA AUTOMÁTICA ---
  let userTime;
  try {
    const pn = new phoneNumber('+' + m.sender.split('@')[0]);
    const tzList = pn.getRegionCode() ? moment.tz.zonesForCountry(pn.getRegionCode()) : [];
    userTime = tzList.length > 0 
      ? moment().tz(tzList[0]).format('h:mm A') 
      : moment().format('h:mm A');
  } catch {
    userTime = moment().format('h:mm A'); // Fallback de seguridad
  }

  // Sistema de comandos y categorías
  let comandosPorGrupo = {};
  Object.values(global.plugins).forEach(plugin => {
    if (!plugin.help || !plugin.tags) return;
    const tags = Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags];
    const help = Array.isArray(plugin.help) ? plugin.help : [plugin.help];

    tags.forEach(tag => {
      const groupName = TAG_TO_GROUP[tag] || '❓ OTROS SECTORES';
      if (!comandosPorGrupo[groupName]) comandosPorGrupo[groupName] = new Set();
      help.forEach(h => {
        if (!/^\$|^=>|^>/.test(h)) comandosPorGrupo[groupName].add(`${usedPrefix}${h}`);
      });
    });
  });

  const allGroupNames = Object.keys(comandosPorGrupo).sort();
  const CATEGORIES_PER_PAGE = 3;
  const totalPaginas = Math.ceil(allGroupNames.length / CATEGORIES_PER_PAGE);

  let paginaActual = 1;
  const match = text.match(/pagina (\d+)/i);
  if (match) paginaActual = Math.max(1, Math.min(parseInt(match[1]), totalPaginas));

  const startIndex = (paginaActual - 1) * CATEGORIES_PER_PAGE;
  const gruposPagina = allGroupNames.slice(startIndex, startIndex + CATEGORIES_PER_PAGE);

  const secciones = gruposPagina.map(groupName => {
    const commandList = Array.from(comandosPorGrupo[groupName]).sort().map(cmd => `  ○ ${cmd}`).join('\n');
    return `\n🔷 **${groupName}**\n${commandList}`;
  }).join('\n');

  // Versión Check
  let localVersion = '1.0.0';
  let updateStatus = '✅ Operativo';
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    localVersion = pkg.version;
    const res = await axios.get(`https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/package.json`);
    if (localVersion !== res.data.version) updateStatus = '⚠️ Actualización disponible';
  } catch (e) {}

  const sep = '——————————————————';
  const encabezado = `
🦈 **𝐄𝐋𝐋𝐄𝐍 𝐉𝐎𝐄 | 𝐒𝐄𝐑𝐕𝐈𝐂𝐄 𝐌𝐄𝐍𝐔**
${sep}
*— (Bostezo)... Bienvenid@ a New Eridu.*
*Dime qué quieres rápido, mi turno termina pronto.*

👤 **Proxy:** ${nombre}
⌚ **Hora** ${userTime}
${sep}
⚙️ **𝐒𝐘𝐒𝐓𝐄𝐌 𝐈𝐍𝐅𝐎**
| 🛠️ **Build:** v${localVersion}
| 🔔 **Status:** ${updateStatus}
| ⏳ **Uptime:** ${clockString(process.uptime() * 1000)}
| 🏙️ **Usuarios:** ${Object.keys(global.db?.data?.users || {}).length}
| 📑 **Comandos:** ${Object.keys(global.plugins).length}
${sep}
📑 **𝐒𝐄𝐂𝐓𝐎𝐑:** ${paginaActual} / ${totalPaginas}
${sep}`.trim();

  const textoFinal = `${encabezado}\n${secciones}\n\n*— No me pidas nada más fuera de mi horario.*\n*${packname}*`;

  // Botones
  let buttons = [];
  if (paginaActual > 1) {
    buttons.push({ buttonId: `${usedPrefix}menu pagina ${paginaActual - 1}`, buttonText: { displayText: '⬅️ ANTERIOR' }, type: 1 });
  }
  if (paginaActual < totalPaginas) {
    buttons.push({ buttonId: `${usedPrefix}menu pagina ${paginaActual + 1}`, buttonText: { displayText: 'SIGUIENTE ➡️' }, type: 1 });
  }

  // Multimedia
  const videoGifURL = enlacesMultimedia.video[Math.floor(Math.random() * enlacesMultimedia.video.length)];
  const miniaturaRandom = enlacesMultimedia.imagen[Math.floor(Math.random() * enlacesMultimedia.imagen.length)];

  const contextInfo = {
    mentionedJid: [m.sender],
    isForwarded: true,
    forwardingScore: 999,
    forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 },
    externalAdReply: {
      title: '𝐕𝐈𝐂𝐓𝐎𝐑𝐈𝐀 𝐇𝐎𝐔𝐒𝐄𝐊𝐄𝐄𝐏𝐈𝐍𝐆 𝐂𝐎.',
      body: `Shark Service | Pag. ${paginaActual}`,
      thumbnailUrl: miniaturaRandom,
      sourceUrl: redes,
      mediaType: 1,
      renderLargerThumbnail: false
    }
  };

  try {
    // --- ENVÍO EN FORMATO GIF DIRECTO SIN BUFFER ---
    await conn.sendMessage(m.chat, {
      video: { url: videoGifURL },
      caption: textoFinal,
      footer: packname,
      gifPlayback: true, // Fuerza reproducción tipo GIF
      mimetype: 'video/mp4', // Asegura compatibilidad
      buttons: buttons.length > 0 ? buttons : undefined,
      headerType: 5,
      contextInfo
    }, { quoted: m });
  } catch (e) {
    // Fallback a imagen
    await conn.sendMessage(m.chat, { 
      image: { url: miniaturaRandom }, 
      caption: textoFinal, 
      footer: packname,
      buttons: buttons.length > 0 ? buttons : undefined,
      contextInfo 
    }, { quoted: m });
  }
};

handler.help = ['menu'];
handler.tags = ['main'];
handler.command = ['menu', 'menú', 'help'];

export default handler;

function clockString(ms) {
  let h = Math.floor(ms / 3600000);
  let m = Math.floor(ms / 60000) % 60;
  let s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

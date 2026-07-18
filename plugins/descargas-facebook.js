import { igdl } from 'ruhend-scraper' // Assuming 'igdl' can handle Facebook links based on the original code's usage

// --- Constantes y Configuración de Transmisión (Estilo Ellen Joe) ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

const handler = async (m, { text, conn, args }) => {
  const name = conn.getName(m.sender); // Identifying the Proxy

  const contextInfo = {
    mentionedJid: [m.sender],
    isForwarded: true,
    forwardingScore: 999,
    forwardedNewsletterMessageInfo: {
      newsletterJid,
      newsletterName,
      serverMessageId: -1
    },

  };

  if (!args[0]) {
    return m.replyExternal(`🦈 *Rastro frío, Proxy ${name}.* Necesito la URL de un video de Facebook para iniciar la extracción.`, { contextInfo });
  }

  let res;
  try {
    await m.react('🔄'); // Changed emoji to '🔄' for consistency
    m.replyExternal(`🔄 *Iniciando protocolo de extracción de Facebook, Proxy ${name}.* Aguarda, la carga visual está siendo procesada.`, { contextInfo });
    res = await igdl(args[0]); // Using igdl as per original code, confirm if it supports FB
  } catch (e) {
    await m.react('❌'); // Error reaction
    console.error("Error al obtener datos de Facebook:", e);
    return m.replyExternal(`❌ *Fallo en la transmisión de datos, Proxy ${name}.*\nVerifica el enlace proporcionado o informa del error. Detalles: ${e.message || e}`, { contextInfo });
  }

  let result = res.data;
  if (!result || result.length === 0) {
    await m.react('❌'); // Error reaction
    return m.replyExternal(`❌ *Carga visual fallida, Proxy ${name}.*\nNo se encontraron resultados válidos para el enlace de Facebook.`, { contextInfo });
  }

  let data;
  try {
    // Prioritize 720p, then 360p, or any available video link if resolution info is absent
    data = result.find(i => i.resolution === "720p (HD)") ||
           result.find(i => i.resolution === "360p (SD)") ||
           result.find(i => i.url && i.type === 'video'); // Fallback to any video URL
  } catch (e) {
    await m.react('❌'); // Error reaction
    console.error("Error al procesar los datos de resolución:", e);
    return m.replyExternal(`⚠️ *Anomalía de datos, Proxy ${name}.*\nError al procesar las resoluciones disponibles.`, { contextInfo });
  }

  if (!data || !data.url) {
    await m.react('❌'); // Error reaction
    return m.replyExternal(`❌ *Resolución no disponible, Proxy ${name}.*\nNo se encontró una resolución adecuada o un enlace de video descargable.`, { contextInfo });
  }

  let video = data.url;
  const caption = `
╭━━━━[ 𝙵𝚊𝚌𝚎𝚋𝚘𝚘𝚔 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝙲𝚊𝚛𝚐𝚊 𝚅𝚒𝚜𝚞𝚊𝚕 𝙰𝚜𝚎𝚐𝚞𝚛𝚊𝚍𝚊 ]━━━━⬣
📹 *Tipo de Contenido:* Video de Facebook
⚙️ *Resolución Capturada:* ${data.resolution || 'Óptima disponible'}
🔗 *Enlace de Origen:* ${args[0]}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;

  try {
    await conn.sendMessage(m.chat, { video: { url: video }, caption: caption, fileName: 'fb.mp4', mimetype: 'video/mp4' }, { quoted: m });
    await m.react('✅'); // Success reaction
  } catch (e) {
    console.error("Error al enviar el video de Facebook:", e);
    await m.react('❌'); // Error reaction
    return m.replyExternal(`⚠️ *Anomalía en la transmisión de video, Proxy ${name}.*\nNo pude enviar el video. Detalles: ${e.message || e}`, { contextInfo });
  }
}

handler.help = ['facebook <url>', 'fb <url>'];
handler.tags = ['descargas'];
handler.command = ['facebook', 'fb'];
handler.group = true;
handler.register = true;
handler.coin = 2;

export default handler;

import fetch from 'node-fetch';

// --- Constantes y Configuración de Transmisión (Estilo Ellen Joe) ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

let handler = async (m, { conn, text }) => { // Added conn to params
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

  if (!text) {
    return m.replyExternal(`🦈 *Rastro frío, Proxy ${name}.* Necesito un término de búsqueda para iniciar el barrido en Google.`, { contextInfo });
  }

  m.react('🔄'); // Processing reaction
  m.replyExternal(`🔄 *Iniciando protocolo de barrido en Google, Proxy ${name}.* Aguarda, la carga de datos está siendo procesada.`, { contextInfo });

  const apiUrl = `https://delirius-apiofc.vercel.app/search/googlesearch?query=${encodeURIComponent(text)}`;

  try {
    const response = await fetch(apiUrl);
    const result = await response.json();

    if (!result.status || !result.data || result.data.length === 0) {
      await m.react('❌'); // Error reaction
      return m.replyExternal(`❌ *Carga de datos fallida, Proxy ${name}.*\nNo se encontraron resultados para "${text}". Verifica el término de búsqueda.`, { contextInfo });
    }

    let replyMessage = `╭━━━━[ 𝙶𝚘𝚘𝚐𝚕𝚎 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝚁𝚎𝚜𝚞𝚕𝚝𝚊𝚍𝚘𝚜 𝙰𝚜𝚎𝚐𝚞𝚛𝚊𝚍𝚘𝚜 ]━━━━⬣\n`;
    replyMessage += `🔎 *Término de Búsqueda:* ${text}\n\n`;

    // Only take the first result as per original code
    const item = result.data[0];
    replyMessage += `☁️ *Título:* ${item.title}\n`;
    replyMessage += `📰 *Descripción:* ${item.description}\n`;
    replyMessage += `🔗 *URL:* ${item.url}\n`;
    replyMessage += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;

    await m.react('✅'); // Success reaction
    m.replyExternal(replyMessage, { contextInfo });

  } catch (error) {
    console.error("Error al procesar Google search:", error);
    await m.react('❌'); // Error reaction
    m.replyExternal(`⚠️ *Anomalía crítica en la operación de Google, Proxy ${name}.*\nNo pude completar la búsqueda. Verifica el término o informa del error.\nDetalles: ${error.message}`, { contextInfo });
  }
};

handler.command = ['google'];
handler.help = ['google <término>']; // Added help text
handler.tags = ['buscador']; // Added tags

export default handler;

import cheerio from 'cheerio';
import axios from 'axios';

let handler = async (m, { conn, args }) => {
  // Verificación de NSFW
  if (!db.data.chats[m.chat].nsfw && m.isGroup) {
    return conn.reply(m.chat, `❌ El contenido *NSFW* está desactivado en este grupo.`, m);
  }

  let text = args.join(" ");
  if (!text) return conn.reply(m.chat, `📑 Por favor, ingresa una búsqueda o un enlace de Pornhub.`, m);

  const isUrl = text.match(/phncdn\.com|pornhub\.com/i);
  let targetUrl = text;

  try {
    await m.react('⏳');

    // --- SI ES BÚSQUEDA, ELEGIMOS UNO AL AZAR ---
    if (!isUrl) {
      let searchResults = await searchPornhub(text);
      if (searchResults.result.length === 0) {
        await m.react('❌');
        return conn.reply(m.chat, `❌ No se encontraron resultados.`, m);
      }
      const randomVideo = searchResults.result[Math.floor(Math.random() * searchResults.result.length)];
      targetUrl = randomVideo.url;
    }

    // --- OBTENEMOS EL LINK DE DESCARGA DE LA API ---
    const apiUrl = `https://api-causas.duckdns.org/api/v1/nsfw/descargas/pornhub?url=${encodeURIComponent(targetUrl)}&apikey=causa-7c134894eacc45d7`;
    const { data } = await axios.get(apiUrl);

    if (data.status && data.data) {
      const { title, thumbnail, duration, download_url } = data.data;

      // ENVIAR EL VIDEO USANDO LA URL DIRECTA (WhatsApp hace el trabajo pesado)
      await conn.sendMessage(m.chat, { 
        video: { url: download_url }, 
        caption: `✨ *P O R N H U B*\n\n🎞️ *Título:* ${title}\n🕒 *Duración:* ${duration}`,
        mimetype: 'video/mp4',
        fileName: `${title}.mp4`,
        thumbnail: { url: thumbnail } 
      }, { quoted: m });

      await m.react('✅');
    } else {
      throw new Error("No se obtuvo enlace de descarga.");
    }

  } catch (e) {
    console.error(e);
    await m.react('❌');
    conn.reply(m.chat, `⚠️ Error: No se pudo procesar el video.`, m);
  }
};

handler.help = ['phdl'];
handler.tags = ['+18'];
handler.command = ['phdl', 'pornhubdl'];

export default handler;

async function searchPornhub(search) {
  try {
    const response = await axios.get(`https://www.pornhub.com/video/search?search=${encodeURIComponent(search)}`);
    const $ = cheerio.load(response.data);
    const result = [];

    $('ul#videoSearchResult > li.pcVideoListItem').each(function() {
      const _title = $(this).find('a').attr('title');
      const _url = $(this).find('a').attr('href');
      if (_title && _url) {
        result.push({ title: _title, url: 'https://www.pornhub.com' + _url });
      }
    });
    return { result };
  } catch {
    return { result: [] };
  }
}

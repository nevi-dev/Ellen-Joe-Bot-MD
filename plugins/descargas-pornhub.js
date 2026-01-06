import cheerio from 'cheerio';
import axios from 'axios';

let handler = async (m, { conn, args, command }) => {
  // Verificación de NSFW
  if (!db.data.chats[m.chat].nsfw && m.isGroup) {
    return conn.reply(m.chat, `❌ El contenido *NSFW* está desactivado en este grupo.`, m);
  }

  let text = args.join(" ");
  if (!text) return conn.reply(m.chat, `📑 Por favor, ingresa una búsqueda o un enlace de Pornhub.`, m);

  // Determinar si es una URL o una búsqueda
  const isUrl = text.match(/phncdn\.com|pornhub\.com/i);
  let targetUrl = text;

  try {
    await m.react('⏳');

    // --- SI ES BÚSQUEDA, OBTENER UN LINK ALEATORIO ---
    if (!isUrl) {
      let searchResults = await searchPornhub(text);
      if (searchResults.result.length === 0) {
        await m.react('❌');
        return conn.reply(m.chat, `❌ No se encontraron resultados para: ${text}`, m);
      }
      // Seleccionar un video aleatorio de la lista
      const randomVideo = searchResults.result[Math.floor(Math.random() * searchResults.result.length)];
      targetUrl = randomVideo.url;
      
      // Avisar que se encontró algo y se está procesando
      await conn.reply(m.chat, `🔍 Encontré: *${randomVideo.title}*\n📦 Descargando video...`, m);
    } else {
      await conn.reply(m.chat, `📦 Procesando enlace, por favor espera...`, m);
    }

    // --- LÓGICA DE DESCARGA (API CAUSAS) ---
    const apiUrl = `https://api-causas.duckdns.org/api/v1/nsfw/descargas/pornhub?url=${encodeURIComponent(targetUrl)}&apikey=causa-ca764667eaad6318`;
    const { data } = await axios.get(apiUrl);

    if (data.status && data.data) {
      const { title, thumbnail, duration, download_url } = data.data;

      let caption = `✨ *P O R N H U B*\n\n`;
      caption += `🎞️ *Título:* ${title}\n`;
      caption += `🕒 *Duración:* ${duration}\n`;

      // Enviamos el video con la miniatura y el título
      await conn.sendMessage(m.chat, { 
        video: { url: download_url }, 
        caption: caption,
        mimetype: 'video/mp4',
        thumbnail: await (await axios.get(thumbnail, { responseType: 'arraybuffer' })).data
      }, { quoted: m });

      await m.react('✅');
    } else {
      throw new Error("La API no devolvió un archivo válido.");
    }

  } catch (e) {
    console.error(e);
    await m.react('❌');
    conn.reply(m.chat, `⚠️ Ocurrió un error al procesar la solicitud.`, m);
  }
};

handler.help = ['phdl'];
handler.tags = ['+18'];
handler.command = ['phdl', 'pornhubdl'];

export default handler;

// Función de Scraping para obtener resultados de búsqueda
async function searchPornhub(search) {
  try {
    const response = await axios.get(`https://www.pornhub.com/video/search?search=${encodeURIComponent(search)}`);
    const $ = cheerio.load(response.data);
    const result = [];

    $('ul#videoSearchResult > li.pcVideoListItem').each(function() {
      const _title = $(this).find('a').attr('title');
      const _url = $(this).find('a').attr('href');
      if (_title && _url && !_url.includes('javascript:void(0)')) {
        result.push({ 
          title: _title, 
          url: 'https://www.pornhub.com' + _url 
        });
      }
    });

    return { result };
  } catch (error) {
    return { result: [] };
  }
}

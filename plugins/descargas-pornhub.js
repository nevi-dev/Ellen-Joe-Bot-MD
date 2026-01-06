import cheerio from 'cheerio';
import axios from 'axios';

let handler = async (m, { conn, args, command, usedPrefix }) => {
  // Verificación de NSFW
  if (!db.data.chats[m.chat].nsfw && m.isGroup) {
    return conn.reply(m.chat, `❌ El contenido *NSFW* está desactivado en este grupo.`, m);
  }

  let text = args.join(" ");
  if (!text) return conn.reply(m.chat, `📑 Por favor, ingresa una búsqueda o un enlace de Pornhub.`, m);

  // Determinar si es una URL o una búsqueda
  const isUrl = text.match(/phncdn\.com|pornhub\.com/i);

  try {
    if (isUrl) {
      // --- LÓGICA DE DESCARGA ---
      await m.react('⏳');
      const apiUrl = `https://api-causas.duckdns.org/api/v1/nsfw/descargas/pornhub?url=${encodeURIComponent(text)}&apikey=causa-ca764667eaad6318`;
      
      const { data } = await axios.get(apiUrl);

      if (data.status && data.data) {
        const { title, thumbnail, duration, download_url } = data.data;
        
        let caption = `✨ *D E S C A R G A*\n\n`;
        caption += `🎞️ *Título:* ${title}\n`;
        caption += `🕒 *Duración:* ${duration}\n`;
        caption += `📦 *Enviando video...*`;

        // Enviamos el video con la miniatura y el título
        await conn.sendMessage(m.chat, { 
          video: { url: download_url }, 
          caption: caption,
          mimetype: 'video/mp4',
          thumbnail: await (await axios.get(thumbnail, { responseType: 'arraybuffer' })).data
        }, { quoted: m });
        
        await m.react('✅');
      } else {
        throw new Error("No se pudo obtener el enlace de descarga.");
      }

    } else {
      // --- LÓGICA DE BÚSQUEDA ---
      await m.react('🔍');
      let searchResults = await searchPornhub(text);
      
      if (searchResults.result.length === 0) {
        return conn.reply(m.chat, `❌ No se encontraron resultados para: ${text}`, m);
      }

      let teks = `🔎 *R E S U L T A D O S*\n\n`;
      searchResults.result.forEach((v, i) => {
        teks += `*${i + 1}.* ${v.title}\n`;
        teks += `🕒 *Duración:* ${v.duration} | 👀 *Vistas:* ${v.views}\n`;
        teks += `🔗 *Link:* ${v.url}\n`;
        teks += `-----------------------------------\n`;
      });

      teks += `\n> Responde con el link para descargar el video.`;
      conn.reply(m.chat, teks, m);
    }

  } catch (e) {
    console.error(e);
    await m.react('❌');
    conn.reply(m.chat, `⚠️ Ocurrió un error: ${e.message}`, m);
  }
};

handler.help = ['phdl'];
handler.tags = ['+18'];
handler.command = ['phdl', 'pornhubdl'];

export default handler;

// Función auxiliar para búsqueda (Scraping)
async function searchPornhub(search) {
  try {
    const response = await axios.get(`https://www.pornhub.com/video/search?search=${encodeURIComponent(search)}`);
    const $ = cheerio.load(response.data);
    const result = [];

    $('ul#videoSearchResult > li.pcVideoListItem').each(function() {
      const _title = $(this).find('a').attr('title');
      if (_title) { // Evitar elementos vacíos o anuncios
        const _duration = $(this).find('var.duration').text().trim();
        const _views = $(this).find('var.views').text().trim();
        const _url = 'https://www.pornhub.com' + $(this).find('a').attr('href');
        result.push({ title: _title, duration: _duration, views: _views, url: _url });
      }
    });

    return { result };
  } catch (error) {
    return { result: [] };
  }
}

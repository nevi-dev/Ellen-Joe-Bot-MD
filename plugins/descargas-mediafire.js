// ====================================================================
// --- LIBRERÍAS REQUERIDAS ---
// ====================================================================
// 🚨 Importamos las librerías necesarias para el scraping
import axios from 'axios'; // 🚨 Usamos Axios en lugar de got
import * as cheerio from 'cheerio';
// No necesitamos 'node-fetch'

// --- CONSTANTES Y UTILIDADES LOCALES ---

// 1. Headers de Solicitud 
const DEFAULT_HEADERS = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'en-US,en;q=0.9',
    'sec-ch-ua': '"Google Chrome";v="117", "Not;A=Brand";v="8", "Chromium";v="117"',
    'sec-ch-ua-mobile': '?0',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
};

// 2. Función parseFileSize
/**
 * @returns as a kilobit (kb)
 */
function parseFileSize (size) {
    return parseFloat(size) * (
      /GB/i.test(size)
        ? 1000000
        : /MB/i.test(size)
          ? 1000
          : /KB/i.test(size)
            ? 1
            : /bytes?/i.test(size)
              ? 0.001
              : /B/i.test(size)
                ? 0.1
                : 0
    )
}

// --- FUNCIÓN SCRAPER DE MEDIAFIRE ADAPTADA PARA AXIOS ---
async function mediafiredlScraper(url) {
    // 🚨 CAMBIO CLAVE: Usamos axios.get
    const response = await axios.get(url, {
        headers: DEFAULT_HEADERS
    });
    
    const data = response.data; // Axios retorna el cuerpo como .data
    const $ = cheerio.load(data);
    
    // Extracción de enlaces de descarga
    const Url = ($('#downloadButton').attr('href') || '').trim();
    const url2 = ($('#download_link > a.retry').attr('href') || '').trim();
    
    // Extracción de metadatos
    const $intro = $('div.dl-info > div.intro');
    const filename = $intro.find('div.filename').text().trim();
    const filetype = $intro.find('div.filetype > span').eq(0).text().trim();
    
    // Extracción de extensión
    const extMatch = /\(\.(.*?)\)/.exec($intro.find('div.filetype > span').eq(1).text());
    const ext = extMatch?.[1]?.trim() || 'bin';
    
    // Extracción de detalles (fecha y tamaño)
    const $li = $('div.dl-info > ul.details > li');
    const aploud = $li.eq(1).find('span').text().trim(); // Fecha de subida
    const filesizeH = $li.eq(0).find('span').text().trim(); // Tamaño legible (ej: 100 MB)
    const filesize = parseFileSize(filesizeH); // Tamaño en Kb

    const result = {
        url: Url || url2,
        filename,
        filetype,
        ext,
        aploud,
        filesizeH,
        filesize 
    }
    
    if (!result.url) {
        throw new Error("No se pudo extraer el enlace de descarga directa. El archivo podría ser privado o el selector de MediaFire ha cambiado.");
    }
    
    return result;
}


// ====================================================================
// --- HANDLER PRINCIPAL (MEDIAFIRE) ---
// ====================================================================

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    const name = conn.getName(m.sender);

    // Asegúrate que 'icons' y 'redes' estén definidos globalmente
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
            title: 'Ellen Joe: Pista localizada. 🦈',
            body: `Procesando solicitud para el/la Proxy ${name}...`,
            thumbnail: icons,
            sourceUrl: redes,
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    if (!text) {
        return conn.reply(m.chat, `🦈 *Rastro frío, Proxy ${name}.* Necesito la URL de un archivo de MediaFire para iniciar la extracción.`, m, { contextInfo, quoted: m });
    }

    conn.sendMessage(m.chat, { react: { text: "🔄", key: m.key } });
    conn.reply(m.chat, `🔄 *Iniciando protocolo de extracción MediaFire (Scraper), Proxy ${name}.* Aguarda, la carga de datos está siendo procesada.`, m, { contextInfo, quoted: m });

    try {
        // 🚨 Llamada al Scraper Integrado (usando Axios)
        let fileData = await mediafiredlScraper(text); 
        
        const caption = `
╭━━━━[ 𝙼𝚎𝚍𝚒𝚊𝙵𝚒𝚛𝚎 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝙲𝚊𝚛𝚐𝚊 𝙰𝚜𝚎𝚐𝚞𝚛𝚊𝚍𝚊 ]━━━━⬣
📦 *Designación de Archivo:* ${fileData.filename}
⚖️ *Tamaño de Carga:* ${fileData.filesizeH}
📂 *Tipo de Archivo:* ${fileData.filetype} (.${fileData.ext})
⬆️ *Fecha de Subida:* ${fileData.aploud}
🔗 *Enlace de Origen:* ${text}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;
        
        // Enviamos el archivo usando la URL de descarga directa
        await conn.sendFile(m.chat, fileData.url, fileData.filename, caption, m);
        await m.react('✅'); 

    } catch (error) {
        console.error("Error al procesar MediaFire:", error);
        await m.react('❌'); 
        
        // Manejamos errores de Axios, errores de Scraper, etc.
        const errorMessage = (error.message && typeof error.message === 'string') 
                            ? error.message.substring(0, 100)
                            : 'Error desconocido durante el scraping.';

        conn.reply(m.chat, `⚠️ *Anomalía crítica en la operación MediaFire, Proxy ${name}.*\nNo pude completar la extracción. Verifica el enlace o informa del error.\nDetalles: ${errorMessage}`, m, { contextInfo, quoted: m });
    }
}

handler.help = ['mediafire <url>'];
handler.tags = ['descargas'];
handler.command = ['mf', 'mediafire'];
handler.coin = 10;
handler.register = true;
handler.group = true;

export default handler;

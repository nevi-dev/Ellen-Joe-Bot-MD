//nevi-dev
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'

// --- Constantes y Configuración de Transmisión (Estilo Ellen Joe) ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

// --- HEADERS OPTIMIZADOS (Basados en el scraper exitoso) ---
const SCRAPER_HEADERS = {
    'accept': '*/*',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'es-ES,es;q=0.9,en;q=0.8', // Modificado para español
    'sec-ch-ua': '"Google Chrome";v="117", "Not;A=Brand";v="8", "Chromium";v="117"',
    'sec-ch-ua-mobile': '?0',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    // Usamos el User-Agent de Chrome 117
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
};

/**
 * Extrae URLs de imágenes de alta calidad de la página de resultados de Google usando RegEx (similar a Bochilteam).
 * @param {string} query - Término de búsqueda.
 * @returns {Promise<string[]>} - Array de URLs de imágenes.
 */
async function extractGoogleImages(query) {
    // Usamos tbm=isch para forzar la vista de imágenes
    const searchUrl = `https://www.google.com/search?q=${query}&tbm=isch`;

    const response = await fetch(searchUrl, {
        headers: SCRAPER_HEADERS // <<<<<< USANDO HEADERS DE CHROME
    });
    const html = await response.text();

    const $ = cheerio.load(html);

    // REGEX CLAVE adaptada (busca la URL real incrustada en el JSON)
    const pattern =
        /\[1,\[0,"(?<id>[\d\w\-_]+)",\["https?:\/\/(?:[^"]+)",\d+,\d+\]\s?,\["(?<url>https?:\/\/(?:[^"]+))",\d+,\d+\]/gm;

    const matches = $.html().matchAll(pattern);

    // Función para decodificar URLs que Google a veces codifica
    const decodeUrl = (url) => {
        if (!url) return null;
        try {
            // Intenta decodificar la cadena JSON/string
            return decodeURIComponent(JSON.parse(`"${url}"`));
        } catch (e) {
            return url;
        }
    };

    const imageUrls = [...matches]
        .map(({ groups }) => decodeUrl(groups?.url)) 
        .filter((v) => v && /.*\.jpe?g|png$/gi.test(v)) // Filtra por extensión
        .filter(v => v.startsWith('http')); // Asegura que sea una URL completa

    return imageUrls;
}


const handler = async (m, { conn, text, usedPrefix, command }) => {
    const name = conn.getName(m.sender);

    // --- Definición de Context Info (External Ad Reply) ---
    // NOTA: Asumo que 'icons' y 'redes' están definidos globalmente en tu entorno.
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
        return conn.reply(m.chat, `🦈 *Rastro frío, Proxy ${name}.* Necesito un término de búsqueda para localizar imágenes.`, m, { contextInfo, quoted: m });
    }

    await m.react('🔄'); 
    conn.reply(m.chat, `🔄 *Iniciando protocolo de barrido (JSON/Headers Optimizado), Proxy ${name}.* Extrayendo URLs de alta calidad...`, m, { contextInfo, quoted: m });

    try {
        // 1. Usar la función de extracción avanzada
        const results = await extractGoogleImages(text); 

        if (!results || results.length === 0) {
            await m.react('❌'); 
            // El error más probable es que la RegEx falló de nuevo o no hay resultados.
            return conn.reply(m.chat, `❌ *Carga visual fallida, Proxy ${name}.*\nNo se encontraron imágenes o la estructura de Google ha sido actualizada.`, m, { contextInfo, quoted: m });
        }

        // 2. Selección Aleatoria de una URL (para variar el resultado)
        const randomIndex = Math.floor(Math.random() * results.length);
        const imageUrl = results[randomIndex];
        
        // 3. Envío de la Imagen
        const caption = `
╭━━━━[ 𝙶𝚘𝚘𝚐𝚕𝚎 𝙸𝚖𝚊𝚐𝚎 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝙲𝚊𝚛𝚐𝚊 𝚅𝚒𝚜𝚞𝚊𝚕 𝙰s𝚎𝚐𝚞𝚛𝚊𝚍𝚊 ]━━━━⬣
🖼️ *Término de Búsqueda:* ${text}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;

        await conn.sendFile(m.chat, imageUrl, 'image.jpg', caption, m);
        await m.react('✅'); 

    } catch (error) {
        console.error("Error al procesar Google Image (Optimizado):", error);
        await m.react('❌'); 
        conn.reply(m.chat, `⚠️ *Anomalía crítica en la operación de extracción, Proxy ${name}.*\nError: ${error.message}`, m, { contextInfo, quoted: m });
    }
};

handler.help = ['imagen <término>'];
handler.tags = ['buscador', 'tools', 'descargas'];
handler.command = ['image', 'imagen'];
handler.register = true;

export default handler;

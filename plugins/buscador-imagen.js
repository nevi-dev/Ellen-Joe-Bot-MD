import fetch from 'node-fetch';
import * as cheerio from 'cheerio'; // Importar cheerio para analizar el HTML

// --- Constantes y Configuración de Transmisión (Estilo Ellen Joe) ---
// NOTA: Estas variables (icons, redes) DEBEN estar definidas y accesibles en tu entorno global.
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

// --- Función Auxiliar para Extracción de Imagen de la Página de Origen ---
/**
 * Intenta encontrar la imagen principal de alta resolución en una página web dada.
 * @param {string} pageUrl - La URL de la página web de origen.
 * @returns {Promise<string|null>} - La URL de la imagen grande o null.
 */
async function findHighResImage(pageUrl) {
    try {
        const response = await fetch(pageUrl, {
            // Usar headers también para la página de origen
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
                'Accept': 'text/html',
            }
        });
        const html = await response.text();
        const $ = cheerio.load(html);

        let finalImageUrl = null;

        // Búsqueda 1: Tags Open Graph (Metadata de redes sociales, alta probabilidad de éxito)
        finalImageUrl = $('meta[property="og:image"]').attr('content');
        if (finalImageUrl) return finalImageUrl;
        
        // Búsqueda 2: Tags de Twitter Card (también metadata)
        finalImageUrl = $('meta[name="twitter:image"]').attr('content');
        if (finalImageUrl) return finalImageUrl;

        // Búsqueda 3: Imágenes grandes en la página (heurística, buscando un 'src' que no sea un ícono)
        $('img').each((i, element) => {
             const src = $(element).attr('src') || $(element).attr('data-src');
             // Si el src existe, es un enlace HTTP completo y no parece ser un ícono/miniatura
             if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && !src.includes('thumb')) {
                 finalImageUrl = src;
                 return false; // Detener después de encontrar el primero válido
             }
        });
        
        return finalImageUrl;

    } catch (error) {
        console.error("Error al hacer fetch a la página de origen:", error);
        return null;
    }
}


// --- Handler Principal ---
const handler = async (m, { conn, text, usedPrefix, command }) => {
    const name = conn.getName(m.sender);

    // --- Definición de Context Info (External Ad Reply) ---
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
    conn.reply(m.chat, `🔄 *Iniciando protocolo de doble barrido (SC), Proxy ${name}.* Buscando el enlace de origen con contingencia.`, m, { contextInfo, quoted: m });

    try {
        const encodedText = encodeURIComponent(text);
        const searchUrl = `https://www.google.com/search?q=${encodedText}&udm=2&safe=active`; 

        // --- Nivel 1: Obtener los enlaces de la página de resultados de Google ---
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
            }
        });
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        let sourcePageLink = null;
        let firstResultHref = null;

        // **INICIO DE LA SOLUCIÓN 1: Múltiples Selectores de Contingencia**
        
        // 1. Contingencia A: Busca enlaces con 'imgurl' (Más común)
        firstResultHref = $('a[href*="imgurl"]').first().attr('href');

        // 2. Contingencia B: Busca enlaces con 'imgrefurl' (Alternativa común)
        if (!firstResultHref) {
            firstResultHref = $('a[href*="imgrefurl"]').first().attr('href');
        }

        // 3. Contingencia C: Selector de contenedor de resultados (Heurística)
        if (!firstResultHref) {
            firstResultHref = $('.DS1iW a').first().attr('href');
        }
        
        // **FIN DE LA SOLUCIÓN 1**

        // --- Procesamiento del Enlace Encontrado ---

        if (firstResultHref) {
            // Se usa URLSearchParams para extraer la URL de origen real de los parámetros de Google
            const urlParams = new URLSearchParams(firstResultHref);
            
            // El parámetro 'url' o 'imgurl' a menudo contiene el enlace a la página de origen real.
            sourcePageLink = urlParams.get('url') || urlParams.get('imgurl');
        }

        if (!sourcePageLink) {
            await m.react('❌'); 
            return conn.reply(m.chat, `❌ *Fallo en Nivel 1, Proxy ${name}.*\nNo se pudo encontrar el enlace a la página de origen para "${text}".`, m, { contextInfo, quoted: m });
        }
        
        // --- Nivel 2: Entrar a la página de origen y buscar la imagen grande ---
        const imageUrl = await findHighResImage(sourcePageLink);

        if (!imageUrl) {
            await m.react('❌'); 
            return conn.reply(m.chat, `❌ *Fallo en Nivel 2, Proxy ${name}.*\nSe encontró la página de origen, pero no se pudo extraer la imagen de alta resolución.`, m, { contextInfo, quoted: m });
        }

        // 3. Envío de la Imagen
        const caption = `
╭━━━━[ 𝙶𝚘𝚘𝚐𝚕𝚎 𝙸𝚖𝚊𝚐𝚎 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝙲𝚊𝚛𝚐𝚊 𝚅𝚒𝚜𝚞𝚊𝚕 𝙰s𝚎𝚐𝚞𝚛𝚊𝚍𝚊 ]━━━━⬣
🖼️ *Término de Búsqueda (2 Niveles):* ${text}
🔗 *Página de Origen:* ${sourcePageLink}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;

        await conn.sendFile(m.chat, imageUrl, 'image.jpg', caption, m);
        await m.react('✅'); 

    } catch (error) {
        console.error("Error al procesar Google Image (2 Niveles):", error);
        await m.react('❌'); 
        conn.reply(m.chat, `⚠️ *Anomalía crítica en la operación de doble barrido, Proxy ${name}.*\nError: ${error.message}`, m, { contextInfo, quoted: m });
    }
};

handler.help = ['imagen <término>'];
handler.tags = ['buscador', 'tools', 'descargas'];
handler.command = ['image', 'imagen'];
handler.register = true;

export default handler;

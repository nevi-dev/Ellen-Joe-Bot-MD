import fetch from 'node-fetch';
import * as cheerio from 'cheerio'; 

// --- Constantes y Configuración de Transmisión ---
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

        // Búsqueda 3: Imágenes grandes en la página (heurística)
        // Busca la primera imagen que parezca ser la principal y tenga un 'src' válido
        $('img').each((i, element) => {
             const src = $(element).attr('src') || $(element).attr('data-src');
             // Si el src existe, no es un ícono pequeño y parece una imagen principal
             if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && !src.includes('thumb')) {
                 finalImageUrl = src;
                 return false; // Detener después de encontrar la primera
             }
        });
        
        return finalImageUrl;

    } catch (error) {
        console.error("Error al hacer fetch a la página de origen:", error);
        return null;
    }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
    const name = conn.getName(m.sender); 
    // ... (contextInfo, validación de permisos y mensajes de proceso omitidos por brevedad) ...
    const contextInfo = { /* ... */ }; // Definición de contextInfo

    if (!text) {
        return conn.reply(m.chat, `🦈 *Rastro frío, Proxy ${name}.* Necesito un término de búsqueda para localizar imágenes.`, m, { contextInfo, quoted: m });
    }

    await m.react('🔄'); 
    conn.reply(m.chat, `🔄 *Iniciando protocolo de doble barrido (SC), Proxy ${name}.* Se buscará en la página de origen.`, m, { contextInfo, quoted: m });

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
        
        // Selector simplificado para buscar el enlace de la página de origen.
        // Google envuelve sus resultados de imágenes en un <a> o un <div> con un enlace a la fuente.
        // Buscaremos el enlace que Google usa para la página de origen de la primera imagen.
        const firstResultLink = $('a[href*="imgurl"]').first().attr('href');

        if (firstResultLink) {
             // El enlace de Google a menudo es un redirector complejo. Intentaremos extraer la URL de origen de los parámetros.
             const urlParams = new URLSearchParams(firstResultLink);
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

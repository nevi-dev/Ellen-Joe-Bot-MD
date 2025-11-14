import fetch from 'node-fetch';
import * as cheerio from 'cheerio'; // Importar cheerio para analizar el HTML

// --- Constantes y Configuración de Transmisión (Estilo Ellen Joe) ---
// NOTA: Estas variables (newsletterJid, newsletterName, icons, redes)
// DEBEN estar definidas y accesibles en tu entorno global.
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

const handler = async (m, { conn, text, usedPrefix, command }) => {
    const name = conn.getName(m.sender); // Obtener el nombre del usuario

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
            // Asegúrate de que 'icons' y 'redes' estén definidos globalmente
            thumbnail: icons, 
            sourceUrl: redes,
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    if (!text) {
        return conn.reply(m.chat, `🦈 *Rastro frío, Proxy ${name}.* Necesito un término de búsqueda para localizar imágenes.`, m, { contextInfo, quoted: m });
    }

    // --- Mensajes de Proceso ---
    await m.react('🔄'); // Reacción de procesamiento
    conn.reply(m.chat, `🔄 *Iniciando protocolo de barrido de imágenes (SC), Proxy ${name}.* Aguarda, la carga visual está siendo procesada.`, m, { contextInfo, quoted: m });

    try {
        const encodedText = encodeURIComponent(text);
        // Usamos tbm=isch o udm=2 para buscar directamente en Google Imágenes
        const searchUrl = `https://www.google.com/search?q=${encodedText}&udm=2&safe=active`; 

        // 1. Fetch de la página web CON HEADERS (simulando un navegador Firefox en Ubuntu)
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3' // Añadido para ayudar con el idioma
            }
        });
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        let imageUrl = null; // Usaremos esta variable para la URL o la cadena Base64
        
        // 2. Extracción de la cadena Base64 del script de carga de imágenes
        $('script').each((i, element) => {
            const scriptContent = $(element).html();
            
            // Expresión regular para buscar el patrón 'var s=' con el prefijo Base64
            // Nota: Se usa el modificador 's' (dotall) para que el punto '.' coincida con saltos de línea.
            const regex = /var s='(data:image\/(?:jpeg|png|webp);base64,.*?)\';/s; 
            const match = scriptContent.match(regex);
            
            if (match && match[1]) {
                // match[1] contiene la cadena Base64 completa (ej: data:image/jpeg;base64,...)
                imageUrl = match[1];
                return false; // Detiene la iteración de Cheerio una vez que se encuentra la primera imagen
            }
        });

        if (!imageUrl) {
            await m.react('❌'); 
            return conn.reply(m.chat, `❌ *Carga visual fallida, Proxy ${name}.*\nNo se pudo extraer la imagen (Base64). El scraper pudo haber sido bloqueado.`, m, { contextInfo, quoted: m });
        }

        // 3. Envío de la Imagen
        const caption = `
╭━━━━[ 𝙶𝚘𝚘𝚐𝚕𝚎 𝙸𝚖𝚊𝚐𝚎 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝙲𝚊𝚛𝚐𝚊 𝚅𝚒𝚜𝚞𝚊𝚕 𝙰s𝚎𝚐𝚞𝚛𝚊𝚍𝚊 ]━━━━⬣
🖼️ *Término de Búsqueda (SC):* ${text}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;

        // Se usa la cadena Base64 directamente como URL
        await conn.sendFile(m.chat, imageUrl, 'image.jpg', caption, m);
        await m.react('✅'); // Reacción de éxito

    } catch (error) {
        console.error("Error al procesar Google Image (SC):", error);
        await m.react('❌'); // Reacción de error
        conn.reply(m.chat, `⚠️ *Anomalía crítica en la operación (SC), Proxy ${name}.*\nNo pude completar la extracción. Detalle: ${error.message}`, m, { contextInfo, quoted: m });
    }
};

handler.help = ['imagen <término>'];
handler.tags = ['buscador', 'tools', 'descargas'];
handler.command = ['image', 'imagen'];
handler.register = true; // Asumo que esto es para registrar el comando

export default handler;

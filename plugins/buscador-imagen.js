import fetch from 'node-fetch';
import * as cheerio from 'cheerio'; 

// --- Constantes y Configuración de Transmisión ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

// --- Función Auxiliar findHighResImage (sin cambios) ---
async function findHighResImage(pageUrl) {
    try {
        const response = await fetch(pageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
                'Accept': 'text/html',
            }
        });
        const html = await response.text();
        const $ = cheerio.load(html);

        let finalImageUrl = null;

        // Búsqueda 1: Tags Open Graph
        finalImageUrl = $('meta[property="og:image"]').attr('content');
        if (finalImageUrl) return finalImageUrl;
        
        // Búsqueda 2: Tags de Twitter Card
        finalImageUrl = $('meta[name="twitter:image"]').attr('content');
        if (finalImageUrl) return finalImageUrl;

        // Búsqueda 3: Imágenes grandes en la página
        $('img').each((i, element) => {
             const src = $(element).attr('src') || $(element).attr('data-src');
             if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon') && !src.includes('thumb')) {
                 finalImageUrl = src;
                 return false; 
             }
        });
        
        return finalImageUrl;

    } catch (error) {
        console.error("Error al hacer fetch a la página de origen:", error);
        return null;
    }
}


// --- Handler Principal con Extracción de JSON ---
const handler = async (m, { conn, text, usedPrefix, command }) => {
    const name = conn.getName(m.sender);
    // Asumo que 'icons' y 'redes' están definidos globalmente
    const contextInfo = { /* ... */ }; 

    if (!text) {
        return conn.reply(m.chat, `🦈 *Rastro frío, Proxy ${name}.* Necesito un término de búsqueda para localizar imágenes.`, m, { contextInfo, quoted: m });
    }

    await m.react('🔄'); 
    conn.reply(m.chat, `🔄 *Iniciando protocolo de JSON/Doble barrido, Proxy ${name}.* Extrayendo datos brutos de Google.`, m, { contextInfo, quoted: m });

    try {
        const encodedText = encodeURIComponent(text);
        const searchUrl = `https://www.google.com/search?q=${encodedText}&udm=2&safe=active`; 

        // --- Nivel 1: Obtener el enlace de la página de origen del JSON ---
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
            }
        });
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        let sourcePageLink = null;
        let jsonText = null;

        // 1. Buscar la etiqueta script que contenga el JSON de resultados
        $('script').each((i, element) => {
            const scriptContent = $(element).html();
            if (scriptContent && scriptContent.includes('AF_initDataCallback')) {
                jsonText = scriptContent;
                return false; 
            }
        });

        if (jsonText) {
            // 2. Usar RegEx para extraer la primera URL de origen dentro del JSON.
            // La URL de origen (imgrefurl) suele ser el primer string importante en la estructura de datos.
            const jsonRegex = /data:\[null,null,null,null,null,\[\[\["([^"]+)"/g;
            let match = jsonRegex.exec(jsonText);
            
            if (match && match[1]) {
                sourcePageLink = match[1];
            }
        }

        if (!sourcePageLink) {
            await m.react('❌'); 
            return conn.reply(m.chat, `❌ *Fallo en Nivel 1, Proxy ${name}.*\nNo se pudo encontrar el enlace de origen en el JSON incrustado.`, m, { contextInfo, quoted: m });
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
        console.error("Error al procesar Google Image (JSON/2 Niveles):", error);
        await m.react('❌'); 
        conn.reply(m.chat, `⚠️ *Anomalía crítica en la operación de doble barrido, Proxy ${name}.*\nError: ${error.message}`, m, { contextInfo, quoted: m });
    }
};

handler.help = ['imagen <término>'];
handler.tags = ['buscador', 'tools', 'descargas'];
handler.command = ['image', 'imagen'];
handler.register = true;

export default handler;

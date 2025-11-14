import fetch from 'node-fetch';
import * as cheerio from 'cheerio'; 

// --- Constantes y Configuración de Transmisión ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

const handler = async (m, { conn, text, usedPrefix, command }) => {
    const name = conn.getName(m.sender);
    // Asumo que 'icons' y 'redes' están definidos globalmente
    const contextInfo = { /* ... */ }; 

    if (!text) {
        return conn.reply(m.chat, `🦈 *Rastro frío, Proxy ${name}.* Necesito un término de búsqueda para localizar imágenes.`, m, { contextInfo, quoted: m });
    }

    await m.react('🔄'); 
    conn.reply(m.chat, `🔄 *Iniciando protocolo de barrido directo, Proxy ${name}.* Extrayendo URL de imagen del HTML.`, m, { contextInfo, quoted: m });

    try {
        const encodedText = encodeURIComponent(text);
        const searchUrl = `https://www.google.com/search?q=${encodedText}&udm=2&safe=active`; 

        // 1. Fetch de la página web CON HEADERS
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
            }
        });
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        let imageUrl = null; 

        // 2. Búsqueda de la URL de Imagen Directa (data-iurl o data-src)
        // Este es el método más robusto contra cambios de Google que la RegEx.
        $('img').each((i, element) => {
            // data-iurl suele contener la URL de la imagen de tamaño completo (o casi)
            const src = $(element).attr('data-iurl') || $(element).attr('data-src'); 
            
            // Filtramos la primera URL http válida para asegurarnos de que no sea un ícono
            if (src && src.startsWith('http') && !src.includes('gstatic.com/images/branding')) {
                imageUrl = src;
                return false; // Obtener la primera y salir
            }
        });

        if (!imageUrl) {
            await m.react('❌'); 
            return conn.reply(m.chat, `❌ *Fallo en la extracción, Proxy ${name}.*\nNo se pudo encontrar ninguna URL de imagen.`, m, { contextInfo, quoted: m });
        }
        
        // 3. Envío de la Imagen
        const caption = `
╭━━━━[ 𝙶𝚘𝚘𝚐𝚕𝚎 𝙸𝚖𝚊𝚐𝚎 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝙲𝚊𝚛𝚐𝚊 𝚅𝚒𝚜𝚞𝚊𝚕 𝙰s𝚎𝚐𝚞𝚛𝚊𝚍𝚊 ]━━━━⬣
🖼️ *Término de Búsqueda (Directo):* ${text}
🔗 *URL Encontrada:* ${imageUrl}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;

        await conn.sendFile(m.chat, imageUrl, 'image.jpg', caption, m);
        await m.react('✅'); 

    } catch (error) {
        console.error("Error al procesar Google Image (Directo):", error);
        await m.react('❌'); 
        conn.reply(m.chat, `⚠️ *Anomalía crítica en la operación de barrido, Proxy ${name}.*\nError: ${error.message}`, m, { contextInfo, quoted: m });
    }
};

handler.help = ['imagen <término>'];
handler.tags = ['buscador', 'tools', 'descargas'];
handler.command = ['image', 'imagen'];
handler.register = true;

export default handler;

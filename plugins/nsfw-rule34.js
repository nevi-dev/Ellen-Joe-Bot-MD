// Necesitas instalar cheerio: npm install cheerio
// Necesitas instalar node-fetch, formdata-node, y file-type
import fetch from 'node-fetch';
import * as cheerio from 'cheerio'; // Importar cheerio
import { FormData, Blob } from "formdata-node";
import { fileTypeFromBuffer } from "file-type";

// --- CONSTANTES DE HD ---
// Eliminaremos las que no se usarán en el mensaje final.
const rwait = "⏳";
const done = "✅";
const error = "❌";
const emoji = "❕";
const emoji2 = "🚫";
const ellen = "🦈 Ellen Joe aquí... *ugh* que flojera~";
const VREDEN_API_URL = "https://api.vreden.my.id/api/v1/artificial/imglarger/upscale";
const CATBOX_API_URL = "https://catbox.moe/user/api.php";

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
}

async function uploadToCatbox(buffer, mimeType, ext) {
    const blob = new Blob([buffer], { type: mimeType }); 
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("fileToUpload", blob, `image.${ext}`);

    const response = await fetch(CATBOX_API_URL, {
        method: "POST",
        body: formData,
    });

    const result = await response.text();
    if (result.startsWith("https://files.catbox.moe/")) {
        return result;
    }
    throw new Error(`Catbox falló la subida.`); 
}
// -------------------------------------------------------------

const handler = async (m, { conn, args, usedPrefix }) => {
    // ... (Tu código de verificación de permisos, que no se ha modificado) ...
    if (!db.data.chats[m.chat].nsfw && m.isGroup) {
        return m.reply(`*nsfw🔞️* está desactivada en este grupo.\n> Un administrador puede activarla con el comando » *#nsfw on*`);
    }

    if (!args[0]) {
        await conn.reply(m.chat, `${emoji} Por favor, ingresa un tag para realizar la búsqueda.`, m);
        return;
    }

    const tag = args[0];
    const baseUrl = 'https://rule34.xxx/';
    const searchUrl = `${baseUrl}index.php?page=post&s=list&tags=${tag}`;
    const scaleFactor = 4;
    
    // Declarar variables que se usarán en el scope final
    let finalImageBuffer = null;
    let originalMediaBuffer = null;
    let captionText = `${emoji} Resultados para » *${tag}*`;

    try {
        await m.react(rwait);
        
        // 1. Búsqueda y obtención de la URL de la imagen de tamaño completo (Scrapping)
        const response = await fetch(searchUrl);
        const html = await response.text(); 
        const $ = cheerio.load(html);
        const postLinks = $('a[id^="p"]');
        
        if (postLinks.length === 0) {
            await m.react(error);
            await conn.reply(m.chat, `${emoji2} No se encontraron resultados de imágenes para *${tag}*`, m);
            return;
        }

        const randomIndex = Math.floor(Math.random() * postLinks.length);
        const postPath = $(postLinks[randomIndex]).attr('href');
        const postUrl = `${baseUrl}${postPath}`;

        const postResponse = await fetch(postUrl);
        const $post = cheerio.load(await postResponse.text());
        const imageUrl = $post('#image').attr('src'); 

        if (!imageUrl) {
            await m.react(error);
            await conn.reply(m.chat, `${emoji2} No se pudo obtener la URL de la imagen.`, m);
            return;
        }
        
        // --- 2. DESCARGA DE LA IMAGEN ORIGINAL Y GUARDA EN BUFFER ---
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Fallo al descargar la imagen original. HTTP ${imageResponse.status}.`);
        }
        originalMediaBuffer = Buffer.from(await imageResponse.arrayBuffer());
        
        // Por defecto, la imagen final es la original.
        finalImageBuffer = originalMediaBuffer;

        // -------------------------------------------------------------
        // ## INTENTO DE ESCALADO HD (BLOQUE SILENCIOSO)
        // -------------------------------------------------------------
        try {
            const { ext, mime: fileMime } = (await fileTypeFromBuffer(originalMediaBuffer)) || {};

            // Paso 3: Subir a Catbox
            const publicImageUrl = await uploadToCatbox(originalMediaBuffer, fileMime, ext);
            
            // Paso 4: Llamar a la API de Vreden
            const vredenUrl = `${VREDEN_API_URL}?url=${encodeURIComponent(publicImageUrl)}&scale=${scaleFactor}`;
            const upscaleResponse = await fetch(vredenUrl);

            if (!upscaleResponse.ok) {
                throw new Error(`Error en Vreden API: ${upscaleResponse.status}.`);
            }

            const upscaleData = await upscaleResponse.json();
            if (upscaleData.status !== true || !upscaleData.result?.download) {
                throw new Error(`Vreden API rechazó el procesamiento.`);
            }
            
            // Paso 5: Descargar la imagen escalada
            const downloadUrl = upscaleData.result.download;
            const downloadResponse = await fetch(downloadUrl);
            
            if (!downloadResponse.ok) {
                throw new Error(`Fallo al descargar el resultado HD: ${downloadResponse.status}.`);
            }

            // Si todo funciona, actualizamos el buffer final
            finalImageBuffer = Buffer.from(await downloadResponse.arrayBuffer());
            
            // Opcional: Podrías añadir un mensaje sutil si quieres una pequeña diferencia 
            // captionText += `\n*Tamaño:* ${formatBytes(finalImageBuffer.length)}`;

        } catch (hdError) {
            // Este bloque atrapa solo los errores de HD (Catbox, Vreden, descarga HD)
            // NO usamos await conn.reply() aquí para mantenerlo silencioso.
            // Solo registramos el error internamente para el desarrollador.
            console.error('El proceso de HD falló silenciosamente:', hdError.message);
            // Dado que finalImageBuffer sigue siendo originalMediaBuffer, 
            // el flujo continuará y enviará la imagen original.
            await m.react(rwait); // React temporal para mostrar que no fue un error fatal
        }
        // -------------------------------------------------------------
        
        // 6. Envío Final (Usando finalImageBuffer, que puede ser HD o la imagen original)
        await conn.sendMessage(m.chat, { 
            image: finalImageBuffer,  
            caption: captionText, 
            mentions: [m.sender] 
        });

        await m.react(done);
    } catch (e) {
        // Este catch atrapa errores FATALES (Fallo en Scrapping, o fallo en descargar la imagen original)
        await m.react(error);
        console.error('Error FATAL en la búsqueda de imágenes:', e);
        await m.reply(
          m.chat,
          `${ellen}\n⚠️ Algo salió mal durante la búsqueda. ${e.message ? `\n\n*Detalles:* ${e.message}` : ''}`,
          m
        );
    }
};

handler.help = ['rule34 <tag>'];
handler.command = ['rule34', 'r34'];
handler.tags = ['nsfw'];

export default handler;

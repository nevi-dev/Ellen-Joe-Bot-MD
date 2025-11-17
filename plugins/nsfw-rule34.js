// Necesitas instalar node-fetch
import fetch from 'node-fetch';
// **IMPORTANTE:** Eliminamos 'formdata-node' y 'file-type' ya que no se necesita Catbox/HD.

// --- CREDENCIALES RULE34 ---
const R34_USER_ID = "5592834";
const R34_API_KEY = "8ba37eaec9cf4a215f62ebc95d122b1649f1037c70e0a962ad73c22afdbe32fec66e4991dc5d0c628850df990b81eb14f422a6d92c4275e1ab3a9e5beba9f857";
// --------------------------

// --- CONSTANTES Y URLS ---
const rwait = "⏳";
const done = "✅";
const error = "❌";
const emoji = "❕";
const emoji2 = "🚫";
const ellen = "🦈 Ellen Joe aquí... *ugh* que flojera~";
const R34_API_URL = "https://rule34.xxx/index.php?page=dapi&s=post&q=index"; // Endpoint base

// **Funciones de HD eliminadas (formatBytes, uploadToCatbox)**
// -------------------------------------------------------------

const handler = async (m, { conn, args, usedPrefix }) => {
    // Tu código de verificación de permisos
    // Asumimos que db.data.chats[m.chat].nsfw existe
    if (!db.data.chats[m.chat].nsfw && m.isGroup) {
        return m.reply(`*nsfw🔞️* está desactivada en este grupo.\n> Un administrador puede activarla con el comando » *#nsfw on*`);
    }

    if (!args || args.length === 0) {
        await conn.reply(m.chat, `${emoji} Por favor, ingresa uno o más tags para realizar la búsqueda.`, m);
        return;
    }

    const tags = args.join('+');
    const displayTags = args.join(', ');
    
    // Construcción de la URL de la API con tags y autenticación
    const apiUrl = `${R34_API_URL}&tags=${tags}&json=1&user_id=${R34_USER_ID}&api_key=${R34_API_KEY}`;
    
    // Declarar variables que se usarán en el scope final
    let captionText = `${emoji} Resultados para » *${displayTags}*`;

    try {
        await m.react(rwait);
        
        // 1. BÚSQUEDA USANDO LA API
        const response = await fetch(apiUrl);
        const textResponse = await response.text();

        // Verificar errores de API (ej. error de autenticación)
        if (textResponse.includes("<error>")) {
            await m.react(error);
            console.error('Error de API Rule34 (XML Response):', textResponse);
            await conn.reply(m.chat, `${emoji2} Error en la API de Rule34. El sitio web devolvió un error.`, m);
            return;
        }

        let posts;
        try {
            posts = JSON.parse(textResponse);
        } catch (e) {
            console.error('Fallo al parsear JSON:', e);
            await m.react(error);
            await conn.reply(m.chat, `${emoji2} La respuesta de la API no fue un JSON válido.`, m);
            return;
        }
        
        if (!posts || posts.length === 0) {
            await m.react(error);
            await conn.reply(m.chat, `${emoji2} No se encontraron resultados de imágenes para *${displayTags}*`, m);
            return;
        }

        // 2. Seleccionar post aleatorio y obtener URL directa
        const randomIndex = Math.floor(Math.random() * posts.length);
        const randomPost = posts[randomIndex];
        const imageUrl = randomPost.file_url; // URL directa de la imagen/video

        if (!imageUrl) {
            await m.react(error);
            await conn.reply(m.chat, `${emoji2} El post seleccionado no tenía una URL de archivo válida.`, m);
            return;
        }
        
        // 3. Envío del archivo por URL (¡Sin descarga previa a Buffer!)
        
        // Verificación de si es una imagen (Rule34 puede dar videos)
        const isImage = imageUrl.match(/\.(jpe?g|png|webp)$/i);
        
        if (isImage) {
            await conn.sendMessage(m.chat, { 
                image: { url: imageUrl },   // Envío por URL directa
                caption: captionText, 
                mentions: [m.sender] 
            });
        } else {
             // Si no es un formato de imagen común, asumimos que es un video o GIF
             await conn.reply(m.chat, `${emoji2} Archivo encontrado no es una imagen estática. URL del archivo: ${imageUrl}`, m);
             await m.react(error); // Si no podemos enviarlo como imagen, lo marcamos como error.
             return;
        }

        await m.react(done);
    } catch (e) {
        // Este catch atrapa errores FATALES 
        await m.react(error);
        console.error('Error FATAL en la búsqueda de imágenes:', e);
        await conn.reply(
          m.chat,
          `${ellen}\n⚠️ Algo salió mal durante la búsqueda. ${e.message ? `\n\n*Detalles:* ${e.message}` : ''}`,
          m
        );
    }
};

handler.help = ['rule34 <tag1> <tag2>'];
handler.command = ['rule34', 'r34'];
handler.tags = ['nsfw'];

export default handler;

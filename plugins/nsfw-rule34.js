// Necesitas instalar cheerio: npm install cheerio
import fetch from 'node-fetch';
import * as cheerio from 'cheerio'; // Importar cheerio

// Asume que 'db', 'emoji', 'emoji2' existen en el scope
// (Mantengo la estructura y variables de tu código original)

const handler = async (m, { conn, args, usedPrefix }) => {
    // ... (Tu código de verificación de permisos, que no se ha modificado) ...
    if (!db.data.chats[m.chat].nsfw && m.isGroup) {
        return m.reply(`*nsfw🔞️* está desactivada en este grupo.\n> Un administrador puede activarla con el comando » *#nsfw on*`);

    if (!args[0]) {
        await conn.reply(m.chat, `${emoji} Por favor, ingresa un tag para realizar la búsqueda.`, m);
        return;
    }

    const tag = args[0];
    
    // **URL de la página de resultados**
    const baseUrl = 'https://rule34.xxx/';
    const searchUrl = `${baseUrl}index.php?page=post&s=list&tags=${tag}`;

    try {
        // ## Paso 1 - 3: Obtener y cargar la página de resultados
        const response = await fetch(searchUrl);
        const html = await response.text(); 
        const $ = cheerio.load(html);
        
        // ## Paso 4: Seleccionar TODOS los enlaces de publicación (los <a> con un ID)
        // Estos son los elementos que contienen el enlace (href) a la publicación.
        const postLinks = $('a[id^="p"]');
        
        // ## Paso 5: Verificar si se encontraron publicaciones
        if (postLinks.length === 0) {
            await conn.reply(m.chat, `${emoji2} No se encontraron resultados de imágenes para *${tag}*`, m);
            return;
        }

        // ## Paso 6: Seleccionar un enlace de publicación aleatorio
        const randomIndex = Math.floor(Math.random() * postLinks.length);
        const randomPostElement = postLinks[randomIndex];
        
        // ## Paso 7: Extraer la URL de la publicación (el link al post)
        const postPath = $(randomPostElement).attr('href');
        
        if (!postPath) {
            await conn.reply(m.chat, `${emoji2} No se pudo obtener la ruta de la publicación seleccionada.`, m);
            return;
        }

        // Construir la URL completa de la publicación
        const postUrl = `${baseUrl}${postPath}`;

        // -------------------------------------------------------------
        // ## SEGUNDO FETCH: ACCEDER A LA PÁGINA DE PUBLICACIÓN
        // -------------------------------------------------------------

        // ## Paso 8: Fetch de la página de la publicación
        const postResponse = await fetch(postUrl);
        const postHtml = await postResponse.text();

        // ## Paso 9: Cargar el HTML de la publicación en Cheerio
        const $post = cheerio.load(postHtml);

        // ## Paso 10: Seleccionar el elemento de la imagen de tamaño completo
        // En esta estructura de sitio web, la imagen principal suele tener el ID 'image'
        const fullImageElement = $post('#image');

        // ## Paso 11: Extraer la URL de la imagen de tamaño completo
        const imageUrl = fullImageElement.attr('src'); 

        // ## Paso 12: Validación final
        if (!imageUrl) {
             await conn.reply(m.chat, `${emoji2} No se pudo obtener la URL de la imagen de tamaño completo desde la publicación.`, m);
             return;
        }
        // -------------------------------------------------------------

        // ## Paso 13: Envío de la Imagen
        await conn.sendMessage(m.chat, { 
            // Asume que la URL extraída es una URL directa de imagen.
            image: { url: imageUrl }, 
            caption: `${emoji} Resultados para » *${tag}*`, 
            mentions: [m.sender] 
        });

    } catch (error) {
        console.error('Error en la búsqueda de imágenes:', error);
        await m.reply(`${emoji} Ocurrió un error al procesar la búsqueda de imágenes.`);
    }
};

handler.help = ['rule34 <tag>'];
handler.command = ['rule34', 'r34'];
handler.tags = ['nsfw'];

export default handler;

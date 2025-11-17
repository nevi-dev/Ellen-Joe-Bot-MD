// Necesitas instalar cheerio: npm install cheerio
import fetch from 'node-fetch';
import * as cheerio from 'cheerio'; // Importar cheerio

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
    
    // ⚠️ ATENCIÓN: Esta URL es un EJEMPLO seguro de cómo DEBERÍA verse la URL COMPLETA.
    // **NO ES LA URL REAL DE LA PÁGINA QUE MENCIONAS.**
    const fullUrl = `https://rule34.xxx/index.php?page=post&s=list&tags=${tag}`;

    try {
        // 1. Fetch de la página web (la respuesta será texto/HTML)
        const response = await fetch(fullUrl);
        
        // 2. Obtener la respuesta como TEXTO, no como JSON
        const html = await response.text(); 
        
        // 3. Cargar el HTML en Cheerio para poder manipularlo
        const $ = cheerio.load(html);
        
        // 4. Seleccionar TODOS los elementos que contengan la imagen (los <a> con un ID)
        // Y buscar la imagen (<img>) dentro de ellos.
        const imageElements = $('a[id^="p"]').find('img');
        
        // 5. Verificar si se encontraron imágenes
        if (imageElements.length === 0) {
            await conn.reply(m.chat, `${emoji2} No se encontraron resultados de imágenes para *${tag}*`, m);
            return;
        }

        // 6. Seleccionar un elemento de imagen aleatorio
        const randomIndex = Math.floor(Math.random() * imageElements.length);
        const randomImageElement = imageElements[randomIndex];
        
        // 7. Extraer la URL de la miniatura del atributo 'src'
        // El atributo 'src' de la imagen seleccionada es lo que quieres.
        const imageUrl = $(randomImageElement).attr('src'); 

        // 8. Validación final
        if (!imageUrl) {
             await conn.reply(m.chat, `${emoji2} No se pudo obtener la URL de la imagen seleccionada.`, m);
             return;
        }

        // 9. Envío de la Imagen
        await conn.sendMessage(m.chat, { 
            image: { url: imageUrl }, 
            caption: `${emoji} Resultados para » *${tag}*`, 
            mentions: [m.sender] 
        });

    } catch (error) {
        console.error(error);
        await m.reply(`${emoji} Ocurrió un error al procesar la búsqueda de imágenes.`);
    }
};

handler.help = ['rule34 <tag>'];
handler.command = ['rule34', 'r34'];
handler.tags = ['nsfw'];

export default handler;

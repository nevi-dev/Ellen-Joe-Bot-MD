// Necesitas instalar node-fetch
import fetch from 'node-fetch';

// --- CREDENCIALES RULE34 ---
const R34_USER_ID = "5592834";
const R34_API_KEY = "8ba37eaec9cf4a215f62ebc95d122b1649f1037c70e0a962ad73c22afdbe32fec66e4991dc5d0c628850df990b81eb14f422a6d92c4275e1ab3a9e5beba9f857";
// --------------------------

// --- CONSTANTES Y URLS (PERSONALIDAD ELLEN JOE - NAVIDAD) ---
const rwait = "⏳";
const done = "✅";
const error = "❌";
const successEmoji = "💰"; // Emoji para la "comisión" de Ellen Joe
const ellen = "❄️ *Ellen Joe*, la tiburón mercenaria. Ugh, ¿tenemos que trabajar en Navidad?";
const R34_API_URL = "https://rule34.xxx/index.php?page=dapi&s=post&q=index"; // Endpoint base

// -------------------------------------------------------------

const handler = async (m, { conn, args, usedPrefix }) => {
    // Tu código de verificación de permisos
    if (!db.data.chats[m.chat].nsfw && m.isGroup) {
        return m.reply(`*nsfw🔞️* está desactivada en este grupo.\n> Un administrador puede activarla con el comando » *#nsfw on*`);
    }

    if (!args || args.length === 0) {
        // Error de no argumentos
        await conn.reply(m.chat, `*Ugh*, no voy a buscar etiquetas al azar. Pon algo, ¡rápido! Me congelo. 🥶`, m);
        return;
    }

    const tags = args.join('+');
    const displayTags = args.join(', ');
    
    // Construcción de la URL de la API con tags y autenticación
    const apiUrl = `${R34_API_URL}&tags=${tags}&json=1&user_id=${R34_USER_ID}&api_key=${R34_API_KEY}`;
    
    // Caption de éxito (con tema navideño y de dinero)
    let captionText = `${successEmoji} Regalo de *Ellen Joe* por tus *${displayTags}*... ¡y me deben una compensación navideña! 🎁`;

    try {
        await m.react(rwait);
        
        // 1. BÚSQUEDA USANDO LA API
        const response = await fetch(apiUrl);
        const textResponse = await response.text();

        // 2. Verificar errores de API (XML/Autenticación)
        if (textResponse.includes("<error>")) {
            await m.react(error);
            console.error('Error de API Rule34 (XML Response):', textResponse);
            // Ellen Joe: Fallo de servicio
            await conn.reply(m.chat, `Qué fastidio. La API de Rule34 se rompió. ¿De verdad? En plenas fiestas... *UGH*. 💔`, m);
            return;
        }

        // <<<< SOLUCIÓN ROBUSTA: CHEQUEO DE RESPUESTA VACÍA >>>>
        if (textResponse.trim() === "") {
             await m.react(error);
             await conn.reply(m.chat, `¿Ni siquiera para eso tienes suerte? Vaya. No encontré nada para *${displayTags}*. ¡Feliz fracaso navideño! 🎄`, m);
             return;
        }
        // <<<< FIN SOLUCIÓN ROBUSTA >>>>


        let posts;
        try {
            posts = JSON.parse(textResponse);
        } catch (e) {
            await m.react(error);
            // Ellen Joe: Mala calidad de datos
            await conn.reply(m.chat, `La base de datos vomitó algo. Si no es dinero, no lo quiero. Inténtalo de nuevo. 🤢`, m);
            return;
        }
        
        if (!posts || posts.length === 0) {
            await m.react(error);
            // Ellen Joe: No hay resultados
            await conn.reply(m.chat, `¿Ni siquiera para eso tienes suerte? Vaya. No encontré nada para *${displayTags}*. ¡Feliz fracaso navideño! 🎄`, m);
            return;
        }

        // 3. Seleccionar post aleatorio y obtener URL directa
        const randomIndex = Math.floor(Math.random() * posts.length);
        const randomPost = posts[randomIndex];
        const imageUrl = randomPost.file_url; // URL directa del archivo

        if (!imageUrl) {
            await m.react(error);
            // Ellen Joe: Archivo roto
            await conn.reply(m.chat, `Me robaste tiempo por un archivo roto. Si esto fuera un contrato, te cobraría extra. 😡`, m);
            return;
        }
        
        // 4. Envío del archivo: Determina si es imagen o video
        const extension = imageUrl.split('.').pop().toLowerCase();
        let messageOptions = { caption: captionText, mentions: [m.sender] };

        const videoExtensions = ['mp4', 'webm', 'mov'];

        if (videoExtensions.includes(extension)) {
            // Es un video o GIF largo
            messageOptions.video = { url: imageUrl };
        } else {
            // Es una imagen (incluye GIF corto, jpg, png, etc.)
            messageOptions.image = { url: imageUrl };
        }
        
        await conn.sendMessage(m.chat, messageOptions);

        await m.react(done);
    } catch (e) {
        // Este catch atrapa errores FATALES (red, archivo no descargable, envío fallido)
        await m.react(error);
        console.error('Error FATAL en la búsqueda/envío de multimedia:', e);

        let errorDetail = e.message || 'Error desconocido del sistema.';
        
        await conn.reply(
          m.chat,
          // Ellen Joe: Error fatal con detalle
          `${ellen}\n*Ugh*, me rompiste los dientes. La misión falló. Detalle: *${errorDetail}*. Mi comisión se acaba de reducir a cero. ¡Feliz Navidad! 💸`,
          m
        );
    }
};

handler.help = ['rule34 <tag1> <tag2>'];
handler.command = ['rule34', 'r34'];
handler.tags = ['nsfw'];

export default handler;

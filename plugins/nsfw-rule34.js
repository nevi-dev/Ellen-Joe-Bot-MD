import db from '../database.js'
import fetch from 'node-fetch';

// --- CONFIGURACIÓN DE LA API ---
const API_BASE_URL = "https://rest.apicausas.xyz/api/v1/nsfw/descargas/rule34";
const API_KEY = "causa-ee5ee31dcfc79da4";

const handler = async (m, { conn, args, usedPrefix, command }) => {
    // 1. Verificación de NSFW
    const chat = db.data.chats[m.chat];
    if (m.isGroup && !chat?.nsfw) {
        return m.reply(`*Ugh, qué molesto.* 🔞\nEste lugar es demasiado "limpio". Si quieres que trabaje, activa el modo NSFW: *${usedPrefix}nsfw on*`);
    }

    // 2. Validación de Argumentos
    if (!args[0]) {
        return m.reply(`*¿En serio?* 🙄\nDame etiquetas o déjame en paz. No busco cosas a ciegas.\n\nEjemplo: *${usedPrefix + command} vienna*`);
    }

    const tags = args.join(', ');
    const queryUrl = `${API_BASE_URL}?tags=${encodeURIComponent(tags)}&apikey=${API_KEY}`;

    try {
        await m.react('⏳');

        const response = await fetch(queryUrl);
        const json = await response.json();

        // 3. Manejo de errores
        if (!json.status || !json.data.results || json.data.results.length === 0) {
            await m.react('❌');
            return m.reply(`*Cero unidades encontradas.* 🦈\nNo hay nada de "${tags}" aquí. Qué pérdida de tiempo.`);
        }

        const results = json.data.results;

        // 4. Enviar los 3 resultados (soporta Imagen y Video)
        for (let i = 0; i < Math.min(results.length, 3); i++) {
            const post = results[i];
            const fileUrl = post.file_url;
            
            // Detectamos el tipo según la extensión o el campo 'type' de la API
            const type = post.type ? post.type.toLowerCase() : fileUrl.split('.').pop().toLowerCase();
            
            // Lista extendida de formatos de video
            const isVideo = ['mp4', 'webm', 'mov', 'gif'].includes(type);

            let captionText = i === 0 
                ? `*Misión: ${tags}* 🪚\nAquí tienes lo que encontré. No te acostumbres a tanta generosidad.` 
                : `*Archivo #${i + 1}* — [${type.toUpperCase()}]`;

            // Configuración del mensaje dinámico
            const messageConfig = {
                caption: captionText,
                mimetype: isVideo ? 'video/mp4' : 'image/jpeg'
            };

            if (isVideo) {
                messageConfig.video = { url: fileUrl };
                // Si es un GIF, lo mandamos como video con reproducción automática (gifPlayback)
                if (type === 'gif') messageConfig.gifPlayback = true;
            } else {
                messageConfig.image = { url: fileUrl };
            }

            await conn.sendMessage(m.chat, messageConfig, { quoted: m });
        }

        await m.react('✅');

    } catch (e) {
        console.error('Error:', e);
        await m.react('❌');
        await m.reply(`*Ugh, algo salió mal.* 🛠️\nLa base de datos no responde. Me voy a mi descanso, arréglatelas solo.`);
    }
};

handler.help = ['rule34 <tags>'];
handler.tags = ['nsfw'];
handler.command = ['r34', 'rule34'];

export default handler;

import { ytmp4, metadata } from '../lib/ytscraper.js';
import axios from 'axios';

// Configuración de Ellen Joe / Victoria Housekeeping
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';
const SIZE_LIMIT_MB = 100;

var handler = async (m, { conn, args, usedPrefix, command }) => {
    const name = conn.getName(m.sender);
    const url = args[0];

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
            title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂',
            body: `✦ ¿Necesitas algo, ${name}? Date prisa...`,
            thumbnail: global.icons,
            sourceUrl: global.redes,
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    if (!url) {
        return conn.reply(
            m.chat,
            `🦈 *— (Bostezo)*... Qué molesto. Si quieres un video, dame el enlace. No puedo trabajar con el aire.\n\n_Uso: ${usedPrefix + command} https://youtube.com/watch?v=..._`,
            m,
            { contextInfo, quoted: m }
        );
    }

    await m.react("📽️");
    await conn.reply(
        m.chat,
        `✦ *Procesando...* Estoy preparando el archivo de video con el equipo de Victoria Housekeeping. No me presiones.`,
        m,
        { contextInfo, quoted: m }
    );

    try {
        // TIER 1: Usando el scraper local ytscraper.js que proporcionaste
        const result = await ytmp4(url, 360); // Calidad por defecto 360p

        if (result.status && result.download.url) {
            const downloadUrl = result.download.url;
            const title = result.metadata.title || 'Video de Cavidad';
            
            // Verificar tamaño del archivo
            const response = await axios.head(downloadUrl);
            const contentLength = response.headers['content-length'];
            const fileSizeMb = contentLength / (1024 * 1024);

            await m.react("📥");

            if (fileSizeMb > SIZE_LIMIT_MB) {
                // Enviar como documento si es pesado
                await conn.sendMessage(m.chat, {
                    document: { url: downloadUrl },
                    fileName: `${title}.mp4`,
                    mimetype: 'video/mp4',
                    caption: `🦈 *Es demasiado pesado...* (${fileSizeMb.toFixed(2)} MB).\n\nNo cabe en mi equipo, así que va como documento.\n\n🎬 *Archivo:* ${title}`
                }, { quoted: m });
            } else {
                // Enviar como video normal
                await conn.sendMessage(m.chat, { 
                    video: { url: downloadUrl }, 
                    mimetype: 'video/mp4', 
                    fileName: `${title}.mp4`,
                    caption: `🦈 *Aquí tienes tu pedido.* 🎞️\n\n🎬 *Título:* ${title}\n✦ *Servicio:* Victoria Housekeeping`,
                    contextInfo
                }, { quoted: m });
            }
            await m.react("✅");
            
        } else {
            throw new Error("El scraper no devolvió URL");
        }

    } catch (error) {
        console.error("Error en ytscraper:", error);

        // TIER DE RESPALDO: API Externa si el scraper local falla
        try {
            const apiRes = await axios.get(`https://api.zenkey.my.id/api/download/ytmp4?url=${encodeURIComponent(url)}`);
            const resJson = apiRes.data;

            if (resJson.status && resJson.result?.download_url) {
                await conn.sendMessage(m.chat, { 
                    video: { url: resJson.result.download_url }, 
                    caption: `🦈 *Tuve que usar un método de emergencia.* 🎞️\n\n🎬 *Título:* ${resJson.result.title || 'Video'}`,
                    contextInfo
                }, { quoted: m });
                await m.react("✅");
            } else {
                throw new Error("Respaldo fallido");
            }
        } catch (e) {
            await conn.reply(m.chat, `🦈 *Tsk...* Fallé en la misión. El nivel de Éter es demasiado alto o el link está roto. Inténtalo luego.`, m, { contextInfo });
            await m.react("❌");
        }
    }
};

handler.help = ['ytmp4 <enlace>'];
handler.tags = ['descargas'];
handler.command = ['ytmp4', 'ytvideo', 'ytmp4dl'];
handler.register = true;
handler.limit = true;

export default handler;

import axios from 'axios';

// --- Configuración API Causas ---
const API_BASE = 'https://rest.apicausas.xyz/api/v1/descargas/youtube';
const API_KEY = 'causa-ee5ee31dcfc79da4';
const SIZE_LIMIT_MB = 100; 

// Configuración de Ellen Joe / Victoria Housekeeping
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

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
        `✦ *Procesando...* Estoy preparando el video con los servidores de Causas. No me presiones.`,
        m,
        { contextInfo, quoted: m }
    );

    try {
        // Petición exclusiva a API Causas con type=video
        const response = await axios.get(`${API_BASE}?url=${encodeURIComponent(url)}&type=video&apikey=${API_KEY}`);
        const res = response.data;

        if (res.status && res.data.download.url) {
            const { title, download } = res.data;
            const downloadUrl = download.url;

            await m.react("📥");

            // Verificar tamaño del archivo antes de enviar
            const checkHeader = await axios.head(downloadUrl);
            const fileSizeMb = (checkHeader.headers['content-length'] || 0) / (1024 * 1024);

            if (fileSizeMb > SIZE_LIMIT_MB) {
                // Enviar como documento si es muy pesado
                await conn.sendMessage(m.chat, {
                    document: { url: downloadUrl },
                    fileName: `${title}.mp4`,
                    mimetype: 'video/mp4',
                    caption: `🦈 *Demasiado pesado...* (${fileSizeMb.toFixed(2)} MB).\n\nSupera mi límite de carga, así que va como documento para no forzar el equipo.\n\n🎬 *Video:* ${title}`
                }, { quoted: m });
                await m.react("📄");
            } else {
                // Enviar como video normal
                await conn.sendMessage(m.chat, { 
                    video: { url: downloadUrl }, 
                    mimetype: 'video/mp4', 
                    fileName: `${title}.mp4`,
                    caption: `🦈 *Aquí tienes tu pedido.* 🎞️\n\n🎬 *Título:* ${title}\n✦ *Servicio:* Victoria Housekeeping`,
                    contextInfo
                }, { quoted: m });
                await m.react("✅");
            }

        } else {
            throw new Error("API Causas devolvió error o enlace inválido");
        }

    } catch (error) {
        console.error("Error en API Causas (Video):", error.message);
        await m.react("❌");
        await conn.reply(
            m.chat, 
            `🦈 *Tsk...* El servidor de Causas no respondió correctamente. El enlace está roto o mi acceso fue denegado.`, 
            m, 
            { contextInfo }
        );
    }
};

handler.help = ['ytmp4 <enlace>'];
handler.tags = ['descargas'];
handler.command = ['ytmp4', 'ytvideo', 'ytmp4dl'];
handler.register = true;
handler.limit = true;

export default handler;

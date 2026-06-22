import axios from 'axios';
import fs from 'fs';

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
    const matchedUrl = 'https://github.com/nevi-dev';

    // Conversión segura de global.icons a Buffer binario para el jpegThumbnail
    const thumbnailBuffer = Buffer.isBuffer(global.icons)
        ? global.icons
        : (fs.existsSync(global.icons) ? fs.readFileSync(global.icons) : Buffer.from(global.icons, 'base64'));

    // --- ÚNICO EXTERNAL LINK MESSAGE CON LA ESTÉTICA DE VICTORIA HOUSEKEEPING ---
    const sendExternalMessage = async (msgText) => {
        await conn.relayMessage(m.chat, {
            extendedTextMessage: {
                text: `${matchedUrl}\n\n${msgText}`,
                matchedText: matchedUrl,
                canonicalUrl: matchedUrl,
                title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊参𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂',
                description: `✦ ¿Necesitas algo, ${name}? Date prisa...`,
                previewType: 'shadow',
                jpegThumbnail: thumbnailBuffer,
                contextInfo: {
                    quotedMessage: m.message,
                    participant: m.sender,
                    stanzaId: m.id,
                    remoteJid: m.chat,
                    isForwarded: true,
                    forwardingScore: 999,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid,
                        newsletterName,
                        serverMessageId: -1
                    }
                }
            }
        }, { quoted: m });
    };

    // ContextInfo limpio usado al enviar el video/documento
    const contextInfo = {
        mentionedJid: [m.sender],
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: {
            newsletterJid,
            newsletterName,
            serverMessageId: -1
        }
    };

    if (!url) {
        return sendExternalMessage(`🦈 *— (Bostezo)*... Qué molesto. Si quieres un video, dame el enlace. No puedo trabajar con el aire.\n\n_Uso: ${usedPrefix + command} https://youtube.com/watch?v=..._`);
    }

    await m.react("📽️");
    await sendExternalMessage(`✦ *Procesando...* Estoy preparando el video. No me presiones.`);

    try {
        // Petición a la API usando tu v1 limpia
        const response = await axios.get(`${API_BASE}?url=${encodeURIComponent(url)}&type=video&quality=420&apikey=${API_KEY}`);
        const res = response.data;

        if (res.status && res.data.download.url) {
            const { title, download } = res.data;
            const downloadUrl = download.url;

            await m.react("📥");

            // Validar el tamaño del archivo usando HEAD de forma rápida para no descargar el archivo en el bot
            const checkHeader = await axios.head(downloadUrl).catch(() => null);
            const fileSizeMb = checkHeader
                ? (checkHeader.headers['content-length'] || 0) / (1024 * 1024)
                : 0;

            if (fileSizeMb > SIZE_LIMIT_MB) {
                // Enviar como documento si es muy pesado usando solo la URL directa
                await conn.sendMessage(m.chat, {
                    document: { url: downloadUrl },
                    fileName: `${title}.mp4`,
                    mimetype: 'video/mp4',
                    caption: `🦈 *Demasiado pesado...* (${fileSizeMb > 0 ? fileSizeMb.toFixed(2) + ' MB' : 'Desconocido'}).\n\nSupera mi límite de carga, así que va como documento para no forzar el equipo.\n\n🎬 *Video:* ${title}`,
                    contextInfo
                }, { quoted: m });
                await m.react("📄");
            } else {
                // Enviar como video normal pasando la URL y forzando parámetros de reproducción limpia
                await conn.sendMessage(m.chat, {
                    video: { url: downloadUrl },
                    mimetype: 'video/mp4',
                    fileName: `${title}.mp4`,
                    caption: `🦈 *Aquí tienes tu pedido.* 🎞️\n\n🎬 *Título:* ${title}\n✦ *Servicio:* Victoria Housekeeping`,
                    asDocument: false, // Forzar que Baileys lo envíe como flujo de video nativo
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
        await sendExternalMessage(`🦈 *Tsk...* El enlace está roto o mi acceso fue denegado.`);
    }
};

handler.help = ['ytmp4 <enlace>'];
handler.tags = ['descargas'];
handler.command = ['ytmp4', 'ytvideo', 'ytmp4dl'];
handler.register = true;
handler.limit = true;

export default handler;

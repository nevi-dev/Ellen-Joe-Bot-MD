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

    const thumbnailBuffer = Buffer.isBuffer(global.icons)
        ? global.icons
        : (fs.existsSync(global.icons) ? fs.readFileSync(global.icons) : Buffer.from(global.icons, 'base64'));

    const sendExternalMessage = (msgText, options = {}) => m.replyExternal(msgText, options)

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
        return sendExternalMessage(`🦈 *— (Suspira)*... ¿Música? Dame el enlace del video, no soy adivina.\n\n_Uso: ${usedPrefix + command} https://youtube.com/watch?v=..._`);
    }

    await m.react("🎵");
    await sendExternalMessage(`✦ *Extrayendo audio...* Déjame limpiar este ruido por ti.`);

    try {
        // Petición a la API (cambiado a type=audio)
        const response = await axios.get(`${API_BASE}?url=${encodeURIComponent(url)}&type=audio&apikey=${API_KEY}`);
        const res = response.data;

        if (res.status && res.data.download.url) {
            const { title, download } = res.data;
            const downloadUrl = download.url;

            await m.react("📥");

            await conn.sendMessage(m.chat, {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                ptt: false, // Cambia a true si quieres que se envíe como nota de voz
                fileName: `${title}.mp3`,
                contextInfo
            }, { quoted: m });

            await m.react("✅");
        } else {
            throw new Error("API Causas devolvió error o enlace inválido");
        }

    } catch (error) {
        console.error("Error en API Causas (Audio):", error.message);
        await m.react("❌");
        await sendExternalMessage(`🦈 *Tsk...* No pude convertir este audio. Intenta con otro enlace.`);
    }
};

handler.help = ['ytmp3 <enlace>'];
handler.tags = ['descargas'];
handler.command = ['ytmp3', 'yta', 'ytmusic'];
handler.register = true;
handler.limit = true;

export default handler;

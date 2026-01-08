import fetch from 'node-fetch';
import axios from 'axios';
import { ytmp3 } from '../lib/ytscraper.js'; 

// --- Constantes y Configuración ---
const NEVI_API_KEY = 'ellen';
const SIZE_LIMIT_MB = 100; 

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

var handler = async (m, { conn, args, usedPrefix, command }) => {
    const name = conn.getName(m.sender);
    const url = args[0];

    // Context Info (Ellen Joe - Victoria Housekeeping)
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
            body: `✦ ¿Otra vez tú, ${name}? Ya estoy trabajando...`, 
            thumbnail: global.icons, 
            sourceUrl: global.redes, 
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    // 1. Initial Check
    if (!url) {
        return conn.reply(
            m.chat,
            `🦈 *— (Bostezo)*... ¿Me despiertas para nada? Dame un enlace de YouTube o vuelve a dormir.\n\n_Uso: ${usedPrefix + command} https://youtu.be/video_`,
            m,
            { contextInfo, quoted: m }
        );
    }

    await conn.reply(
        m.chat,
        `✦ *Procesando...* Estoy extrayendo el audio. Si tardo un poco es porque mi turno está por terminar. No me presiones.`,
        m,
        { contextInfo, quoted: m }
    );
    await m.react("🎧");

    // Función de envío centralizada para URL
    const sendAudioFromUrl = async (downloadUrl, title) => {
        try {
            await m.react("📥");
            const response = await axios.head(downloadUrl);
            const contentLength = response.headers['content-length'];
            const fileSizeMb = contentLength / (1024 * 1024);

            if (fileSizeMb > SIZE_LIMIT_MB) {
                await conn.sendMessage(m.chat, {
                    document: { url: downloadUrl },
                    fileName: `${title}.mp3`,
                    mimetype: 'audio/mpeg',
                    caption: `🦈 *Demasiado pesado...* (${fileSizeMb.toFixed(2)} MB).\n\nEl archivo excede el límite de carga directa, así que lo envío como documento.\n\n🎵 *Archivo:* ${title}`
                }, { quoted: m });
                await m.react("📄");
            } else {
                await conn.sendMessage(m.chat, { 
                    audio: { url: downloadUrl }, 
                    mimetype: 'audio/mpeg', 
                    fileName: `${title}.mp3`,
                    ptt: false // Cambiar a true si quieres que se envíe como nota de voz
                }, { quoted: m });
                await m.react("✅");
            }
        } catch (error) {
            console.error("Error al enviar audio:", error);
            throw new Error(`Fallo en la entrega.`);
        }
    };
    
    // --- ESTRATEGIA DE DESCARGA (TIERS) ---

    // TIER 1: Tu ytscraper.js local
    try {
        const scraperResult = await ytmp3(url, 128); // 128kbps por defecto
        if (scraperResult?.status && scraperResult.download?.url) {
            await sendAudioFromUrl(scraperResult.download.url, scraperResult.metadata?.title || 'Audio_Yt');
            return;
        }
    } catch (e) {
        console.log("Tier 1 falló...");
    }

    // TIER 2: NEVI API
    try {
        const res = await fetch(`http://neviapi.ddns.net:5000/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': NEVI_API_KEY },
            body: JSON.stringify({ url, format: "mp3" }),
        });
        const json = await res.json();
        if (json.status === "success" && json.download_link) {
            await sendAudioFromUrl(json.download_link, json.title || 'Audio_Nevi');
            return;
        }
    } catch (e) {
        console.log("Tier 2 falló...");
    }

    // TIER 3: API DE RESPALDO (Reemplazo de OGMP3)
    try {
        const apiRes = await fetch(`https://api.zenkey.my.id/api/download/ytmp3?url=${encodeURIComponent(url)}`);
        const resJson = await apiRes.json();
        
        if (resJson.status && resJson.result?.download_url) {
            await sendAudioFromUrl(resJson.result.download_url, resJson.result.title || 'Audio_Respaldo');
            return;
        }
        throw new Error("Sin recursos");
    } catch (e) {
        await conn.reply(m.chat, `🦈 *Tsk...* El sistema de extracción falló. El enlace es defectuoso o los Etéreos han interferido. Inténtalo más tarde.`, m, { contextInfo });
        await m.react("❌");
    }
};

handler.help = ['ytmp3 <link>'];
handler.tags = ['descargas'];
handler.command = ['ytmp3', 'ytaudio', 'mp3'];
handler.register = true;
handler.limit = true;

export default handler;

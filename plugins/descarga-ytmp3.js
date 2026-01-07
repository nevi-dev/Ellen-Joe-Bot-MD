import fetch from 'node-fetch';
import crypto from 'crypto';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
// Asegúrate de que estas funciones existan en tu ../lib/
import { ogmp3 } from '../lib/youtubedl.js'; 
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

    // 1. Initial Check (Ellen Joe Style)
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

    let finalDownloadUrl, finalTitle;

    // Función de envío centralizada
    const sendAudio = async (downloadUrl, title) => {
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
                    caption: `🦈 *Demasiado pesado...* (${fileSizeMb.toFixed(2)} MB).\n\nEl archivo excede el límite de carga directa, así que lo envío como documento. Ten más cuidado la próxima vez.\n\n🎵 *Archivo:* ${title}`
                }, { quoted: m });
                await m.react("📄");
            } else {
                await conn.sendMessage(m.chat, { 
                    audio: { url: downloadUrl }, 
                    mimetype: 'audio/mpeg', 
                    fileName: `${title}.mp3`,
                    caption: `🦈 *Aquí tienes tu pedido.* 🎧\n\n🎵 *Título:* ${title}\n✦ *Servicio:* Victoria Housekeeping`,
                }, { quoted: m });
                await m.react("✅");
            }
        } catch (error) {
            console.error("Error al enviar audio:", error);
            throw new Error(`Hubo un fallo en la entrega. Mi guadaña no pudo cortar este enlace.`);
        }
    };
    
    // --- TIER 1: YTSCRAPER ---
    try {
        const scraperResult = await ytmp3(url);
        if (scraperResult?.status && scraperResult.download?.url) {
            finalDownloadUrl = scraperResult.download.url;
            finalTitle = scraperResult.metadata?.title || 'Audio Extrayendo...';
            await sendAudio(finalDownloadUrl, finalTitle);
            return;
        }
        throw new Error('Tier 1 falló');
    } catch (e1) {
        console.error("Error en Tier 1:", e1.message);

        // --- TIER 2: NEVI API ---
        try {
            const neviApiUrl = `http://neviapi.ddns.net:5000/download`;
            const res = await fetch(neviApiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-API-KEY': NEVI_API_KEY,
                },
                body: JSON.stringify({ url: url, format: "mp3" }),
            });

            const json = await res.json();
            if (json.status === "success" && json.download_link) {
                finalDownloadUrl = json.download_link;
                finalTitle = json.title || 'Audio Pedido';
                await sendAudio(finalDownloadUrl, finalTitle);
                return;
            }
            throw new Error(json.message || "NEVI API falló");
        } catch (e2) {
            console.error("Error en Tier 2:", e2.message);

            // --- TIER 3: OGMP3/LOCAL ---
            try {
                const tempDir = path.join(process.cwd(), './tmp');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
                const tempFilePath = path.join(tempDir, `${Date.now()}_audio.mp3`);
                
                const downloadResult = await ogmp3.download(url, tempFilePath, 'audio');
                
                if (downloadResult.status && fs.existsSync(tempFilePath)) {
                    const stats = fs.statSync(tempFilePath);
                    const fileSizeMb = stats.size / (1024 * 1024);
                    const fileBuffer = fs.readFileSync(tempFilePath);
                    finalTitle = downloadResult.result.title || 'Audio de Cavidad';
                    
                    if (fileSizeMb > SIZE_LIMIT_MB) {
                        await conn.sendMessage(m.chat, {
                            document: fileBuffer,
                            fileName: `${finalTitle}.mp3`,
                            mimetype: 'audio/mpeg',
                            caption: `🦈 *Pesado...* (${fileSizeMb.toFixed(2)} MB). Va como documento.\n\n🎵 *Archivo:* ${finalTitle}`
                        }, { quoted: m });
                    } else {
                        await conn.sendMessage(m.chat, { 
                            audio: fileBuffer, 
                            mimetype: 'audio/mpeg', 
                            fileName: `${finalTitle}.mp3`
                        }, { quoted: m });
                    }
                    
                    fs.unlinkSync(tempFilePath);
                    await m.react("✅");
                    return;
                }
                throw new Error("Tier 3 falló.");

            } catch (e3) {
                console.error("Error en Tier 3:", e3.message);
                await conn.reply(m.chat, `🦈 *Tsk...* El sistema de extracción falló. El enlace es defectuoso o los Etéreos han interferido en la red. Inténtalo más tarde.`, m, { contextInfo });
                await m.react("❌");
            }
        }
    }
};

handler.help = ['ytmp3'].map(v => v + ' <link>');
handler.tags = ['descargas'];
handler.command = ['ytmp3', 'ytaudio', 'mp3'];
handler.register = true;
handler.limit = true;
handler.coin = 2;

export default handler;

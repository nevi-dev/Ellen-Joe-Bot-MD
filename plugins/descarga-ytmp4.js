import fetch from 'node-fetch';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
// Asegúrate de que estas funciones existan en tu ../lib/
import { ogmp4 } from '../lib/youtubedl.js'; 
import { ytmp4 as scraperYtmp4 } from '../lib/ytscraper.js'; 

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
            body: `✦ ¿Necesitas algo, ${name}? Date prisa...`,
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
            `🦈 *— (Bostezo)*... Qué molesto. Si quieres un video, dame el enlace. No puedo trabajar con el aire.\n\n_Uso: ${usedPrefix + command} https://youtube.com/watch?v=..._`,
            m,
            { contextInfo, quoted: m }
        );
    }

    await conn.reply(
        m.chat,
        `✦ *Procesando...* Estoy preparando el archivo de video. Si tardo, es porque la señal en la Cavidad es pésima. No me presiones.`,
        m,
        { contextInfo, quoted: m }
    );
    await m.react("📽️");

    let finalDownloadUrl, finalTitle;

    // Función de envío centralizada para URL (Tiers 1 y 2)
    const sendVideoFromUrl = async (downloadUrl, title) => {
        try {
            await m.react("📥");
            const response = await axios.head(downloadUrl);
            const contentLength = response.headers['content-length'];
            const fileSizeMb = contentLength / (1024 * 1024);

            if (fileSizeMb > SIZE_LIMIT_MB) {
                await conn.sendMessage(m.chat, {
                    document: { url: downloadUrl },
                    fileName: `${title}.mp4`,
                    mimetype: 'video/mp4',
                    caption: `🦈 *Es demasiado pesado...* (${fileSizeMb.toFixed(2)} MB).\n\nNo cabe en mi equipo de limpieza, así que te lo envío como documento. Ten paciencia.\n\n🎬 *Archivo:* ${title}`
                }, { quoted: m });
                await m.react("📄");
            } else {
                await conn.sendMessage(m.chat, { 
                    video: { url: downloadUrl }, 
                    mimetype: 'video/mp4', 
                    fileName: `${title}.mp4`,
                    caption: `🦈 *Aquí tienes tu pedido.* 🎞️\n\n🎬 *Título:* ${title}\n✦ *Servicio:* Victoria Housekeeping`,
                }, { quoted: m });
                await m.react("✅");
            }
        } catch (error) {
            console.error("Error al enviar video:", error);
            throw new Error(`Hubo un problema en la entrega. Mi guadaña no pudo procesar esto.`);
        }
    };
    
    // --- TIER 1: YTSCRAPER ---
    try {
        const scraperResult = await scraperYtmp4(url);
        if (scraperResult?.status && scraperResult.download?.url) {
            finalDownloadUrl = scraperResult.download.url;
            finalTitle = scraperResult.metadata?.title || 'Video de Cavidad';
            await sendVideoFromUrl(finalDownloadUrl, finalTitle);
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
                body: JSON.stringify({ url: url, format: "mp4" }),
            });

            const json = await res.json();
            if (json.status === "success" && json.download_link) {
                finalDownloadUrl = json.download_link;
                finalTitle = json.title || 'Video Respaldo';
                await sendVideoFromUrl(finalDownloadUrl, finalTitle);
                return;
            }
            throw new Error(json.message || "NEVI API falló.");
        } catch (e2) {
            console.error("Error en Tier 2:", e2.message);

            // --- TIER 3: OGMP4/LOCAL ---
            try {
                const tempDir = path.join(process.cwd(), './tmp');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
                const tempFilePath = path.join(tempDir, `${Date.now()}_video.mp4`);
                
                const downloadResult = await ogmp4.download(url, tempFilePath, 'video'); 
                
                if (downloadResult.status && fs.existsSync(tempFilePath)) {
                    const stats = fs.statSync(tempFilePath);
                    const fileSizeMb = stats.size / (1024 * 1024);
                    const fileBuffer = fs.readFileSync(tempFilePath);
                    finalTitle = downloadResult.result.title || 'Archivo Local';
                    
                    if (fileSizeMb > SIZE_LIMIT_MB) {
                        await conn.sendMessage(m.chat, {
                            document: fileBuffer,
                            fileName: `${finalTitle}.mp4`,
                            mimetype: 'video/mp4',
                            caption: `🦈 *Pesado...* (${fileSizeMb.toFixed(2)} MB). Va como documento.\n\n🎬 *Archivo:* ${finalTitle}`
                        }, { quoted: m });
                    } else {
                        await conn.sendMessage(m.chat, { 
                            video: fileBuffer, 
                            mimetype: 'video/mp4', 
                            fileName: `${finalTitle}.mp4`,
                            caption: `🦈 *Aquí está.* 🎞️\n\n🎬 *Título:* ${finalTitle}`,
                        }, { quoted: m });
                    }
                    
                    fs.unlinkSync(tempFilePath);
                    await m.react("✅");
                    return;
                }
                throw new Error("Tier 3 falló.");

            } catch (e3) {
                console.error("Error en Tier 3:", e3.message);
                await conn.reply(m.chat, `🦈 *Tsk...* Fallé en la misión. El enlace no sirve o la red está saturada de Etéreos. Inténtalo luego.`, m, { contextInfo });
                await m.react("❌");
            }
        }
    }
};

handler.help = ['ytmp4'].map(v => v + ' <enlace>');
handler.tags = ['descargas'];
handler.command = ['ytmp4', 'ytvideo', 'ytmp4dl'];
handler.register = true;
handler.limit = true;
handler.coin = 3;

export default handler;

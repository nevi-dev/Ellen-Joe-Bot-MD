// Importa las librerías necesarias
import fetch from 'node-fetch';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
// Asegúrate de que estas funciones existan en tu ../lib/
import { ogmp3 } from '../lib/youtubedl.js'; // Asumimos función para descargar video localmente
import { ytmp4 as scraperYtmp4 } from '../lib/ytscraper.js'; // Asumimos función para obtener enlace directo
// --- Constantes y Configuración ---
const NEVI_API_KEY = 'ellen';
const SIZE_LIMIT_MB = 100; // Define el límite para enviar como documento

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

var handler = async (m, { conn, args, usedPrefix, command }) => {
    const name = conn.getName(m.sender);
    const url = args[0];

    // Context Info (Ellen Joe - Navidad)
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
            title: '🖤 ⏤͟͟͞͞𝙀𝙇𝙇𝙀𝙉 - 𝘽𝙊𝙏 ᨶ႒ᩚ',
            body: `✦ ¡Dame tu lista de deseos, ${name}! El Grinch espera. 🎁`,
            thumbnail: global.icons,
            sourceUrl: global.redes,
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    // 1. Initial Check (Ellen Joe Navidad)
    if (!url) {
        return conn.reply(
            m.chat,
            `🦈 *¡Qué impaciente!* Necesito el enlace del "regalo" de video que quieres. ¡Dame la URL, o te envío carbón!\n\n_Ejemplo: ${usedPrefix + command} https://youtube.com/watch?v=xxxxxxxxxxx_`,
            m,
            { contextInfo, quoted: m }
        );
    }

    await conn.reply(
        m.chat,
        `Procesando tu capricho. Estoy empaquetando el video. Si tarda, es porque tu deseo es un "gran regalo" y no una baratija. 🎄`,
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
                    caption: `🎁 *¡Vaya paquete!* (${fileSizeMb.toFixed(2)} MB). Es demasiado grande para el trineo, lo envío como documento. ¡Paciencia!
                    🖤 *Regalo:* ${title}`
                }, { quoted: m });
                await m.react("📄");
            } else {
                await conn.sendMessage(m.chat, { 
                    video: { url: downloadUrl }, 
                    mimetype: 'video/mp4', 
                    fileName: `${title}.mp4`,
                    caption: `*¡Gran Regalo Entregado!* 🎄
                    🎬 *Título:* ${title}`,
                }, { quoted: m });
                await m.react("📽️");
            }
        } catch (error) {
            console.error("Error al obtener el tamaño del archivo o al enviarlo:", error);
            // Fallback error si el envío falla
            throw new Error(`Hubo un error al envolver tu "regalo" (falló el envío).`);
        }
    };
    
    // --- TIER 1: YTSCRAPER (PRIMARIO) ---
    try {
        const scraperResult = await scraperYtmp4(url);

        if (scraperResult?.status && scraperResult.download?.url) {
            finalDownloadUrl = scraperResult.download.url;
            finalTitle = scraperResult.metadata?.title || 'Video Desconocido (Tier 1)';
            await sendVideoFromUrl(finalDownloadUrl, finalTitle);
            return;
        }
        throw new Error('Tier 1 falló: Enlace no generado.');
    } catch (e1) {
        console.error("Error en Tier 1 (ytscraper):", e1.message);

        // --- TIER 2: NEVI API (RESPALDO 1) ---
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
                finalTitle = json.title || 'Video Respaldo (Tier 2)';
                await sendVideoFromUrl(finalDownloadUrl, finalTitle);
                return;
            }
            throw new Error(json.message || "NEVI API falló.");
        } catch (e2) {
            console.error("Error en Tier 2 (NEVI API):", e2.message);

            // --- TIER 3: OGMP4/YOUTUBEDL (RESPALDO 2/LOCAL) ---
            try {
                const tempDir = path.join(process.cwd(), './tmp');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
                const tempFilePath = path.join(tempDir, `${Date.now()}_video.mp4`);
                
                const downloadResult = await ogmp4.download(url, tempFilePath, 'video'); 
                
                if (downloadResult.status && fs.existsSync(tempFilePath)) {
                    const stats = fs.statSync(tempFilePath);
                    const fileSizeMb = stats.size / (1024 * 1024);
                    const fileBuffer = fs.readFileSync(tempFilePath);

                    finalTitle = downloadResult.result.title || 'Regalo Local (Tier 3)';
                    
                    // Send logic for TIER 3 (Buffer)
                    if (fileSizeMb > SIZE_LIMIT_MB) {
                        await conn.sendMessage(m.chat, {
                            document: fileBuffer,
                            fileName: `${finalTitle}.mp4`,
                            mimetype: 'video/mp4',
                            caption: `🎁 *¡Vaya paquete!* (${fileSizeMb.toFixed(2)} MB). Es demasiado grande para el trineo, lo envío como documento. ¡Paciencia!
                            🖤 *Regalo:* ${finalTitle}`
                        }, { quoted: m });
                        await m.react("📄");
                    } else {
                        await conn.sendMessage(m.chat, { 
                            video: fileBuffer, 
                            mimetype: 'video/mp4', 
                            fileName: `${finalTitle}.mp4`,
                            caption: `*¡Gran Regalo Entregado!* 🎄
                            🎬 *Título:* ${finalTitle}`,
                        }, { quoted: m });
                        await m.react("📽️");
                    }
                    
                    fs.unlinkSync(tempFilePath);
                    return; // Éxito, salir del handler
                }
                throw new Error("ogmp4 no pudo descargar el archivo.");

            } catch (e3) {
                console.error("Error en Tier 3 (ogmp4/youtubedl):", e3.message);
                
                // Falla definitiva (Ellen Joe Navidad)
                await conn.reply(m.chat, `💔 *Fallé, pero tú más.*
Tu "lista de deseos" resultó ser una mala inversión. ¡No pude entregarte el regalo de video! ¡Carbón para ti! 🎄`, m, { contextInfo });
                await m.react("❌");
                return;
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

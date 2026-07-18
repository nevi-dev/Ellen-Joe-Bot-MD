import { exec, spawn } from 'child_process';
import fs from 'fs';
import axios from 'axios';
import yts from "yt-search";
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);
const API_KEY = 'causa-ee5ee31dcfc79da4';
const API_SAVENOW = 'https://rest.apicausas.xyz/api/v3/descargas/YouTube';
const API_V2 = 'https://rest.apicausas.xyz/api/v2/descargas/youtube';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

const requestHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
};

const getFileSize = async (url) => {
    try {
        const response = await axios.get(url, { responseType: 'stream', headers: requestHeaders });
        const bytes = response.headers['content-length'];
        response.data.destroy(); 
        if (bytes) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } catch (e) {}
    return 'Desconocido';
};

// Descarga directa (Para V3)
const downloadMedia = async (url, filepath) => {
    const writer = fs.createWriteStream(filepath);
    const response = await axios.get(url, { responseType: 'stream', headers: requestHeaders });
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filepath));
        writer.on('error', (err) => {
            writer.close();
            if (fs.existsSync(filepath)) try { fs.unlinkSync(filepath); } catch {}
            reject(err);
        });
    });
};

// Descarga y procesa en tiempo real con FFmpeg (Para V2)
const downloadAndProcessV2 = async (url, type, filepath) => {
    const response = await axios.get(url, { responseType: 'stream', headers: requestHeaders });
    
    return new Promise((resolve, reject) => {
        const args = type === 'audio' 
            ? ['-y', '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '128k', filepath]
            : ['-y', '-i', 'pipe:0', '-c:v', 'libx264', '-c:a', 'aac', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', filepath];
            
        const ffmpeg = spawn('ffmpeg', args);
        
        // Pasamos el stream de axios directo a la entrada de ffmpeg
        response.data.pipe(ffmpeg.stdin);
        
        ffmpeg.on('close', (code) => {
            if (code === 0) resolve(filepath);
            else {
                if (fs.existsSync(filepath)) try { fs.unlinkSync(filepath); } catch {}
                reject(new Error(`FFmpeg falló con código ${code}`));
            }
        });
        
        ffmpeg.on('error', (err) => {
            if (fs.existsSync(filepath)) try { fs.unlinkSync(filepath); } catch {}
            reject(err);
        });
    });
};

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const tmpDir = './tmp';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    args = args.filter(v => v?.trim());
    const isMode = ["audio", "video"].includes(args[0]?.toLowerCase());
    const type = isMode ? args[0].toLowerCase() : null;
    const query = isMode ? args.slice(1).join(" ") : args.join(" ");

    const sendExternalMessage = (msgText, options = {}) => m.replyExternal(msgText, options)

    const sendInteractiveCard = async (text, imageUrl, buttons = []) => {
        const nativeFlow = buttons.map((button, index) => {
            const params = button?.buttonParamsJson ? JSON.parse(button.buttonParamsJson) : {}
            if (button?.name === 'cta_url') return { text: params.display_text || `Abrir ${index + 1}`, url: params.url || params.merchant_url }
            return { text: params.display_text || `Opción ${index + 1}`, id: params.id || params.rowId || `${usedPrefix}${command}` }
        }).filter((button) => button.text && (button.url || button.id))

        await conn.sendMessage(m.chat, {
            image: imageUrl ? { url: imageUrl } : global.icons,
            caption: text,
            title: "𝐄llen 𝐉ᴏ𝐄's 𝐒ervice 🦈",
            footer: 'Victoria Housekeeping Service',
            nativeFlow,
            contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
            }
        }, { quoted: m });
    };

    if (!args[0]) {
        return await sendExternalMessage(`*— (Bostezo)*... Dame algo que buscar.\n\n🎧 ᥱȷᥱm⍴ᥣ᥆:\n${usedPrefix}${command} *Linger*`);
    }

    if (isMode) {
        await m.react(type === 'audio' ? "🎧" : "🎬");
        const ext = type === 'audio' ? 'mp3' : 'mp4';
        const finalPath = path.join(tmpDir, `${Date.now()}_final.${ext}`);

        try {
            // ==========================================
            // INTENTO 1: MOTOR V3 (Descarga Directa)
            // ==========================================
            const resV3 = await axios.get(API_SAVENOW, {
                params: { url: query, type: type, quality: type === 'video' ? '360' : '320', apikey: API_KEY },
                headers: requestHeaders
            });

            if (!resV3.data?.status || !resV3.data?.data?.download?.url) throw new Error("V3 no entregó enlaces");
            
            const v3Data = resV3.data.data;
            await downloadMedia(v3Data.download.url, finalPath);

            const fileSize = v3Data.size || await getFileSize(v3Data.download.url);
            
            if (type === 'audio') {
                await conn.sendMessage(m.chat, { audio: { url: finalPath }, mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
            } else {
                const videoCaption = `🎬 *Aquí tienes.*\n\n> *Título:* ${v3Data.title || 'Video'}\n> *Calidad:* ${v3Data.quality || '360p'}\n> *Peso:* ${fileSize}\n> *Servidor:* V3`;
                await conn.sendMessage(m.chat, { video: { url: finalPath }, caption: videoCaption, mimetype: "video/mp4" }, { quoted: m });
            }
            await m.react("✅");

        } catch (errorV3) {
            console.log(`[V3 Falló]: ${errorV3.message}`);
            await sendExternalMessage(`*— Tsk...* El motor V3 falló. Intentando con el motor V2... ⚙️`);
            
            // ==========================================
            // INTENTO 2: MOTOR V2 (Procesamiento en Stream con FFmpeg)
            // ==========================================
            try {
                const resV2 = await axios.get(API_V2, {
                    params: { apikey: API_KEY, url: query, type: type, quality: type === 'video' ? '360' : undefined },
                    headers: requestHeaders
                });

                if (!resV2.data?.status || !resV2.data?.data?.download?.url) throw new Error("V2 no entregó enlaces");
                
                const v2Data = resV2.data.data;
                const v2Url = v2Data.download.url;
                
                await m.react("⚙️"); 
                // Descarga y procesa simultáneamente
                await downloadAndProcessV2(v2Url, type, finalPath);
                
                const fileSizeV2 = v2Data.size || await getFileSize(v2Url);

                if (type === 'audio') {
                    await conn.sendMessage(m.chat, { audio: { url: finalPath }, mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
                } else {
                    const videoCaption = `🎬 *Aquí tienes.*\n\n> *Título:* ${v2Data.title || 'Video'}\n> *Calidad:* ${v2Data.quality || '360p'}\n> *Peso:* ${fileSizeV2}\n> *Servidor:* V2 (Corregido)`;
                    await conn.sendMessage(m.chat, { video: { url: finalPath }, caption: videoCaption, mimetype: "video/mp4" }, { quoted: m });
                }
                await m.react("✅");

            } catch (errorV2) {
                console.log(`[V2 Falló]: ${errorV2.message}`);
                await m.react("❌");
                await sendExternalMessage(`*— Tsk...* Ninguno de los motores pudo procesar el enlace. Intenta de nuevo más tarde.`);
            }
        } finally {
            if (fs.existsSync(finalPath)) try { fs.unlinkSync(finalPath); } catch {}
        }
        return;
    }

    // ==========================================
    // BÚSQUEDA NORMAL
    // ==========================================
    await m.react("🔍");
    const searchResult = await yts(query);
    const video = searchResult.videos?.[0];

    if (!video) return await sendExternalMessage(`*— No encontré nada con ese nombre.*`);

    const caption = `₊‧꒰ 🦈 ꒱ 𝙀𝙇𝙇𝙀 𝙅𝙊𝙀 𝙎𝙀𝙍𝙑𝙄𝘾𝙀\n\n> *Título:* ${video.title}\n> *Uploader:* ${video.author.name}\n> *Duración:* ${video.timestamp}\n\n*— Elige si quieres audio o video.*`;

    const botonesNativos = [
        { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎧 𝘼𝙐𝘿𝙄𝙊", id: `${usedPrefix}${command} audio ${video.url}` }) },
        { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎬 𝙑𝙄𝘿𝙀𝙊", id: `${usedPrefix}${command} video ${video.url}` }) }
    ];

    await sendInteractiveCard(caption, video.thumbnail, botonesNativos);
};

handler.help = ['play <búsqueda>'];
handler.tags = ['descargas'];
handler.command = ['play'];
handler.register = true;

export default handler;

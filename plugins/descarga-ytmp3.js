import axios from 'axios';
import { exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

// --- Configuración API ---
const API_BASE = 'https://rest.apicausas.xyz/api/v1/descargas/youtube';
const API_KEY = 'causa-ee5ee31dcfc79da4';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

var handler = async (m, { conn, args, usedPrefix, command }) => {
    const name = conn.getName(m.sender);
    const url = args[0];
    const tmpDir = './tmp';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const contextInfo = {
        mentionedJid: [m.sender],
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 },
        externalAdReply: {
            title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎Ｅ𝙆ＥＥ𝙋ＩＮ𝙂',
            body: `✦ Procesando metadatos para ti, ${name}...`, 
            thumbnail: global.icons, 
            sourceUrl: global.redes, 
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    if (!url) return conn.reply(m.chat, `🦈 *— Dame un enlace.*`, m, { contextInfo, quoted: m });

    await m.react("🎧");

    const fileName = `${Date.now()}`;
    const inputPath = path.join(tmpDir, `${fileName}_in.mp3`);
    const outputPath = path.join(tmpDir, `${fileName}.mp3`);

    try {
        const response = await axios.get(`${API_BASE}?url=${encodeURIComponent(url)}&type=audio&apikey=${API_KEY}`);
        const res = response.data;

        if (res.status && res.data.download.url) {
            const { title, download } = res.data;
            
            // 1. Descarga del archivo
            const fileRes = await axios({ url: download.url, method: 'GET', responseType: 'stream' });
            const writer = fs.createWriteStream(inputPath);
            fileRes.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // 2. REPARACIÓN E INYECCIÓN DE METADATOS
            // -metadata title: El nombre del video + tu marca
            // -metadata artist: Tu marca de servicio
            // -id3v2_version 3: Asegura compatibilidad con la mayoría de reproductores
            const customTitle = `${title} - ELLEN JOE SERVICES`;
            const customArtist = `ELLEN JOE SERVICE`;

            await execPromise(`ffmpeg -i "${inputPath}" -c copy -metadata title="${customTitle}" -metadata artist="${customArtist}" -id3v2_version 3 "${outputPath}"`);

            await conn.sendMessage(m.chat, { 
                audio: fs.readFileSync(outputPath), 
                mimetype: 'audio/mpeg', 
                fileName: `${title}.mp3`,
                ptt: false 
            }, { quoted: m });

            await m.react("✅");

        } else { throw new Error(); }
    } catch (e) {
        console.error(e);
        await m.react("❌");
        await conn.reply(m.chat, `🦈 *Error al procesar el audio.*`, m);
    } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
};

handler.command = ['ytmp3'];
export default handler;

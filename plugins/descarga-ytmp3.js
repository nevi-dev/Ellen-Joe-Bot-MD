import axios from 'axios';
import { exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

// --- Configuración API Causas ---
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
            body: `✦ Trabajando rápido para ti, ${name}...`, 
            thumbnail: global.icons, 
            sourceUrl: global.redes, 
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    if (!url) return conn.reply(m.chat, `🦈 *— Dame un enlace.*`, m, { contextInfo, quoted: m });

    await m.react("🎧");

    const fileName = `${Date.now()}`;
    const inputPath = path.join(tmpDir, `${fileName}_in`);
    const outputPath = path.join(tmpDir, `${fileName}.m4a`);

    try {
        const response = await axios.get(`${API_BASE}?url=${encodeURIComponent(url)}&type=audio&apikey=${API_KEY}`);
        const res = response.data;

        if (res.status && res.data.download.url) {
            const { title, download } = res.data;
            
            // 1. Descarga rápida en stream
            const fileRes = await axios({ url: download.url, method: 'GET', responseType: 'stream' });
            const writer = fs.createWriteStream(inputPath);
            fileRes.data.pipe(writer);
            await new Promise((resolve) => writer.on('finish', resolve));

            // 2. REPARACIÓN ULTRA LIVIANA (Copy codec)
            // -c copy: no procesa el audio, solo repara el contenedor para que no de 0:00.
            // -movflags +faststart: pone los metadatos al principio para que cargue rápido.
            await execPromise(`ffmpeg -i "${inputPath}" -c copy -movflags +faststart "${outputPath}"`);

            await conn.sendMessage(m.chat, { 
                audio: fs.readFileSync(outputPath), 
                mimetype: 'audio/mp4', // Usamos mp4/m4a que es nativo y pesa menos que mp3
                fileName: `${title}.m4a`,
                ptt: false 
            }, { quoted: m });

            await m.react("✅");

        } else { throw new Error(); }
    } catch (e) {
        await m.react("❌");
        await conn.reply(m.chat, `🦈 *Error rápido.*`, m);
    } finally {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
};

handler.command = ['ytmp3'];
export default handler;

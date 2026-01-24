import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = "https://api-causas.duckdns.org/api/v1/nsfw/descargas/veohentai";
const API_KEY = "causa-ee5ee31dcfc79da4";

const handler = async (m, { conn, args, usedPrefix, command }) => {
    // 1. Definimos la carpeta y variables fuera para que todo el código las vea
    const tmpDir = './tmp2';
    let filePath = ''; 
    
    const chat = global.db.data.chats[m.chat];
    if (m.isGroup && !chat?.nsfw) return m.reply(`*🔞 Activa el modo NSFW.*`);
    if (!args[0]) return m.reply(`*— Dame un nombre o URL.*`);

    // Crear tmp2 si no existe
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const query = args.join(' ');
    const isUrl = query.match(/https?:\/\/veohentai\.com\//i);
    const queryParam = isUrl ? `url=${encodeURIComponent(query)}` : `q=${encodeURIComponent(query)}`;
    const queryUrl = `${API_BASE_URL}?${queryParam}&subs=false&apikey=${API_KEY}`;

    try {
        await m.react('⏳');
        const response = await fetch(queryUrl);
        const json = await response.json();

        if (!json.status || !json.data) {
            await m.react('❌');
            return m.reply(`*No encontré nada.*`);
        }

        const { title, download_url } = json.data;
        
        // Asignamos valor a filePath
        filePath = path.join(tmpDir, `${Date.now()}.mp4`);

        console.log(`[1] Descargando en tmp2: ${title}`);

        const res = await fetch(download_url);
        const fileStream = fs.createWriteStream(filePath);

        await new Promise((resolve, reject) => {
            res.body.pipe(fileStream);
            res.body.on('error', reject);
            fileStream.on('finish', resolve);
        });

        const stats = fs.statSync(filePath);
        console.log(`[2] Peso: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

        console.log(`[3] Enviando a WhatsApp...`);
        
        // Enviamos usando el PATH directamente para que Baileys gestione el stream
        await conn.sendMessage(m.chat, { 
            video: { url: filePath }, 
            caption: `✅ *Aquí tienes:* ${title}`,
            mimetype: 'video/mp4',
            fileName: `${title}.mp4`
        }, { quoted: m });

        console.log(`[4] Enviado con éxito.`);

        // Borramos después de enviar
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await m.react('✅');

    } catch (e) {
        console.error(`[ERROR]:`, e);
        await m.react('❌');
        m.reply(`*— Tsk... Falló.* ${e.message}`);
        
        // Aquí filePath ya es visible, así que no dará ReferenceError
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
};

handler.help = ['veohentai'];
handler.tags = ['nsfw'];
handler.command = ['veohentai', 'vh'];
handler.register = true;

export default handler;

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = "https://api-causas.duckdns.org/api/v1/nsfw/descargas/veohentai";
const API_KEY = "causa-ee5ee31dcfc79da4";

const handler = async (m, { conn, args, usedPrefix, command }) => {
    const chat = global.db.data.chats[m.chat];
    if (m.isGroup && !chat?.nsfw) return m.reply(`*🔞 Activa el modo NSFW.*`);
    if (!args[0]) return m.reply(`*— Dame un nombre o URL.*`);

    const query = args.join(' ');
    const isUrl = query.match(/https?:\/\/veohentai\.com\//i);
    const queryParam = isUrl ? `url=${encodeURIComponent(query)}` : `q=${encodeURIComponent(query)}`;
    const queryUrl = `${API_BASE_URL}?${queryParam}&subs=false&apikey=${API_KEY}`;

    // Crear carpeta tmp si no existe
    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp');

    try {
        await m.react('⏳');
        const response = await fetch(queryUrl);
        const json = await response.json();

        if (!json.status || !json.data) {
            await m.react('❌');
            return m.reply(`*No encontré nada.*`);
        }

        const { title, download_url } = json.data;
        const filePath = path.join('./tmp', `${Date.now()}.mp4`);

        console.log(`[1] Descargando: ${title}`);

        // --- DESCARGA AL DISCO ---
        const res = await fetch(download_url);
        const fileStream = fs.createWriteStream(filePath);

        await new Promise((resolve, reject) => {
            res.body.pipe(fileStream);
            res.body.on('error', reject);
            fileStream.on('finish', resolve);
        });

        const stats = fs.statSync(filePath);
        console.log(`[2] Descarga completa. Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

        // --- ENVÍO COMO VIDEO NORMAL ---
        console.log(`[3] Subiendo a WhatsApp...`);
        
        await conn.sendMessage(m.chat, { 
            video: fs.readFileSync(filePath), // Usamos el buffer del archivo local
            caption: `✅ *Aquí tienes:* ${title}`,
            mimetype: 'video/mp4',
            fileName: `${title}.mp4`,
            seconds: 60, // Engañamos un poco al sistema con la duración
            gifPlayback: false
        }, { quoted: m });

        console.log(`[4] Enviado con éxito.`);

        // Limpieza inmediata
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await m.react('✅');

    } catch (e) {
        console.error(`[ERROR]:`, e);
        await m.react('❌');
        m.reply(`*— Tsk... Falló.* Verifica que el video no sea demasiado largo para tu servidor.`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
};

handler.help = ['veohentai'];
handler.tags = ['nsfw'];
handler.command = ['veohentai', 'vh'];
handler.register = true;

export default handler;

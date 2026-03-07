import fetch from 'node-fetch';
import { format } from 'util';

const handler = async (m, { text, conn }) => {
    // ¿En serio? ¿Me despiertas para esto y ni siquiera pones una URL? 
    if (!text) return m.reply(`*Suspira...* 🙄 Pon la URL si quieres que haga algo.`);
    if (!/^https?:\/\//.test(text)) return m.reply(`❌ Eso ni siquiera es una URL válida. ¿Te falta azúcar en el cerebro?`);

    m.react('🍭'); // Algo dulce para la espera...

    try {
        const res = await fetch(text, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const contentType = res.headers.get('content-type') || '';
        const buffer = await res.buffer();

        // --- MULTIMEDIA (FOTOS, VIDEOS, AUDIOS) ---
        // Si es algo visual, te lo mando directo. No me hagas perder el tiempo explicando.
        if (/image|video|audio/.test(contentType) && !/json|text|javascript|html/.test(contentType)) {
            const isAudio = contentType.includes('audio');
            
            await conn.sendFile(m.chat, buffer, 'file', `*Aquí tienes tu archivo:* ${contentType}\n*URL:* ${text}`, m, isAudio);
            return m.react('✅');
        }

        // --- TEXTO / CÓDIGO / JSON ---
        let output = '';
        const rawText = buffer.toString();

        if (/json/.test(contentType)) {
            try {
                // Lo ordeno un poco porque seguro eres un desastre
                const json = JSON.parse(rawText);
                output = JSON.stringify(json, null, 2);
            } catch (e) {
                output = rawText;
            }
        } else {
            output = rawText;
        }

        if (!output.trim()) return m.reply('⚠️ Vacío... como tu cabeza ahora mismo. No hay nada que leer ahí.');

        // WhatsApp tiene sus límites, así que si escribiste la biblia, la voy a cortar.
        if (output.length > 65000) {
            const chunk = output.slice(0, 65000);
            await m.reply(`\`\`\`\n${chunk}\n\`\`\``);
            await m.reply('⚠️ *Demasiado largo.* Lo corté porque no tengo todo el día para leer esto.');
        } else {
            await m.reply(`\`\`\`\n${output}\n\`\`\``);
        }

        m.react('🦈'); // Mi toque personal.

    } catch (e) {
        console.error(e);
        m.react('✖️');
        m.reply(`💢 Tsk... Algo salió mal: ${e.message}. No me culpes a mí, seguro es tu conexión.`);
    }
};

handler.help = ['fetch', 'get'];
handler.tags = ['owner'];
handler.command = ['fetch', 'get'];
handler.rowner = true;

export default handler;

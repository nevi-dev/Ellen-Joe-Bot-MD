import fetch from 'node-fetch';

let cooldowns = {};

// Configuración del Newsletter/Canal
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

let handler = async (m, { conn, usedPrefix, command }) => {
    let user = global.db.data.users[m.sender];
    let senderId = m.sender;
    let name = conn.getName(senderId);

    // ContextInfo estético de Victoria Housekeeping
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
            body: `— Patrulla de Distrito para ${name}`,
            thumbnail: icons, 
            sourceUrl: redes,
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    let tiempoEspera = 5 * 60; // 5 minutos

    if (cooldowns[m.sender] && Date.now() - cooldowns[m.sender] < tiempoEspera * 1000) {
        let tiempoRestante = segundosAHMS(Math.ceil((cooldowns[m.sender] + tiempoEspera * 1000 - Date.now()) / 1000));
        return conn.reply(m.chat, `*— (Bostezo)*... Qué molesto eres. Mis pies aún duelen de caminar. Espera **${tiempoRestante}** o vete tú solo por ahí.`, m, { contextInfo });
    }

    if (!user) {
        return conn.reply(m.chat, `*— ¿Eh?* No estás en mis registros. Qué pérdida de tiempo.`, m);
    }

    // Eventos temáticos de Zenless Zone Zero (Exploración de Distrito)
    const eventos = [
        { nombre: '📦 Entrega Extraviada', coin: 100, exp: 50, health: 0, mensaje: `Encontré un paquete de Dennies tirado cerca del Videoclub. Supongo que ahora es tuyo.` },
        { nombre: '🐱 Gatos de la Sexta Calle', coin: 0, exp: 20, health: 0, mensaje: `Me detuve a mirar unos gatos. No encontré nada, pero al menos descansé un poco.` },
        { nombre: '🔫 Bandidos del Distrito', coin: -50, exp: 30, health: -10, mensaje: `Unos tipos intentaron asaltarme. Tuve que usar mi guadaña y se me rompió una uña. Qué fastidio.` },
        { nombre: '🍜 Cupón de Fideos', coin: 200, exp: 100, health: 5, mensaje: `¡Encontré un cupón de Dennies premium! Esto casi hace que valga la pena haber salido.` },
        { nombre: '🔧 Chatarrero de Belobog', coin: 50, exp: 40, health: 0, mensaje: `Un trabajador de construcción me dio una propina por ayudarle con unos cables. Qué pesado.` },
        { nombre: '🧪 Residuo Etéreo', coin: -30, exp: 20, health: -15, mensaje: `Había una pequeña grieta etérea en un callejón. Me siento un poco mareada, tsk.` }
    ];

    let evento = eventos[Math.floor(Math.random() * eventos.length)];

    // Actualizar datos
    user.coin += evento.coin;
    user.exp += evento.exp;
    user.health += evento.health;

    // Límites de salud y monedas
    if (user.health > 100) user.health = 100;
    if (user.health < 0) user.health = 0;
    if (user.coin < 0) user.coin = 0;

    cooldowns[m.sender] = Date.now();

    let info = `🦈 **𝐑𝐄𝐏𝐎𝐑𝐓𝐄 𝐃𝐄 𝐏𝐀𝐓𝐑𝐔𝐋𝐋𝐀: 𝐍𝐄𝐖 𝐄𝐑𝐈𝐃𝐔**

📍 **Suceso:** ${evento.nombre}
💬 **Ellen Joe:** *"${evento.mensaje}"*

💰 **Balance:** ${evento.coin >= 0 ? '+' : ''}${evento.coin} ${moneda}
✨ **Progreso:** +${evento.exp} XP
❤️ **Estado:** ${user.health} HP

*— Terminé mi ronda. Me voy a la cocina a buscar algo dulce, no me sigas.*`;

    // Envío con imagen grande de la variable global 'icons'
    await conn.sendMessage(m.chat, { 
        image: { url: icons }, 
        caption: info,
        contextInfo
    }, { quoted: m });

    global.db.write();
};

handler.tags = ['rpg'];
handler.help = ['explorar'];
handler.command = ['explorar', 'bosque', 'patrulla', 'calle'];
handler.register = true;
handler.group = true;

export default handler;

function segundosAHMS(segundos) {
    let minutos = Math.floor(segundos / 60);
    let segundosRestantes = segundos % 60;
    return `${minutos}m y ${segundosRestantes}s`;
}

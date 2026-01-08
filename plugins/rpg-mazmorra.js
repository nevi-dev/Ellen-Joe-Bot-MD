import fetch from 'node-fetch';

let cooldowns = {};

// Configuración del Newsletter/Canal
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

let handler = async (m, { conn, usedPrefix, command }) => {
    // Definición de variables para evitar errores de "not defined"
    let icons = global.icons;
    let redes = global.redes;
    let moneda = global.moneda || 'Dennies';

    let user = global.db.data.users[m.sender];
    let senderId = m.sender;
    let name = conn.getName(senderId);

    // ContextInfo estético
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
            body: `— Limpieza de Cavidades para ${name}`,
            thumbnail: icons, 
            sourceUrl: redes,
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    let tiempoEspera = 8 * 60; // 8 minutos

    if (cooldowns[m.sender] && Date.now() - cooldowns[m.sender] < tiempoEspera * 1000) {
        let tiempoRestante = segundosAHMS(Math.ceil((cooldowns[m.sender] + tiempoEspera * 1000 - Date.now()) / 1000));
        return conn.reply(m.chat, `*— (Bostezo)*... Qué insistente eres. Todavía no me recupero de la última incursión. Espera **${tiempoRestante}** o ve tú solo.`, m, { contextInfo });
    }

    if (!user) {
        return conn.reply(m.chat, `*— ¿Eh?* No te conozco. Regístrate primero o déjame dormir.`, m);
    }

    // Eventos temáticos de Zenless Zone Zero
    const eventos = [
        { nombre: 'Nido de Etéreos', coin: randomNumber(150, 300), exp: randomNumber(50, 100), health: 0, mensaje: `🏆 Encontré un suministro abandonado tras limpiar un nido. Aquí tienes tus Dennies.` },
        { nombre: 'Falla de Datos en el HDD', coin: randomNumber(-70, -40), exp: randomNumber(10, 20), health: randomNumber(-15, -5), mensaje: `⚠️ El sistema HDD falló y nos perdimos. Tuve que gastar recursos para sacarnos de ahí.` },
        { nombre: 'Suministros de la Guadaña', coin: randomNumber(250, 400), exp: randomNumber(100, 150), health: 0, mensaje: `💎 Encontramos una caja de suministros de alta prioridad. No está mal para un día de pereza.` },
        { nombre: 'Interferencia Etérea', coin: 0, exp: randomNumber(5, 10), health: 0, mensaje: `🚧 Una fuerte distorsión nos obligó a dar vueltas. No ganamos nada, qué pérdida de tiempo.` },
        { nombre: 'Emboscada de Thiren Salvaje', coin: randomNumber(-150, -80), exp: randomNumber(20, 40), health: randomNumber(-30, -20), mensaje: `🐉 Nos emboscaron. Tuve que pelear en serio y eso me dio hambre. Perdimos equipo en la huida.` },
        { nombre: 'Almacén de New Eridu', coin: randomNumber(100, 200), exp: randomNumber(30, 60), health: 0, mensaje: `🎆 Un almacén sin vigilancia. Tomé lo que pude antes de que llegara la Seguridad Pública.` },
        { nombre: 'Rastro de Éter Falso', coin: 0, exp: randomNumber(5, 15), health: 0, mensaje: `🌀 Seguimos una señal que resultó ser falsa. Solo perdimos tiempo de mi descanso.` },
        { nombre: 'Punto de Extracción Seguro', coin: randomNumber(50, 100), exp: randomNumber(30, 50), health: 5, mensaje: `👴 Encontramos un refugio con suministros médicos. Aproveché para comer algo dulce.` },
    ];

    let evento = eventos[Math.floor(Math.random() * eventos.length)];

    // Aplicar cambios al usuario
    user.coin = (user.coin || 0) + evento.coin;
    user.exp = (user.exp || 0) + evento.exp;
    user.health = (user.health || 100) + evento.health;
    
    // Asegurar que los valores no sean negativos o excedan el límite
    if (user.coin < 0) user.coin = 0;
    if (user.health > 100) user.health = 100;
    if (user.health < 0) user.health = 0;

    cooldowns[m.sender] = Date.now();

    let info = `🦈 **𝐑𝐄𝐏𝐎𝐑𝐓𝐄 𝐃𝐄 𝐌𝐈𝐒𝐈𝐎́𝐍: 𝐇𝐎𝐋𝐋𝐎𝐖**

📍 **Zona:** ${evento.nombre}
💬 **Notas:** ${evento.mensaje}

💰 **Ganancia:** ${evento.coin >= 0 ? '+' : ''}${evento.coin} ${moneda}
✨ **Experiencia:** +${evento.exp} XP
❤️ **Estado Vital:** ${user.health} HP 
${evento.health < 0 ? '*(Recibiste daños en la Cavidad)*' : '*(Sin daños críticos)*'}

*— Ugh, terminé. No me pidas nada más por un buen rato, voy a mi hora del té.*`;

    // SOLUCIÓN AL ERROR: Al ser Buffer, enviamos 'icons' directamente
    await conn.sendMessage(m.chat, { 
        image: icons, 
        caption: info,
        contextInfo
    }, { quoted: m });

    global.db.write();
};

handler.tags = ['rpg'];
handler.help = ['mazmorra'];
handler.command = ['dungeon', 'mazmorra', 'cueva', 'explorar'];
handler.register = true;
handler.group = true;

export default handler;

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function segundosAHMS(segundos) {
    let minutos = Math.floor(segundos / 60);
    let segundosRestantes = segundos % 60;
    return `${minutos}m y ${segundosRestantes}s`;
}

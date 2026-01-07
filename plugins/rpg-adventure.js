import fetch from 'node-fetch';

// Configuración del Newsletter/Canal
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

let handler = async (m, { conn }) => {
    let user = global.db.data.users[m.sender];
    let name = conn.getName(m.sender);

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
            body: `— Incursión en Cavidad para ${name}`,
            thumbnail: icons, 
            sourceUrl: redes,
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    if (!user) {
        return conn.reply(m.chat, `*— ¿Eh?* No estás en mis registros. Qué pérdida de tiempo.`, m);
    }

    // Validación de Salud (Mínimo 80 HP para entrar a la Cavidad)
    if (user.health < 80) {
        return conn.reply(m.chat, `*— Tsk...* El nivel de éter te mataría con esa salud. Tienes **${user.health} HP**. Ve a descansar o usa #heal, no quiero recoger tus restos.`, m, { contextInfo });
    }

    // Cooldown de 25 minutos
    if (user.lastAdventure && new Date() - user.lastAdventure <= 1500000) {
        let timeLeft = 1500000 - (new Date() - user.lastAdventure);
        return conn.reply(m.chat, `*— (Bostezo)*... Las incursiones agotan. Vuelve en **${msToTime(timeLeft)}**. Estoy en mi descanso y no pienso moverme.`, m, { contextInfo });
    }

    // Zonas de Zenless Zone Zero (Cavidades y New Eridu)
    let hollows = [
        'Cavidad Zero', 
        'Sector de Construcción de la Línea 2', 
        'Distrito de Negocios de la Cavidad 6', 
        'Zona de Contaminación por Éter: Punto Cero',
        'Antiguo Almacén de la Guadaña',
        'Subsuelo de la Plaza de la Perla',
        'Ruinas del Metro de New Eridu',
        'Zona Crítica: Hollow 0',
        'Plaza de la Fuente Abandonada',
        'Laboratorio de Investigación Etérea'
    ];

    let randomHollow = pickRandom(hollows);
    
    // Recompensas temáticas
    let coin = pickRandom([100, 200, 300, 500, 800, 1200]); // Dennies
    let exp = pickRandom([50, 80, 100, 150]); // Experiencia de Proxy
    let diamonds = pickRandom([1, 2, 3, 5]); // Películas / Cromo
    let iron = pickRandom([10, 20, 30, 50]); // Chatarra
    let emerald = pickRandom([1, 2, 4]); // Cristales Etéreos
    let coal = pickRandom([20, 40, 60, 100]); // Combustible
    let gold = pickRandom([5, 10, 15, 25]); // Componentes de Motor

    // Actualizar datos del usuario
    user.coin += coin;
    user.exp += exp;
    user.diamonds += diamonds;
    user.iron += iron;
    user.emerald += emerald;
    user.coal += coal;
    user.gold += gold;
    user.health -= 50; // El desgaste de la cavidad
    user.lastAdventure = new Date();

    if (user.health < 0) user.health = 0;

    let info = `🦈 **𝐈𝐍𝐅𝐎𝐑𝐌𝐄 𝐃𝐄 𝐄𝐗𝐓𝐑𝐀𝐂𝐂𝐈𝐎́𝐍: 𝐂𝐀𝐕𝐈𝐃𝐀𝐃**

*— Ugh, qué cansancio.* He terminado la incursión en: 
📍 **${randomHollow}**

He recolectado esto entre tanto Eterio suelto... espero que sea suficiente para que me dejes en paz:

💸 **Dennies:** +${coin.toLocaleString()}
✨ **Exp de Proxy:** +${exp}
💎 **Películas:** +${diamonds}
♦️ **Cristal Etéreo:** +${emerald}
🔩 **Chatarra:** +${iron}
🕋 **Combustible:** +${coal}
🏅 **Componentes:** +${gold}

❤️ **Resistencia Actual:** ${user.health} HP

*— Mi turno terminó. No me molestes mientras como mi dulce.*`;

    // Enviar mensaje con la imagen de 'icons' en grande
    await conn.sendMessage(m.chat, { 
        image: { url: icons }, 
        caption: info,
        contextInfo
    }, { quoted: m });
};

handler.help = ['aventura'];
handler.tags = ['rpg'];
handler.command = ['adventure', 'aventura', 'hollow'];
handler.group = true;
handler.register = true;

export default handler;

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function msToTime(duration) {
    let minutes = Math.floor((duration / (1000 * 60)) % 60);
    let seconds = Math.floor((duration / 1000) % 60);
    return `${minutes}m y ${seconds}s`;
}

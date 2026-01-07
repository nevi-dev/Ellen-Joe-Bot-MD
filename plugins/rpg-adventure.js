import fetch from 'node-fetch';

// Configuración del Newsletter/Canal
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

let handler = async (m, { conn }) => {
    let user = global.db.data.users[m.sender];
    let name = conn.getName(m.sender);

    // ContextInfo estético de Ellen Joe
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
            body: `— Exploración de Zonas para ${name}`,
            thumbnail: icons, // Miniatura para el link
            sourceUrl: redes,
            mediaType: 1,
            renderLargerThumbnail: false
        }
    };

    if (!user) {
        return conn.reply(m.chat, `*— ¿Quién eres?* No estás en mi lista. Qué molesto.`, m);
    }

    if (user.health < 80) {
        return conn.reply(m.chat, `*— Tsk...* Estás demasiado mal para ir a ningún lado. Tienes **${user.health} HP**. Ve a curarte o déjame dormir.`, m, { contextInfo });
    }

    if (user.lastAdventure && new Date() - user.lastAdventure <= 1500000) {
        let timeLeft = 1500000 - (new Date() - user.lastAdventure);
        return conn.reply(m.chat, `*— (Bostezo)*... Qué pesadez. Te faltan **${msToTime(timeLeft)}** de descanso. No voy a moverme antes.`, m, { contextInfo });
    }

    let kingdoms = [
        'Reino de Eldoria', 'Reino de Drakonia', 'Reino de Arkenland', 
        'Reino de Valoria', 'Reino de Mystara', 'Reino de Ferelith', 
        'Reino de Thaloria', 'Reino de Nimboria', 'Reino de Galadorn', 'Reino de Elenaria'
    ];

    let randomKingdom = pickRandom(kingdoms);
    let coin = pickRandom([20, 50, 70, 90, 300, 500]);
    let emerald = pickRandom([1, 5, 8]);
    let iron = pickRandom([10, 20, 50, 80]);
    let gold = pickRandom([10, 20, 50, 88]);
    let coal = pickRandom([50, 100, 500]);
    let stone = pickRandom([200, 500, 800]);
    let diamonds = pickRandom([1, 2, 3, 5]);
    let exp = pickRandom([20, 40, 60, 100]);

    // Actualizar datos del usuario
    user.coin += coin;
    user.emerald += emerald;
    user.iron += iron;
    user.gold += gold;
    user.coal += coal;
    user.stone += stone;
    user.diamonds += diamonds;
    user.exp += exp;
    user.health -= 50;
    user.lastAdventure = new Date();

    if (user.health < 0) user.health = 0;

    let info = `🦈 **𝐑𝐄𝐒𝐔𝐌𝐄𝐍 𝐃𝐄 𝐋𝐀 𝐄𝐗𝐏𝐋𝐎𝐑𝐀𝐂𝐈𝐎́𝐍**
    
*— Bien, ya volví.* Fuimos al **${randomKingdom}**. Esto es lo que logré rescatar mientras no me quedaba dormida. Espero que te sirva.

💰 **${moneda}:** +${coin}
✨ **Experiencia:** +${exp}
💎 **Diamantes:** +${diamonds}
♦️ **Esmeralda:** +${emerald}
🔩 **Hierro:** +${iron}
🏅 **Oro:** +${gold}
🪨 **Piedra/Carbón:** ${stone}/${coal}

❤️ **Salud Actual:** ${user.health} HP

*— Ahora me voy a mi descanso, no me busques.*`;

    // Usamos conn.sendMessage con la imagen de 'icons' en grande
    // 'icons' debe ser una URL o Buffer válido según tu configuración global
    await conn.sendMessage(m.chat, { 
        image: { url: icons }, 
        caption: info,
        contextInfo
    }, { quoted: m });
};

handler.help = ['aventura'];
handler.tags = ['rpg'];
handler.command = ['adventure', 'aventura'];
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

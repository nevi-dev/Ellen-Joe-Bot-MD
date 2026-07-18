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

    };

    if (!user) {
        return m.replyExternal(`*— ¿Eh?* No estás en mis registros. Qué pérdida de tiempo.`, m);
    }

    // Validación de Salud (Mínimo 80 HP para entrar a la Cavidad)
    if ((user.health || 0) < 80) {
        return m.replyExternal(`*— Tsk...* El nivel de éter te mataría con esa salud. Tienes **${user.health || 0} HP**. Ve a descansar o usa #heal, no quiero recoger tus restos.`, { contextInfo });
    }

    // Cooldown de 25 minutos (1500000 ms)
    if (user.lastAdventure && new Date() - user.lastAdventure <= 1500000) {
        let timeLeft = 1500000 - (new Date() - user.lastAdventure);
        return m.replyExternal(`*— (Bostezo)*... Las incursiones agotan. Vuelve en **${msToTime(timeLeft)}**. Estoy en mi descanso y no pienso moverme.`, { contextInfo });
    }

    // Zonas de Zenless Zone Zero
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
    let coin = pickRandom([100, 200, 300, 500, 800, 1200]);
    let exp = pickRandom([50, 80, 100, 150]);
    let diamonds = pickRandom([1, 2, 3, 5]);
    let iron = pickRandom([10, 20, 30, 50]);
    let emerald = pickRandom([1, 2, 4]);
    let coal = pickRandom([20, 40, 60, 100]);
    let gold = pickRandom([5, 10, 15, 25]);

    // Actualizar datos del usuario con seguridad
    user.coin = (user.coin || 0) + coin;
    user.exp = (user.exp || 0) + exp;
    user.diamonds = (user.diamonds || 0) + diamonds;
    user.iron = (user.iron || 0) + iron;
    user.emerald = (user.emerald || 0) + emerald;
    user.coal = (user.coal || 0) + coal;
    user.gold = (user.gold || 0) + gold;
    user.health = (user.health || 100) - 50; 
    user.lastAdventure = new Date() * 1; // Guardar como timestamp

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

    // Envío con el Buffer directo para evitar TypeError
    await conn.sendMessage(m.chat, { 
        image: icons, 
        caption: info,
        contextInfo
    }, { quoted: m });

    global.db.write();
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

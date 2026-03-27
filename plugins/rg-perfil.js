import moment from 'moment-timezone';
import PhoneNumber from 'awesome-phonenumber';
import fetch from 'node-fetch';

let handler = async (m, { conn, args }) => {
    // 1. Detección de usuario mejorada (Menciones > Citado > Uno mismo)
    let userId = m.mentionedJid && m.mentionedJid[0] 
        ? m.mentionedJid[0] 
        : (m.quoted ? m.quoted.sender : m.sender);

    // 2. Validación de base de datos para evitar errores de "undefined"
    let user = global.db.data.users[userId] || {};
    if (!global.db.data.users[userId]) global.db.data.users[userId] = {};

    // 3. Variables con valores por defecto (Failsafe)
    let name = conn.getName(userId);
    let exp = user.exp || 0;
    let nivel = user.level || 0;
    let role = user.role || 'Sin Rango';
    let coins = user.coin || 0;
    let bankCoins = user.bank || 0;
    let description = user.description || 'Sin Descripción';
    
    // 4. Obtención de foto de perfil (Si falla, usa una por defecto)
    let perfil;
    try {
        perfil = await conn.profilePictureUrl(userId, 'image');
    } catch (e) {
        perfil = 'https://telegra.ph/file/241f050a4abb3a354ca3f.jpg'; 
    }

    let profileText = `
「✿」 *Perfil* ◢@${userId.split('@')[0]}◤
${description}

✦ *Edad »* ${user.age || 'Desconocida'}
♛ *Cumpleaños »* ${user.birth || 'No especificado'}
⚥ *Género »* ${user.genre || 'No especificado'}
♡ *Casado »* ${user.marry || 'Nadie'}

☆ *Experiencia »* ${exp.toLocaleString()}
❖ *Nivel »* ${nivel}
✎ *Rango »* ${role}

⛁ *Cartera »* ${coins.toLocaleString()} ${global.moneda || 'Coins'}
⛃ *Banco »* ${bankCoins.toLocaleString()} ${global.moneda || 'Coins'}
❁ *Premium »* ${user.premium ? '✅' : '❌'}`.trim();

    // 5. Envío del mensaje corregido para visibilidad total
    await conn.sendMessage(m.chat, { 
        text: profileText,
        contextInfo: {
            mentionedJid: [userId],
            externalAdReply: {
                title: `✧ Perfil de ${name} ✧`,
                body: global.dev || 'Sistema de Usuario',
                thumbnailUrl: perfil,
                sourceUrl: redes, // URL necesaria para estabilidad
                mediaType: 1, // CAMBIADO A 1: Esto soluciona que los demás no lo vean
                showAdAttribution: true,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m });
};

handler.help = ['profile'];
handler.tags = ['rg'];
handler.command = ['profile', 'perfil'];

export default handler;

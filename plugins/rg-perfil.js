import moment from 'moment-timezone';
import PhoneNumber from 'awesome-phonenumber';
import fetch from 'node-fetch';

let handler = async (m, { conn, args }) => {
    let userId;
    if (m.quoted && m.quoted.sender) {
        userId = m.quoted.sender;
    } else {
        userId = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.sender;
    }

    // Validación para que no de error si el usuario no está en la base de datos
    let user = global.db.data.users[userId] || {};
    let name = await conn.getName(userId);
    let cumpleanos = user.birth || 'No especificado';
    let genero = user.genre || 'No especificado';
    let parejaId = user.marry || null;
    let parejaText = 'Nadie';
    let mentions = [userId];

    if (parejaId) {
        let parejaName = await conn.getName(parejaId);
        parejaText = `@${parejaId.split('@')[0]} (${parejaName})`;
        mentions.push(parejaId);
    }

    let description = user.description || 'Sin descripción';
    let exp = user.exp || 0;
    let nivel = user.level || 0;
    let role = user.role || 'Sin Rango';
    let coins = user.coin || 0;
    let bankCoins = user.bank || 0;

    // Foto de perfil con URL de respaldo fija (Catbox es muy confiable)
    let perfil;
    try {
        perfil = await conn.profilePictureUrl(userId, 'image');
    } catch (e) {
        perfil = 'https://files.catbox.moe/xr2m6u.jpg';
    }

    let profileText = `
「✿」 *Perfil de* @${userId.split('@')[0]}
✦ *Edad:* ${user.age || 'Desconocida'}
♛ *Cumpleaños:* ${cumpleanos}
⚥ *Género:* ${genero}
♡ *Casado con:* ${parejaText}

✎ *Rango:* ${role}
☆ *Exp:* ${exp.toLocaleString()}
❖ *Nivel:* ${nivel}

⛁ *Coins Cartera:* ${coins.toLocaleString()} ${global.moneda || ''}
⛃ *Coins Banco:* ${bankCoins.toLocaleString()} ${global.moneda || ''}
❁ *Premium:* ${user.premium ? '✅' : '❌'}

📝 *Descripción:* ${description}
`.trim();

    await conn.sendMessage(m.chat, { 
        text: profileText,
        contextInfo: {
            mentionedJid: mentions,
            isForwarded: true,             // Estructura del comando PLAY
            forwardingScore: 999,          // Estructura del comando PLAY
            externalAdReply: {
                title: '✧ Perfil de Usuario ✧',
                body: global.dev || 'Victoria Housekeeping',
                thumbnailUrl: perfil,
                sourceUrl: global.redes || 'https://www.whatsapp.com',
                mediaType: 1,
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

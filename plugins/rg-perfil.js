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

    let user = global.db.data.users[userId];
    let name = await conn.getName(userId);
    let cumpleanos = user.birth || 'No lo ha dicho';
    let genero = user.genre || 'Desconocido';
    let parejaId = user.marry || null;
    let parejaText = 'Nadie (mejor así)';
    let mentions = [userId];

    if (parejaId) {
        let parejaName = await conn.getName(parejaId);
        parejaText = `@${parejaId.split('@')[0]} (${parejaName})`;
        mentions.push(parejaId);
    }

    let description = user.description || 'No hay nada escrito aquí... qué flojera.';
    let exp = user.exp || 0;
    let nivel = user.level || 0;
    let role = user.role || 'Novato';
    let coins = user.coin || 0;
    let bankCoins = user.bank || 0;

    let perfil = await conn.profilePictureUrl(userId, 'image').catch(_ => 'https://files.catbox.moe/xr2m6u.jpg');

    // Personalidad de Ellen Joe: Cortante, perezosa pero eficiente.
    let profileText = `
🦈 *Expediente de Servicio: @${userId.split('@')[0]}*
> "Ugh, ¿otra vez pidiendo datos? Terminaré esto rápido, mi turno casi acaba..."

*「 Datos del Cliente 」*
✦ *Edad:* ${user.age || '¿A quién le importa?'}
♛ *Cumple:* ${cumpleanos}
⚥ *Género:* ${genero}
♡ *Pareja:* ${parejaText}

*「 Rendimiento (RPG) 」*
✎ *Rango:* ${role}
☆ *Exp:* ${exp.toLocaleString()}
❖ *Nivel:* ${nivel}
> *(No te esfuerces demasiado, el exceso de trabajo mata).*

*「 Economía 」*
⛁ *Cartera:* ${coins.toLocaleString()} ${global.moneda || 'Coins'}
⛃ *Banco:* ${bankCoins.toLocaleString()} ${global.moneda || 'Coins'}
❁ *Estatus Premium:* ${user.premium ? '✅ (Vip, supongo)' : '❌ (Cliente promedio)'}

*「 Notas adicionales 」*
📝 ${description}

_— Solo no me pidas nada más durante mi descanso..._ 🍭
`.trim();

    await conn.sendMessage(m.chat, { 
        text: profileText,
        mentions,
        contextInfo: {
            mentionedJid: mentions,
            externalAdReply: {
                title: '🦈 V.H.P.S - Ellen Joe Service',
                body: '¿Ya terminaste? Quiero un helado.',
                thumbnailUrl: perfil,
                mediaType: 1,
                showAdAttribution: false,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m });
};

handler.help = ['profile'];
handler.tags = ['rg'];
handler.command = ['profile', 'perfil'];

export default handler;

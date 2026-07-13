import moment from 'moment-timezone';
import PhoneNumber from 'awesome-phonenumber';
import fetch from 'node-fetch';
import fs from 'fs';

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

    // --- CONFIGURACIÓN DEL MENSAJE EXTERNO DE VICTORIA HOUSEKEEPING ---
    const matchedUrl = 'https://github.com/nevi-dev';

    // Función unificada para responder con el external link de alta fidelidad
    const sendExternalMessage = async (msgText) => {
        const newsletterJid = global.newsletterJid || '120363198533816654@newsletter';
        const newsletterName = global.newsletterName || 'Ellen Joe Bot Updates 🦈';

        // Intentar obtener foto del usuario inspeccionado, o fallback a global.icons
        let thumbnailBuffer;
        try {
            const profileImgUrl = await conn.profilePictureUrl(userId, 'image').catch(() => null);
            if (profileImgUrl) {
                const response = await fetch(profileImgUrl);
                thumbnailBuffer = Buffer.from(await response.arrayBuffer());
            } else {
                throw new Error();
            }
        } catch {
            thumbnailBuffer = Buffer.isBuffer(global.icons) 
                ? global.icons 
                : (fs.existsSync(global.icons) ? fs.readFileSync(global.icons) : Buffer.from(global.icons, 'base64'));
        }

        await conn.relayMessage(m.chat, {
            extendedTextMessage: {
                text: `${matchedUrl}\n\n${msgText}`,
                matchedText: matchedUrl,
                canonicalUrl: matchedUrl,
                title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊𝙐𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂', 
                description: `✦ ¿Necesitas algo, ${name}? Date prisa...`, 
                previewType: 'shadow',
                jpegThumbnail: thumbnailBuffer,
                contextInfo: {
                    mentionedJid: mentions,
                    quotedMessage: m.message,
                    participant: m.sender,
                    stanzaId: m.id,
                    remoteJid: m.chat,
                    isForwarded: true,
                    forwardingScore: 999,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid,
                        newsletterName,
                        serverMessageId: -1
                    }
                }
            }
        }, { quoted: m });
    };

    // Personalidad de Ellen Joe intacta
    let profileText = `🦈 *Expediente de Servicio: @${userId.split('@')[0]}*
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

_— Solo no me pidas nada más durante mi descanso..._ 🍭`.trim();

    // Lanzar el nuevo formato de respuesta externa
    await sendExternalMessage(profileText);
    await m.react('🦈');
};

handler.help = ['profile'];
handler.tags = ['rg'];
handler.command = ['profile', 'perfil'];

export default handler;

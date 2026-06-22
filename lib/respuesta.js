import fs from 'fs';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

const handler = async (type, conn, m, comando) => {
    const name = await conn.getName(m.sender);
    const matchedUrl = 'https://github.com/nevi-dev';

    const thumbnailBuffer = Buffer.isBuffer(global.icons)
        ? global.icons
        : (fs.existsSync(global.icons) ? fs.readFileSync(global.icons) : Buffer.from(global.icons, 'base64'));

    const sendExternalMessage = async (msgText) => {
        await conn.relayMessage(m.chat, {
            extendedTextMessage: {
                text: `${matchedUrl}\n\n${msgText}`,
                matchedText: matchedUrl,
                canonicalUrl: matchedUrl,
                title: '🦈 𝙑𝙄𝘾𝙏𝙊𝙍𝙄𝘼 𝙃𝙊参𝙎𝙀𝙆𝙀𝙀𝙋𝙄𝙉𝙂',
                description: `✦ ¿Necesitas algo, ${name}? Date prisa...`,
                previewType: 'shadow',
                jpegThumbnail: thumbnailBuffer,
                contextInfo: {
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

    try {
        const frasesEllen = {
            rowner: `『🦈』¿Intentando usar *${comando}*? Solo mi Creador puede tocar mi cola de tiburón. Aléjate.`,
            owner: `『⚙️』Comando exclusivo para Owners. No insistas, tengo un batido que terminar. 🙄`,
            mods: `『🔌』¿Permisos para *${comando}*? Solo mis Moderadores. Tú no estás en la lista. 😏`,
            premium: `『🌟』¿Quieres atención especial? Paga el servicio Premium. No trabajo gratis. 💅`,
            group: `『🫂』Qué pesado... *${comando}* es solo para grupos. Baka~`,
            private: `『🏠』Este comando es para chats privados. No hagas ruido aquí. 😒`,
            admin: `『👑』Solo los Admins pueden usar *${comando}*. Tú eres un cliente más. 💁‍♀️`,
            botAdmin: `『🚫』¿Cómo lo ejecuto si no soy Admin? Dame los permisos. 🤨`,
            unreg: `『📝』Regístrate con: *#reg Nombre.Edad* antes de pedirme algo. 😈`,
            restrict: `『⛔』Función restringida. Ni con un aumento te dejaría usar *${comando}*.`
        };

        const msgText = frasesEllen[type] || `『🦈』Lo siento, no tienes permiso para ejecutar *${comando}*.`;
        await sendExternalMessage(msgText);
        await m.react('✖️');
    } catch (e) {
        console.error('Error en Ellen External Message:', e);
    }
};

export default handler;

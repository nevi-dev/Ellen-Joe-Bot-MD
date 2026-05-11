import crypto from 'crypto';

const handler = async (type, conn, m, comando) => {
    const thumbnail = global.icons; // Tu Buffer real

    // --- GENERACIÓN DINÁMICA DE METADATOS ---
    const thumbnailSha256 = crypto.createHash('sha256').update(thumbnail).digest('base64');
    // Para el EncSha y MediaKey generamos valores derivados del buffer original
    const thumbnailEncSha256 = crypto.createHash('sha256').update(thumbnailSha256).digest('base64');
    const mediaKey = crypto.randomBytes(32).toString('base64');
    const timestamp = Math.floor(Date.now() / 1000);

    const frasesEllen = {
        rowner: `『🦈』¿Intentando usar *${comando}*? Solo mi Creador puede tocar mi cola de tiburón. Aléjate.\n\n${redes}`,
        owner: `『⚙️』Comando exclusivo para Owners. No insistas, tengo un batido que terminar. 🙄\n\n${redes}`,
        mods: `『🔌』¿Permisos para *${comando}*? Solo mis Moderadores. Tú no estás en la lista. 😏\n\n${redes}`,
        premium: `『🌟』¿Quieres atención especial? Paga el servicio Premium. No trabajo gratis. 💅\n\n${redes}`,
        group: `『🫂』Qué pesado... *${comando}* es solo para grupos. Baka~\n\n${redes}`,
        private: `『🏠』Este comando es para chats privados. No hagas ruido aquí. 😒\n\n${redes}`,
        admin: `『👑』Solo los Admins pueden usar *${comando}*. Tú eres un cliente más. 💁‍♀️\n\n${redes}`,
        botAdmin: `『🚫』¿Cómo lo ejecuto si no soy Admin? Dame los permisos. 🤨\n\n${redes}`,
        unreg: `『📝』Regístrate con: *#reg Nombre.Edad* antes de pedirme algo. 😈\n\n${redes}`,
        restrict: `『⛔』Función restringida. Ni con un aumento te dejaría usar *${comando}*.\n\n${redes}`
    };

    const msgText = frasesEllen[type];

    if (msgText) {
        const content = {
            extendedTextMessage: {
                text: msgText,
                matchedText: redes,
                description: "🦈 𝐄llen 𝐉ᴏ𝐄 - 𝐒ervice Status: 𝐃enied",
                title: packname,
                previewType: 0,
                jpegThumbnail: thumbnail,
                endCardTiles: [],
                contextInfo: {
                    mentionedJid: [m.sender],
                    isForwarded: true,
                    forwardingScore: 999,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid,
                        newsletterName,
                        serverMessageId: -1
                    },
                    expiration: 604800,
                    disappearingMode: { initiator: 0, trigger: 0 }
                },
                // METADATOS GENERADOS DINÁMICAMENTE
                thumbnailDirectPath: `/v/t62.36144-24/ellen_joe_${timestamp}.enc`,
                thumbnailSha256: thumbnailSha256,
                thumbnailEncSha256: thumbnailEncSha256,
                mediaKey: mediaKey,
                mediaKeyTimestamp: timestamp,
                thumbnailHeight: 720,
                thumbnailWidth: 1280,
                inviteLinkGroupTypeV2: 0,
                faviconMMSMetadata: {
                    thumbnailDirectPath: `/v/t62.36144-24/favicon_${timestamp}.enc`,
                    thumbnailSha256: thumbnailSha256,
                    thumbnailEncSha256: thumbnailEncSha256,
                    mediaKey: mediaKey,
                    mediaKeyTimestamp: timestamp,
                    thumbnailHeight: 48,
                    thumbnailWidth: 48
                }
            },
            messageContextInfo: {
                threadId: [],
                messageSecret: crypto.randomBytes(32).toString('base64')
            }
        };

        await conn.relayMessage(m.chat, content, { quoted: m });
        return m.react('✖️');
    }
};

export default handler;

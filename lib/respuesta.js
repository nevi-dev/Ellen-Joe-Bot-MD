import crypto from 'crypto';

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';
const packname = '˚🄴🄻🄼🄴🄽-🄹🄾🄴-🄱🄾🅃';
const redes = 'https://github.com/nevi-dev';

const handler = async (type, conn, m, comando) => {
    const thumbnail = global.icons; // Tu Buffer

    // --- SUBIDA REAL AL SERVIDOR ---
    // Esto genera los datos para que WhatsApp no la muestre borrosa
    const upload = await conn.waUploadToServer(thumbnail, { newsletter: true });
    const thumbnailDirectPath = upload.directPath;
    const mediaKey = upload.mediaKey.toString('base64');
    const thumbnailSha256 = crypto.createHash('sha256').update(thumbnail).digest('base64');
    const timestamp = Math.floor(Date.now() / 1000);

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

    const msgText = frasesEllen[type];

    if (msgText) {
        const content = {
            extendedTextMessage: {
                text: msgText,
                matchedText: redes,
                description: "🦈 Ellen JoE - Service Status: Denied",
                title: packname,
                previewType: 0,
                jpegThumbnail: thumbnail,
                contextInfo: {
                    mentionedJid: [m.sender],
                    isForwarded: true,
                    forwardingScore: 999,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid,
                        newsletterName,
                        serverMessageId: -1
                    },
                    expiration: 604800
                },
                // METADATOS DE SUBIDA (Sin externalAdReply)
                thumbnailDirectPath: thumbnailDirectPath,
                thumbnailSha256: thumbnailSha256,
                mediaKey: mediaKey,
                mediaKeyTimestamp: timestamp,
                thumbnailHeight: 400, // Ajusta para que sea pequeña
                thumbnailWidth: 400
            }
        };

        // Responde directamente al usuario con el mensaje "subido"
        await conn.relayMessage(m.chat, content, { quoted: m });
        return m.react('✖️');
    }
};

export default handler;

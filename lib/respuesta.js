// --- CONFIGURACIÓN ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';
const packname = '˚🄴🄻🄼🄴🄽-🄹🄾🄴-🄱🄾🅃';
const redes = 'https://github.com/nevi-dev';

const handler = async (type, conn, m, comando) => {
    // Usamos el buffer que ya tienes en global.icons
    const thumbnail = global.icons; 

    const msgText = {
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
    }[type];

    if (msgText) {
        const content = {
            extendedTextMessage: {
                text: msgText,
                matchedText: redes,
                description: "🦈 ¡SERVICIO DENEGADO! 🦈",
                title: packname,
                previewType: 0,
                jpegThumbnail: thumbnail, // AQUÍ SE PONE TU IMAGEN (BUFFER)
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
                    disappearingMode: {
                        initiator: 0,
                        trigger: 0
                    }
                },
                // Estos valores mantienen el estilo de tarjeta pequeña/Pinterest
                thumbnailDirectPath: "/v/t62.36144-24/ellen_joe_assets.enc",
                thumbnailSha256: "KBkGtghySXYLecL4RJFHheaYyH+0Ic99Z1EPmYkAU84=",
                thumbnailEncSha256: "FjrEEM0hHIRhCmsh+hywbhY7G/pB7PtNFIzZhbb5tk0=",
                mediaKey: "BozvAkzWZGsnLqsz3yXhUY7rNxKvW0iO+68uP60PtaI=",
                mediaKeyTimestamp: 1769908520,
                thumbnailHeight: 500,
                thumbnailWidth: 500,
                inviteLinkGroupTypeV2: 0,
                faviconMMSMetadata: {
                    thumbnailDirectPath: "/v/t62.36144-24/ellen_joe_fav.enc",
                    thumbnailSha256: "mbRZf1uTEgmarC3L6SuVL8/aLSAwwS07ssk0ylftG8Q=",
                    thumbnailEncSha256: "RTBZoTwbf4m2+PhLVF5q8C4VIRqERdYKlIjNdXjTAac=",
                    mediaKey: "6wMz3YJhWi8eoQwruCtzMdI9KqWQxt7QQFf3ZkahbtI=",
                    mediaKeyTimestamp: 1769908520,
                    thumbnailHeight: 48,
                    thumbnailWidth: 48
                }
            },
            messageContextInfo: {
                threadId: [],
                messageSecret: "XD+sGXtADb85pzQH2vQKS5Q9InUdcY6nS/y7QC963Xg="
            }
        };

        const relayOption = {};

        // Enviar el mensaje con tus iconos y el estilo Pinterest
        await conn.relayMessage(m.chat, content, relayOption);
        return m.react('✖️');
    }
    return true;
};

export default handler;

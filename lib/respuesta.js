// --- VALORES NECESARIOS ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';
const packname = '˚🄴🄻🄼🄴🄽-🄹🄾🄴-🄱🄾🅃';
const redes = 'https://github.com/nevi-dev'; 

/**
 * Plugin centralizado para manejar mensajes de error de permisos con relayMessage (Estilo Pinterest).
 */
const handler = async (type, conn, m, comando) => {
    // Se asume que 'icons' es el base64 de la imagen
    const thumbnail = global.icons ? Buffer.from(global.icons, 'base64') : null;

    const msgText = {
        rowner: `『🦈』¿Intentando usar *${comando}*? Solo mi Creador puede tocar mi cola de tiburón, y tú definitivamente no eres él. Aléjate.`,
        owner: `『⚙️』Ese comando es exclusivo para la gerencia (Owners). No insistas, tengo un batido que terminar. 🙄`,
        mods: `『🔌』¿Permisos para *${comando}*? Solo mis Moderadores autorizados. Tú no estás en la lista. 😏`,
        premium: `『🌟』¿Quieres atención especial con *${comando}*? Paga el servicio Premium. No trabajo gratis fuera de mi horario. 💅`,
        group: `『🫂』Qué pesado... *${comando}* es solo para grupos. No me busques en privado para esto. Baka~`,
        private: `『🏠』Este comando es para chats privados. No hagas ruido aquí en el grupo, es molesto. 😒`,
        admin: `『👑』Solo los Admins que mantienen el orden pueden usar *${comando}*. Tú solo eres un cliente más, espera tu turno. 💁‍♀️`,
        botAdmin: `『🚫』¿Cómo esperas que ejecute *${comando}* si no soy Admin? Dame los permisos de una vez. 🤨`,
        unreg: `『📝』Ni siquiera tienes un contrato firmado. Regístrate con: *#reg Nombre.Edad* antes de pedirme algo. 😈`,
        restrict: `『⛔』Función restringida. Ni con un aumento de sueldo te dejaría usar *${comando}*. ¡Next! 😜`
    }[type];

    if (msgText) {
        const content = {
            extendedTextMessage: {
                text: msgText,
                matchedText: global.redes,
                description: "🦈 ¡SERVICIO DENEGADO! 🦈",
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
                    expiration: 604800,
                    disappearingMode: {
                        initiator: 0,
                        trigger: 0
                    }
                }
            }
        };

        // Enviar el mensaje usando relayMessage sin el externalAdReply anterior
        await conn.relayMessage(m.chat, content, { quoted: m });
        
        // Reacción de error
        return m.react('✖️');
    }
    return true;
};

export default handler;

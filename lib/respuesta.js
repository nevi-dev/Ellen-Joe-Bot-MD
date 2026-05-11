// --- CONFIGURACIÓN DE ELLEN ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';
const packname = '˚🄴🄻🄼🄴🄽-🄹🄾🄴-🄱🄾🅃';
const redes = 'https://github.com/nevi-dev'; 

/**
 * Manejador de errores usando la estructura de tarjeta pequeña (externalAdReply).
 */
const handler = async (type, conn, m, comando) => {
    // Usamos el buffer directamente de tus iconos
    const thumbBuffer = global.icons; 

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
        await conn.reply(m.chat, msgText, m, { 
            contextInfo: { 
                isForwarded: true, 
                forwardingScore: 999, 
                forwardedNewsletterMessageInfo: { 
                    newsletterJid: newsletterJid, 
                    newsletterName: newsletterName, 
                    serverMessageId: -1 
                }, 
                externalAdReply: { 
                    title: packname, 
                    body: '🦈 ¡SERVICIO DENEGADO! 🦈', 
                    mediaType: 1, 
                    thumbnail: thumbBuffer, 
                    renderLargerThumbnail: false, // CLAVE: Tarjeta pequeña
                    mediaUrl: redes, 
                    sourceUrl: redes 
                } 
            } 
        });

        return m.react('✖️');
    }
    return true;
};

export default handler;

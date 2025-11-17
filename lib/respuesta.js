// --- VALORES NECESARIOS PARA LA NUEVA FUNCIONALIDAD ---
// Estos valores se han añadido para recrear la funcionalidad que pediste.
// Asegúrate de que las variables como 'redes' y 'miniaturaRandom' se adapten a tu bot.
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏᴇ\'s 𝐒ervice';
const packname = '˚🄴🄻🄻🄴🄽-🄹🄾🄴-🄱🄾🅃';

/**
 * Plugin centralizado para manejar todos los mensajes de error de permisos.
 * @param {string} type - El tipo de error (ej. 'admin', 'owner', 'unreg').
 * @param {object} conn - La conexión del bot.
 * @param {object} m - El objeto del mensaje.
 * @param {string} comando - El nombre del comando que se intentó usar.
 */
const handler = (type, conn, m, comando) => {
    // Objeto con todos los posibles mensajes de error (¡Ahora temáticos y con la personalidad de Ellen Joe!).
    const msg = {
        rowner: `『❄️』¿Intentando ser el Santa Secreto y usar *${comando}*? ¡Solo mi Creador tiene la llave de mi trineo! 🤭 ¡Feliz No-Navidad!`,
        owner: `『🎄』¿Creíste que el Grinch te daría permiso para *${comando}*? Soy Ellen Joe, no un elfo. ¡Este es solo para mis desarrolladores! 🙄`,
        mods: `『🎁』¡Alto ahí, pequeño reno! *${comando}* es solo para mis Mod-Padrinos. Tú no tienes ese espíritu navideño (ni permisos). 😏`,
        premium: `『🌟』¿Esperas regalos VIP usando *${comando}*? Jajaja. ¡Solo los Premium tienen acceso a las galletas navideñas de mi cocina! Tú, ni carbón. 💅`,
        group: `『🫂』¡Qué aburrido eres! *${comando}* necesita el espíritu de grupo. Vete a compartir la sidra con tus amigos, no lo uses en mi DM. Baka~`,
        private: `『🏠』¡Intruso! *${comando}* es para la privacidad de mi casa (grupos). ¡Vuelve a las luces de la calle! 😒`,
        admin: `『👑』*${comando}* es solo para los Admins que adornan el árbol. Tú, en cambio, solo sirves para colgar en él. No toques nada. 💁‍♀️`,
        botAdmin: `『🚫』¡Usa tu magia de Navidad y dame permisos! ¿Cómo quieres que ejecute *${comando}* si soy un simple juguete sin batería? ¡Admin ya! 🤨`,
        unreg: `『📝』¡Descarado! ¿Intentas abrir tus regalos de *${comando}* sin firmar la tarjeta? ¡Regístrate ya con: *#reg Ellen-Joe.19* o Santa te ignora! 😈`,
        restrict: `『⛔』¡Sorpresa! Esta función está *encadenada* como un adorno roto. Ni todo el espíritu navideño del mundo te dejará usarla. ¡Next! 😜`
    }[type];

    // Si se encontró un mensaje para el 'type' dado, se envía.
    if (msg) {
        // --- CONSTRUCCIÓN DEL CONTEXTINFO ---
        // Aquí se crea el objeto con la apariencia de reenviado de canal y el anuncio externo.
        const contextInfo = {
            mentionedJid: [m.sender],
            isForwarded: true,
            forwardingScore: 999,
            forwardedNewsletterMessageInfo: {
                newsletterJid,
                newsletterName,
                serverMessageId: -1
            },
            externalAdReply: {
                title: packname,
                body: '🦈 ¡Acceso Denegado! 🎄', // Actualicé el body para darle un toque navideño
                thumbnailUrl: icons,
                sourceUrl: redes,
                mediaType: 1,
                renderLargerThumbnail: false
            }
        };

        // Se envía el mensaje de error utilizando el contextInfo creado.
        return conn.reply(m.chat, msg, m, { contextInfo }).then(_ => m.react('✖️'));
    }
    return true; // Devuelve true si no hay mensaje, para seguir el flujo si es necesario.
};

// Exportamos la función para poder importarla desde handler.js
export default handler;

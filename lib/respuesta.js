const handler = async (type, conn, m, comando) => {
    const thumbnail = global.icons; // Tu Buffer de Ellen

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

    if (msgText) {
        const content = {
            extendedTextMessage: {
                text: msgText,
                matchedText: redes,
                description: "🦈 ¡SERVICIO DENEGADO! 🦈",
                title: packname,
                previewType: 0, 
                jpegThumbnail: thumbnail, // Única fuente de imagen
                contextInfo: {
                    mentionedJid: [m.sender],
                    isForwarded: true,
                    forwardingScore: 999,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid,
                        newsletterName,
                        serverMessageId: -1
                    }
                }
            }
        };

        // Eliminamos los SHA y directPath del ejemplo que causan el bug visual
        await conn.relayMessage(m.chat, content, { quoted: m });
        return m.react('✖️');
    }
}

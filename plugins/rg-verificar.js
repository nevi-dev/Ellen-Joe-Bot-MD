import { createHash } from 'crypto';
import fetch from 'node-fetch';
import moment from 'moment-timezone';
import fs from 'fs';

// Expresión regular para capturar Nombre y Edad
let Reg = /\|?(.*)([.|] *?)([0-9]*)$/i

let handler = async function (m, { conn, text, args, usedPrefix, command }) {
    let user = global.db.data.users[m.sender]
    let name2 = conn.getName(m.sender)
    let name = name2 // Fallback inicial para el remitente
    let whe = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : m.sender

    // --- CONFIGURACIÓN DEL MENSAJE EXTERNO DE VICTORIA HOUSEKEEPING ---
    const matchedUrl = 'https://github.com/nevi-dev';

    // Conversión segura de global.icons a Buffer binario para el jpegThumbnail
    // --- OBTENCIÓN DINÁMICA DE MINIATURA (Foto de perfil o Ellen fallback) ---
    let thumbnailBuffer;
    try {
        // Intentamos obtener la URL de la foto de perfil del usuario (o el objetivo 'whe')
        const profileImgUrl = await conn.profilePictureUrl(whe, 'image').catch(() => null);
        
        if (profileImgUrl) {
            // Si tiene foto, la descargamos y la convertimos en Buffer
            const response = await fetch(profileImgUrl);
            thumbnailBuffer = Buffer.from(await response.arrayBuffer());
        } else {
            // Si no tiene foto de perfil, forzamos el lanzamiento al bloque catch para usar global.icons
            throw new Error('No profile picture');
        }
    } catch {
        // FALLBACK: Si falla o no tiene foto, procesamos global.icons de forma segura
        thumbnailBuffer = Buffer.isBuffer(global.icons) 
            ? global.icons 
            : (fs.existsSync(global.icons) ? fs.readFileSync(global.icons) : Buffer.from(global.icons, 'base64'));
    }

    // Función unificada para responder con la estética de Ellen Joe
    const sendExternalMessage = async (msgText) => {
        // Variables requeridas por el newsletter de tu bot
        const newsletterJid = global.newsletterJid || '120363198533816654@newsletter';
        const newsletterName = global.newsletterName || 'Ellen Joe Bot Updates 🦈';

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

    // 1. Mensaje de Usuario ya registrado
    if (user.registered === true) {
        return sendExternalMessage(`*『🎄』Ya estás en el sistema. No me interesa tu doble registro. Usa #unreg si quieres reiniciar y perderlo todo.*`)
    }

    // 2. Error de formato
    if (!Reg.test(text)) {
        return sendExternalMessage(`*『🦈』¡Aprende a seguir las instrucciones! El comando ingresado es incorrecto, úsalo así:*\n\n#reg *Nombre.edad*\n\n\`\`\`Ejemplo:\`\`\`\n#reg *${name2}.18*`)
    }

    let [_, parsedName, splitter, age] = text.match(Reg)
    name = parsedName.trim() // Actualizamos 'name' con el nombre real del registro para el external reply
    
    // 3. Errores de datos en el registro
    if (!name) return sendExternalMessage('*『✦』¡Sin nombre no hay negocio! El nombre es obligatorio. Inténtelo de nuevo.*')
    if (!age) return sendExternalMessage('*『✦』¡La edad es obligatoria para tu expediente! Inténtelo de nuevo.*')
    if (name.length > 30) return sendExternalMessage('*『✦』Tu nombre es demasiado largo. No tengo tiempo para leer novelas. Máximo 30 caracteres.*')

    age = parseInt(age)
    if (age > 1000 || age < 5) return sendExternalMessage('⏤͟͟͞͞𝑳𝒂 𝑬𝒅𝒂𝒅 𝒊𝒏𝒈𝒓𝒆𝒔𝒂𝒅𝒂 𝑬𝒔 𝒊𝒏𝒄𝒐𝒓𝒓𝒆𝒄𝒕𝒂⏤͟͟͞͞')

    // --- PROCESAMIENTO DEL REGISTRO EXITOSO ---
    user.name = name
    user.age = age
    user.regTime = +new Date
    user.registered = true
    
    // Asignación de recompensas en la base de datos
    global.db.data.users[m.sender].money += 600
    global.db.data.users[m.sender].estrellas += 10
    global.db.data.users[m.sender].exp += 245
    global.db.data.users[m.sender].joincount += 5    

    let sn = createHash('md5').update(m.sender).digest('hex');
    let moneda = '💸'
    
    // Cuerpo del mensaje de éxito adaptado
    let regbot = `╭══• ೋ•✧๑♡๑✧•ೋ •══╮
*🦈 ¡INVENTARIO ADQUIRIDO! 🎄*
╰══• ೋ•✧๑♡๑✧•ೋ •══╯
║
║ ֪ ׂ⛓️ ̶ 𝐍𝐨𝐦𝐛𝐫𝐞: ${name}
║ ֪ ׁ🌫️ 𝐄𝐝𝐚𝐝: ${age} años
║
║ ¡Bienvenido/a a la nómina de Ellen Joe!
║ 📝 Usa *.menu* si crees que eres útil.
║
║ ✨ 𝗥𝗲𝗰𝗼𝗺𝗽𝗲𝗻𝘀𝗮𝘀 𝗣𝗼𝗿 🇮𝗻𝗴𝗿𝗲𝘀𝗼:
║ • ${moneda} » 600
║ • Experiencia » 245 🪙
║ • Tokens » 10 💸
╚═══════════════════════
> 『🦈』¡No me hagas arrepentirme de esta inversión!`;

    // Mandar el mensaje final con el formato external link limpio
    await sendExternalMessage(regbot);
    await m.react('✅');
};

handler.help = ['reg']
handler.tags = ['rg']
handler.command = ['verify', 'verificar', 'reg', 'register', 'registrar']

export default handler;

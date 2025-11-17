import { createHash } from 'crypto';
import fetch from 'node-fetch';
import moment from 'moment-timezone';

// Expresión regular para capturar Nombre y Edad
let Reg = /\|?(.*)([.|] *?)([0-9]*)$/i

let handler = async function (m, { conn, text, args, usedPrefix, command }) {
    let user = global.db.data.users[m.sender]
    let name2 = conn.getName(m.sender)
    let whe = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : m.sender
    let perfil = await conn.profilePictureUrl(whe, 'image').catch(_ => 'https://qu.ax/FGSG.jpg') // Mantengo esta línea por si se usa 'perfil' en el externalAdReply

    // Mensaje de Usuario ya registrado (Ellen Joe: Desinteresada)
    if (user.registered === true) {
        return m.reply(`*『🎄』Ya estás en el sistema. No me interesa tu doble registro. Usa #unreg si quieres reiniciar y perderlo todo.*`)
    }

    // Error de formato (Ellen Joe: Despectiva)
    if (!Reg.test(text)) return m.reply(`*『🦈』¡Aprende a seguir las instrucciones! El comando ingresado es incorrecto, úsalo así:*\n\n#reg *Nombre.edad*\n\n\`\`\`Ejemplo:\`\`\`\n#reg *${name2}.18*`)

    let [_, name, splitter, age] = text.match(Reg)
    
    // Errores de datos
    if (!name) return m.reply('*『✦』¡Sin nombre no hay negocio! El nombre es obligatorio. Inténtelo de nuevo.*')
    if (!age) return m.reply('*『✦』¡La edad es obligatoria para tu expediente! Inténtelo de nuevo.*')
    if (name.length > 30) return m.reply('*『✦』Tu nombre es demasiado largo. No tengo tiempo para leer novelas. Máximo 30 caracteres.*')

    age = parseInt(age)
    if (age > 1000 || age < 5) return m.reply('⏤͟͟͞͞𝑳𝒂 𝑬𝒅𝒂𝒅 𝒊𝒏𝒈𝒓𝒆𝒔𝒂𝒅𝒂 𝑬𝒔 𝒊𝒏𝒄𝒐𝒓𝒓𝒆𝒄𝒕𝒂⏤͟͟͞͞')

    // --- REGISTRO EXITOSO ---
    user.name = name.trim()
    user.age = age
    user.regTime = +new Date
    user.registered = true
    
    // Recompensas
    global.db.data.users[m.sender].money += 600
    global.db.data.users[m.sender].estrellas += 10
    global.db.data.users[m.sender].exp += 245
    global.db.data.users[m.sender].joincount += 5    

    let sn = createHash('md5').update(m.sender).digest('hex');
    let moneda = '💸'
    
    // Mensaje de respuesta (Ellen Joe: Confirmando la adquisición)
    let regbot = `
╭══• ೋ•✧๑♡๑✧•ೋ •══╮
*🦈 ¡INVENTARIO ADQUIRIDO! 🎄*
╰══• ೋ•✧๑♡๑✧•ೋ •══╯
║
║ ֪ ׂ⛓️ ̶ 𝐍𝐨𝐦𝐛𝐫𝐞: ${name}
║ ֪ ׁ🌫️ 𝐄𝐝𝐚𝐝: ${age} años
║
║ ¡Bienvenido/a a la nómina de Ellen Joe!
║ 📝 Usa *.menu* si crees que eres útil.
║
║ ✨ 𝗥𝗲𝗰𝗼𝗺𝗽𝗲𝗻𝘀𝗮𝘀 𝗣𝗼𝗿 𝗜𝗻𝗴𝗿𝗲𝘀𝗼:
║ • ${moneda} » 600
║ • Experiencia » 245 🪙
║ • Tokens » 10 💸
╚═══════════════════════
> 『🦈』¡No me hagas arrepentirme de esta inversión!
`;

    await conn.sendMessage(m.chat, {
        text: regbot,
        contextInfo: {
            externalAdReply: {
                title: '⊱『✅𝆺𝅥 ADQUISICIÓN COMPLETADA 𝆹𝅥✅』⊰',
                thumbnailUrl: icons, // Asegúrate que 'icons' esté definido globalmente
                mediaType: 1,
                body: '¡Empieza a ganar valor con *.menu*!',
            }
        }
    }, { quoted: m });

    // --- SE ELIMINÓ LA LÓGICA DE ENVÍO AL CANAL ---
};

handler.help = ['reg']
handler.tags = ['rg']
handler.command = ['verify', 'verificar', 'reg', 'register', 'registrar']

export default handler;

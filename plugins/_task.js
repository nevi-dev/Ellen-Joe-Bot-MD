import { promises as fs } from 'fs'
import path from 'path'

const charactersFilePath = path.join(process.cwd(), './src/database/characters.json');
const SUPER_ADMIN = '18096758983'; 
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

function normalizeName(text) {
    return text.trim().toLowerCase().replace(/-/g, ' ');
}

let handler = async (m, { conn, args, isOwner, usedPrefix, command }) => {
    // 1. Lógica para procesar la CONFIRMACIÓN (Cuando se presiona el botón)
    if (args[0] === 'confirmar_yoshy') {
        const isSuperAdmin = m.sender.split('@')[0] === SUPER_ADMIN;
        if (!isSuperAdmin) return m.reply('*— Tsk.* Solo mi jefe real puede tocar ese botón.');

        const type = args[1]; // 'reset', 'all' o 'no'
        const target = args[2]; // JID si es transferencia

        if (type === 'no') return m.reply('*— Lo sabía.* Solicitud cancelada. No me vuelvas a despertar.');

        // Ejecutar lógica de base de datos
        await executeLogic(m, conn, charactersFilePath, type === 'reset', type === 'all', target, []);
        return;
    }

    // 2. Verificación inicial de Owner
    if (!isOwner) return m.reply('*— (Bostezo)*... Solo mi jefe puede pedirme estas cosas. No me molestes.');

    const senderNumber = m.sender.split('@')[0];
    const adminJid = SUPER_ADMIN + '@s.whatsapp.net';

    let targetJID;
    let characterNames = [];
    let transferAll = false;
    let resetAll = false;

    // 3. Parsing de argumentos
    if (m.quoted) {
        targetJID = m.quoted.sender;
        characterNames = args;
    } else {
        if (args[0]?.toLowerCase() === 'reset') {
            resetAll = true;
        } else {
            if (args.length < 2) return m.reply('*— Tsk.* Pon el nombre y el número. Qué poca eficiencia...');
            targetJID = args[args.length - 1].includes('@') ? args[args.length - 1] : args[args.length - 1] + '@s.whatsapp.net';
            characterNames = args.slice(0, args.length - 1);
        }
    }

    if (!resetAll && characterNames[0]?.toLowerCase() === 'all') transferAll = true;

    // 4. MODO MASIVO: Enviar Botones
    if (resetAll || transferAll) {
        const actionType = resetAll ? 'RESETEAR TODA LA DB' : 'TRANSFERENCIA MASIVA';
        const typeArg = resetAll ? 'reset' : 'all';
        
        // El ID del botón será el comando que el bot recibirá de vuelta
        const buttons = [
            { buttonId: `${usedPrefix}${command} confirmar_yoshy ${typeArg} ${targetJID || ''}`, buttonText: { displayText: '✅ ACEPTAR' }, type: 1 },
            { buttonId: `${usedPrefix}${command} confirmar_yoshy no`, buttonText: { displayText: '❌ RECHAZAR' }, type: 1 }
        ];

        const caption = `
┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪۪۪۪۪ٜ݊᷼⁔᮫ּׅ̫ׄ࣪︵᮫ּ๋ׅׅ۪۪۪۪ׅ࣪࣪͡⌒🌀𔗨⃪̤̤̤ٜ۫۫۫҈҈҈҈҉҉᷒ᰰ꤬۫۫۫𔗨̤̤̤𐇽─۪۪۪۪ٜ᷼┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪݊᷼
₊‧꒰ 🦈 ꒱ 𝐄𝐋𝐋𝐄𝐍 𝐉𝐎𝐄 𝐒𝐄𝐑𝐕𝐈𝐂𝐄 — 𝐀𝐋𝐄𝐑𝐓𝐀 ✧˖°
︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶    ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶    ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶

> ૢ⃘꒰⚠️⃝︩֟፝ *Acción:* ${actionType}
> ૢ⃘꒰👤⃝︩֟፝ *Solicita:* @${senderNumber}
> ૢ⃘꒰🦈⃝︩֟፝ *Destino:* ${resetAll ? 'LIMPIEZA TOTAL' : '@' + targetJID.split('@')[0]}

*— Oye @${SUPER_ADMIN}, ¿realmente quieres que haga esto? Elige abajo.*
⌣᮫ֶุ࣪ᷭ⌣〫᪲꒡᳝۪︶᮫໋࣭〭〫𝆬࣪࣪𝆬࣪꒡ֶ〪࣪ ׅ۫ெ᮫〪⃨〫〫᪲࣪˚̥ׅ੭ֶ֟ৎ᮫໋ׅ̣𝆬  ּ֢̊࣪⡠᮫ ໋🦈᮫ุ〪〪〫〫ᷭ ݄࣪⢄ꠋּ֢ ࣪ ֶׅ੭ֶ̣֟ৎ᮫˚̥࣪ெ᮫〪〪⃨〫᪲ ࣪꒡᮫໋〭࣪𝆬࣪︶〪᳝۪ꠋּ꒡ׅ⌣᮫ֶ࣪᪲⌣᮫ุ᳝〫֩ᷭ`;

        return await conn.sendMessage(m.chat, {
            image: icons, // Usa tu variable global de iconos
            caption,
            footer: 'Victoria Housekeeping Service',
            buttons,
            headerType: 4,
            contextInfo: {
                mentionedJid: [adminJid, m.sender, targetJID].filter(Boolean),
                forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
            }
        }, { quoted: m });
    }

    // 5. MODO NORMAL (Sin botones)
    await executeLogic(m, conn, charactersFilePath, false, false, targetJID, characterNames);
}

async function executeLogic(m, conn, pathFile, resetAll, transferAll, targetJID, characterNames) {
    try {
        const data = await fs.readFile(pathFile, 'utf-8');
        let characters = JSON.parse(data);
        let count = 0;
        const normalizedNames = characterNames.map(normalizeName);

        characters = characters.map(char => {
            const normDBName = normalizeName(char.name);
            if (resetAll) {
                if (char.user || char.protectionUntil) {
                    char.user = "";
                    char.status = "Libre";
                    char.protectionUntil = 0;
                    count++;
                }
            } else if (transferAll || normalizedNames.includes(normDBName)) {
                if (char.user !== targetJID) {
                    char.user = targetJID;
                    char.status = 'Reclamado';
                    count++;
                }
            }
            return char;
        });

        if (count > 0) await fs.writeFile(pathFile, JSON.stringify(characters, null, 2));

        const resMsg = resetAll 
            ? `*— (Bostezo)...* Turno terminado. He liberado a ${count} personajes y destruido sus escudos.`
            : `*— Ya está.* Se transfirieron ${count} personajes. No me pidas nada más por hoy.`;

        return conn.reply(m.chat, resMsg, m, {
            contextInfo: {
                mentionedJid: [targetJID].filter(Boolean),
                forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
            }
        });
    } catch (e) {
        console.error(e);
        return m.reply('*— Tsk.* Algo salió mal con el archivo. Qué pereza...');
    }
}

handler.command = ['yoshy'];
handler.rowner = true; 
export default handler;

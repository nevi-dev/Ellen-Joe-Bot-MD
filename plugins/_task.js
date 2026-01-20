import { promises as fs } from 'fs'
import path from 'path'

const charactersFilePath = path.join(process.cwd(), './src/database/characters.json');
const SUPER_ADMIN = '18096758983'; 
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

function normalizeName(text) {
    return text.trim().toLowerCase().replace(/-/g, ' ');
}

let handler = async (m, { conn, args, isOwner, usedPrefix }) => {
    if (!isOwner) return m.reply('*— (Bostezo)*... Solo mi jefe puede pedirme estas cosas. No me molestes.');

    const name = conn.getName(m.sender);
    const senderNumber = m.sender.split('@')[0];
    const isSuperAdmin = senderNumber === SUPER_ADMIN;
    const adminJid = SUPER_ADMIN + '@s.whatsapp.net';

    let targetJID;
    let characterNames = [];
    let transferAll = false;
    let resetAll = false;

    // 1. Parsing de argumentos
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

    // 2. SISTEMA DE BOTONES ESTILO "PLAY"
    if (resetAll || transferAll) {
        const actionType = resetAll ? 'RESETEAR TODA LA DB' : 'TRANSFERENCIA MASIVA';
        
        const buttons = [
            { buttonId: `${usedPrefix}confirmar_yoshy si`, buttonText: { displayText: '✅ ACEPTAR' }, type: 1 },
            { buttonId: `${usedPrefix}confirmar_yoshy no`, buttonText: { displayText: '❌ RECHAZAR' }, type: 1 }
        ];

        const caption = `
┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪۪۪۪۪ٜ݊᷼⁔᮫ּׅ̫ׄ࣪︵᮫ּ๋ׅׅ۪۪۪۪ׅ࣪࣪͡⌒🌀𔗨⃪̤̤̤ٜ۫۫۫҈҈҈҈҉҉᷒ᰰ꤬۫۫۫𔗨̤̤̤𐇽─۪۪۪۪ٜ᷼┈۪۪۪۪۪۪۪۪ٜ̈᷼─۪۪۪۪ٜ࣪᷼┈۪۪۪۪݊᷼
₊‧꒰ 🦈 ꒱ 𝐄𝐋𝐋𝐄𝐍 𝐉𝐎𝐄 𝐒𝐄𝐑𝐕𝐈𝐂𝐄 — 𝐀𝐋𝐄𝐑𝐓𝐀 ✧˖°
︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶    ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶    ︶֟፝ᰳ࡛۪۪۪۪۪⏝̣ ͜͝ ۫۫۫۫۫۫︶

> ૢ⃘꒰⚠️⃝︩֟፝ *Acción:* ${actionType}
> ૢ⃘꒰👤⃝︩֟፝ *Solicita:* @${senderNumber}
> ૢ⃘꒰🦈⃝︩֟፝ *Destino:* ${resetAll ? 'LIMPIEZA TOTAL' : '@' + targetJID.split('@')[0]}

*— Oye @${SUPER_ADMIN}, ¿realmente quieres que haga este trabajo extra? Responde rápido.*
⌣᮫ֶุ࣪ᷭ⌣〫᪲꒡᳝۪︶᮫໋࣭〭〫𝆬࣪࣪𝆬࣪꒡ֶ〪࣪ ׅ۫ெ᮫〪⃨〫〫᪲࣪˚̥ׅ੭ֶ֟ৎ᮫໋ׅ̣𝆬  ּ֢̊࣪⡠᮫ ໋🦈᮫ุ〪〪〫〫ᷭ ݄࣪⢄ꠋּ֢ ࣪ ֶׅ੭ֶ̣֟ৎ᮫˚̥࣪ெ᮫〪〪⃨〫᪲ ࣪꒡᮫໋〭࣪𝆬࣪︶〪᳝۪ꠋּ꒡ׅ⌣᮫ֶ࣪᪲⌣᮫ุ᳝〫֩ᷭ`;

        await conn.sendMessage(m.chat, {
            image: icons, // Imagen de Ellen Joe
            caption,
            footer: 'Victoria Housekeeping Service',
            buttons,
            headerType: 4,
            contextInfo: {
                mentionedJid: [adminJid, m.sender, targetJID],
                forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
            }
        }, { quoted: m });

        // Colector para procesar el botón
        const collector = conn.createMessageCollector(m.chat, {
            filter: (v) => v.sender === adminJid && v.msg?.selectedButtonId?.includes('confirmar_yoshy'),
            time: 60000
        });

        collector.on('collect', async (v) => {
            const selection = v.msg.selectedButtonId.split(' ')[1];
            if (selection === 'no') {
                await conn.reply(m.chat, '*— Tsk.* Sabía que era una pérdida de tiempo. Solicitud cancelada.', v);
                return collector.stop();
            }

            if (selection === 'si') {
                collector.stop();
                await executeLogic(m, conn, charactersFilePath, resetAll, transferAll, targetJID, characterNames);
            }
        });

        return;
    }

    // Transferencia normal
    await executeLogic(m, conn, charactersFilePath, resetAll, transferAll, targetJID, characterNames);
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
            ? `*— (Bostezo)...* Listo. He vaciado la base de datos y mandé los escudos al desguace. ${count} personajes libres.`
            : `*— Ya está.* He movido ${count} personajes a la cuenta de ese usuario. No me pidas nada más.`;

        return conn.reply(m.chat, resMsg, m, {
            contextInfo: {
                mentionedJid: [targetJID],
                forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
            }
        });
    } catch (e) {
        return m.reply('*— Tsk.* Error interno. Qué molestia.');
    }
}

handler.command = ['yoshy'];
handler.rowner = true; 
export default handler;

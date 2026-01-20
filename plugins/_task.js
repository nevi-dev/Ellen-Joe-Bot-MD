import { promises as fs } from 'fs'
import path from 'path'

const charactersFilePath = path.join(process.cwd(), './src/database/characters.json');
const SUPER_ADMIN = '18096758983'; 
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

function normalizeName(text) {
    return text.trim().toLowerCase().replace(/-/g, ' ');
}

let handler = async (m, { conn, args, isOwner }) => {
    if (!isOwner) return m.reply('*— (Bostezo)*... Solo mi jefe puede pedirme estas cosas. No me molestes.');

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

    // 2. SISTEMA DE BOTONES PARA COMANDOS CRÍTICOS
    if (resetAll || transferAll) {
        const actionType = resetAll ? 'RESETEAR TODO' : 'TRANSFERIR TODO';
        
        // Construcción del mensaje con botones
        const buttons = [
            { buttonId: `confirm_yoshy_si`, buttonText: { displayText: '✅ Aceptar Solicitud' }, type: 1 },
            { buttonId: `confirm_yoshy_no`, buttonText: { displayText: '❌ Rechazar' }, type: 1 }
        ];

        const buttonMessage = {
            text: `⚠️ **𝐀𝐋𝐄𝐑𝐓𝐀 𝐃𝐄 𝐒𝐄𝐆𝐔𝐑𝐈𝐃𝐀𝐃**\n\n*— Oye, @${SUPER_ADMIN}...*\n@${senderNumber} quiere ejecutar: **${actionType}**.\n\n¿Realmente quieres que gaste energía en esto?`,
            footer: '— Victoria Housekeeping Service',
            buttons: buttons,
            headerType: 1,
            mentions: [adminJid, m.sender]
        };

        // Enviamos los botones
        const sentMsg = await conn.sendMessage(m.chat, buttonMessage, { quoted: m });

        // Colector de respuestas (espera el botón)
        const collector = conn.createMessageCollector(m.chat, {
            filter: (v) => v.quoted && v.quoted.id === sentMsg.id && v.sender === adminJid,
            time: 60000 // 1 minuto
        });

        collector.on('collect', async (v) => {
            const id = v.msg.selectedButtonId;
            if (id === 'confirm_yoshy_no') {
                await conn.reply(m.chat, '*— Menos mal.* Solicitud cancelada. Vuelvo a mi siesta.', v);
                return collector.stop();
            }

            if (id === 'confirm_yoshy_si') {
                collector.stop();
                await executeLogic(m, conn, charactersFilePath, resetAll, transferAll, targetJID, characterNames);
            }
        });

        return; // Detenemos la ejecución aquí hasta que el admin presione el botón
    }

    // Si no es masivo (es una transferencia normal), se ejecuta directo
    await executeLogic(m, conn, charactersFilePath, resetAll, transferAll, targetJID, characterNames);
}

// Función separada para procesar la lógica después de la aprobación
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
                    char.protectionUntil = 0; // Limpia escudos
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

        const response = resetAll 
            ? `*— Agh, listo.* He limpiado la base de datos. ${count} personajes liberados y sin escudos. No me hables en una hora.`
            : `🦈 **𝐄𝐋𝐋𝐄𝐍 𝐉𝐎𝐄 𝐒𝐄𝐑𝐕𝐈𝐂𝐄**\n\n*— Movimiento terminado.* He pasado **${count}** personajes a @${targetJID.split('@')[0]}. Hazlo legal la próxima.`;

        return conn.reply(m.chat, response, m, { 
            mentions: [targetJID],
            forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 } 
        });

    } catch (e) {
        return m.reply('*— Tsk.* Algo se rompió. Qué problemático...');
    }
}

handler.command = ['yoshy'];
handler.rowner = true; 
export default handler;

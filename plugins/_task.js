import { promises as fs } from 'fs'
import path from 'path'

const charactersFilePath = path.join(process.cwd(), './src/database/characters.json');

// --- CONFIGURACIÓN DE JEFES (SUPER ADMIN) ---
// Añade aquí los números que quieres que tengan poder total (sin @s.whatsapp.net)
const SUPER_ADMINS = ['18493873691', '16028790660']; 

const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ鯊 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

// Función para normalizar nombres (quita espacios, guiones y pasa a minúsculas)
function normalizeName(text) {
    if (!text) return "";
    return text.trim().toLowerCase().replace(/-/g, ' ');
}

let handler = async (m, { conn, args, isOwner, usedPrefix, command }) => {
    const senderNumber = m.sender.split('@')[0];
    const isSuperAdmin = SUPER_ADMINS.includes(senderNumber);

    // 1. Lógica para procesar la CONFIRMACIÓN (Botones)
    if (args[0] === 'confirmar_yoshy') {
        if (!isSuperAdmin) return m.reply('*— Tsk.* Solo mis jefes reales pueden tocar ese botón.');

        const type = args[1]; // 'reset' o 'all'
        const target = args[2]; // JID de destino

        if (type === 'no') return m.reply('*— Lo sabía.* Solicitud cancelada. No me vuelvas a despertar.');

        await executeLogic(m, conn, charactersFilePath, type === 'reset', type === 'all', target, []);
        return;
    }

    // 2. Verificación de permisos para el comando inicial
    if (!isOwner && !isSuperAdmin) return m.reply('*— (Bostezo)*... Solo mi jefe puede pedirme estas cosas.');

    let targetJID;
    let characterNames = [];
    let transferAll = false;
    let resetAll = false;

    // 3. Parsing de argumentos (Detectar si es respuesta a mensaje o texto directo)
    if (m.quoted) {
        targetJID = m.quoted.sender;
        characterNames = args; // Todos los argumentos son nombres de waifus
    } else {
        if (args[0]?.toLowerCase() === 'reset') {
            resetAll = true;
        } else {
            if (args.length < 2) return m.reply('*— Tsk.* Pon el nombre y el número. Qué poca eficiencia...');
            // El último argumento se asume que es el número/JID
            targetJID = args[args.length - 1].includes('@') ? args[args.length - 1] : args[args.length - 1] + '@s.whatsapp.net';
            characterNames = args.slice(0, args.length - 1);
        }
    }

    // Si el primer nombre es "all", activamos transferencia masiva
    if (!resetAll && characterNames[0]?.toLowerCase() === 'all') transferAll = true;

    // 4. MODO MASIVO: Enviar Botones de confirmación
    if (resetAll || transferAll) {
        const actionType = resetAll ? 'RESETEAR TODA LA DB' : 'TRANSFERENCIA MASIVA';
        const typeArg = resetAll ? 'reset' : 'all';

        const buttons = [
            { buttonId: `${usedPrefix}${command} confirmar_yoshy ${typeArg} ${targetJID || ''}`, buttonText: { displayText: '✅ ACEPTAR' }, type: 1 },
            { buttonId: `${usedPrefix}${command} confirmar_yoshy no`, buttonText: { displayText: '❌ RECHAZAR' }, type: 1 }
        ];

        const mentionAdmins = SUPER_ADMINS.map(num => num + '@s.whatsapp.net');
        const caption = `
₊‧꒰ 🦈 ꒱ 𝐄𝐋𝐋𝐄𝐍 𝐉𝐎𝐄 𝐒𝐄𝐑𝐕𝐈𝐂𝐄 — 𝐀𝐋𝐄𝐑𝐓𝐀 ✧˖°

> ૢ⃘꒰⚠️⃝︩֟፝ *Acción:* ${actionType}
> ૢ⃘꒰👤⃝︩֟፝ *Solicita:* @${senderNumber}
> ૢ⃘꒰🦈⃝︩֟፝ *Destino:* ${resetAll ? 'LIMPIEZA TOTAL' : '@' + targetJID.split('@')[0]}

*— Oigan jefes, ¿realmente quieren que haga esto? Confirmen abajo.*`;

        return await conn.sendMessage(m.chat, {
            text: caption,
            footer: 'Victoria Housekeeping Service',
            buttons,
            headerType: 1,
            contextInfo: {
                mentionedJid: [...mentionAdmins, m.sender, targetJID].filter(Boolean),
                forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
            }
        }, { quoted: m });
    }

    // 5. MODO NORMAL (Sin botones, ejecución directa para waifus específicas)
    await executeLogic(m, conn, charactersFilePath, false, false, targetJID, characterNames);
}

async function executeLogic(m, conn, pathFile, resetAll, transferAll, targetJID, characterNames) {
    try {
        const data = await fs.readFile(pathFile, 'utf-8');
        let characters = JSON.parse(data);
        let count = 0;
        
        // Normalizamos los nombres de waifus que el usuario escribió (todo a minúsculas)
        const normalizedInputNames = characterNames.map(name => normalizeName(name));

        characters = characters.map(char => {
            const charNameInDB = normalizeName(char.name);
            
            if (resetAll) {
                if (char.user || char.protectionUntil) {
                    char.user = "";
                    char.status = "Libre";
                    char.protectionUntil = 0;
                    count++;
                }
            } else if (transferAll || normalizedInputNames.includes(charNameInDB)) {
                // Si es transferencia masiva O el nombre normalizado coincide con la DB
                if (char.user !== targetJID) {
                    char.user = targetJID;
                    char.status = 'Reclamado';
                    count++;
                }
            }
            return char;
        });

        if (count > 0) {
            await fs.writeFile(pathFile, JSON.stringify(characters, null, 2));
        } else {
            return m.reply('*— Oye...* No encontré ningún personaje con esos nombres o ya los tiene ese usuario.');
        }

        const resMsg = resetAll 
            ? `*— (Bostezo)...* Turno terminado. He liberado a ${count} personajes.`
            : `*— Ya está.* Se transfirieron ${count} personajes correctamente.`;

        return conn.reply(m.chat, resMsg, m, {
            contextInfo: {
                mentionedJid: [targetJID].filter(Boolean),
                forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
            }
        });
    } catch (e) {
        console.error(e);
        return m.reply('*— Tsk.* Error al leer la base de datos.');
    }
}

handler.command = ['yoshy'];
handler.rowner = true; 
export default handler;

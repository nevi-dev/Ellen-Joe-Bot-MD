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
    // 1. Verificación de Rowner (Cualquier owner puede intentar usarlo)
    if (!isOwner) return m.reply('*— (Bostezo)*... Solo el dueño puede pedirme estas cosas. No me hagas perder el tiempo.');

    const senderNumber = m.sender.split('@')[0];
    const isSuperAdmin = senderNumber === SUPER_ADMIN;

    let targetJID;
    let characterNames = [];
    let transferAll = false;
    let resetAll = false;

    // 2. Parsear argumentos
    if (m.quoted) {
        targetJID = m.quoted.sender;
        characterNames = args;
    } else {
        if (args[0]?.toLowerCase() === 'reset') {
            resetAll = true;
        } else {
            if (args.length < 2) {
                return m.reply('*— Tsk.* Uso: `.yoshy <Nombre> <JID>`. O responde a alguien. Qué molestia...');
            }
            targetJID = args[args.length - 1].includes('@') ? args[args.length - 1] : args[args.length - 1] + '@s.whatsapp.net';
            characterNames = args.slice(0, args.length - 1);
        }
    }

    if (!resetAll && characterNames[0]?.toLowerCase() === 'all') transferAll = true;

    // 3. LOGICA DE APROBACIÓN PARA COMANDOS MASIVOS
    if (resetAll || transferAll) {
        const adminJid = SUPER_ADMIN + '@s.whatsapp.net';
        
        // Mensaje de solicitud para el Super Admin
        const confirmationMsg = `⚠️ **𝐒𝐎𝐋𝐈𝐂𝐈𝐓𝐔𝐃 𝐃𝐄 𝐀𝐋𝐓𝐎 𝐑𝐈𝐄𝐒𝐆𝐎**\n\n*— Oye, @${SUPER_ADMIN}...* El usuario @${senderNumber} quiere ejecutar un comando masivo (**${resetAll ? 'RESET' : 'TRANSFER ALL'}**).\n\n¿Tengo que trabajar tanto? Responde con "si" para aceptar o "no" para mandarlo a volar. Tienes 60 segundos.`;

        await conn.reply(m.chat, confirmationMsg, m, { mentions: [adminJid, m.sender] });

        // Esperar respuesta del Super Admin
        const filter = (res) => res.sender === adminJid && (res.text.toLowerCase() === 'si' || res.text.toLowerCase() === 'no');
        
        try {
            const response = await conn.waitEvent('messages.upsert', filter, 60000); // 60 segundos de espera
            if (response.text.toLowerCase() === 'no') {
                return m.reply('*— Lo imaginaba.* Solicitud rechazada. Voy a seguir con mi descanso.');
            }
            // Si dijo "si", continúa la ejecución
        } catch (e) {
            return m.reply('*— Me cansé de esperar.* El administrador no respondió, así que no haré nada.');
        }
    }

    // 4. Cargar base de datos
    let characters;
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8');
        characters = JSON.parse(data);
    } catch (e) {
        return m.reply('*— (Suspiro)*... Error con el archivo. Qué problemático.');
    }

    // 5. Procesar Cambios
    try {
        const normalizedNamesToFind = characterNames ? characterNames.map(normalizeName) : [];
        let count = 0;

        const updatedCharacters = characters.map(char => {
            const normDBName = normalizeName(char.name);

            if (resetAll) {
                if (char.user || char.protectionUntil) {
                    char.user = "";
                    char.status = "Libre";
                    char.protectionUntil = 0; // Quita escudos
                    count++;
                }
            } else if (transferAll || normalizedNamesToFind.includes(normDBName)) {
                if (char.user !== targetJID) {
                    char.user = targetJID;
                    char.status = 'Reclamado';
                    count++;
                }
            }
            return char;
        });

        // 6. Guardar si hubo cambios
        if (count > 0) {
            await fs.writeFile(charactersFilePath, JSON.stringify(updatedCharacters, null, 2), 'utf-8');
        }

        // 7. Reporte final estilo Ellen Joe
        const contextInfo = {
            mentionedJid: [targetJID],
            forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 }
        };

        if (resetAll) {
            return conn.reply(m.chat, `*— Listo.* Se terminó el turno para todos. ${count} waifus liberadas y sin escudos. No me pidas más por hoy.`, m, { contextInfo });
        } 

        if (count === 0) {
            return m.reply('*— ¿Eh?* No encontré nada para mover. Revisa bien o deja de molestar.');
        }

        let response = `🦈 **𝐕𝐈𝐂𝐓𝐎𝐑𝐈𝐀 𝐇𝐎𝐔𝐒𝐄𝐊𝐄𝐄𝐏𝐈𝐍𝐆 - 𝐑𝐄𝐏𝐎𝐑𝐓𝐄**\n\n*— Oye, ya moví tus cosas.* Se transfirieron **${count}** personajes a @${targetJID.split('@')[0]}.\n\nHazlo legal la próxima vez, qué fastidio...`;
        
        conn.reply(m.chat, response, m, { contextInfo, mentions: [targetJID] });

    } catch (error) {
        console.error(error);
        m.reply('*— Tsk...* Algo salió mal internamente. Qué pereza arreglarlo.');
    }
}

handler.command = ['yoshy'];
handler.rowner = true; 
export default handler;

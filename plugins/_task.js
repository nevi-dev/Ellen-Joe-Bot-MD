import { promises as fs } from 'fs'
import path from 'path'

const charactersFilePath = path.join(process.cwd(), './src/database/characters.json');
// Número autorizado para comandos masivos (sin el @s.whatsapp.net)
const SUPER_ADMIN = '18096758983';

function normalizeName(text) {
    return text.trim().toLowerCase().replace(/-/g, ' ');
}

/**
 * @type {import('@adiwajshing/baileys').ICommand} 
 */
let handler = async (m, { conn, args, isOwner }) => {
    // 1. Verificación básica de Rowner
    if (!isOwner) {
        return m.reply('❌ Este comando solo puede ser ejecutado por el dueño del bot.');
    }

    const senderNumber = m.sender.split('@')[0];
    const isSuperAdmin = senderNumber === SUPER_ADMIN;

    let targetJID;
    let characterNames;
    let transferAll = false;
    let resetAll = false;

    // 2. Parsear argumentos y detectar modos especiales
    if (m.quoted) {
        targetJID = m.quoted.sender;
        characterNames = args;
    } else {
        if (args[0]?.toLowerCase() === 'reset') {
            resetAll = true;
        } else {
            if (args.length < 2) {
                let usage = '⚠️ *USO INCORRECTO*\n\n';
                usage += '• `.yoshy <Nombre> <JID>` -> Transferencia manual.';
                return m.reply(usage);
            }
            targetJID = args[args.length - 1];
            characterNames = args.slice(0, args.length - 1);
        }
    }

    if (!resetAll && characterNames[0]?.toLowerCase() === 'all') {
        transferAll = true;
    }

    // 3. Bloqueo de seguridad para Reset y All
    if ((resetAll || transferAll) && !isSuperAdmin) {
        return m.reply('Solo mi creador real puede usar comandos masivos.');
    }

    // 4. Cargar base de datos
    let characters;
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8');
        characters = JSON.parse(data);
    } catch (e) {
        return m.reply('❌ Error al leer la base de datos.');
    }

    // 5. Procesar Cambios
    try {
        const normalizedNamesToFind = characterNames ? characterNames.map(normalizeName) : [];
        let count = 0;
        let namesTransferred = [];

        const updatedCharacters = characters.map(char => {
            const normDBName = normalizeName(char.name);

            if (resetAll) {
                if (char.user) {
                    char.user = "";
                    char.status = "Libre";
                    count++;
                }
            } else if (transferAll || normalizedNamesToFind.includes(normDBName)) {
                if (char.user !== targetJID) {
                    char.user = targetJID;
                    char.status = 'Reclamado';
                    namesTransferred.push(char.name);
                    count++;
                }
            }
            return char;
        });

        // 6. Guardar si hubo cambios
        if (count > 0) {
            await fs.writeFile(charactersFilePath, JSON.stringify(updatedCharacters, null, 2), 'utf-8');
        }

        // 7. Reporte final con mensaje personalizado
        if (resetAll) {
            return m.reply(`✨ *RESET COMPLETO*\nSe han liberado ${count} personajes.`);
        } 

        if (count === 0) {
            return m.reply('⚠️ No se encontraron personajes para transferir o ya pertenecen al destino.');
        }

        // Mensaje especial para transferencias manuales (no masivas)
        let response = `gay hazlo legal te pase tus waifus pero no lo hagas de nuevo\n\n✅ *Transferidos:* ${count} personajes a @${targetJID.split('@')[0]}`;
        
        conn.reply(m.chat, response, m, { mentions: [targetJID] });

    } catch (error) {
        console.error(error);
        m.reply('❌ Error interno.');
    }
}

handler.command = ['yoshy'];
handler.rowner = true; 
export default handler;

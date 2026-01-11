import { promises as fs } from 'fs'
import path from 'path'

const charactersFilePath = path.join(process.cwd(), './src/database/characters.json');

function normalizeName(text) {
    return text.trim().toLowerCase().replace(/-/g, ' ');
}

/**
 * @type {import('@adiwajshing/baileys').ICommand} 
 */
let handler = async (m, { conn, args, isOwner }) => {
    if (!isOwner) {
        return m.reply('❌ Este comando solo puede ser ejecutado por el dueño del bot.');
    }

    let targetJID;
    let characterNames;
    let transferAll = false;
    let resetAll = false;

    // 1. Parsear argumentos
    if (m.quoted) {
        targetJID = m.quoted.sender;
        characterNames = args;
    } else {
        // Caso especial: .yoshy reset (no necesita JID)
        if (args[0]?.toLowerCase() === 'reset') {
            resetAll = true;
        } else {
            if (args.length < 2) {
                let usage = '⚠️ *USO INCORRECTO*\n\n';
                usage += '• `.yoshy reset` -> Libera TODOS los personajes.\n';
                usage += '• `.yoshy all <JID>` -> Pasa todo a un usuario.\n';
                usage += '• `.yoshy <Nombre> <JID>` -> Pasa personajes específicos.';
                return m.reply(usage);
            }
            targetJID = args[args.length - 1];
            characterNames = args.slice(0, args.length - 1);
        }
    }

    // Identificar si es "all" para transferencia masiva
    if (!resetAll && characterNames[0]?.toLowerCase() === 'all') {
        transferAll = true;
    }

    // 2. Cargar base de datos
    let characters;
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8');
        characters = JSON.parse(data);
    } catch (e) {
        return m.reply('❌ Error al leer la base de datos.');
    }

    // 3. Procesar Cambios
    try {
        const normalizedNamesToFind = characterNames ? characterNames.map(normalizeName) : [];
        let count = 0;

        const updatedCharacters = characters.map(char => {
            const normDBName = normalizeName(char.name);
            
            if (resetAll) {
                // Lógica de RESET: Quitar dueño y poner libre
                if (char.user) {
                    char.user = "";
                    char.status = "Libre"; // O el estado que uses para waifus sin dueño
                    count++;
                }
            } else if (transferAll || normalizedNamesToFind.includes(normDBName)) {
                // Lógica de TRANSFERENCIA (Individual o All)
                if (char.user !== targetJID) {
                    char.user = targetJID;
                    char.status = 'Reclamado';
                    count++;
                }
            }
            return char;
        });

        // 4. Guardar si hubo cambios
        if (count > 0) {
            await fs.writeFile(charactersFilePath, JSON.stringify(updatedCharacters, null, 2), 'utf-8');
        }

        // 5. Reporte final
        let message = '';
        if (resetAll) {
            message = `✨ *RESET COMPLETO*\nSe han liberado ${count} personajes. Ahora todos están disponibles.`;
        } else {
            message = `✅ *TRANSFERENCIA FINALIZADA*\nSe han asignado ${count} personajes a @${targetJID.split('@')[0]}`;
        }

        conn.reply(m.chat, message, m, { mentions: targetJID ? [targetJID] : [] });

    } catch (error) {
        console.error(error);
        m.reply('❌ Error interno al procesar los datos.');
    }
}

handler.command = ['yoshy'];
handler.rowner = true; 
export default handler;

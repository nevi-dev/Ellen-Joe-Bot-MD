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

    // 1. Parsear argumentos y detectar modo "ALL"
    if (m.quoted) {
        targetJID = m.quoted.sender;
        characterNames = args;
    } else {
        if (args.length < 2) {
            let usage = '⚠️ *USO INCORRECTO*\n\n';
            usage += 'Usa: `.yoshy all <JID>` para transferir todo.\n';
            usage += 'Usa: `.yoshy <Nombre> <JID>` para personajes específicos.';
            return m.reply(usage);
        }
        targetJID = args[args.length - 1];
        characterNames = args.slice(0, args.length - 1);
    }

    // Verificar si se pidió transferir todo
    if (characterNames[0]?.toLowerCase() === 'all') {
        transferAll = true;
    }

    if (!targetJID || !targetJID.includes('@')) {
        return m.reply(`❌ JID no válido.`);
    }

    // 2. Cargar base de datos
    let characters;
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8');
        characters = JSON.parse(data);
    } catch (e) {
        return m.reply('❌ Error al leer la base de datos.');
    }

    // 3. Procesar transferencia
    try {
        const normalizedNamesToFind = characterNames.map(normalizeName);
        const transferred = [];
        const alreadyOwned = [];
        const foundNormalized = new Set();

        const updatedCharacters = characters.map(char => {
            const normDBName = normalizeName(char.name);
            
            // Lógica de selección: Si es 'all' o si el nombre coincide
            if (transferAll || normalizedNamesToFind.includes(normDBName)) {
                foundNormalized.add(normDBName);

                if (char.user === targetJID) {
                    alreadyOwned.push(char.name);
                } else {
                    char.user = targetJID;
                    char.status = 'Reclamado';
                    transferred.push(char.name);
                }
            }
            return char;
        });

        // 4. Guardar cambios
        if (transferred.length > 0) {
            await fs.writeFile(charactersFilePath, JSON.stringify(updatedCharacters, null, 2), 'utf-8');
        }

        // 5. Reporte
        let replyMsg = `✅ *REPORTE DE TRANSFERENCIA ${transferAll ? '(TODO)' : ''}*\n`;
        replyMsg += `Destino: @${targetJID.split('@')[0]}\n`;
        replyMsg += `-----------------------------------\n`;

        if (transferred.length > 0) {
            // Si son muchos, solo mostramos el conteo para no saturar el chat
            if (transferred.length > 20) {
                replyMsg += `*Transferidos:* ${transferred.length} personajes.\n`;
            } else {
                replyMsg += `*Transferidos:* \n- ${transferred.join('\n- ')}\n`;
            }
        }

        if (alreadyOwned.length > 0 && !transferAll) {
            replyMsg += `\n*Ya pertenecían al destino:* ${alreadyOwned.length}\n`;
        }

        if (transferred.length === 0) {
            replyMsg = `⚠️ No se realizaron cambios. El usuario ya poseía los personajes o la lista estaba vacía.`;
        }

        conn.reply(m.chat, replyMsg, m, { mentions: [targetJID] });

    } catch (error) {
        console.error(error);
        m.reply('❌ Error interno.');
    }
}

handler.command = ['yoshy'];
handler.rowner = true; 
export default handler;

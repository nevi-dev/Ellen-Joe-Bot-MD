import { promises as fs } from 'fs'
import path from 'path'

// Ruta al archivo characters.json (Ajusta si es necesario)
const charactersFilePath = path.join(process.cwd(), './src/database/characters.json'); 

/**
 * Función auxiliar para limpiar el nombre del personaje.
 * @param {string} text
 * @returns {string}
 */
function normalizeName(text) {
    // Normaliza a minúsculas y elimina espacios innecesarios
    return text.trim().toLowerCase();
}

/**
 * @type {import('@adiwajshing/baileys').ICommand} 
 */
let handler = async (m, { conn, args, isOwner }) => {
    // 1. Verificar permisos (Solo el dueño del bot puede usarlo)
    if (!isOwner) {
        return m.reply('❌ Este comando solo puede ser ejecutado por el dueño del bot.');
    }
    
    // 2. Verificar argumentos (Necesita al menos dos: nombre y JID)
    if (args.length < 2) {
        let usage = '⚠️ *USO INCORRECTO*\n\n';
        usage += 'Usa el formato: `.transferirwaifu <Nombre del Personaje> <JID@lid>`';
        usage += '\n\n*Ejemplo:* `.transferirwaifu Mariya Mikhailovna Kujou 1234567890@lid`';
        return m.reply(usage);
    }
    
    // 3. Parsear argumentos
    // El JID debe ser el último argumento
    const targetJID = args[args.length - 1]; 
    // El nombre del personaje es el resto de los argumentos unidos
    const characterName = args.slice(0, args.length - 1).join(' ');
    const normalizedCharacterName = normalizeName(characterName);

    // 4. Validar el JID (debe terminar en @lid)
    if (!targetJID.endsWith('@lid')) {
        return m.reply('❌ El JID proporcionado debe terminar en *@lid* (ej: 1234567890@lid).');
    }
    
    // 5. Cargar la base de datos
    try {
        let data;
        try {
            data = await fs.readFile(charactersFilePath, 'utf-8');
        } catch (e) {
            if (e.code === 'ENOENT') {
                return m.reply('❌ Error: El archivo characters.json no fue encontrado.');
            }
            throw e;
        }

        let characters = JSON.parse(data);
        let characterFound = false;

        // 6. Buscar y procesar la transferencia
        const updatedCharacters = characters.map(char => {
            // Usamos la versión normalizada para la búsqueda, pero mantenemos el nombre original en la DB
            if (normalizeName(char.name) === normalizedCharacterName) {
                
                // Si el personaje ya pertenece al nuevo dueño, no hacemos nada
                if (char.user === targetJID) {
                    m.reply(`⚠️ El personaje *${char.name}* ya pertenece a ${targetJID.split('@')[0]}.`);
                    characterFound = true; // Lo encontramos, pero no lo modificamos
                    return char;
                }
                
                // Realizar la transferencia
                const previousOwner = char.user ? char.user.split('@')[0] : 'nadie (estaba Libre)';
                
                char.user = targetJID;
                char.status = 'Reclamado'; // O el estado que uses para personajes con dueño
                characterFound = true;
                
                console.log(`[TRANSFER] ${char.name} transferido de ${previousOwner} a ${targetJID.split('@')[0]}`);
            }
            return char;
        });

        if (!characterFound) {
            return m.reply(`❌ Personaje no encontrado: *${characterName}*.\n\nAsegúrate de escribir el nombre exactamente como aparece en la lista.`);
        }

        // 7. Guardar la base de datos
        await fs.writeFile(charactersFilePath, JSON.stringify(updatedCharacters, null, 2), 'utf-8');

        // 8. Enviar confirmación final
        m.reply(`✅ *TRANSFERENCIA INDIVIDUAL COMPLETADA*\n\nPersonaje: *${characterName}*\nNuevo Dueño: ${targetJID}`);

    } catch (error) {
        console.error('ERROR en el comando .transferirwaifu:', error);
        m.reply('❌ Ocurrió un error interno al procesar la transferencia. Revisa la consola.');
    }
}

handler.command = ['yoshy'];
handler.rowner = true; // Solo para dueños/administradores del bot
export default handler;

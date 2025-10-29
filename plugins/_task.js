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

    let targetJID;
    let characterNames;

    // 2. Parsear argumentos (con soporte para respuesta)
    if (m.quoted) {
        // Si responde a un mensaje, el JID es el del autor del mensaje citado
        targetJID = m.quoted.sender;
        characterNames = args; // Todos los argumentos son nombres
    } else {
        // Si no responde, el JID es el último argumento
        if (args.length < 2) { // Necesita al menos un nombre y un JID
            let usage = '⚠️ *USO INCORRECTO*\n\n';
            usage += 'Usa el formato: `.transferirwaifu <Nombre 1> [Nombre 2...] <JID>`';
            usage += '\nO responde a un usuario: `.transferirwaifu <Nombre 1> [Nombre 2...]`';
            usage += '\n\n*Ejemplo 1:* `.transferirwaifu Mariya 1234567890@s.whatsapp.net`';
            usage += '\n*Ejemplo 2 (nombres con espacios):* `.transferirwaifu "Mariya Kujou" "Rias Gremory" 1234567890@s.whatsapp.net`';
            return m.reply(usage);
        }
        
        targetJID = args[args.length - 1];
        characterNames = args.slice(0, args.length - 1);
    }
    
    // 3. Validar JID
    // La validación se relaja para aceptar JIDs de usuario (@s.whatsapp.net) o de grupo (@lid, @g.us)
    if (!targetJID || !targetJID.includes('@')) {
        return m.reply(`❌ JID no válido: ${targetJID}. Debe ser un JID completo (ej: 12345@s.whatsapp.net).`);
    }

    // 4. Validar que tengamos nombres
    if (characterNames.length === 0) {
        return m.reply('❌ No especificaste ningún nombre de personaje para transferir.');
    }

    // 5. Cargar la base de datos
    let characters;
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8');
        characters = JSON.parse(data);
    } catch (e) {
        if (e.code === 'ENOENT') {
            return m.reply('❌ Error: El archivo characters.json no fue encontrado.');
        }
        console.error('ERROR al leer characters.json:', e);
        return m.reply('❌ Error al leer la base de datos.');
    }

    // 6. Procesar la transferencia
    try {
        const normalizedNamesToFind = characterNames.map(normalizeName);
        // Usamos un Map para rastrear el nombre original que el usuario escribió
        const originalNameMap = new Map();
        characterNames.forEach(name => {
            // Si varios nombres normalizan a lo mismo (ej: "Goku" y "goku"), se usará el último para el reporte de "no encontrado"
            originalNameMap.set(normalizeName(name), name);
        });

        const transferred = [];
        const alreadyOwned = [];
        const foundNormalized = new Set(); // Para rastrear qué nombres normalizados encontramos

        const updatedCharacters = characters.map(char => {
            const normDBName = normalizeName(char.name);
            
            // Comprobar si este personaje está en la lista de los que queremos transferir
            if (normalizedNamesToFind.includes(normDBName)) {
                
                // Marcar este nombre normalizado como encontrado
                foundNormalized.add(normDBName);

                if (char.user === targetJID) {
                    // Ya pertenece al destino
                    alreadyOwned.push(char.name);
                } else {
                    // Realizar la transferencia
                    const previousOwner = char.user ? char.user.split('@')[0] : 'nadie (estaba Libre)';
                    char.user = targetJID;
                    char.status = 'Reclamado'; // O el estado que uses
                    transferred.push(char.name);
                    
                    console.log(`[TRANSFER] ${char.name} transferido de ${previousOwner} a ${targetJID.split('@')[0]}`);
                }
            }
            return char;
        });

        // Determinar qué nombres no se encontraron
        const notFoundOriginal = [];
        normalizedNamesToFind.forEach(normName => {
            if (!foundNormalized.has(normName)) {
                // Obtener el nombre original que escribió el usuario para el reporte
                notFoundOriginal.push(originalNameMap.get(normName) || normName); // Fallback por si acaso
            }
        });


        // 7. Guardar la base de datos (solo si hubo cambios)
        if (transferred.length > 0) {
            await fs.writeFile(charactersFilePath, JSON.stringify(updatedCharacters, null, 2), 'utf-8');
        }

        // 8. Enviar confirmación final como reporte
        let replyMsg = `✅ *REPORTE DE TRANSFERENCIA*\n\nDestino: ${targetJID.split('@')[0]}\n`;
        replyMsg += `-----------------------------------\n`;

        if (transferred.length > 0) {
            replyMsg += `*Transferidos Exitosamente:* (${transferred.length})\n`;
            replyMsg += `- ${transferred.join('\n- ')}\n\n`;
        }
        
        if (alreadyOwned.length > 0) {
            replyMsg += `*Ya Pertenecían al Destino:* (${alreadyOwned.length})\n`;
            replyMsg += `- ${alreadyOwned.join('\n- ')}\n\n`;
        }

        if (notFoundOriginal.length > 0) {
            replyMsg += `*Personajes No Encontrados:* (${notFoundOriginal.length})\n`;
            replyMsg += `- ${notFoundOriginal.join('\n- ')}\n\n`;
        }

        if (transferred.length === 0 && alreadyOwned.length === 0) {
             replyMsg = `❌ *TRANSFERENCIA FALLIDA*\n\nNinguno de los personajes especificados fue encontrado en la base de datos:\n- ${characterNames.join('\n- ')}`;
        }

        m.reply(replyMsg.trim());

    } catch (error) {
        console.error('ERROR en el comando .transferirwaifu:', error);
        m.reply('❌ Ocurrió un error interno al procesar la transferencia. Revisa la consola.');
    }
}

// Actualizamos el comando y mantenemos el rowner
handler.command = ['yoshy'];
handler.rowner = true; // Solo para dueños/administradores del bot
export default handler;

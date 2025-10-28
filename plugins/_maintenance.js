import { promises as fs } from 'fs'
import path from 'path'

const charactersFilePath = path.join(process.cwd(), './src/database/characters.json');

// --- Funciones de Persistencia (Mantenidas) ---

async function loadCharacters() {
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw new Error('❀ No se pudo cargar el archivo characters.json.');
    }
}

async function saveCharacters(characters) {
    try {
        await fs.writeFile(charactersFilePath, JSON.stringify(characters, null, 2), 'utf-8');
    } catch (error) {
        throw new Error('❀ No se pudo guardar el archivo characters.json.');
    }
}

// -----------------------------------------------------------------------
// 🚀 FUNCIÓN CRÍTICA: BUSCAR JIDs ACTIVOS EN GRUPOS 🚀
// Usamos el método Baileys de la conexión 'sock' para obtener grupos.
// -----------------------------------------------------------------------
/**
 * Obtiene todos los JIDs de usuarios (miembros o dueños) que están en cualquier
 * grupo donde el bot es miembro.
 * @param {object} sock El objeto de conexión del bot (ej. 'conn' o 'sock').
 * @returns {Promise<Set<string>>} Un conjunto de JIDs (IDs de usuario) activos en grupos.
 */
async function getAllUsersInGroups(sock) {
    const activeUsers = new Set();
    
    try {
        // Asumiendo que sock.groupFetchAllParticipating() funciona
        const groups = await sock.groupFetchAllParticipating();
        
        console.log(`[Waifu-MAINTENANCE] Grupos encontrados: ${Object.keys(groups).length}`);

        for (const jid in groups) {
            const group = groups[jid];
            
            if (group && group.participants) {
                group.participants.forEach(p => {
                    if (p.id) {
                        // 1. Añadir el JID estándar (@s.whatsapp.net)
                        const standardJID = p.id; 
                        activeUsers.add(standardJID);
                        
                        // 2. Intentar añadir el JID @lid (si existe en tu DB)
                        // Esto asegura que la comprobación cubra ambos formatos.
                        const lidJID = standardJID.replace('@s.whatsapp.net', '@lid');
                        activeUsers.add(lidJID);
                    }
                });
            }
        }
        
        // 3. Añadir el JID del bot mismo, para evitar que se libere si tiene personajes.
        if (sock.user && sock.user.id) {
            activeUsers.add(sock.user.id);
            // También la versión @s.whatsapp.net si es @lid
            const standardBotJID = sock.user.id.includes('@lid') 
                ? sock.user.id.replace('@lid', '@s.whatsapp.net') 
                : sock.user.id;
            activeUsers.add(standardBotJID);
        }

        console.log(`[Waifu-MAINTENANCE] JIDs únicos activos recolectados: ${activeUsers.size}`);
        
    } catch (e) {
        console.error("❌ ERROR CRÍTICO al obtener miembros de grupos. ¡PELIGRO DE LIBERACIÓN MASIVA!", e);
        // Devolver Set vacío es MUY PELIGROSO. Es mejor lanzar un error o devolver la última lista conocida.
        throw new Error("Fallo al obtener usuarios activos."); 
    }
    
    return activeUsers;
}
// -----------------------------------------------------------------------

// --- Función Principal de Mantenimiento ---

/**
 * Revisa la base de datos de personajes y libera (pone 'user' a null)
 * los personajes de los dueños que ya no están en ningún grupo con el bot.
 * * @param {object} conn La conexión del bot.
 */
export async function runCharacterMaintenance(conn) {
    if (!conn) {
        console.error('[Waifu Maintenance] Error: Objeto de conexión (conn) no proporcionado.');
        return;
    }
    
    try {
        const characters = await loadCharacters();
        // OBTENER LA LISTA DE JIDs ACTIVOS (CRÍTICO)
        const activeUsers = await getAllUsersInGroups(conn); 

        let charactersModified = false;
        const usersToClear = new Set();

        const updatedCharacters = characters.map(char => {
            // Si el personaje NO tiene dueño o el dueño es el bot, lo mantiene
            if (!char.user || char.user.includes(conn.user.id.split(':')[0])) { 
                return char;
            }

            // ⚠️ Chequea si el dueño (char.user, que puede ser @lid o @s.whatsapp.net)
            // NO está en la lista de usuarios activos que generamos
            if (!activeUsers.has(char.user)) {
                
                usersToClear.add(char.user);
                charactersModified = true;
                
                console.log(`[Waifu-LIBERADO] Personaje: ${char.name} de ${char.user.split('@')[0]}`);
                
                // Devuelve el personaje con el campo 'user' a null para liberarlo
                return { ...char, user: null, status: 'Libre' }; // También reiniciamos el status
            }

            // Si el usuario es activo, mantiene el personaje
            return char;
        });

        if (charactersModified) {
            await saveCharacters(updatedCharacters);
            console.log(`[Waifu-MANTENIMIENTO] Base de datos actualizada. Personajes liberados de ${usersToClear.size} usuario(s) inactivos.`);
        } else {
            console.log('[Waifu-MANTENIMIENTO] No se encontraron personajes para liberar.');
        }

    } catch (error) {
        console.error('❌ [ERROR EN MANTENIMIENTO DE WAIFUS]:', error.message);
    }
}

// --- Función Opcional para Ejecución Periódica (startMaintenanceInterval) ---
// ... (mantenida igual si la necesitas aparte)

import { promises as fs } from 'fs'
import path from 'path'

const charactersFilePath = path.join(process.cwd(), './src/database/characters.json');

// --- Funciones de Persistencia ---

async function loadCharacters() {
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Devolver array vacío si el archivo no existe para evitar errores fatales al inicio
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
// ⚠️ ¡ADAPTAR ESTA FUNCIÓN! ⚠️
// Debe usar la API de tu bot para obtener los JID de todos los usuarios
// que están en cualquier grupo donde el bot es miembro.
// -----------------------------------------------------------------------
/**
 * @param {object} conn La conexión del bot.
 * @returns {Promise<Set<string>>} Un conjunto de JIDs (IDs de usuario) activos en grupos.
 */
async function getAllUsersInGroups(conn) {
    // Ejemplo SIMULADO. Debes reemplazar esto con la lógica real de tu bot (ej. Baileys)
    // para iterar sobre todos los grupos y obtener los participantes.
    
    // Si usas Baileys, esto es complejo y asíncrono. Por ahora, asumiremos que
    // el objeto 'conn' tiene la capacidad de darte los grupos.
    
    const activeUsers = new Set();
    
    // Ejemplo conceptual:
    /*
    const groups = await conn.groupFetchAllParticipating();
    for (const jid in groups) {
        const group = groups[jid];
        group.participants.forEach(p => activeUsers.add(p.id));
    }
    */

    // Retornamos un set vacío en la simulación si no se puede implementar.
    // **Si dejas esto en producción sin modificar, no hará nada.**
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
        // Obtener un Set de todos los JIDs de usuarios activos en grupos
        const activeUsers = await getAllUsersInGroups(conn); 

        let charactersModified = false;
        const usersToClear = new Set();

        const updatedCharacters = characters.map(char => {
            // Si el personaje NO tiene dueño o el dueño es el bot, lo mantiene
            if (!char.user || char.user.includes(conn.user.id.split(':')[0])) { 
                return char;
            }

            // Chequea si el dueño (char.user) NO está en la lista de usuarios activos
            if (!activeUsers.has(char.user)) {
                
                usersToClear.add(char.user);
                charactersModified = true;
                
                console.log(`[Waifu-LIBERADO] Personaje: ${char.name} de ${char.user.split('@')[0]}`);
                
                // Devuelve el personaje con el campo 'user' a null para liberarlo
                return { ...char, user: null }; 
            }

            // Si el usuario es activo, mantiene el personaje
            return char;
        });

        if (charactersModified) {
            await saveCharacters(updatedCharacters);
            console.log(`[Waifu-MANTENIMIENTO] Base de datos actualizada. Personajes liberados de ${usersToClear.size} usuario(s) inactivos.`);
        } else {
            // console.log('[Waifu-MANTENIMIENTO] No se encontraron personajes para liberar.');
        }

    } catch (error) {
        console.error('❌ [ERROR EN MANTENIMIENTO DE WAIFUS]:', error.message);
    }
}

// --- Función Opcional para Ejecución Periódica (si no se usa el intervalo unificado) ---

/**
 * Inicia el intervalo de ejecución.
 * (Solo usa esta si NO integras runCharacterMaintenance en el intervalo de CypherTrans)
 * * @param {object} conn La conexión del bot.
 */
export function startMaintenanceInterval(conn) {
    const intervalTime = 60 * 1000; // 60 segundos
    
    // Ejecuta la función inmediatamente al inicio
    runCharacterMaintenance(conn); 

    // Establece el intervalo
    setInterval(() => runCharacterMaintenance(conn), intervalTime);

    console.log(`[Waifu Maintenance] Chequeo programado cada ${intervalTime / 1000} segundos.`);
}

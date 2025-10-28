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
// 🚀 FUNCIÓN CRÍTICA: BUSCAR JIDs ACTIVOS EN GRUPOS (INCLUYE SUB-BOTS) 🚀
// -----------------------------------------------------------------------
/**
 * Obtiene todos los JIDs de usuarios (miembros o dueños) que están en cualquier
 * grupo compartido con el bot principal O con cualquiera de sus sub-bots.
 * @param {object} mainSock El objeto de conexión del bot principal (ej. 'conn' o 'sock').
 * @returns {Promise<Set<string>>} Un conjunto de JIDs (IDs de usuario) activos en grupos.
 */
async function getAllUsersInGroups(mainSock) {
    const activeUsers = new Set();
    const allSocks = [mainSock]; // Empezamos con el bot principal
    
    // 1. Agregar las conexiones de los sub-bots (asumiendo global.subSocks es un array)
    if (global.subSocks && Array.isArray(global.subSocks)) {
        // Solo incluimos socks que existen y que tienen la función de grupos
        const validSubSocks = global.subSocks.filter(s => s && s.groupFetchAllParticipating);
        allSocks.push(...validSubSocks);
        console.log(`[Waifu-MAINTENANCE] Incluyendo ${validSubSocks.length} conexiones de sub-bots en el chequeo.`);
    }

    // 2. Iterar sobre todas las conexiones (principal + sub-bots)
    for (const sock of allSocks) {
        const botJid = sock.user?.id || 'desconocido';
        try {
            console.log(`[Waifu-MAINTENANCE] Chequeando grupos del bot: ${botJid.split(':')[0]}`);
            
            // Obtener la lista de grupos
            const groups = await sock.groupFetchAllParticipating();
            
            // 3. Procesar los participantes de cada grupo
            for (const jid in groups) {
                const group = groups[jid];
                
                if (group && group.participants) {
                    group.participants.forEach(p => {
                        if (p.id) {
                            const standardJID = p.id; 
                            activeUsers.add(standardJID); // Ej: 521XXX@s.whatsapp.net
                            
                            // Asegurar la compatibilidad con el formato @lid
                            const lidJID = standardJID.includes('@s.whatsapp.net') 
                                ? standardJID.replace('@s.whatsapp.net', '@lid')
                                : standardJID;
                            activeUsers.add(lidJID); // Ej: 521XXX@lid
                        }
                    });
                }
            }
            
            // 4. Asegurar que el bot actual esté en la lista (para evitar liberarse si tiene waifus)
            if (sock.user && sock.user.id) {
                activeUsers.add(sock.user.id);
            }

        } catch (e) {
            console.error(`❌ ERROR al obtener grupos del bot ${botJid}:`, e.message);
        }
    }
    
    console.log(`[Waifu-MAINTENANCE] JIDs únicos activos recolectados (Total): ${activeUsers.size}`);
    
    // Si la lista está vacía y esperabas usuarios, esto indica un problema crítico
    if (activeUsers.size === 0 && allSocks.length > 0) {
        throw new Error("Fallo al obtener usuarios activos: La lista está vacía. ¡PELIGRO!"); 
    }
    
    return activeUsers;
}
// -----------------------------------------------------------------------

// --- Función Principal de Mantenimiento (runCharacterMaintenance) ---

/**
 * Revisa la base de datos de personajes y libera los personajes de los dueños inactivos.
 * * @param {object} conn La conexión del bot.
 */
export async function runCharacterMaintenance(conn) {
    if (!conn) {
        console.error('[Waifu Maintenance] Error: Objeto de conexión (conn) no proporcionado.');
        return;
    }
    
    try {
        const characters = await loadCharacters();
        // OBTENER LA LISTA DE JIDs ACTIVOS (PRINCIPAL + SUB-BOTS)
        const activeUsers = await getAllUsersInGroups(conn); 

        let charactersModified = false;
        const usersToClear = new Set();

        const updatedCharacters = characters.map(char => {
            // ... (Lógica de liberación igual a la anterior) ...
            if (!char.user || char.user.includes(conn.user.id.split(':')[0])) { 
                return char;
            }

            if (!activeUsers.has(char.user)) {
                
                usersToClear.add(char.user);
                charactersModified = true;
                
                console.log(`[Waifu-LIBERADO] Personaje: ${char.name} de ${char.user.split('@')[0]}`);
                
                return { ...char, user: null, status: 'Libre' }; 
            }

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

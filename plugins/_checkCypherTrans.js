// --- Importar la función de Mantenimiento de Waifus ---
// Asumiendo que el archivo de mantenimiento se llama _maintenance.js y está en src/tasks/
import { startMaintenanceInterval } from './plugins/_maintenance.js'; 

// --- Importar la función de Chequeo de CypherTrans ---
// Asumiendo que el código de CypherTrans está en _check_tx.js (o similar)
import { checkCypherTransInbound } from './plugins/_checkCypherTrans2.js'; 


/**
 * @typedef {import('@adiwajshing/baileys').WASocket} WASocket
 */

// --- CONFIGURACIÓN DE INTERVALOS ---
// 1. Mantenimiento de Waifus (cada 60 segundos)
const WAIFU_MAINTENANCE_INTERVAL_MS = 60 * 1000; // 60 segundos

// 2. Chequeo de CypherTrans (cada 5 segundos - debe ser rápido para notificar)
const CYPHERTRANS_CHECK_INTERVAL_MS = 5 * 1000; // 5 segundos

/**
 * Inicia todos los procesos y chequeos que deben ejecutarse periódicamente
 * en segundo plano.
 * * @param {WASocket | any} conn El objeto de conexión del bot (ej. 'sock' en Baileys).
 */
export function startAllBackgroundTasks(conn) {
    if (!conn) {
        console.error("⚠️ [Tasks] No se puede iniciar las tareas: Objeto de conexión (conn/sock) es nulo.");
        return;
    }

    console.log("=================================================");
    console.log("          INICIANDO TAREAS EN SEGUNDO PLANO        ");
    console.log("=================================================");

    // --- 1. INICIAR EL MANTENIMIENTO DE WAIFUS ---
    // Si estás usando la función startMaintenanceInterval del módulo anterior:
    startMaintenanceInterval(conn);
    
    // --- 2. INICIAR EL CHEQUEO DE CYPHERTRANS ---
    
    // Función de envoltorio para CypherTrans para asegurar el log
    const runCypherCheck = async () => {
        try {
            await checkCypherTransInbound(conn);
        } catch (error) {
            console.error(`❌ [CypherTrans] Error durante el chequeo periódico: ${error.message}`);
        }
    };
    
    // Ejecutar inmediatamente al inicio
    runCypherCheck();

    // Establecer el intervalo de chequeo
    setInterval(runCypherCheck, CYPHERTRANS_CHECK_INTERVAL_MS);
    
    console.log(`[CypherTrans] Chequeo programado cada ${CYPHERTRANS_CHECK_INTERVAL_MS / 1000}s.`);
    console.log("=================================================");
}

// Nota: No se requiere 'export default' si solo se exporta la función principal.

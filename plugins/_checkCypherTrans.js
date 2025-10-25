// Asegúrate de que estas dependencias estén disponibles.
import fetch from 'node-fetch'; 
import fs from 'fs/promises'; // Para operaciones asíncronas de archivos
import path from 'path'; // Para manejar rutas de archivos

// --- CONFIGURACIÓN DE CYPHERTRANS ---
const HASH_FILE_PATH = path.join(process.cwd(), 'src', 'hash.json'); 
const API_URL = 'https://cyphertrans.duckdns.org'; 

// Las variables globales 'global.db.data.users' y 'moneda' son necesarias para esta función.
const moneda = global.moneda || 'Coin';

/**
 * Extrae el número de teléfono del número de cuenta CypherTrans.
 * @param {string} recipientAccount - La cuenta CypherTrans (ej: 521XXXXXXXXMARC1234).
 * @returns {string} El número de teléfono (ej: 521XXXXXXXX).
 */
function extractUserNumber(recipientAccount) {
    return recipientAccount.slice(0, -7); 
}

/**
 * Busca todos los JIDs de GRUPO donde se encuentra el número de usuario.
 * @param {string} userNumber - El número de teléfono del usuario (ej: 521XXXXXXXX).
 * @param {object} sock - El objeto de conexión de WhatsApp (Baileys).
 * @returns {Promise<string[]>} Una promesa que resuelve un array de JIDs de grupo ([groupJID1, groupJID2...]).
 */
async function findGroupJIDs(userNumber, sock) {
    const groupJIDs = [];
    try {
        const allGroups = await sock.groupFetchAllParticipating();
        
        for (const [jid, groupData] of Object.entries(allGroups)) {
            if (!groupData.participants) continue;
            
            // Verificamos si el usuario es participante en este grupo
            for (const participant of groupData.participants) {
                const participantNumber = participant.id.split('@')[0];
                if (participantNumber === userNumber) {
                    groupJIDs.push(participant.id); // Agregamos el JID del grupo
                    break; 
                }
            }
        }
    } catch (error) {
        console.error("Error al buscar JIDs de grupo:", error);
    }
    return groupJIDs; 
}

/**
 * Obtiene el hash del bot desde el archivo local.
 * (Sin cambios, es una función de soporte necesaria)
 */
async function getBotHashFromFile() {
    try {
        const data = await fs.readFile(HASH_FILE_PATH, 'utf-8');
        const hashData = JSON.parse(data);
        if (hashData && hashData.bot_hash) {
            return hashData.bot_hash;
        }
        return null;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`[CypherTrans] Advertencia: Archivo de hash no encontrado en ${HASH_FILE_PATH}.`);
        } else {
            console.error(`[CypherTrans] Error leyendo hash.json:`, error.message);
        }
        return null;
    }
}

// --- FUNCIÓN PRINCIPAL DE CHEQUEO DE TRANSACCIONES ---

export async function checkCypherTransInbound(sock) {
    if (!sock) return console.error('[CypherTrans] Error: Objeto de conexión (sock) no proporcionado.');
    
    const BOT_HASH = await getBotHashFromFile();
    if (!BOT_HASH) return console.log('[CypherTrans] Solicitud omitida: Bot no registrado.');
    
    try {
        const response = await fetch(`${API_URL}/api/v1/inbound_history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bot_hash: BOT_HASH })
        });

        if (!response.ok) return console.error(`[CypherTrans] Error en la API: ${response.status} ${response.statusText}`);

        const newTransactions = await response.json();
        if (newTransactions.length === 0) return;

        console.log(`[CypherTrans] ${newTransactions.length} nuevas transacciones entrantes encontradas.`);

        for (const tx of newTransactions) {
            
            // 1. Determinar el JID basado en la cuenta y la DB
            const userNumber = extractUserNumber(tx.recipient);
            const standardJID = `${userNumber}@s.whatsapp.net`;
            const lidJID = `${userNumber}@lid`; // Asumiendo este es el formato de tu @lid
            
            let targetJID = null;
            let notificationType = ''; // 'group' o 'private'
            
            // Prioridad 1: Buscar por @lid
            if (global.db.data.users[lidJID]) {
                targetJID = lidJID;
                notificationType = 'group'; // Si está en @lid, notificamos en grupos.
            } 
            // Prioridad 2: Buscar por JID estándar
            else if (global.db.data.users[standardJID]) {
                targetJID = standardJID;
                notificationType = 'private'; // Si está en JID estándar, notificamos en privado.
            }
            
            // 2. Procesar si se encontró un usuario en la DB
            if (targetJID) {
                const amount = tx.amount; 
                const receiptUrl = `${API_URL}/receipt/${tx.tx_id}`;
                const contactId = userNumber; // Usamos el número para la mención
                
                // --- LÓGICA DE DEPÓSITO AL BANCO ---
                if (typeof global.db.data.users[targetJID].bank !== 'number') {
                    global.db.data.users[targetJID].bank = 0;
                }
                global.db.data.users[targetJID].bank += amount * 1; 
                const newBankBalance = global.db.data.users[targetJID].bank;
                console.log(`[CypherTrans] ${amount} depositado en el banco de ${targetJID}.`);
                // ------------------------------------
               
                // 3. Preparar mensajes
                const fullMessage = `✅ *¡Depósito Multibot APROBADO!*` +
                    `\n\n*Monto Recibido:* *${amount} ${moneda}*` +
                    `\n*De la cuenta:* ${tx.sender}` +
                    `\n*ID Transacción:* \`${tx.tx_id}\`` +
                    `\n\n*Tu nuevo saldo en el banco:* ${newBankBalance} ${moneda}` +
                    `\n\n_El dinero ha sido depositado en tu banco y está seguro._` +
                    `\n\nComprobante (HTML): ${receiptUrl}`;

                const groupNotice = `🔔 *Aviso* @${contactId}, la transferencia Multibot de *${amount} ${moneda}* ha sido APROBADA y depositada en tu banco.`;

                // 4. Lógica de Notificación
                if (notificationType === 'private') {
                    // Notificar en privado (JID estándar)
                    await sock.sendMessage(targetJID, { 
                        text: fullMessage, 
                        mentions: [targetJID] 
                    });
                    console.log(`[CypherTrans] Notificación COMPLETA enviada a CHAT PRIVADO de ${targetJID}.`);

                } else if (notificationType === 'group') {
                    // Notificar en todos los grupos (si es @lid)
                    const groupJIDs = await findGroupJIDs(userNumber, sock);
                    
                    if (groupJIDs.length > 0) {
                         const groupMessage = `[MENSAJE IMPORTANTE PARA @${contactId}] ${fullMessage}`;

                        for (const groupJID of groupJIDs) {
                            try {
                                await sock.sendMessage(groupJID, {
                                    text: groupMessage,
                                    mentions: [standardJID] // Necesitamos el JID estándar para la mención
                                });
                            } catch (e) {
                                console.error(`[CypherTrans] Error al enviar mensaje COMPLETO a grupo ${groupJID}: ${e.message}`);
                            }
                        }
                        console.log(`[CypherTrans] Notificación COMPLETA enviada a ${groupJIDs.length} grupos (@lid mode).`);
                    } else {
                        console.log(`[CypherTrans] Usuario ${targetJID} encontrado (@lid) pero no se encontró ningún grupo compartido para notificar.`);
                    }
                }
            } else {
                console.log(`[CypherTrans] ERROR: Usuario ${userNumber} (ni @lid ni @s.whatsapp.net) no encontrado en la DB local.`);
            }
        }
    } catch (error) {
        console.error("Error al verificar CypherTrans:", error.message);
    }
}

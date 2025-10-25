// Asegúrate de que estas dependencias estén disponibles.
import fetch from 'node-fetch'; 
import fs from 'fs/promises'; 
import path from 'path'; 
// Si quieres enviar imagen, necesitarás Buffer y posiblemente un módulo para descargar la imagen
// import { Buffer } from 'buffer';

// --- CONFIGURACIÓN DE CYPHERTRANS ---
const HASH_FILE_PATH = path.join(process.cwd(), 'src', 'hash.json'); 
const API_URL = 'https://cyphertrans.duckdns.org'; 

// Las variables globales 'global.db.data.users' y 'moneda' son necesarias para esta función.
const moneda = global.moneda || 'Coin';
const emoji = '✅';

/**
 * Extrae el número de teléfono del número de cuenta CypherTrans.
 */
function extractUserNumber(recipientAccount) {
    return recipientAccount.slice(0, -7); 
}

/**
 * Obtiene el hash del bot desde el archivo local.
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
            
            // 1. Determinar el JID de destino para el depósito y mensaje
            const userNumber = extractUserNumber(tx.recipient);
            const standardJID = `${userNumber}@s.whatsapp.net`;
            const lidJID = `${userNumber}@lid`; 
            
            let targetJID = null;
            
            // Prioridad 1: Buscar por @lid (usado en tu DB)
            if (global.db.data.users[lidJID]) {
                targetJID = lidJID;
            } 
            // Prioridad 2: Buscar por JID estándar
            else if (global.db.data.users[standardJID]) {
                targetJID = standardJID;
            }
            
            // 2. Procesar si se encontró un usuario en la DB
            if (targetJID) {
                const amount = tx.amount; 
                const receiptUrl = `${API_URL}/receipt/${tx.tx_id}`;
                const contactId = userNumber; 
                
                // --- LÓGICA DE DEPÓSITO AL BANCO ---
                if (typeof global.db.data.users[targetJID].bank !== 'number') {
                    global.db.data.users[targetJID].bank = 0;
                }
                global.db.data.users[targetJID].bank += amount * 1; 
                const newBankBalance = global.db.data.users[targetJID].bank;
                console.log(`[CypherTrans] ${amount} depositado en el banco de ${targetJID}.`);
                // ------------------------------------
               
                // 3. Preparar el mensaje ÚNICO (Estética mejorada)
                const fullMessage = `${emoji} *— ¡DEPÓSITO MULTIBOT APROBADO! —*` +
                    `\n\n*Monto Recibido:* *${amount} ${moneda}*` +
                    `\n*Desde:* ${tx.sender}` +
                    `\n*ID Transacción:* \`${tx.tx_id}\`` +
                    `\n\n*Tu Nuevo Saldo en el Banco:* ${newBankBalance} ${moneda}` +
                    `\n\n_El dinero ha sido depositado directamente en tu cuenta de banco._` +
                    `\n\nComprobante (HTML): ${receiptUrl}`;

                
                // 4. Enviar el mensaje ÚNICO (sin distinción de grupo/privado)
                try {
                    // Usamos el targetJID para enviar el mensaje
                    await sock.sendMessage(targetJID, { 
                        text: fullMessage, 
                        // Si targetJID es @lid, la mención probablemente no funcione, pero el mensaje se envía.
                        // Usamos standardJID en mentions por si targetJID es el privado.
                        mentions: [standardJID] 
                    });
                    console.log(`[CypherTrans] Notificación ÚNICA enviada a ${targetJID}.`);
                } catch (e) {
                     console.error(`[CypherTrans] ERROR: Falló el envío del mensaje único a ${targetJID}.`, e.message);
                }
                
            } else {
                console.log(`[CypherTrans] ERROR: Usuario ${userNumber} (ni @lid ni @s.whatsapp.net) no encontrado en la DB local.`);
            }
        }
    } catch (error) {
        console.error("Error al verificar CypherTrans:", error.message);
    }
}

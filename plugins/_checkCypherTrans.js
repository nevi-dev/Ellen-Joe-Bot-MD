// Asegúrate de que estas dependencias estén disponibles.
import fetch from 'node-fetch'; 
import fs from 'fs/promises'; 
import path from 'path'; 
// Si quieres enviar imagen, necesitarás Buffer
import { Buffer } from 'buffer';

// --- CONFIGURACIÓN DE CYPHERTRANS ---
const HASH_FILE_PATH = path.join(process.cwd(), 'src', 'hash.json'); 
const API_URL = 'https://cyphertrans.duckdns.org'; 

// Las variables globales 'global.db.data.users' y 'moneda' son necesarias para esta función.
// Usamos global.moneda como el código de moneda local (e.g., ELLC o DEN)
const moneda = global.moneda || 'ELLC'; 
const emoji = '✅';
const emoji2 = '❌';

/**
 * Mapea el código de la divisa (ELLC, DEN, BER, etc.) a su nombre completo.
 */
function getCurrencyName(code) {
    if (!code) return 'Moneda Desconocida';
    const upperCode = code.toUpperCase();
    switch (upperCode) {
        case 'ELLC': // El código antiguo de Deniques
        case 'DEN':  // El nuevo prefijo de Deniques
            return 'Deniques';
        case 'BER':  // El nuevo prefijo de Berries
        case 'LUFC': // El código antiguo de Berries (asumiendo Luffy)
            return 'Berries';
        case 'WON':  // El nuevo prefijo de Wones
        case 'MARC': // El código antiguo de Wones (asumiendo Maria)
            return 'Wones';
        case 'CT':
        case 'CYPHERTRANS':
            return 'CypherTrans (CT)';
        default:
            return code; // Devuelve el código si no es reconocido
    }
}

/**
 * Extrae el número de teléfono del número de cuenta CypherTrans.
 */
function extractUserNumber(account) {
    // Asume que el número es todo menos los últimos 7 caracteres (DEN1234, BER1234, etc.)
    return account.slice(0, -7); 
}

/**
 * Busca el JID (WhatsApp ID) de un usuario local a partir de su número de cuenta.
 * Retorna el JID si es encontrado, o null.
 */
function findLocalUserJID(accountNumber) {
    if (!global.db || !global.db.data || !global.db.data.users || accountNumber.length < 8) return null;

    const userNumber = extractUserNumber(accountNumber);
    const standardJID = `${userNumber}@s.whatsapp.net`;
    const lidJID = `${userNumber}@lid`; 
            
    // Prioridad 1: Buscar por @lid
    if (global.db.data.users[lidJID]) {
        return lidJID;
    } 
    // Prioridad 2: Buscar por JID estándar
    else if (global.db.data.users[standardJID]) {
        return standardJID;
    }
    return null;
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
            
            // 1. Identificar al usuario a notificar basado en el estado
            let targetJID = null;
            let targetAccount = null;
            let isRefund = false;

            if (tx.status === 'COMPLETED') {
                // Notificar al RECEPTOR de un depósito exitoso
                targetAccount = tx.recipient;
                targetJID = findLocalUserJID(targetAccount);
            } else if (tx.status === 'REJECTED') {
                // Notificar al EMISOR de una devolución/rechazo
                targetAccount = tx.sender;
                targetJID = findLocalUserJID(targetAccount);
                isRefund = true;
            } else {
                console.warn(`[CypherTrans] Advertencia: Transacción ${tx.tx_id} en estado inesperado (${tx.status}).`);
                continue;
            }

            // 2. Procesar si se encontró un usuario en la DB
            if (!targetJID) {
                const accountRole = isRefund ? 'Emisor' : 'Receptor';
                console.log(`[CypherTrans] ERROR: Usuario ${targetAccount} (${accountRole}) no encontrado en la DB local para TX ${tx.tx_id}.`);
                continue; // Pasar a la siguiente transacción
            }

            let baseCaption;
            let messageOptions;
            const receiptUrl = `${API_URL}/receipt/${tx.tx_id}`;
            const targetUserStandardJID = `${extractUserNumber(targetAccount)}@s.whatsapp.net`;
            
            if (tx.status === 'COMPLETED') {
                // --- LÓGICA DE DEPÓSITO EXITOSO (Para el RECEPTOR) ---

                const depositAmount = tx.received_amount || tx.amount; 
               
                // Lógica de DEPOSITAR el monto en la DB local
                if (typeof global.db.data.users[targetJID].bank !== 'number') {
                    global.db.data.users[targetJID].bank = 0;
                }
                global.db.data.users[targetJID].bank += depositAmount * 1; 
                const newBankBalance = global.db.data.users[targetJID].bank;
                console.log(`[CypherTrans] ${depositAmount} depositado en el banco de ${targetJID}.`);
               
                // 3. Preparar el mensaje de éxito usando NOMBRES de moneda
                const isCrossCurrency = tx.sent_currency !== tx.received_currency;
               
                baseCaption = `${emoji} *— ¡DEPÓSITO MULTIBOT APROBADO! —*` +
                    `\n\n*Desde:* ${tx.sender}` +
                    `\n*ID Transacción:* \`${tx.tx_id}\`` +
                    `\n\n*Monto Enviado:* ${tx.amount} ${getCurrencyName(tx.sent_currency)}`;
                
                if (tx.fee > 0) {
                    baseCaption += `\n*Comisión Aplicada:* -${tx.fee} ${getCurrencyName(tx.sent_currency)}`;
                }

                if (isCrossCurrency) {
                     baseCaption += `\n*Tasa de Cambio:* 1 ${getCurrencyName(tx.sent_currency)} = ${tx.exchange_rate} ${getCurrencyName(tx.received_currency)}`;
                }
                
                baseCaption += `\n\n*Monto Depositado:* *${depositAmount} ${getCurrencyName(tx.received_currency)}*` +
                    `\n\n*Tu Nuevo Saldo en el Banco:* ${newBankBalance} ${getCurrencyName(moneda)}` +
                    `\n\n_El dinero ha sido depositado directamente en tu cuenta de banco._`;

                // Lógica de recibo con imagen (Base64)
                const imageBase64Data = tx.image_base64;
                if (imageBase64Data && imageBase64Data.length > 100) { 
                    const media = Buffer.from(imageBase64Data, 'base64');
                    messageOptions = {
                        image: media, 
                        caption: baseCaption,
                        mimetype: 'image/png',
                        mentions: [targetUserStandardJID]
                    };
                } else {
                    const textMessage = baseCaption +
                        `\n\nComprobante (HTML): ${receiptUrl}`;
                    
                    messageOptions = {
                        text: textMessage,
                        mentions: [targetUserStandardJID]
                    };
                }
            
            } else if (tx.status === 'REJECTED') {

                // --- LÓGICA DE TRANSACCIÓN RECHAZADA (Para el EMISOR) ---

                // El re-crédito ocurrió en el backend de CypherTrans.
                console.log(`[CypherTrans] Transacción ${tx.tx_id} fue RECHAZADA. Se notifica la devolución a ${targetJID}.`);

                baseCaption = `${emoji2} *— ¡TRANSFERENCIA RECHAZADA Y DEVUELTA! —*` +
                    `\n\n*ID Transacción:* \`${tx.tx_id}\`` +
                    `\n*Destinatario Intentado:* ${tx.recipient}` +
                    // Usamos el nombre de la moneda enviada
                    `\n\nLa transferencia de *${tx.amount} ${getCurrencyName(tx.sent_currency)}* fue *RECHAZADA* por el sistema o por el administrador.` +
                    `\n\n*Motivo Común:* Alto valor (>100K) pendiente de aprobación, o problemas con la cuenta de destino/red.` +
                    // Se re-acredita el monto total enviado.
                    `\n\n💰 *FONDOS DEVUELTOS:* El monto total ha sido *re-acreditado* a tu cuenta de origen.` +
                    `\n\n*Por favor, verifica tu saldo actual.*`;

                messageOptions = {
                    text: baseCaption,
                    mentions: [targetUserStandardJID]
                };

            } // Fin de la lógica de estado
                
            // 4. Enviar el mensaje
            try {
                await sock.sendMessage(targetJID, messageOptions);
                const action = tx.status === 'COMPLETED' ? 'depósito' : 'devolución';
                console.log(`[CypherTrans] Notificación de ${action} enviada a ${targetJID}.`);
            } catch (e) {
                console.error(`[CypherTrans] ERROR: Falló el envío del mensaje/recibo a ${targetJID}.`, e.message);
            }
        } // Fin del bucle for
    } catch (error) {
        console.error("Error al verificar CypherTrans:", error.message);
    }
}

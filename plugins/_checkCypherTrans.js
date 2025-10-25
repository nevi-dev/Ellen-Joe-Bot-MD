// Asegúrate de que estas dependencias estén disponibles.
import fetch from 'node-fetch'; 
import fs from 'fs/promises'; // Para operaciones asíncronas de archivos
import path from 'path'; // Para manejar rutas de archivos

// --- CONFIGURACIÓN DE CYPHERTRANS ---
const HASH_FILE_PATH = path.join(process.cwd(), 'src', 'hash.json'); 
const API_URL = 'https://cyphertrans.duckdns.org'; 

// Las variables globales 'global.db.data.users' y 'moneda' son necesarias para esta función.

function extractUserNumber(recipientAccount) {
    // Los últimos 7 caracteres son el tag del bot (ej: MARC1234)
    return recipientAccount.slice(0, -7); 
}

async function findJIDInGroups(userNumber, sock) {
    const standardJID = `${userNumber}@s.whatsapp.net`;
    try {
        const allGroups = await sock.groupFetchAllParticipating();
        
        for (const [jid, groupData] of Object.entries(allGroups)) {
            if (!groupData.participants) continue;
            for (const participant of groupData.participants) {
                const participantNumber = participant.id.split('@')[0];
                if (participantNumber === userNumber) {
                    return participant.id; 
                }
            }
        }
    } catch (error) {
        console.error("Error al buscar JID en grupos:", error);
    }
    return standardJID; 
}

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

        console.log(`[CypherTrans] ${newTransactions.length} nuevas transacciones encontradas.`);

        for (const tx of newTransactions) {
            const userNumber = extractUserNumber(tx.recipient);
            const JID = await findJIDInGroups(userNumber, sock); 

            if (JID && global.db.data.users[JID]) {
                const amount = tx.amount; 
                const receiptUrl = `${API_URL}/receipt/${tx.tx_id}`;
                const contactId = JID.split('@')[0];
                
                // --- LÓGICA DE DEPÓSITO AL BANCO ---
                if (typeof global.db.data.users[JID].bank !== 'number') {
                    global.db.data.users[JID].bank = 0;
                }
                global.db.data.users[JID].bank += amount * 1; 
                // ------------------------------------
                
                let textoo = `✅ *¡Transferencia APROBADA!* @${contactId}\n\n`;
                textoo += `Monto: *${amount}*\n`;
                textoo += `De la cuenta: ${tx.sender}\n`;
                textoo += `ID Transacción: ${tx.tx_id}\n\n`;
                textoo += `*Se han depositado ${amount} ${moneda} en tu banco*. Ya no podrán robarlos.`; 
                textoo += `\nComprobante (HTML): ${receiptUrl}`;

                await sock.sendMessage(JID, { 
                    text: textoo, 
                    mentions: [JID] 
                });
                console.log(`[CypherTrans] Notificación enviada y ${amount} depositado en el banco de ${JID}.`);
                
            } else {
                console.log(`[CypherTrans] ERROR: Usuario ${userNumber} no encontrado en la DB o JID inválido.`);
            }
        }
    } catch (error) {
        console.error("Error al verificar CypherTrans:", error.message);
    }
}

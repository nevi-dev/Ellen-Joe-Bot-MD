import fetch from 'node-fetch';
import { Buffer } from 'buffer';
import fs from 'fs/promises';
import path from 'path';

// --- CONFIGURACIÓN Y CONSTANTES (Actualizadas) ---
const HASH_FILE_PATH = './src/hash.json';
const API_URL = 'https://cyphertrans.duckdns.org';

// Prefijos actualizados de tu main(6).py
const BOT_API_KEY = 'ellen'; // Clave de la API
const BOT_KEY_PREFIX = 'DEN'; // Nuevo prefijo para Deniques (Ellen)
const ALL_PREFIXES = ['WON', 'BER', 'DEN']; // Wones, Berries, Deniques
const moneda = global.moneda || 'Deniques'; // Moneda local
const emoji = '✅';
const emoji2 = '❌';
const emojiWait = '⏳'; // Usado para transferencias pendientes

// =========================================================================
// === FUNCIÓN DE SOPORTE: Nombres de Moneda (Temporalmente incluida) ===
// =========================================================================

/**
 * Mapea el código de la divisa (ELLC, DEN, BER, WON) a su nombre completo.
 * NOTA: Esta función DEBE coincidir con la de tu otro handler.
 */
function getCurrencyName(code) {
    if (!code) return 'Moneda Desconocida';
    const upperCode = code.toUpperCase();
    switch (upperCode) {
        case 'ELLC': // Código base anterior
        case 'DEN':  // Prefijo actual (Deniques)
            return 'Deniques';
        case 'BER':  // Prefijo actual (Berries)
            return 'Berries';
        case 'WON':  // Prefijo actual (Wones)
            return 'Wones';
        default:
            return code; // Devuelve el código si no es reconocido
    }
}

// =========================================================================
// === FUNCIONES DE SOPORTE BÁSICAS ===
// =========================================================================

async function getBotHashFromFile() {
    try {
        const fullPath = path.join(process.cwd(), HASH_FILE_PATH);
        const data = await fs.readFile(fullPath, 'utf-8');
        const hashData = JSON.parse(data);
        return hashData?.bot_hash || null;
    } catch (error) {
        return null;
    }
}

function isNumber(x) {
    return !isNaN(x);
}

/** Extrae el prefijo (WON, BER, DEN) del número de cuenta CypherTrans. */
function getAccountPrefix(accountNumber) {
    if (accountNumber && accountNumber.length >= 7) {
        return accountNumber.slice(-7, -4).toUpperCase();
    }
    return null;
}

/** Verifica si la cuenta es de CypherTrans. */
function isCypherTransAccount(recipientArg) {
    const prefix = getAccountPrefix(recipientArg);
    return ALL_PREFIXES.includes(prefix);
}

async function callCypherTransAPI(botHash, sender, recipient, amount, type) {
    try {
        const response = await fetch(`${API_URL}/api/v1/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bot_hash: botHash,
                sender_account: sender,
                recipient_account: recipient,
                amount: amount,
                transfer_type: type
            })
        });
        const data = await response.json();
        // Aseguramos que los campos de conversión sean números para evitar problemas
        data.exchange_rate = parseFloat(data.exchange_rate);
        data.net_sent_amount = parseFloat(data.net_sent_amount);
        data.received_amount = parseFloat(data.received_amount);
        
        return { status: response.status, data: data };
    } catch (error) {
        console.error("Error en llamada a API CypherTrans:", error);
        return { status: 500, data: { error: 'Error de conexión con el servidor CypherTrans.' } };
    }
}


// =========================================================================
// === FUNCIONES DE ENVÍO DE MENSAJES ===
// =========================================================================

/** Envía el mensaje de ayuda (mejor estética). */
function sendHelpMessage(conn, m, usedPrefix, command) {
    const helpMessage = `
${emoji} *— Billetera y Transferencias —*

*Uso:* ${usedPrefix}${command} <cantidad> <destinatario> [tipo_opcional]

${usedPrefix}${command} *<cantidad> @mencion*
> Realiza una transferencia *Local* (banco -> cartera del receptor).

${usedPrefix}${command} *<cantidad> <CuentaCT>*
> Inicia una transferencia *Multibot* (requiere confirmación).

*Nota:* Las transferencias se realizan desde tu *Banco*.
`.trim();
    return conn.sendMessage(m.chat, { text: helpMessage, mentions: [m.sender] }, { quoted: m });
}

/** Envía el mensaje de confirmación de transferencia LOCAL. */
function sendLocalTransferConfirmation(conn, m, amount, totalInBank, who) {
    const mentionText = `@${who.split('@')[0]}`;
    const message = `
${emoji} *¡Transferencia Local Exitosa!*
 
*Monto Transferido:* *${amount} ${moneda}*
*Destinatario:* ${mentionText} (Recibido en Cartera)
 
${emoji2} *Balance de tu Banco:* ${totalInBank} ${moneda}
`.trim();
    return conn.sendMessage(m.chat, { text: message, mentions: [who] }, { quoted: m });
}


/** Envía la confirmación de transferencia externa (PENDIENTE o APROBADA) incluyendo el recibo si existe. */
function sendFinalTransferConfirmation(conn, chatId, txData, amount, newBankBalance, m) {
    // ... (Esta función sigue igual que en tu código original)
    const isApproved = txData.status === 'APROBADA';
    const isPending = txData.status.startsWith('PENDIENTE');
    const hasReceipt = txData.receipt_base64 && Buffer.from(txData.receipt_base64, 'base64').length > 0;
    
    // Status y Emoji
    let statusText;
    let emojiStatus;
    if (isApproved) {
        statusText = 'APROBADA (Instantánea)';
        emojiStatus = emoji;
    } else if (isPending) {
        statusText = txData.status === 'PENDIENTE_MANUAL' ? 'PENDIENTE (Revisión Manual)' : 'REGISTRADA (Pendiente)';
        emojiStatus = emojiWait;
    } else {
         statusText = 'ESTADO DESCONOCIDO';
         emojiStatus = '❓';
    }

    // Desglose del mensaje (usando los nuevos campos de la API)
    // Usamos getCurrencyName()
    const sentCurrency = getCurrencyName(txData.sent_currency || BOT_KEY_PREFIX);
    const receivedCurrency = getCurrencyName(txData.received_currency || BOT_KEY_PREFIX);
    const isCrossCurrency = sentCurrency !== receivedCurrency;
    
    let caption = `${emojiStatus} *¡Transferencia Multibot ${statusText}!*`;
    
    // 1. Monto enviado y Comisión
    caption += `\n\n*Monto Enviado:* ${amount} ${sentCurrency}`;
    if (txData.fee_applied && txData.fee_applied > 0) {
        caption += `\n*Comisión Aplicada:* -${txData.fee_applied} ${sentCurrency}`;
    }
    
    // 2. Conversión (Solo si es externa o tiene un cambio)
    if (isCrossCurrency) {
        caption += `\n*Tasa de Cambio:* 1 ${sentCurrency} = ${txData.exchange_rate} ${receivedCurrency}`;
    }
    
    // 3. Monto Recibido
    caption += `\n\n*Monto Recibido:* *${txData.received_amount || amount} ${receivedCurrency}*`;
    
    // 4. IDs y Balances
    caption += `\n*ID Transacción:* \`${txData.tx_id}\``;
    caption += `\n\n*Tu Nuevo Balance en Banco:* ${newBankBalance} ${moneda}`;
    
    // 5. Tracking URL (Solo si no es aprobada o no tiene imagen)
    if (isPending || !hasReceipt) {
        caption += `\n\n🔗 *Seguimiento:* ${API_URL}${txData.tracking_url}`;
    }

    const quotedOptions = m && m.chat ? { quoted: m } : {};
    
    if (hasReceipt) {
        // Enviar como imagen con caption
        const media = Buffer.from(txData.receipt_base64, 'base64');
        return conn.sendMessage(chatId, { image: media, caption: caption, ...quotedOptions });
    } else {
        // Enviar como texto plano
        return conn.sendMessage(chatId, { text: caption, ...quotedOptions });
    }
}


// =========================================================================
// === FUNCIÓN PRINCIPAL DEL HANDLER (MODIFICADA) ===
// =========================================================================

async function handler(m, { conn, args, usedPrefix, command }) {
    if (!m || !m.sender) {
        return;
    }

    const user = global.db.data.users[m.sender];
    const bankType = 'bank';
    const txState = 'pendingCypherTransTx'; // Clave para guardar la transacción pendiente
    
    let amount, recipientArg, typeShortcut;
    let isConfirmation = false;
    
    // 1. Lógica para manejar comandos y respuestas de botones

    // Comandos de confirmación (Sí/No) o ejecución rápida
    if (args.length === 4 && (args[0] === 'CONFIRM' || args[0] === 'CANCEL') && isNumber(args[1])) {
        // Formato: .transferir CONFIRM <amount> <recipient> <type>
        isConfirmation = true;
        const action = args[0]; // CONFIRM o CANCEL
        amount = parseInt(args[1]);
        recipientArg = args[2].trim();
        typeShortcut = args[3].trim();
        
        // Verifica que la transacción pendiente guardada coincida
        const pendingTx = user[txState];
        if (!pendingTx || pendingTx.amount !== amount || pendingTx.recipient !== recipientArg || pendingTx.type !== typeShortcut) {
            return m.reply(`${emoji2} La confirmación no coincide con la última transferencia pendiente. Intenta de nuevo.`);
        }

        // Si es CANCEL, borra y notifica
        if (action === 'CANCEL') {
            user[txState] = null; // Elimina el estado pendiente
            return m.reply(`${emoji2} Transferencia a ${recipientArg} por ${amount} ${moneda} *cancelada*.`);
        }
        // Si es CONFIRM, continúa la ejecución después del bloque if
    }
    // Comando inicial de transferencia
    else if (args.length >= 2) {
        amount = isNumber(args[0]) ? parseInt(args[0]) : 0;
        recipientArg = args[1].trim();
        typeShortcut = args[2] ? args[2].trim() : null; // Para tipo 1 o 2 en el comando inicial
    } else {
        // Uso incorrecto - Muestra ayuda mejorada
        return sendHelpMessage(conn, m, usedPrefix, command);
    }

    amount = Math.min(Number.MAX_SAFE_INTEGER, Math.max(100, amount)) * 1;
   
    const botHash = await getBotHashFromFile();
    
    // Verificación de balance
    if (user[bankType] * 1 < amount) {
        return conn.sendMessage(m.chat, {text: `${emoji2} Solo tienes *${user[bankType]} ${moneda}* en el banco para transferir.`, mentions: [m.sender]}, {quoted: m});
    }

    // Si ya existe una transacción pendiente y no es una confirmación, no deja continuar
    if (user[txState] && !isConfirmation) {
         return m.reply(`${emojiWait} Ya tienes una transferencia pendiente de confirmación a *${user[txState].recipient}* por *${user[txState].amount} ${moneda}*. Responde al mensaje anterior o usa ${usedPrefix + command} CANCEL.`);
    }

    // --- LÓGICA DE TRANSFERENCIA ---

    // 1. TRANSFERENCIA LOCAL
    if (recipientArg.includes('@s.whatsapp.net') || recipientArg.includes('@')) {
        // ... (Lógica local sin cambios, sin confirmación)
        const who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : (recipientArg.replace(/[@ .+-]/g, '') + '@s.whatsapp.net');
        
        if (!who || !(who in global.db.data.users)) {
             const recipientDisplay = who ? who.split('@')[0] : 'mencionado';
             return conn.sendMessage(m.chat, {text: `${emoji2} El usuario *${recipientDisplay}* no está en la base de datos local.`, mentions: [m.sender]}, {quoted: m});
        }
        
        user[bankType] -= amount * 1;
        global.db.data.users[who]['coin'] = (global.db.data.users[who]['coin'] || 0) + amount * 1;
        
        const totalInBank = user[bankType];
        
        return sendLocalTransferConfirmation(conn, m, amount, totalInBank, who);
    } 

    // 2. TRANSFERENCIA MULTIBOT (CypherTrans)
    if (isCypherTransAccount(recipientArg)) {
        const senderAccount = global.db.data.users[m.sender]?.cypherTransAccount;

        if (!botHash || !senderAccount) {
            return m.reply(`${emoji2} El sistema multibot no está activado o tu cuenta no está vinculada. Usa *${usedPrefix}crearcuenta* o *${usedPrefix}registerbot*.`);
        }

        const recipientPrefix = getAccountPrefix(recipientArg);
        const recipientAccount = recipientArg;
        let transferType = null;
        const isInternalBot = BOT_KEY_PREFIX === recipientPrefix;
        
        // C.1. Transferencia al mismo bot (DEN)
        if (isInternalBot) {
            transferType = 'instant';
        } 
        // C.2. Tipo de transferencia definido por el usuario (1 o 2)
        else if (typeShortcut === '1' || typeShortcut === '2') {
             transferType = (typeShortcut === '1' ? 'normal' : 'instant');
        }

        // --- Bucle de Confirmación/Ejecución ---

        // Si es la PRIMERA VEZ (No es confirmación) y requiere tipo (no es interno), se pide la selección
        if (!isConfirmation && !isInternalBot && !transferType) {
            
            // E. Bots Diferentes (Menú de selección)
            const buttons = [
                {buttonId: `${usedPrefix + command} ${amount} ${recipientAccount} 1`, buttonText: {displayText: '1: Lenta (Normal) 🐢'}, type: 1},
                {buttonId: `${usedPrefix + command} ${amount} ${recipientAccount} 2`, buttonText: {displayText: '2: Rápida (Instantánea) ⚡'}, type: 1}
            ];
        
            const buttonMessage = {
                text: `🌐 *Selecciona la Velocidad de Transferencia*\n\n` + 
                      `*Destino:* ${getCurrencyName(recipientPrefix)} | *Monto:* ${amount} ${moneda}\n\n` +
                      `*1. Lenta (Normal):* Tarda hasta 24h. Sin comisión base. (Recomendado)\n` +
                      `*2. Rápida (Instantánea):* Tarda ~8min. Aplica comisión.`,
                footer: 'CypherTrans | Selecciona una opción:',
                buttons: buttons,
                headerType: 1
            };

            return conn.sendMessage(m.chat, buttonMessage, { quoted: m });
        }
        
        // Si YA SE TIENE el tipo de transferencia (Interna, o Externa y ya seleccionó), se pide la confirmación SI NO HA CONFIRMADO
        if (!isConfirmation && transferType) {

            // Guarda el estado de la transacción pendiente
            user[txState] = { amount, recipient: recipientAccount, type: typeShortcut || 'instant' };

            const buttons = [
                // Los botones envían el comando completo de confirmación (CONFIRM/CANCEL <amount> <recipient> <type>)
                {buttonId: `${usedPrefix + command} CONFIRM ${amount} ${recipientAccount} ${typeShortcut || 'instant'}`, buttonText: {displayText: '✅ SÍ, CONFIRMO'}, type: 1},
                {buttonId: `${usedPrefix + command} CANCEL ${amount} ${recipientAccount} ${typeShortcut || 'instant'}`, buttonText: {displayText: '❌ NO, CANCELAR'}, type: 1}
            ];

            const transferTypeText = isInternalBot ? 'INSTANTÁNEA (Mismo Bot)' : (transferType === 'instant' ? 'RÁPIDA (Instantánea)' : 'LENTA (Normal)');

            const confirmationMessage = {
                text: `⚠️ *¿CONFIRMAS ESTA TRANSFERENCIA MULTIBOT?* ⚠️\n\n` + 
                      `*Monto:* *${amount} ${moneda}*\n` +
                      `*Destino:* ${recipientAccount} (${getCurrencyName(recipientPrefix)})\n` +
                      `*Tipo:* ${transferTypeText}\n\n` +
                      `*¡El dinero será restado de tu banco inmediatamente al confirmar!*`,
                footer: 'Pulsa SÍ para continuar. Pulsa NO para cancelar.',
                buttons: buttons,
                headerType: 1
            };

            return conn.sendMessage(m.chat, confirmationMessage, { quoted: m });
        }

        // --- Lógica de EJECUCIÓN FINAL (Solo llega aquí si isConfirmation es true) ---
        if (isConfirmation) {
            
            // Limpia el estado pendiente
            user[txState] = null;
            
            // Se resta el dinero ANTES de la llamada a la API
            user[bankType] -= amount * 1;
            
            // Usamos el tipo que viene en el estado, si no, 'instant' (default para interno)
            const finalTransferType = typeShortcut || 'instant'; 
            
            const txResponse = await callCypherTransAPI(botHash, senderAccount, recipientAccount, amount, finalTransferType);
            
            if (txResponse.status === 200) {
                const txData = txResponse.data;
                // Envía el mensaje y, si hay base64 y está aprobado, la imagen
                return sendFinalTransferConfirmation(conn, m.chat, txData, amount, user[bankType], m);
                
            } else {
                // Si falla la API, se devuelve el dinero
                user[bankType] += amount * 1; 
                return m.reply(`${emoji2} Falló la transferencia a ${recipientAccount}. Se te ha devuelto el dinero. ${txResponse.data.error || 'Error desconocido'}`);
            }
        }

    }

    // 3. ERROR DE FORMATO
    return m.reply(`${emoji2} Formato de destinatario no reconocido. Debe ser @mencion o una cuenta CypherTrans (ej: 01234DEN1234).`);
}


handler.help = ['pay', 'transfer'];
handler.tags = ['rpg'];
handler.command = ['pay', 'transfer', 'transferir'];
handler.group = true;
handler.register = true;

export default handler;

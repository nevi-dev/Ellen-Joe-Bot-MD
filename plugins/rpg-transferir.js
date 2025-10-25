// handler.js (pay/transfer)

import fetch from 'node-fetch';
import { Buffer } from 'buffer';

// --- CONFIGURACIÓN Y CONSTANTES (Sin cambios) ---
const HASH_FILE_PATH = './src/hash.json';
const API_URL = 'https://cyphertrans.duckdns.org';
const BOT_API_KEY = 'ellen';
const BOT_KEY_PREFIX = 'ELL'; 
const ALL_PREFIXES = ['MAR', 'LUF', 'ELL', 'RUB'];
const moneda = global.moneda || 'Coin';
const emoji = '✅';
const emoji2 = '❌';

// --- FUNCIONES DE SOPORTE BÁSICAS (Sin cambios) ---

async function getBotHashFromFile() {
    // ... (Tu función getBotHashFromFile sin cambios)
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
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

async function callCypherTransAPI(botHash, sender, recipient, amount, type) {
    // ... (Tu función callCypherTransAPI sin cambios)
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
        return { status: response.status, data: data };
    } catch (error) {
        console.error("Error en llamada a API CypherTrans:", error);
        return { status: 500, data: { error: 'Error de conexión con el servidor CypherTrans.' } };
    }
}


// --- FUNCIONES DE CONFIRMACIÓN CORREGIDAS ---

/** * Envía el mensaje final de confirmación al usuario (para transferencias PENDIENTES o externas).
 * @param {object} m El objeto del mensaje original.
 */
function sendTransferConfirmation(conn, chatId, txData, amount, newBankBalance, m) {
    const statusText = txData.status === 'APROBADA' ? 'APROBADA (Instantánea)' : 'REGISTRADA (Pendiente)';
    const emojiStatus = txData.status === 'APROBADA' ? '✅' : '⏳';
    const feeDisplay = txData.fee_applied ? `Comisión: ${txData.fee_applied} ${moneda}\n` : 'Comisión: 0\n';

    const message = `${emojiStatus} *¡Transferencia ${statusText}!*\n\n` +
                    `*Monto:* ${amount} ${moneda}\n` +
                    `${feeDisplay}` +
                    `*ID Transacción:* ${txData.tx_id}\n` +
                    `*Tu nuevo balance en banco:* ${newBankBalance} ${moneda}\n\n` +
                    `Puedes seguir el estado aquí: ${API_URL}${txData.tracking_url}`;

    // APLICAMOS LA CITA CONDICIONAL
    const quotedOptions = m && m.chat ? { quoted: m } : {};

    return conn.sendMessage(chatId, { text: message, ...quotedOptions });
}


/** * Envía la confirmación con la imagen del recibo (para transferencias INTERNAS/APROBADAS).
 * @param {object} m El objeto del mensaje original.
 */
function sendInternalTransferConfirmation(conn, chatId, txData, amount, newBankBalance, m) {
    const feeDisplay = txData.fee_applied ? `Comisión: ${txData.fee_applied} ${moneda}\n` : 'Comisión: 0\n';
    const media = Buffer.from(txData.receipt_base64, 'base64');
    
    const caption = `✅ *¡Transferencia INTERNA APROBADA! (Instantánea)*\n\n` +
                    `*Monto:* ${amount} ${moneda}\n` +
                    `${feeDisplay}` +
                    `*ID Transacción:* ${txData.tx_id}\n` +
                    `*Tu nuevo balance en banco:* ${newBankBalance} ${moneda}\n`;

    // APLICAMOS LA CITA CONDICIONAL
    const quotedOptions = m && m.chat ? { quoted: m } : {};

    // Envía la imagen del recibo Base64
    return conn.sendMessage(chatId, { image: media, caption: caption, ...quotedOptions });
}


// --- FUNCIÓN PRINCIPAL DEL HANDLER (Cuerpo de la función principal, solo se actualizan las llamadas) ---

async function handler(m, { conn, args, usedPrefix, command }) {
    // *** VERIFICACIÓN CRÍTICA DEL MENSAJE (Sin cambios, es necesaria) ***
    if (!m || !m.sender) {
        return; 
    }

    const user = global.db.data.users[m.sender];
    const bankType = 'bank';
    
    let amount, recipientArg, typeShortcut;
    let isButtonResponse = false;
    
    // Lógica para detectar si es una respuesta de botón o un comando directo.
    if (args.length === 3 && (args[0] === '1' || args[0] === '2') && isNumber(args[1]) && args[2].length > 7) {
        typeShortcut = args[0];
        amount = parseInt(args[1]);
        recipientArg = args[2].trim();
        isButtonResponse = true;
    } else if (args.length >= 2) {
        amount = isNumber(args[0]) ? parseInt(args[0]) : 0;
        recipientArg = args[1].trim();
        typeShortcut = args[2] ? args[2].trim() : null;
    } else {
        const helpMessage = `${emoji} *Uso:* Debes ingresar la cantidad y el destinatario...\n`.trim();
        return conn.sendMessage(m.chat, {text: helpMessage, mentions: [m.sender]}, {quoted: m});
    }

    amount = Math.min(Number.MAX_SAFE_INTEGER, Math.max(100, amount)) * 1;
    const botHash = await getBotHashFromFile();
    
    if (user[bankType] * 1 < amount) {
        return conn.sendMessage(m.chat, {text: `${emoji2} Solo tienes *${user[bankType]} ${moneda}* en el banco para transferir.`, mentions: [m.sender]}, {quoted: m});
    }

    // 1. TRANSFERENCIA LOCAL
    if (!isButtonResponse && (recipientArg.includes('@s.whatsapp.net') || recipientArg.includes('@'))) {
        const who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : (recipientArg.replace(/[@ .+-]/g, '') + '@s.whatsapp.net');
        
        if (!who || !(who in global.db.data.users)) {
             const recipientDisplay = who ? who.split('@')[0] : 'mencionado';
             return conn.sendMessage(m.chat, {text: `${emoji2} El usuario *${recipientDisplay}* no está en la base de datos local.`, mentions: [m.sender]}, {quoted: m});
        }
        
        user[bankType] -= amount * 1;
        global.db.data.users[who]['coin'] = (global.db.data.users[who]['coin'] || 0) + amount * 1;
        
        const mentionText = `@${who.split('@')[0]}`;
        const totalInBank = user[bankType];
        
        return conn.sendMessage(m.chat, {text: `${emoji} Transferencia local exitosa!\nTransferiste *${amount} ${moneda}* a ${mentionText}\n> Ahora tienes *${totalInBank} ${moneda}* en tu banco.`, mentions: [who]}, {quoted: m});
    } 

    // 2. TRANSFERENCIA MULTIBOT
    const isCypherTransAccount = recipientArg.length > 7 && ALL_PREFIXES.some(prefix => recipientArg.endsWith(prefix + recipientArg.slice(-4)));

    if (isCypherTransAccount) {
        const senderAccount = global.db.data.users[m.sender]?.cypherTransAccount;

        if (!botHash || !senderAccount) {
            return m.reply(`${emoji2} El sistema multibot no está activado o tu cuenta no está vinculada.`);
        }

        const recipientPrefix = recipientArg.slice(-7, -4);
        const recipientAccount = recipientArg;
        let transferType = null;
        
        // C.1. Transferencia al mismo bot (ELL)
        if (BOT_KEY_PREFIX === recipientPrefix) {
            transferType = 'instant';
        } else if (typeShortcut === '1' || typeShortcut === '2') {
             transferType = (typeShortcut === '1' ? 'normal' : 'instant');
        }
        
        if (transferType) {
            user[bankType] -= amount * 1;
            
            const txResponse = await callCypherTransAPI(botHash, senderAccount, recipientAccount, amount, transferType);
            
            if (txResponse.status === 200) {
                if (txResponse.data.status === 'APROBADA' && txResponse.data.receipt_base64) {
                    // LLAMADA CORREGIDA: Pasar 'm'
                    return sendInternalTransferConfirmation(conn, m.chat, txResponse.data, amount, user[bankType], m);
                }
                // LLAMADA CORREGIDA: Pasar 'm'
                return sendTransferConfirmation(conn, m.chat, txResponse.data, amount, user[bankType], m);
                
            } else {
                user[bankType] += amount * 1; 
                return m.reply(`${emoji2} Falló la transferencia a ${recipientAccount}. ${txResponse.data.error || 'Error desconocido'}`);
            }
        }
        
        // E. Bots Diferentes (Menú de selección)
        const buttons = [
            {buttonId: `${usedPrefix + command} 1 ${amount} ${recipientAccount}`, buttonText: {displayText: '1: Lenta (Normal)'}, type: 1},
            {buttonId: `${usedPrefix + command} 2 ${amount} ${recipientAccount}`, buttonText: {displayText: '2: Rápida (Instantánea)'}, type: 1}
        ];
        
        const buttonMessage = {
            text: `🌐 Transferencia Multibot a ${recipientPrefix}. *Monto:* ${amount} ${moneda}\n\nPor favor, selecciona la velocidad...`,
            footer: 'Selecciona una opción:',
            buttons: buttons,
            headerType: 1
        };

        return conn.sendMessage(m.chat, buttonMessage, { quoted: m });
    }

    // 3. ERROR DE FORMATO
    return m.reply(`${emoji2} Formato de destinatario no reconocido.`);
}


handler.help = ['pay', 'transfer'];
handler.tags = ['rpg'];
handler.command = ['pay', 'transfer', 'transferir'];
handler.group = true;
handler.register = true;

export default handler;

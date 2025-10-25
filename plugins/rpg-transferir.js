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
const emojiWait = '⏳'; // Usado para transferencias pendientes

// --- FUNCIONES DE SOPORTE BÁSICAS (Sin cambios) ---

async function getBotHashFromFile() {
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


// --- FUNCIONES DE ENVÍO DE MENSAJES CON ESTÉTICA MEJORADA ---

/** Envía el mensaje de ayuda (mejor estética). */
function sendHelpMessage(conn, m, usedPrefix, command) {
    const helpMessage = `
${emoji} *— Billetera y Transferencias —*

*Uso:* ${usedPrefix}${command} <cantidad> <destinatario> [tipo_opcional]

${usedPrefix}${command} *<cantidad> @mencion*
> Realiza una transferencia *Local* (banco -> cartera del receptor).

${usedPrefix}${command} *<cantidad> <CuentaCT>*
> Inicia una transferencia *Multibot* (requiere seleccionar velocidad).

${usedPrefix}${command} *<cantidad> <CuentaCT> [1|2]*
> Transferencia *Multibot Rápida*. (1=Normal/Lenta, 2=Instantánea/Rápida)

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


/** Envía la confirmación de transferencia externa (PENDIENTE o APROBADA sin base64). */
function sendTransferConfirmation(conn, chatId, txData, amount, newBankBalance, m) {
    const isApproved = txData.status === 'APROBADA';
    const statusText = isApproved ? 'APROBADA (Instantánea)' : 'REGISTRADA (Pendiente)';
    const emojiStatus = isApproved ? emoji : emojiWait;
    const feeDisplay = txData.fee_applied ? `Comisión: *${txData.fee_applied} ${moneda}*\n` : 'Comisión: *0 ${moneda}*\n';

    const message = `
${emojiStatus} *¡Transferencia Multibot ${statusText}!*
 
*Monto Enviado:* ${amount} ${moneda}
${feeDisplay}
*ID Transacción:* \`${txData.tx_id}\`
 
*Tu Balance en Banco:* ${newBankBalance} ${moneda}
 
🔗 *Seguimiento:* ${API_URL}${txData.tracking_url}
`.trim();

    const quotedOptions = m && m.chat ? { quoted: m } : {};
    return conn.sendMessage(chatId, { text: message, ...quotedOptions });
}


/** Envía la confirmación con la imagen del recibo (para transferencias INTERNAS/APROBADAS). */
function sendInternalTransferConfirmation(conn, chatId, txData, amount, newBankBalance, m) {
    const feeDisplay = txData.fee_applied ? `Comisión: *${txData.fee_applied} ${moneda}*\n` : 'Comisión: *0 ${moneda}*\n';
    const media = Buffer.from(txData.receipt_base64, 'base64');
    
    const caption = `
${emoji} *¡Transferencia INTERNA APROBADA! (Instantánea)*
 
*Monto Enviado:* ${amount} ${moneda}
${feeDisplay}
*ID Transacción:* \`${txData.tx_id}\`
 
*Tu Nuevo Balance en Banco:* ${newBankBalance} ${moneda}
 
_Adjunto el recibo de la transacción._
`.trim();

    const quotedOptions = m && m.chat ? { quoted: m } : {};
    // Envía la imagen del recibo Base64
    return conn.sendMessage(chatId, { image: media, caption: caption, ...quotedOptions });
}


// --- FUNCIÓN PRINCIPAL DEL HANDLER ---

async function handler(m, { conn, args, usedPrefix, command }) {
    // *** VERIFICACIÓN CRÍTICA DEL MENSAJE ***
    if (!m || !m.sender) {
        return; 
    }

    const user = global.db.data.users[m.sender];
    const bankType = 'bank';
    
    let amount, recipientArg, typeShortcut;
    let isButtonResponse = false;
    
    // 1. Lógica para determinar el tipo de argumento
    if (args.length === 3 && (args[0] === '1' || args[0] === '2') && isNumber(args[1]) && args[2].length > 7) {
        // Respuesta del botón o comando rápido/completo
        typeShortcut = args[0];
        amount = parseInt(args[1]);
        recipientArg = args[2].trim();
        isButtonResponse = true;
    } else if (args.length >= 2) {
        // Comando inicial
        amount = isNumber(args[0]) ? parseInt(args[0]) : 0;
        recipientArg = args[1].trim();
        typeShortcut = args[2] ? args[2].trim() : null;
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

    // --- LÓGICA DE TRANSFERENCIA ---

    // 1. TRANSFERENCIA LOCAL (ya estaba funcionando, solo mejoramos el mensaje)
    if (!isButtonResponse && (recipientArg.includes('@s.whatsapp.net') || recipientArg.includes('@'))) {
        const who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : (recipientArg.replace(/[@ .+-]/g, '') + '@s.whatsapp.net');
        
        if (!who || !(who in global.db.data.users)) {
             const recipientDisplay = who ? who.split('@')[0] : 'mencionado';
             return conn.sendMessage(m.chat, {text: `${emoji2} El usuario *${recipientDisplay}* no está en la base de datos local.`, mentions: [m.sender]}, {quoted: m});
        }
        
        user[bankType] -= amount * 1;
        global.db.data.users[who]['coin'] = (global.db.data.users[who]['coin'] || 0) + amount * 1;
        
        const totalInBank = user[bankType];
        
        // Muestra confirmación local con estética mejorada
        return sendLocalTransferConfirmation(conn, m, amount, totalInBank, who);
    } 

    // 2. TRANSFERENCIA MULTIBOT
    const isCypherTransAccount = recipientArg.length > 7 && ALL_PREFIXES.some(prefix => recipientArg.endsWith(prefix + recipientArg.slice(-4)));

    if (isCypherTransAccount) {
        const senderAccount = global.db.data.users[m.sender]?.cypherTransAccount;

        if (!botHash || !senderAccount) {
            return m.reply(`${emoji2} El sistema multibot no está activado o tu cuenta no está vinculada. Usa *${usedPrefix}crearcuenta* o *${usedPrefix}registerbot*.`);
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
                    return sendInternalTransferConfirmation(conn, m.chat, txResponse.data, amount, user[bankType], m);
                }
                return sendTransferConfirmation(conn, m.chat, txResponse.data, amount, user[bankType], m);
                
            } else {
                user[bankType] += amount * 1; 
                return m.reply(`${emoji2} Falló la transferencia a ${recipientAccount}. ${txResponse.data.error || 'Error desconocido'}`);
            }
        }
        
        // E. Bots Diferentes (Menú de selección) - Estética mejorada
        const buttons = [
            {buttonId: `${usedPrefix + command} 1 ${amount} ${recipientAccount}`, buttonText: {displayText: '1: Lenta (Normal) 🐢'}, type: 1},
            {buttonId: `${usedPrefix + command} 2 ${amount} ${recipientAccount}`, buttonText: {displayText: '2: Rápida (Instantánea) ⚡'}, type: 1}
        ];
        
        const buttonMessage = {
            text: `🌐 *Selecciona la Velocidad de Transferencia*\n\n` + 
                    `*Destino:* ${recipientPrefix} | *Monto:* ${amount} ${moneda}\n\n` +
                    `*1. Lenta (Normal):* Tarda hasta 24h. Sin comisión base. (Recomendado)\n` +
                    `*2. Rápida (Instantánea):* Tarda ~8min. Aplica comisión.`,
            footer: 'CypherTrans | Selecciona una opción:',
            buttons: buttons,
            headerType: 1
        };

        return conn.sendMessage(m.chat, buttonMessage, { quoted: m });
    }

    // 3. ERROR DE FORMATO
    return m.reply(`${emoji2} Formato de destinatario no reconocido. Debe ser @mencion o una cuenta CypherTrans (ej: XXXXXMARC1234).`);
}


handler.help = ['pay', 'transfer'];
handler.tags = ['rpg'];
handler.command = ['pay', 'transfer', 'transferir'];
handler.group = true;
handler.register = true;

export default handler;

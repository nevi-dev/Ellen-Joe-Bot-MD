import fetch from 'node-fetch';
import { Buffer } from 'buffer';
import fs from 'fs/promises';
import path from 'path';

// --- CONFIGURACIÓN Y CONSTANTES ---
const moneda = global.moneda || 'Deniques'; // Moneda local
const emoji = '✅';
const emoji2 = '❌';
const emojiWait = '⏳'; // Usado para transferencias pendientes

// =========================================================================
// === FUNCIONES DE SOPORTE BÁSICAS ===
// =========================================================================

function isNumber(x) {
    return !isNaN(x);
}

// =========================================================================
// === FUNCIONES DE ENVÍO DE MENSAJES ===
// =========================================================================

/** Envía el mensaje de ayuda (mejor estética). */
function sendHelpMessage(conn, m, usedPrefix, command) {
    const helpMessage = `
${emoji} *— Billetera y Transferencias —*

*Uso:* ${usedPrefix}${command} <cantidad> @mencion

> Ejemplo: ${usedPrefix}${command} 500 @user

*Nota:* Las transferencias se realizan de tu *Banco* al *Banco* del destinatario.
`.trim();
    return conn.sendMessage(m.chat, { text: helpMessage, mentions: [m.sender] }, { quoted: m });
}

/** Envía el mensaje de confirmación de transferencia. */
function sendTransferConfirmationMessage(conn, m, amount, newSenderBankBalance, who) {
    const mentionText = `@${who.split('@')[0]}`;
    const message = `
${emoji} *¡Transferencia Exitosa!*
 
*Monto Transferido:* *${amount} ${moneda}*
*Destinatario:* ${mentionText} (Recibido en su Banco)
 
${emoji} *Tu Nuevo Balance en Banco:* ${newSenderBankBalance} ${moneda}
`.trim();
    return conn.sendMessage(m.chat, { text: message, mentions: [who] }, { quoted: m });
}


// =========================================================================
// === FUNCIÓN PRINCIPAL DEL HANDLER ===
// =========================================================================

async function handler(m, { conn, args, usedPrefix, command }) {
    if (!m || !m.sender) {
        return;
    }

    const user = global.db.data.users[m.sender];
    const bankType = 'bank'; // Balance de origen y destino
    const txState = 'pendingLocalTx'; // Clave para guardar la transacción pendiente
    
    let amount, recipientJid, isConfirmation = false;
    
    // --- 1. PROCESAR ARGUMENTOS (Comando Inicial o Confirmación) ---

    if (args.length === 3 && (args[0] === 'CONFIRM' || args[0] === 'CANCEL') && isNumber(args[1])) {
        // Formato: .transferir CONFIRM <amount> <recipientJid>
        isConfirmation = true;
        const action = args[0]; // CONFIRM o CANCEL
        amount = parseInt(args[1]);
        recipientJid = args[2].trim();
        
        // Verifica que la transacción pendiente guardada coincida
        const pendingTx = user[txState];
        if (!pendingTx || pendingTx.amount !== amount || pendingTx.recipient !== recipientJid) {
            user[txState] = null; // Limpia el estado
            return m.reply(`${emoji2} La confirmación no coincide con la última transferencia pendiente. Intenta de nuevo.`);
        }

        // Si es CANCEL, borra y notifica
        if (action === 'CANCEL') {
            user[txState] = null; // Elimina el estado pendiente
            return m.reply(`${emoji2} Transferencia a @${recipientJid.split('@')[0]} por ${amount} ${moneda} *cancelada*.`, null, { mentions: [recipientJid] });
        }
        // Si es CONFIRM, continúa la ejecución.
    }
    // Comando inicial de transferencia
    else if (args.length >= 2) {
        amount = isNumber(args[0]) ? parseInt(args[0]) : 0;
        
        // Obtener el JID del destinatario (mención o argumento)
        recipientJid = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : (args[1].replace(/[@ .+-]/g, '') + '@s.whatsapp.net');
    } else {
        // Uso incorrecto - Muestra ayuda
        return sendHelpMessage(conn, m, usedPrefix, command);
    }

    // --- 2. VALIDACIONES GLOBALES ---
    
    amount = Math.min(Number.MAX_SAFE_INTEGER, Math.max(100, amount)) * 1;

    if (amount <= 0 || !isNumber(amount)) {
        return m.reply(`${emoji2} La cantidad a transferir debe ser un número positivo (mínimo 100 ${moneda}).`);
    }
    
    // A. Balance
    if (user[bankType] * 1 < amount) {
        return conn.sendMessage(m.chat, {text: `${emoji2} Solo tienes *${user[bankType]} ${moneda}* en el banco para transferir.`, mentions: [m.sender]}, {quoted: m});
    }

    // B. Existencia del Destinatario
    if (!recipientJid || !(recipientJid in global.db.data.users)) {
        const recipientDisplay = recipientJid ? recipientJid.split('@')[0] : 'mencionado';
        return conn.sendMessage(m.chat, {text: `${emoji2} El usuario *${recipientDisplay}* no está en la base de datos. Pídele que se registre.`, mentions: [m.sender]}, {quoted: m});
    }

    // C. Evitar autotransferencias
    if (recipientJid === m.sender) {
        return m.reply(`${emoji2} ¿Intentas enviarte dinero a ti mismo? ¡Hazlo por la cartera!`);
    }
    
    // D. Bloqueo por Pendiente (si ya hay una tx pendiente y no es confirmación)
    if (user[txState] && !isConfirmation) {
         return m.reply(`${emojiWait} Ya tienes una transferencia pendiente de confirmación a @${user[txState].recipient.split('@')[0]} por *${user[txState].amount} ${moneda}*. Responde al mensaje anterior o usa ${usedPrefix + command} CANCEL.`, null, { mentions: [user[txState].recipient] });
    }


    // --- 3. LÓGICA DE CONFIRMACIÓN O EJECUCIÓN ---

    if (!isConfirmation) {
        // Pide Confirmación (Guarda el estado y envía botones)

        // Guarda el estado de la transacción pendiente
        user[txState] = { amount, recipient: recipientJid, type: 'local' };

        const buttons = [
            // Los botones envían el comando completo de confirmación (CONFIRM/CANCEL <amount> <recipientJid>)
            {buttonId: `${usedPrefix + command} CONFIRM ${amount} ${recipientJid}`, buttonText: {displayText: '✅ SÍ, CONFIRMO'}, type: 1},
            {buttonId: `${usedPrefix + command} CANCEL ${amount} ${recipientJid}`, buttonText: {displayText: '❌ NO, CANCELAR'}, type: 1}
        ];

        const recipientDisplay = `@${recipientJid.split('@')[0]}`;

        const confirmationMessage = {
            text: `⚠️ *¿CONFIRMAS ESTA TRANSFERENCIA?* ⚠️\n\n` + 
                  `*Monto:* *${amount} ${moneda}*\n` +
                  `*Destino:* ${recipientDisplay} (Su Banco)\n\n` +
                  `*¡El dinero será restado de tu banco inmediatamente al confirmar!*`,
            footer: 'Pulsa SÍ para continuar. Pulsa NO para cancelar.',
            buttons: buttons,
            headerType: 1
        };

        return conn.sendMessage(m.chat, confirmationMessage, { quoted: m, mentions: [m.sender, recipientJid] });
    }

    // --- 4. EJECUCIÓN FINAL (Si isConfirmation es true) ---
    if (isConfirmation) {
            
        // Limpia el estado pendiente
        user[txState] = null;
        
        // DEDUCCIÓN Y TRANSFERENCIA
        const recipientData = global.db.data.users[recipientJid];

        // Deduce del emisor (Banco)
        user[bankType] -= amount * 1;
        
        // Suma al receptor (Banco)
        recipientData[bankType] = (recipientData[bankType] || 0) + amount * 1;
        
        const newSenderBankBalance = user[bankType];
        
        // Envía la confirmación final de éxito
        return sendTransferConfirmationMessage(conn, m, amount, newSenderBankBalance, recipientJid);
    }
}


handler.help = ['pay', 'transfer'];
handler.tags = ['rpg'];
handler.command = ['pay', 'transfer', 'transferir'];
handler.group = true;
handler.register = true;

export default handler;

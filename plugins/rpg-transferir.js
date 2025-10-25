// handler.js (pay/transfer)

import fetch from 'node-fetch';
import { Buffer } from 'buffer'; // Necesario para manejar Base64

// --- CONFIGURACIÓN DE CYPHERTRANS (Asegúrate de que estas rutas sean correctas) ---
const HASH_FILE_PATH = './src/hash.json';
const API_URL = 'https://cyphertrans.duckdns.org';
// --- LA CLAVE API DE ESTE BOT ---
const BOT_API_KEY = 'ellen';
const BOT_KEY_PREFIX = 'ELL'; // El prefijo de ELLEN es ELL (según tu app.py)

// --- VARIABLES GLOBALES DEL BOT (Ajusta si es necesario) ---
const ALL_PREFIXES = ['MAR', 'LUF', 'ELL', 'RUB'];
const moneda = global.moneda || 'Coin';
const emoji = '✅';
const emoji2 = '❌';

// --- FUNCIÓN PARA OBTENER EL HASH DEL BOT ---
async function getBotHashFromFile() {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const fullPath = path.join(process.cwd(), HASH_FILE_PATH);
        const data = await fs.readFile(fullPath, 'utf-8');
        const hashData = JSON.parse(data);
        return hashData?.bot_hash || null;
    } catch (error) {
        return null; // Archivo no existe o error
    }
}

// *** IMPORTANTE: Si isNumber no está en tu entorno global, debe estar definida aquí o importada ***
function isNumber(x) {
    return !isNaN(x);
}
// **********************************************************************************************

// --- FUNCIÓN PRINCIPAL DEL HANDLER (Usado para el comando inicial y la respuesta del botón) ---
async function handler(m, { conn, args, usedPrefix, command }) {
    // *** SOLUCIÓN A TypeError: cannot read properties of undefined (reading 'fromMe') ***
    // Asegura que 'm' sea un objeto de mensaje válido con un remitente definido.
    if (!m || !m.sender) {
        return; 
    }
    // Si tienes problemas con m.fromMe en otros hooks o módulos, también puedes añadir:
    // if (typeof m.fromMe === 'undefined') return; 

    const user = global.db.data.users[m.sender];
    const bankType = 'bank';
    
    // El formato de argumentos esperado es: [cantidad] [destinatario] [tipo_opcional]
    // O para el botón: [tipo_opcional] [cantidad] [destinatario] -> Esto lo manejamos internamente para simplificar
    
    let amount, recipientArg, typeShortcut;
    let isButtonResponse = false;
    
    // Lógica para detectar si es una respuesta de botón o un comando directo.
    // Si viene del botón, args[0] es el tipo ('1' o '2'), args[1] es el monto, args[2] es la cuenta.
    if (args.length === 3 && (args[0] === '1' || args[0] === '2') && isNumber(args[1]) && args[2].length > 7) {
        // Es la respuesta del botón o el comando rápido/completo
        typeShortcut = args[0]; // '1' o '2'
        amount = parseInt(args[1]);
        recipientArg = args[2].trim();
        isButtonResponse = true; // Marcamos que venimos de un flujo de selección
    } else if (args.length >= 2) {
        // Es el comando inicial
        amount = isNumber(args[0]) ? parseInt(args[0]) : 0;
        recipientArg = args[1].trim();
        typeShortcut = args[2] ? args[2].trim() : null; // Nuevo: Captura el 3er argumento
    } else {
        // Uso incorrecto para el comando inicial
        const helpMessage = `${emoji} *Uso:* Debes ingresar la cantidad y el destinatario.\n` +
            `> Ejemplo 1 (Local): *${usedPrefix + command} 25000 @mencion*\n` +
            `> Ejemplo 2 (Multibot): *${usedPrefix + command} 25000 521XXXXXXXXMARC1234*\n` +
            `> Ejemplo 3 (Rápido): *${usedPrefix + command} 25000 521XXXXXXXXMARC1234 2* (2=Instantánea)`
            .trim();
        return conn.sendMessage(m.chat, {text: helpMessage, mentions: [m.sender]}, {quoted: m});
    }

    // Asegurar que el monto sea válido (mínimo 100)
    amount = Math.min(Number.MAX_SAFE_INTEGER, Math.max(100, amount)) * 1;
    
    const botHash = await getBotHashFromFile();
    
    // Verificación de balance (IMPORTANTE: Esto debe estar después de determinar el 'amount')
    if (user[bankType] * 1 < amount) {
        return conn.sendMessage(m.chat, {text: `${emoji2} Solo tienes *${user[bankType]} ${moneda}* en el banco para transferir.`, mentions: [m.sender]}, {quoted: m});
    }

    // --- LÓGICA DE TRANSFERENCIA ---

    // 1. TRANSFERENCIA LOCAL (Formato @mencion o JID) - Solo si NO es respuesta de botón
    if (!isButtonResponse && (recipientArg.includes('@s.whatsapp.net') || recipientArg.includes('@'))) {
        const who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : (recipientArg.replace(/[@ .+-]/g, '') + '@s.whatsapp.net');
        
        if (!who || !(who in global.db.data.users)) {
             const recipientDisplay = who ? who.split('@')[0] : 'mencionado';
             return conn.sendMessage(m.chat, {text: `${emoji2} El usuario *${recipientDisplay}* no está en la base de datos local.`, mentions: [m.sender]}, {quoted: m});
        }
        
        user[bankType] -= amount * 1;
        // Asume que la transferencia local va a la 'coin' (cartera) del receptor
        global.db.data.users[who]['coin'] = (global.db.data.users[who]['coin'] || 0) + amount * 1;
        
        const mentionText = `@${who.split('@')[0]}`;
        const totalInBank = user[bankType];
        
        return conn.sendMessage(m.chat, {text: `${emoji} Transferencia local exitosa!\nTransferiste *${amount} ${moneda}* a ${mentionText}\n> Ahora tienes *${totalInBank} ${moneda}* en tu banco.`, mentions: [who]}, {quoted: m});
    } 

    // 2. TRANSFERENCIA MULTIBOT (Formato de Cuenta CypherTrans: XXXXXMARC1234)
    const isCypherTransAccount = recipientArg.length > 7 && ALL_PREFIXES.some(prefix => recipientArg.endsWith(prefix + recipientArg.slice(-4)));

    if (isCypherTransAccount) {
        
        // A. Verificar registro del bot
        if (!botHash) {
            return m.reply(`${emoji2} El sistema multibot no está activado. Regístrate con *${usedPrefix}registerbot [API_KEY]*.`);
        }
        
        // B. Verificar cuenta del remitente
        const senderAccount = global.db.data.users[m.sender]?.cypherTransAccount;
        if (!senderAccount) {
            return m.reply(`${emoji2} No tienes una cuenta CypherTrans vinculada. Crea una con *${usedPrefix}crearcuenta*.`);
        }

        const recipientPrefix = recipientArg.slice(-7, -4);
        const recipientAccount = recipientArg;
        
        
        // C. DETERMINAR TIPO DE TRANSFERENCIA FINAL
        let transferType = null;
        
        // C.1. Transferencia al mismo bot (Prioridad: Siempre instantánea y gratis)
        if (BOT_KEY_PREFIX === recipientPrefix) {
            transferType = 'instant'; // Usamos 'instant' para activar la lógica interna de la API
        }
        
        // C.2. Transferencia con acceso directo (shortcut o respuesta del botón)
        else if (typeShortcut === '1' || typeShortcut === '2') {
             transferType = (typeShortcut === '1' ? 'normal' : 'instant');
        }
        
        
        // D. PROCESAR TRANSFERENCIA
        if (transferType) {
            
            user[bankType] -= amount * 1; // Deduce los fondos antes de llamar a la API
            
            const txResponse = await callCypherTransAPI(botHash, senderAccount, recipientAccount, amount, transferType);
            
            if (txResponse.status === 200) {
                // Si la transferencia es APROBADA (generalmente interna) y tiene el recibo base64
                if (txResponse.data.status === 'APROBADA' && txResponse.data.receipt_base64) {
                    return sendInternalTransferConfirmation(conn, m.chat, txResponse.data, amount, user[bankType]);
                }
                // Si es PENDIENTE (externa) o APROBADA sin base64, usa el mensaje de texto estándar
                return sendTransferConfirmation(conn, m.chat, txResponse.data, amount, user[bankType]);
                
            } else {
                // Revertir fondos y mostrar error
                user[bankType] += amount * 1; 
                return m.reply(`${emoji2} Falló la transferencia a ${recipientAccount}. ${txResponse.data.error || 'Error desconocido'}`);
            }
        }
        
        
        // E. Bots Diferentes (Requiere seleccionar tipo, si NO se usó el shortcut)
        
        const buttons = [
            // CORREGIDO: El buttonId usa la sintaxis correcta para que el handler principal lo interprete como ButtonResponse
            {buttonId: `${usedPrefix + command} 1 ${amount} ${recipientAccount}`, buttonText: {displayText: '1: Lenta (Normal)'}, type: 1},
            {buttonId: `${usedPrefix + command} 2 ${amount} ${recipientAccount}`, buttonText: {displayText: '2: Rápida (Instantánea)'}, type: 1}
        ];
        
        const buttonMessage = {
            text: `🌐 Transferencia Multibot a ${recipientPrefix}.\n\n` + 
                    `*Monto:* ${amount} ${moneda}\n\n` +
                    `Por favor, selecciona la velocidad de transferencia o usa el comando rápido: *${usedPrefix + command} ${amount} ${recipientAccount} [1|2]*.\n\n` +
                    `1️⃣ *Lenta (Normal):* Tarda hasta 24h. Sin comisión base. (Recomendado)\n` +
                    `2️⃣ *Rápida (Instantánea):* Tarda ~8min. Aplica comisión.`,
            footer: 'Selecciona una opción:',
            buttons: buttons,
            headerType: 1
        };

        return conn.sendMessage(m.chat, buttonMessage, { quoted: m });
    }

    // 3. ERROR DE FORMATO
    return m.reply(`${emoji2} Formato de destinatario no reconocido. Debe ser @mencion o una cuenta CypherTrans (ej: XXXXXMARC1234).`);
}


// --- FUNCIONES DE SOPORTE ---

/** Llama a la API de CypherTrans para iniciar la transferencia. */
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

/** Envía el mensaje final de confirmación al usuario (para transferencias PENDIENTES o externas). */
function sendTransferConfirmation(conn, chatId, txData, amount, newBankBalance) {
    const statusText = txData.status === 'APROBADA' ? 'APROBADA (Instantánea)' : 'REGISTRADA (Pendiente)';
    const emojiStatus = txData.status === 'APROBADA' ? '✅' : '⏳';
    const feeDisplay = txData.fee_applied ? `Comisión: ${txData.fee_applied} ${moneda}\n` : 'Comisión: 0\n';

    const message = `${emojiStatus} *¡Transferencia ${statusText}!*\n\n` +
                    `*Monto:* ${amount} ${moneda}\n` +
                    `${feeDisplay}` +
                    `*ID Transacción:* ${txData.tx_id}\n` +
                    `*Tu nuevo balance en banco:* ${newBankBalance} ${moneda}\n\n` +
                    `Puedes seguir el estado aquí: ${API_URL}${txData.tracking_url}`;

    // Solo se envía el enlace al recibo HTML.
    return conn.sendMessage(chatId, { text: message }, { quoted: conn.chats[chatId] });
}


/** Envía la confirmación con la imagen del recibo (para transferencias INTERNAS/APROBADAS). */
function sendInternalTransferConfirmation(conn, chatId, txData, amount, newBankBalance) {
    const feeDisplay = txData.fee_applied ? `Comisión: ${txData.fee_applied} ${moneda}\n` : 'Comisión: 0\n';
    const media = Buffer.from(txData.receipt_base64, 'base64');
    
    const caption = `✅ *¡Transferencia INTERNA APROBADA! (Instantánea)*\n\n` +
                    `*Monto:* ${amount} ${moneda}\n` +
                    `${feeDisplay}` +
                    `*ID Transacción:* ${txData.tx_id}\n` +
                    `*Tu nuevo balance en banco:* ${newBankBalance} ${moneda}\n`;

    // Envía la imagen del recibo Base64
    return conn.sendMessage(chatId, { image: media, caption: caption }, { quoted: conn.chats[chatId] });
}


handler.help = ['pay', 'transfer'];
handler.tags = ['rpg'];
handler.command = ['pay', 'transfer', 'transferir'];
handler.group = true;
handler.register = true;

export default handler;

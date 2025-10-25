// handler.js (pay/transfer)

import fetch from 'node-fetch';
import isNumber from './lib/isNumber.js'; // Asumiendo que esta función está en un archivo de utilidad

// --- CONFIGURACIÓN DE CYPHERTRANS (Asegúrate de que estas rutas sean correctas) ---
const HASH_FILE_PATH = './src/hash.json'; 
const API_URL = 'https://cyphertrans.duckdns.org'; 
// --- LA CLAVE API DE ESTE BOT ---
const BOT_API_KEY = 'ellen';
const BOT_KEY_PREFIX = 'ELL'; // El prefijo de ELLEN es ELL (según tu app.py)

// --- VARIABLES GLOBALES DEL BOT (Ajusta si es necesario) ---
// Define todos los prefijos de las monedas para la validación
const ALL_PREFIXES = ['MAR', 'LUF', 'ELL', 'RUB']; 
const moneda = global.moneda || 'Coin'; 
const emoji = '✅'; 
const emoji2 = '❌';

// --- FUNCIÓN PARA OBTENER EL HASH DEL BOT ---
async function getBotHashFromFile() {
    try {
        // Asegúrate de tener fs/promises y path instalados o disponibles en tu entorno
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

// --- FUNCIÓN PRINCIPAL DEL HANDLER ---
async function handler(m, { conn, args, usedPrefix, command }) {
    const user = global.db.data.users[m.sender];
    const bankType = 'bank';

    // Manejar la invocación sin argumentos para el reintento de botón
    if (args.length === 0 && user.tempCypherTrans && user.tempCypherTrans.amount && user.tempCypherTrans.recipientAccount) {
        // Reinvocar el menú de selección si existe data temporal
        const amount = user.tempCypherTrans.amount;
        const recipientAccount = user.tempCypherTrans.recipientAccount;
        
        // El resto de la lógica de botones es la misma que la original
        const buttons = [
            {buttonId: `${usedPrefix}transferir 1`, buttonText: {displayText: '1: Lenta (Normal)'}, type: 1},
            {buttonId: `${usedPrefix}transferir 2`, buttonText: {displayText: '2: Rápida (Instantánea)'}, type: 1}
        ];
        
        const buttonMessage = {
            text: `🌐 Transferencia Multibot a ${recipientAccount.slice(-7, -4)}.\n\n` + 
                  `*Monto:* ${amount} ${moneda}\n\n` +
                  `*Reinicia la selección de velocidad:*\n` +
                  `1️⃣ *Lenta (Normal):* Tarda hasta 24h. Sin comisión base.\n` +
                  `2️⃣ *Rápida (Instantánea):* Tarda ~8min. Aplica comisión.`,
            footer: 'Selecciona una opción:',
            buttons: buttons,
            headerType: 1
        };

        return conn.sendMessage(m.chat, buttonMessage, { quoted: m });
    }
    
    // Si no hay argumentos ni data temporal, mostrar ayuda
    if (!args[0] || !args[1]) {
        const helpMessage = `${emoji} *Uso:* Debes ingresar la cantidad y el destinatario.\n` +
            `> Ejemplo 1 (Local): *${usedPrefix + command} 25000 @mencion*\n` +
            `> Ejemplo 2 (Multibot): *${usedPrefix + command} 25000 521XXXXXXXXMARC1234*`.trim();
        return conn.sendMessage(m.chat, {text: helpMessage, mentions: [m.sender]}, {quoted: m});
    }

    // Asegurar que el monto sea válido (mínimo 100)
    const amount = Math.min(Number.MAX_SAFE_INTEGER, Math.max(100, (isNumber(args[0]) ? parseInt(args[0]) : 100))) * 1;
    const recipientArg = args[1].trim();
    const botHash = await getBotHashFromFile();
    
    // Verificación de balance
    if (user[bankType] * 1 < amount) {
        return conn.sendMessage(m.chat, {text: `${emoji2} Solo tienes *${user[bankType]} ${moneda}* en el banco para transferir.`, mentions: [m.sender]}, {quoted: m});
    }

    // --- LÓGICA DE TRANSFERENCIA ---

    // 1. TRANSFERENCIA LOCAL (Formato @mencion o JID)
    if (recipientArg.includes('@s.whatsapp.net') || recipientArg.includes('@')) {
        const who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : (recipientArg.replace(/[@ .+-]/g, '') + '@s.whatsapp.net');
        
        if (!who || !(who in global.db.data.users)) {
             return conn.sendMessage(m.chat, {text: `${emoji2} El usuario ${who ? who.split('@')[0] : 'mencionado'} no está en la base de datos local.`, mentions: [m.sender]}, {quoted: m});
        }
        
        user[bankType] -= amount * 1;
        global.db.data.users[who]['coin'] += amount * 1; // Aumenta la coin (cartera) del receptor
        
        const mentionText = `@${who.split('@')[0]}`;
        const totalInBank = user[bankType];
        
        return conn.sendMessage(m.chat, {text: `${emoji} Transferencia local exitosa!\nTransferiste *${amount} ${moneda}* a ${mentionText}\n> Ahora tienes *${totalInBank} ${moneda}* en tu banco.`, mentions: [who]}, {quoted: m});
    } 

    // 2. TRANSFERENCIA MULTIBOT (Formato de Cuenta CypherTrans: XXXXXMARC1234)
    
    // Verificamos si tiene el formato correcto (termina con un prefijo conocido y 4 dígitos)
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
        
        // C. Lógica de Tipo de Transferencia
        
        // Si el prefijo de la cuenta es el mismo que el prefijo de este bot (ELL)
        if (BOT_KEY_PREFIX === recipientPrefix) {
            // Transferencia al mismo bot (se asume INSTANTÁNEA sin menú)
            const transferType = 'instant'; 
            
            user[bankType] -= amount * 1; // Deduce los fondos antes de llamar a la API
            
            const txResponse = await callCypherTransAPI(botHash, senderAccount, recipientAccount, amount, transferType);
            
            if (txResponse.status === 200) {
                return sendTransferConfirmation(conn, m.chat, txResponse.data, amount, user[bankType]);
            } else {
                // Revertir fondos y mostrar error
                user[bankType] += amount * 1; 
                return m.reply(`${emoji2} Falló la transferencia a ${recipientAccount}. ${txResponse.data.error || 'Error desconocido'}`);
            }
        }
        
        // D. Bots Diferentes (Requiere seleccionar tipo)
        
        // *** ALMACENAR DATA TEMPORAL ***
        user.tempCypherTrans = {
            amount: amount,
            recipientAccount: recipientAccount
        };
        // ******************************
        
        const buttons = [
            // Los buttonId solo llevan el tipo
            {buttonId: `${usedPrefix}transferir 1`, buttonText: {displayText: '1: Lenta (Normal)'}, type: 1},
            {buttonId: `${usedPrefix}transferir 2`, buttonText: {displayText: '2: Rápida (Instantánea)'}, type: 1}
        ];
        
        const buttonMessage = {
            text: `🌐 Transferencia Multibot a ${recipientPrefix}.\n\n` + 
                  `*Monto:* ${amount} ${moneda}\n\n` +
                  `Por favor, selecciona la velocidad de transferencia:\n` +
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


// --- HANDLER SECUNDARIO PARA LA RESPUESTA DEL BOTÓN ---
handler.transferir = async (m, { conn, args, usedPrefix }) => {
    const user = global.db.data.users[m.sender];
    const bankType = 'bank';

    if (args.length !== 1) return; // Ahora solo recibe el tipo: #transferir [tipo]
    
    const typeSelected = args[0]; // 1 o 2
    
    // *** RECUPERAR DATA TEMPORAL ***
    if (!user.tempCypherTrans || !user.tempCypherTrans.amount || !user.tempCypherTrans.recipientAccount) {
        return m.reply(`${emoji2} Error de contexto. No se encontraron los detalles de la transferencia guardados. Por favor, inicia la transferencia nuevamente con *${usedPrefix}pay*.`);
    }

    const amount = user.tempCypherTrans.amount;
    const recipientAccount = user.tempCypherTrans.recipientAccount;
    // ******************************
    
    const transferType = (typeSelected === '1' ? 'normal' : 'instant');
    
    const botHash = await getBotHashFromFile();
    const senderAccount = user?.cypherTransAccount;
    
    // Verificaciones rápidas de seguridad
    if (!botHash || !senderAccount || !isNumber(amount) || amount < 100 || amount > user[bankType] * 1) {
        delete user.tempCypherTrans; // Limpiar data corrupta
        return m.reply(`${emoji2} Error de seguridad/contexto. Por favor, inicia la transferencia nuevamente con *${usedPrefix}pay*.`);
    }

    // Deduce los fondos
    user[bankType] -= amount * 1; 

    // Llamar a la API
    const txResponse = await callCypherTransAPI(botHash, senderAccount, recipientAccount, amount, transferType);
    
    // *** LIMPIAR DATA TEMPORAL ***
    delete user.tempCypherTrans;
    // ******************************
    
    if (txResponse.status === 200) {
        return sendTransferConfirmation(conn, m.chat, txResponse.data, amount, user[bankType]);
    } else {
        // Revertir fondos y mostrar error
        user[bankType] += amount * 1; 
        return m.reply(`${emoji2} Falló la transferencia a ${recipientAccount}. ${txResponse.data.error || 'Error desconocido'}`);
    }
};

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

/** Envía el mensaje final de confirmación al usuario. */
function sendTransferConfirmation(conn, chatId, txData, amount, newBankBalance) {
    const statusText = txData.status === 'APROBADA' ? 'APROBADA (Instantánea)' : 'REGISTRADA (Pendiente)';
    const emojiStatus = txData.status === 'APROBADA' ? '✅' : '⏳';
    const feeDisplay = txData.fee_applied ? `Comisión: ${txData.fee_applied} ${moneda}\n` : 'Comisión: 0\n';

    const message = `${emojiStatus} *¡Transferencia ${statusText}!*\n\n` +
                    `*Monto:* ${amount} ${moneda}\n` +
                    `${feeDisplay}` +
                    `*ID Transacción:* ${txData.tx_id}\n` +
                    `*Tu nuevo balance en banco:* ${newBankBalance} ${moneda}\n\n` +
                    `Puedes seguir el estado aquí: ${API_URL}${txData.tracking_url}\n` +
                    `Recibo: ${API_URL}${txData.receipt_image_url}`;

    // Nota: El comprobante es HTML, así que se envía el enlace.
    return conn.sendMessage(chatId, { text: message }, { quoted: conn.chats[chatId] });
}

function isNumber(x) {
    return !isNaN(x);
}


handler.help = ['pay', 'transfer'];
handler.tags = ['rpg'];
handler.command = ['pay', 'transfer', 'transferir'];
handler.group = true;
handler.register = true;

// Define el handler secundario para los botones
handler.transferir.command = ['transferir'];
handler.transferir.register = true;

export default handler;

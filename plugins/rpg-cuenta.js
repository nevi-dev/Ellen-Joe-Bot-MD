// handler.js (cuenta/myaccount)

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

// --- CONFIGURACIÓN DE CYPHERTRANS (Debe coincidir con el handler de pay/transfer) ---
const HASH_FILE_PATH = './src/hash.json'; 
// ASEGÚRATE DE QUE ESTA URL ES CORRECTA:
const API_URL = 'https://cyphertrans.duckdns.org'; 
// --- LA CLAVE API Y EL PREFIJO DE ESTE BOT (Fijos) ---
const BOT_API_KEY = 'ellen'; // Configuración para el bot de Ellen
const BOT_KEY_PREFIX = 'ELL'; // Configuración para el bot de Ellen

// --- CONSTANTES DE MENSAJE ---
const moneda = global.moneda || 'Coin'; 
const emoji = '✅'; 
const emoji2 = '❌';

// --- FUNCIONES DE UTILIDAD DE ARCHIVO ---

/** Obtiene el hash del bot desde el archivo. */
async function getBotHashFromFile() {
    try {
        const fullPath = path.join(process.cwd(), HASH_FILE_PATH);
        const data = await fs.readFile(fullPath, 'utf-8');
        const hashData = JSON.parse(data);
        return hashData?.bot_hash || null;
    } catch (error) {
        // Ignorar si el archivo no existe
        return null; 
    }
}

/** Guarda el hash del bot en el archivo. */
async function saveBotHashToFile(hash) {
    try {
        const fullPath = path.join(process.cwd(), HASH_FILE_PATH);
        await fs.mkdir(path.dirname(fullPath), { recursive: true }); // Asegura que la carpeta exista
        await fs.writeFile(fullPath, JSON.stringify({ bot_hash: hash }, null, 2), 'utf-8');
        console.log(`[CypherTrans] Bot Hash guardado: ${hash}`);
    } catch (error) {
        console.error("Error al guardar el Bot Hash:", error);
        throw new Error("No se pudo guardar el hash del bot en el archivo.");
    }
}

// --- FUNCIONES DE INTERACCIÓN CON LA API ---

/** Llama a la API para obtener/registrar el hash del bot usando la API Key. */
async function getBotHashAPI(apiKey) {
    try {
        const response = await fetch(`${API_URL}/api/v1/register_bot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey })
        });

        const data = await response.json();
        return { status: response.status, data: data };
    } catch (error) {
        console.error("Error en llamada a API /register_bot:", error);
        return { status: 500, data: { error: 'Error de conexión con el servidor CypherTrans.' } };
    }
}

/** * Llama a la API para crear una cuenta de usuario o devolver la existente.
 * Esto siempre debe ser llamado para confirmar el número de cuenta.
 */
async function getOrCreateUserAccountAPI(botHash, userNumber) { 
    try {
        const response = await fetch(`${API_URL}/api/v1/create_account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bot_hash: botHash,
                user_jid: userNumber // El número sin @s.whatsapp.net
            })
        });

        const data = await response.json();
        return { status: response.status, data: data };
    } catch (error) {
        console.error("Error en llamada a API /create_account:", error);
        return { status: 500, data: { error: 'Error de conexión con el servidor CypherTrans.' } };
    }
}


// --- FUNCIÓN PRINCIPAL DEL HANDLER ---
async function handler(m, { conn, usedPrefix, command }) {
    const user = global.db.data.users[m.sender];
    const jid = m.sender;
    const userNumber = jid.split('@')[0]; // ✅ Extracción del número sin @
    let botHash = await getBotHashFromFile();
    let userAccount = user.cypherTransAccount;
    let isNewAccount = false;
    
    // El balance siempre será el del bot/banco local
    const currentLocalBalance = user.bank || 0; 

    // =========================================================
    // 1. Verificar y Obtener Hash del Bot (Autoregistro)
    // =========================================================
    if (!botHash) {
        await conn.sendMessage(m.chat, {text: `⏳ *Iniciando configuración multibot...*`}, {quoted: m});
        
        const hashResponse = await getBotHashAPI(BOT_API_KEY);

        if (hashResponse.status === 200 && hashResponse.data.bot_hash) {
            botHash = hashResponse.data.bot_hash;
            try {
                await saveBotHashToFile(botHash);
                await conn.sendMessage(m.chat, {text: `${emoji} *Bot registrado con éxito en CypherTrans.*\nHash obtenido y guardado localmente.\n\nContinuando con la creación de tu cuenta...`}, {quoted: m});
            } catch (fileError) {
                return m.reply(`${emoji2} Falló el registro del bot. ${fileError.message}`);
            }
        } else {
            const errorMsg = hashResponse.data.error || `Clave API "${BOT_API_KEY}" inválida o error en el servidor.`;
            return m.reply(`${emoji2} Falló el registro del bot.\n*Razón:* ${errorMsg}`);
        }
    }


    // =========================================================
    // 2. Obtener/Crear Cuenta del Usuario y Sincronizar Número
    // =========================================================
    if (!userAccount) {
        await conn.sendMessage(m.chat, {text: `⏳ *Creando tu cuenta CypherTrans...*`}, {quoted: m});
        isNewAccount = true;
    } else {
        await conn.sendMessage(m.chat, {text: `⏳ *Verificando número de cuenta...*`}, {quoted: m});
    }

    // 🔑 LLAMAR SIEMPRE a la API para asegurar que la cuenta exista y obtener el número completo.
    const accountResponse = await getOrCreateUserAccountAPI(botHash, userNumber); 

    if (accountResponse.status === 200 && accountResponse.data.account_number) {
        const apiData = accountResponse.data;
        
        // 1. Sincronizar el número de cuenta local (¡siempre!)
        userAccount = apiData.account_number;
        user.cypherTransAccount = userAccount;
        
        // 2. MANTENER el balance LOCAL (user.bank) como la fuente de verdad.
        // No se hace ninguna asignación a user.bank aquí para proteger el dinero.
        
        // Notificar si fue una nueva creación
        if (isNewAccount) {
            // Este mensaje ya incluye el número, pero lo enviaremos de nuevo más tarde para copiar
            await conn.sendMessage(m.chat, {text: `${emoji} *¡Cuenta CypherTrans creada con éxito!*\n\n*Tu cuenta es:* \`${userAccount}\``}, {quoted: m});
        }
    } else {
        const errorMsg = accountResponse.data.error || 'Error desconocido al crear/obtener la cuenta.';
        return m.reply(`${emoji2} Falló la operación de cuenta.\n*Razón:* ${errorMsg}`);
    }

    // =========================================================
    // 3. Mostrar Datos de la Cuenta (Mensaje Principal)
    // =========================================================
    const finalMessage = `👤 *Mis Datos de Cuenta CypherTrans*\n\n` +
                         `*Balance en Bot/Banco:* ${currentLocalBalance.toFixed(2)} ${moneda}\n` + 
                         `*Hash del Bot:* \`${botHash.substring(0, 15)}...\`\n` +
                         `*Prefijo de Bot (ID):* ${BOT_KEY_PREFIX}\n\n` +
                         `_Usa el número de cuenta (en el mensaje siguiente) para recibir transferencias de cualquier bot CypherTrans._`;
    
    // Enviamos el mensaje principal
    await conn.sendMessage(m.chat, { text: finalMessage }, { quoted: m });

    // =========================================================
    // 4. Mandar el número de cuenta aparte (Para fácil copiado)
    // =========================================================
    const accountMessage = `📋 *TU NÚMERO DE CUENTA (Toca para copiar):*\n\n` +
                           `\`\`\`\n${userAccount}\n\`\`\``; // Usar triple comilla para bloque de código

    return conn.sendMessage(m.chat, { text: accountMessage }, { quoted: m });
}


handler.help = ['cuenta', 'cyphertrans', 'myaccount'];
handler.tags = ['rpg'];
handler.command = ['cuenta', 'cyphertrans', 'myaccount'];
handler.group = true;
handler.register = true;

export default handler;

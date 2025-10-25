// handler.js (divisas/market)

import fetch from 'node-fetch';

// --- CONFIGURACIÓN DE CYPHERTRANS ---
const API_URL = 'https://cyphertrans.duckdns.org'; 

// --- CONSTANTES DE MENSAJE ---
const moneda = global.moneda || 'Coin'; 
const emoji = '📊'; // Usamos un emoji más acorde al mercado
const emoji2 = '❌';

// --- FUNCIÓN PRINCIPAL DEL HANDLER ---
async function handler(m, { conn, usedPrefix, command }) {
    // Envía un mensaje de espera (Placeholder)
    const initialMessage = await conn.sendMessage(m.chat, {text: `⏳ *Consultando Mercado de Divisas CypherTrans...*`}, {quoted: m});
    
    try {
        // 1. Llamar a la API para obtener los datos del mercado
        const response = await fetch(`${API_URL}/api/v1/currency_market`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000 // Añadimos un timeout de 10 segundos
        });

        const data = await response.json();

        if (response.status !== 200) {
            const errorMsg = data.error || `Error ${response.status} en la API.`;
            // Edita el mensaje de espera con el error de la API
            return conn.sendMessage(m.chat, { text: `${emoji2} Falló la consulta del mercado. *Razón:* ${errorMsg}` }, { edit: initialMessage.key });
        }

        // 2. Procesar los datos y construir el mensaje
        let message = `${emoji} *— Mercado de Divisas CypherTrans —*\n\n`;
        message += `El mercado se valora con respecto a 1 ${moneda}.\n`;
        message += `Los valores se actualizan constantemente.\n\n`;
        
        // Iterar sobre las divisas
        let counter = 0;
        for (const key in data) {
            const currency = data[key];
            const code = currency.code;
            const value = currency.value;
            const usage = currency.usage;
            counter++;
            
            // Determinar el emoji de fluctuación (usando 1.0 como base)
            const fluctuationEmoji = value > 1.0001 ? '🟢🔺' : (value < 0.9999 ? '🔴🔻' : '⚪️');
            const separator = (counter > 1) ? `\n———————————————————` : ``;

            message += `${separator}\n`;
            message += `🏦 *Moneda:* ${key.toUpperCase()} (${code})\n`;
            message += `💵 *Valor de Cambio:* ${fluctuationEmoji} *${value.toFixed(4)}* ${moneda}s\n`;
            message += `📊 *Volumen:* ${usage} Transacciones\n`;
        }
        
        message += `\n*Nota:* El volumen alto aumenta la volatilidad del precio.`;


        // 3. Editar el mensaje inicial con la respuesta final
        return conn.sendMessage(m.chat, { text: message }, { edit: initialMessage.key });

    } catch (error) {
        console.error("Error de conexión al consultar divisas CypherTrans:", error);
        
        let errorMessage = `${emoji2} *Error de Conexión/Tiempo de Espera*`;
        
        // Verifica si es un error de tiempo de espera o similar (típico de fetch/node-fetch)
        if (error.code === 'ERR_REQUEST_TIMEOUT' || error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
            errorMessage += `\n\nEl servidor de CypherTrans (*${API_URL}*) tardó demasiado en responder o está inactivo. Intenta más tarde.`;
        } else {
            errorMessage += `\n\nNo se pudo establecer la comunicación con el servidor. *Detalles:* ${error.message}`;
        }
        
        // Edita el mensaje de espera con el error de conexión
        return conn.sendMessage(m.chat, { text: errorMessage }, { edit: initialMessage.key });
    }
}


handler.help = ['divisas', 'market', 'currency'];
handler.tags = ['rpg'];
handler.command = ['divisas', 'market', 'currency'];
handler.group = true;
handler.register = true;

export default handler;

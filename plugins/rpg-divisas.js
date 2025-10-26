// handler.js (divisas/market)

import fetch from 'node-fetch';

// --- CONFIGURACIÓN DE CYPHERTRANS ---
const API_URL = 'https://cyphertrans.duckdns.org'; 

// --- CONSTANTES DE MENSAJE ---
const DENIQUES_CODE = 'ELL'; // Moneda base, asumida como Deniques
const CT_CURRENCY_NAME = 'CT'; // Nombre explícito para CypherTrans (CT)
const emoji = '📊'; 
const emoji2 = '❌';

// --- FUNCIÓN PRINCIPAL DEL HANDLER (CORREGIDA PARA ELL) ---
async function handler(m, { conn, usedPrefix, command }) {
    // Envía un mensaje de espera (Placeholder)
    const initialMessage = await conn.sendMessage(m.chat, {text: `⏳ *Consultando Mercado de Divisas CypherTrans...*`}, {quoted: m});
    
    try {
        // 1. Llamar a la API para obtener los datos del mercado
        const response = await fetch(`${API_URL}/api/v1/currency_market`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000 
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.error || `Error ${response.status} en la API.`;
            // Edita el mensaje de espera con el error de la API
            return conn.sendMessage(m.chat, { text: `${emoji2} Falló la consulta del mercado. *Razón:* ${errorMsg}` }, { edit: initialMessage.key });
        }

        // 2. Procesar los datos y construir el mensaje
        let message = `${emoji} *— Mercado de Divisas CypherTrans —*\n\n`;
        
        // CAMBIO 1: Clarificar que el ELL es la moneda base del servidor
        message += `Base de Conversión del Servidor: *${CT_CURRENCY_NAME} (${DENIQUES_CODE})*\n`;
        message += `_Mostrando cuánto vale *1 Deniques (ELL)* en otras divisas._\n`; // Nuevo enfoque
        message += `Los valores se actualizan constantemente.\n\n`;
        
        // Iterar sobre las divisas
        let counter = 0;
        for (const key in data) {
            const currency = data[key];
            const code = currency.code;
            const value = currency.value; // Tasa: 1 [Moneda] = X ELL
            const usage = currency.usage;
            counter++;
            
            let ellRateDisplay;
            let ellValueInOtherCurrency; // La tasa inversa (1 ELL = X [Otra Moneda])
            
            if (code === DENIQUES_CODE) {
                // La moneda base Deniques (ELL)
                ellRateDisplay = `*1.0000* ${DENIQUES_CODE}s (Base)`;
                ellValueInOtherCurrency = `*1.0000* ${DENIQUES_CODE}`;
            } else {
                // CAMBIO 2: Aquí es donde se realiza la multiplicación/inversión (1 / X)
                // Queremos saber: 1 ELL = ? [Otra Moneda]
                ellValueInOtherCurrency = (1 / value); 
                
                const fluctuationEmoji = value > 1.0001 ? '🟢🔺' : (value < 0.9999 ? '🔴🔻' : '⚪️');
                
                // Tasa Directa (1 [Otra Moneda] = X ELL)
                ellRateDisplay = `${fluctuationEmoji} *${value.toFixed(4)}* ${DENIQUES_CODE}s`;
            }
            
            const separator = (counter > 1) ? `\n———————————————————` : ``;

            message += `${separator}\n`;
            message += `🏦 *Divisa:* ${key.toUpperCase()} (${code})\n`;
            
            // Muestra el valor de 1 ELL en términos de esta moneda
            // Si la divisa es ELL, muestra 1 ELL = 1 ELL
            // Si es otra, muestra 1 ELL = X [Otra Moneda]
            if (code === DENIQUES_CODE) {
                message += `💵 *Tasa (1 ${DENIQUES_CODE}):* ${ellValueInOtherCurrency}\n`;
            } else {
                message += `💵 *Tasa (1 ${DENIQUES_CODE}):* *${ellValueInOtherCurrency.toFixed(4)}* ${code}\n`;
            }
            
            // Se mantiene la tasa de la API como referencia para el volumen.
            message += `ℹ️ *Referencia:* 1 ${code} = ${ellRateDisplay}\n`; 
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

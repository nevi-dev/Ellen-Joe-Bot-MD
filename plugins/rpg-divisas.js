// handler.js (divisas/market)

import fetch from 'node-fetch';

// --- CONFIGURACIÓN DE CYPHERTRANS ---
const API_URL = 'https://cyphertrans.duckdns.org'; 

// --- CONSTANTES DE MENSAJE ---
const DENIQUES_CODE = 'ELLC'; 
const DENIQUES_NAME = 'ELLEN';
const CT_CURRENCY_CODE = 'CT'; // CypherTrans Token
const emoji = '📊'; 
const emoji2 = '❌';

// --- FUNCIÓN PRINCIPAL DEL HANDLER (CORREGIDA PARA VALOR CT ABSTRACTO) ---
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
            return conn.sendMessage(m.chat, { text: `${emoji2} Falló la consulta del mercado. *Razón:* ${errorMsg}` }, { edit: initialMessage.key });
        }

        // 2. Procesar los datos y construir el mensaje
        let message = `${emoji} *— Mercado de Divisas CypherTrans —*\n\n`;
        
        // Mensaje de cabecera ajustado
        message += `Base de Conversión del Servidor: *${DENIQUES_NAME} (${DENIQUES_CODE})*\n`;
        message += `_Mostrando el valor abstracto de *1 ${CT_CURRENCY_CODE}* y su equivalencia en *1 ${DENIQUES_NAME}*._\n`;
        message += `Los valores se actualizan constantemente.\n\n`;
        
        let counter = 0;
        for (const key in data) {
            const currency = data[key];
            const code = currency.code;
            const value = currency.value; // Tasa: 1 [Moneda] = X ELLC
            const usage = currency.usage;
            counter++;
            
            let ctRate; // 1 CT = X (Valor Abstracto)
            let ellenRate; // 1 ELLEN = X [Otra Moneda]
            
            if (code === DENIQUES_CODE) {
                // Si la moneda es ELLEN (ELLC)
                ctRate = 1.0;
                ellenRate = 1.0;
            } else {
                // 1 ELLEN = 1/value [Otra Moneda]
                ellenRate = (1 / value);

                // 1 CT (Valor Abstracto) = 1/value (Usamos la misma lógica que ELLEN)
                ctRate = ellenRate;
            }

            // Lógica de fluctuación (usando la tasa de la API vs 1.0)
            const fluctuationEmoji = value > 1.0001 ? '🟢🔺' : (value < 0.9999 ? '🔴🔻' : '⚪️');
            
            const separator = (counter > 1) ? `\n———————————————————` : ``;

            message += `${separator}\n`;
            message += `🏦 *Divisa:* ${key.toUpperCase()} (${code})\n`;
            
            // CAMBIO CLAVE 1: Muestra 1 CT = X (SIN UNIDAD DE MONEDA)
            if (code === DENIQUES_CODE) {
                // Para ELLC, el valor es 1
                message += `✨ *Valor (1 ${CT_CURRENCY_CODE}):* *${ctRate.toFixed(4)}*\n`;
                message += `💵 *Valor (1 ${DENIQUES_CODE}):* *${ellenRate.toFixed(4)}* ${DENIQUES_CODE}\n`;
            } else {
                // Para otras monedas, muestra el valor abstracto de CT
                message += `✨ *Valor (1 ${CT_CURRENCY_CODE}):* *${ctRate.toFixed(4)}* ${fluctuationEmoji}\n`;
                // CAMBIO CLAVE 2: Muestra 1 ELLEN = X [Otra Moneda]
                message += `💵 *Valor (1 ${DENIQUES_CODE}):* *${ellenRate.toFixed(4)}* ${code} ${fluctuationEmoji}\n`;
            }
            
            // Tasa de referencia del servidor (1 [Moneda] = X ELLC)
            message += `ℹ️ *Referencia:* 1 ${code} = *${value.toFixed(4)}* ${DENIQUES_CODE}\n`; 
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

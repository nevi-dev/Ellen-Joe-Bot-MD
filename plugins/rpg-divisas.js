// handler.js (divisas/market)

import fetch from 'node-fetch';

// --- CONFIGURACIÓN DE CYPHERTRANS ---
const API_URL = 'https://cyphertrans.duckdns.org'; 

// --- CONSTANTES DE MENSAJE ---
const BASE_CODE = 'ELLC'; // Deniques, usado como base de la API
const BASE_NAME = 'Deniques';
const emoji = '📊'; 
const emoji2 = '❌';

/**
 * Mapea el código de la divisa (ELLC, DEN, BER, WON) a su nombre completo.
 */
function getCurrencyName(code) {
    if (!code) return 'Moneda Desconocida';
    const upperCode = code.toUpperCase();
    switch (upperCode) {
        case 'ELLC': // Código base anterior
        case 'DEN':  // Prefijo actual (Deniques)
            return 'Deniques';
        case 'BER':  // Prefijo actual (Berries)
        case 'LUFC': // Código antiguo (si aplica)
            return 'Berries';
        case 'WON':  // Prefijo actual (Wones)
        case 'MARC': // Código antiguo (si aplica)
            return 'Wones';
        case 'CT':
        case 'CYPHERTRANS':
            return 'CypherTrans (CT)';
        default:
            return code; // Devuelve el código si no es reconocido
    }
}

// --- FUNCIÓN PRINCIPAL DEL HANDLER (REFACTORIZADA PARA ENFOQUE EN ELLEN) ---
async function handler(m, { conn, usedPrefix, command }) {
    // Envía un mensaje de espera (Placeholder)
    const initialMessage = await conn.sendMessage(m.chat, {text: `⏳ *Consultando Mercado de Divisas CypherTrans...*`}, {quoted: m});
    
    try {
        // 1. Llamar a la API para obtener los datos del mercado (Fuente para el cálculo)
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
        let message = `${emoji} *— Tasa de Cambio Base ${BASE_NAME} —*\n\n`;
        
        // Mensaje de cabecera ajustado, usando el nombre completo
        message += `Mostrando el precio de *1 ${BASE_NAME} (${BASE_CODE})* en otras divisas.\n`;
        message += `_Esta tasa es calculada por el motor CypherTrans en tiempo real._\n\n`;
        
        let counter = 0;
        for (const key in data) {
            const currency = data[key];
            const code = currency.code;
            const value = currency.value; // Tasa de Referencia: 1 [Moneda] = X ELLC
            const usage = currency.usage;
            counter++;
            
            let ellenRate; // 1 ELLEN = X [Otra Moneda]
            
            if (code === BASE_CODE) {
                // 1 ELLEN = 1 ELLEN
                ellenRate = 1.0;
            } else {
                // CALCULO (Inversión de la tasa): 1 ELLEN = 1 / (1 [Moneda] a ELLC)
                ellenRate = (1 / value);
            }

            // Lógica de fluctuación ELIMINADA para simplificar el mensaje.
            
            const separator = (counter > 1) ? `\n———————————————————` : ``;

            message += `${separator}\n`;
            // USADO: Nombre completo de la divisa (ej. Berries)
            message += `🏦 *Divisa:* ${getCurrencyName(code)} (${code})\n`;
            
            // Precio de 1 DENIQUES (ELLC) en la otra divisa
            // USADO: Nombre completo de la base (ej. Deniques) y el objetivo (ej. Wones)
            message += `💵 *Precio (1 ${BASE_NAME}):* *${ellenRate.toFixed(4)}* ${getCurrencyName(code)}\n`;
            
            // Tasa de referencia del servidor (1 [Moneda] = X ELLC)
            // USADO: Nombre completo de la divisa (ej. Wones) y la base (ej. Deniques)
            message += `ℹ️ *Referencia:* 1 ${getCurrencyName(code)} = *${value.toFixed(4)}* ${BASE_NAME}\n`; 
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

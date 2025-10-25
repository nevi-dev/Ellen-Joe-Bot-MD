// handler.js (divisas/market)

import fetch from 'node-fetch';

// --- CONFIGURACIÓN DE CYPHERTRANS (Debe coincidir con otros handlers) ---
const API_URL = 'https://cyphertrans.duckdns.org'; 

// --- CONSTANTES DE MENSAJE ---
const moneda = global.moneda || 'Coin'; 
const emoji = '📈'; 
const emoji2 = '📉';

// --- FUNCIÓN PRINCIPAL DEL HANDLER ---
async function handler(m, { conn, usedPrefix, command }) {
    await conn.sendMessage(m.chat, {text: `⏳ *Consultando valores actuales del mercado CypherTrans...*`}, {quoted: m});
    
    try {
        // 1. Llamar a la API para obtener los datos del mercado
        const response = await fetch(`${API_URL}/api/v1/currency_market`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (response.status !== 200) {
            const errorMsg = data.error || 'Error desconocido al conectar con el mercado.';
            return m.reply(`${emoji2} Falló la consulta de divisas. *Razón:* ${errorMsg}`);
        }

        // 2. Procesar los datos y construir el mensaje
        let message = `${emoji} *Mercado de Divisas CypherTrans*\n\n`;
        message += `Los valores se actualizan constantemente (cada 60s en la API).\n\n`;
        
        // Iterar sobre las divisas
        for (const key in data) {
            const currency = data[key];
            const code = currency.code;
            const value = currency.value;
            const usage = currency.usage;
            
            // Determinar si el valor subió (simulado) para el emoji
            const fluctuationEmoji = value >= 1.0 ? '🔺' : '🔻';

            message += `═════════════════\n`;
            message += `🆔 *Moneda:* ${code} (${key.toUpperCase()})\n`;
            message += `💵 *Valor Actual:* ${fluctuationEmoji} *${value.toFixed(4)}* ${moneda}s\n`;
            message += `📊 *Uso Reciente:* ${usage} (Afecta el precio)\n`;
        }
        
        message += `═════════════════\n\n`;
        message += `_Tu cuenta es del tipo ${moneda} con el prefijo *${code.slice(0, -1)}*._`;


        // 3. Enviar el mensaje
        return conn.sendMessage(m.chat, { text: message }, { quoted: m });

    } catch (error) {
        console.error("Error al consultar divisas CypherTrans:", error);
        return m.reply(`${emoji2} Error de conexión. No se pudo obtener la información del mercado.`);
    }
}


handler.help = ['divisas', 'market', 'currency'];
handler.tags = ['rpg'];
handler.command = ['divisas', 'market', 'currency'];
handler.group = true;
handler.register = true;

export default handler;

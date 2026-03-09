import fetch from 'node-fetch'

const API_URL = 'https://rest.apicausas.xyz/api/v1/ai?apikey=causa-ee5ee31dcfc79da4'; 
const INACTIVITY_LIMIT = 10 * 60 * 1000; 

// Memoria volátil (se borra si el bot se reinicia)
const chatMemory = {}; 

var handler = async (m, { conn, text, usedPrefix, command }) => {
    const chatId = m.chat;
    const userName = m.pushName || 'Usuario';
    const userJid = m.sender.split('@')[0];

    // 1. Inicializar o Resetear memoria por inactividad
    if (!chatMemory[chatId]) chatMemory[chatId] = { history: [], lastInteraction: Date.now() };
    
    const memory = chatMemory[chatId];
    const now = Date.now();

    if (now - memory.lastInteraction > INACTIVITY_LIMIT) {
        memory.history = [];
    }
    memory.lastInteraction = now;

    // Comandos de limpieza
    if (text === 'reset' || text === 'borrar') {
        memory.history = [];
        return conn.reply(m.chat, '✅ Memoria del chat limpiada.', m);
    }

    if (!text) return conn.reply(m.chat, `¡Hola *${userName}*! Dime algo para responderte.`, m);

    try {
        await m.react('🧠');

        // 2. Construir el prompt con identidad para grupos
        const promptConIdentidad = `[${userName} | ${userJid}]: ${text}`;

        // 3. Petición a tu API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001", // Usando el Flash que es más barato
                q: promptConIdentidad,
                history: memory.history // Enviamos el array acumulado
            })
        });

        const res = await response.json();

        if (res.status && res.reply) {
            // 4. GUARDAR EL HISTORIAL ACTUALIZADO
            // Importante: Guardamos el historial que la API ya procesó y devolvió
            memory.history = res.history;

            // Limitar para no saturar tokens ni RAM
            if (memory.history.length > 10) {
                memory.history = memory.history.slice(-10);
            }

            await m.react('✅');
            await m.reply(res.reply);
        } else {
            // Si la API devuelve un error de créditos o de otro tipo
            throw new Error(res.error || 'Error desconocido en la API');
        }

    } catch (error) {
        console.error("DEBUG BOT ERROR:", error.message);
        await m.react('❌');
        
        // Si el error es por falta de créditos, informamos al usuario
        if (error.message.includes('credits')) {
            return conn.reply(m.chat, `⚠️ *Sin saldo:* La API se quedó sin créditos.`, m);
        }
        
        conn.reply(m.chat, `❌ *Error:* ${error.message}`, m);
    }
}

handler.command = ['gemini', 'ia']
handler.help = ['gemini']
handler.tags = ['ai']

export default handler

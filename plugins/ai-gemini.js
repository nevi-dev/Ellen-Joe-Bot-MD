import fetch from 'node-fetch'

// --- CONFIGURACIÓN ---
const API_URL = 'https://rest.apicausas.xyz/api/v1/ai?apikey=causa-ee5ee31dcfc79da4'; 
const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutos

// Esta variable almacenará TODO el historial de todos los grupos mientras el bot esté encendido
const chatMemory = {}; 

var handler = async (m, { conn, text, usedPrefix, command }) => {
    
    const chatId = m.chat;
    const userName = m.pushName || 'Usuario';
    const userJid = m.sender.split('@')[0];

    // 1. INICIALIZAR MEMORIA PARA ESTE CHAT ESPECÍFICO
    if (!chatMemory[chatId]) {
        chatMemory[chatId] = {
            history: [],
            lastInteraction: Date.now()
        };
    }

    const memory = chatMemory[chatId];
    const now = Date.now();

    // 2. LÓGICA DE AUTO-RESET (10 MINUTOS)
    if (now - memory.lastInteraction > INACTIVITY_LIMIT) {
        memory.history = [];
        console.log(`[Memory] Reset por inactividad en: ${chatId}`);
    }
    memory.lastInteraction = now;

    // Comando Reset Manual
    if (text === 'reset' || text === 'borrar') {
        memory.history = [];
        return conn.reply(m.chat, '✅ Memoria local del grupo reseteada.', m);
    }

    if (!text) return conn.reply(m.chat, `¡Hola *${userName}*! Soy Gemini. ¿De qué quiere hablar el grupo hoy?`, m);

    try {
        await m.react('🧠');

        // 3. FORMATEO DE IDENTIDAD
        // Enviamos quién escribe para que la IA distinga en el grupo
        const promptConIdentidad = `[MENSAJE DE: ${userName} | JID: ${userJid}]: ${text}`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "google/gemini-1.5-flash",
                history: memory.history,
                q: promptConIdentidad
            })
        });

        if (!response.ok) throw new Error(`Error de conexión: ${response.status}`);

        const res = await response.json();

        if (res.status && res.reply) {
            // 4. ACTUALIZAR HISTORIAL EN LA CONSTANTE
            // Guardamos lo que devuelve tu API (que ya incluye la nueva interacción)
            memory.history = res.history || [];

            // Limitar tamaño para no saturar la RAM del VPS (últimos 12 mensajes)
            if (memory.history.length > 12) {
                memory.history = memory.history.slice(-12);
            }

            await m.react('✅');
            await m.reply(res.reply);
        } else {
            throw new Error('La API no devolvió una respuesta válida.');
        }

    } catch (error) {
        console.error("ERROR EN MEMORIA LOCAL:", error);
        await m.react('❌');
        conn.reply(m.chat, `❌ *Error:* ${error.message}`, m);
    }
}

handler.command = ['gemini', 'ia']
handler.help = ['gemini']
handler.tags = ['ai']

export default handler

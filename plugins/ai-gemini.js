import fetch from 'node-fetch'

const API_URL = 'https://rest.apicausas.xyz/api/v1/ai?apikey=causa-ee5ee31dcfc79da4'; 
const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutos

var handler = async (m, { conn, text, usedPrefix, command }) => {
    
    // 1. Identificadores y Metadatos
    const chatId = m.chat; // ID del grupo o chat
    const userName = m.pushName || 'Usuario Desconocido';
    const userJid = m.sender.split('@')[0]; // Número de teléfono sin el @s.whatsapp.net

    // 2. Inicializar almacenamiento en la DB del Bot (global.db)
    if (!global.db.data.chats[chatId]) global.db.data.chats[chatId] = {};
    let chatData = global.db.data.chats[chatId];

    if (!chatData.gemini_history) chatData.gemini_history = [];
    if (!chatData.last_interaction) chatData.last_interaction = Date.now();

    // 3. Sistema de Auto-Reset por Inactividad
    const now = Date.now();
    if (now - chatData.last_interaction > INACTIVITY_LIMIT) {
        chatData.gemini_history = []; // Borramos historial si pasaron > 10 min
    }
    chatData.last_interaction = now; // Actualizamos el marcador de tiempo

    // Comando manual para limpiar
    if (text === 'reset' || text === 'borrar') {
        chatData.gemini_history = [];
        return conn.reply(m.chat, '✅ Memoria del grupo reseteada.', m);
    }

    if (!text) return conn.reply(m.chat, `¡Hola *${userName}*! Escribe algo para que el grupo y yo hablemos.`, m);

    try {
        await m.react('🧠');
        conn.sendPresenceUpdate('composing', m.chat);

        // 4. FORMATEO DE IDENTIDAD (El "Truco" para que la IA sepa quién es quién)
        // Enviamos el mensaje estructurado para que Gemini entienda el contexto del grupo
        const promptConIdentidad = `[MENSAJE DE: ${userName} | JID: ${userJid}]: ${text}`;

        const payload = {
            model: "google/gemini-1.5-flash", 
            history: chatData.gemini_history,
            q: promptConIdentidad 
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const res = await response.json();

        if (res.status && res.reply) {
            // 5. Guardar el historial actualizado devuelto por la API
            chatData.gemini_history = res.history;

            // Mantener un historial manejable (últimos 12 mensajes)
            if (chatData.gemini_history.length > 12) {
                chatData.gemini_history = chatData.gemini_history.slice(-12);
            }

            await m.react('✅');
            await m.reply(res.reply);
        } else {
            throw new Error('No hubo respuesta de la IA.');
        }

    } catch (error) {
        console.error(error);
        await m.react('❌');
        conn.reply(m.chat, `❌ Error: ${error.message}`, m);
    }
}

handler.command = ['gemini', 'ia']
handler.help = ['gemini']
handler.tags = ['ai']

export default handler

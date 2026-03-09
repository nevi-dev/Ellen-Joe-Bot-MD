import fetch from 'node-fetch'

const API_URL = 'https://rest.apicausas.xyz/api/v1/ai?apikey=causa-ee5ee31dcfc79da4'; 
const INACTIVITY_LIMIT = 10 * 60 * 1000; 

const chatMemory = {}; 

var handler = async (m, { conn, text, participants, isPrems }) => {
    const chatId = m.chat;
    const isGroup = m.isGroup;
    
    // 1. Obtener información del grupo y el usuario
    const groupMetadata = isGroup ? await conn.groupMetadata(chatId).catch(e => ({})) : {};
    const groupName = isGroup ? groupMetadata.subject : 'Chat Privado';
    
    // 2. Determinar el ROL (Admin o Miembro)
    const isAdmin = isGroup ? participants.some(p => p.id === m.sender && (p.admin === 'admin' || p.admin === 'superadmin')) : false;
    const role = isAdmin ? 'ADMIN' : (isPrems ? 'PREMIUM' : 'MIEMBRO');
    
    const userName = m.pushName || 'Usuario';
    const userJid = m.sender.split('@')[0];

    // Inicializar memoria
    if (!chatMemory[chatId]) chatMemory[chatId] = { history: [], lastInteraction: Date.now() };
    const memory = chatMemory[chatId];
    const now = Date.now();

    if (now - memory.lastInteraction > INACTIVITY_LIMIT) memory.history = [];
    memory.lastInteraction = now;

    if (text === 'reset' || text === 'borrar') {
        memory.history = [];
        return conn.reply(m.chat, '✅ Memoria limpiada.', m);
    }

    if (!text) return conn.reply(m.chat, `¡Hola *${userName}*! Soy Gemini. ¿Qué deseas saber hoy?`, m);

    try {
        await m.react('🧠');

        // 3. CONSTRUCCIÓN DEL PROMPT CON CONTEXTO AVANZADO
        // Esto le da a la IA la visión completa de quién habla y dónde
        const contextHeader = `[CONTEXTO: Grupo "${groupName}" | Usuario: ${userName} | Rol: ${role}]`;
        const promptConIdentidad = `${contextHeader}: ${text}`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001", 
                q: promptConIdentidad,
                history: memory.history 
            })
        });

        const res = await response.json();

        if (res.status && res.reply) {
            memory.history = res.history;
            if (memory.history.length > 12) memory.history = memory.history.slice(-12);

            await m.react('✅');
            await m.reply(res.reply);
        } else {
            throw new Error(res.error || 'Error en la API');
        }

    } catch (error) {
        console.error("DEBUG ERROR:", error.message);
        await m.react('❌');
        
        if (error.message.includes('credits')) {
            return conn.reply(m.chat, `⚠️ *Sin saldo:* La API necesita recarga.`, m);
        }
        conn.reply(m.chat, `❌ *Error:* ${error.message}`, m);
    }
}

handler.command = ['gemini', 'ia']
handler.help = ['gemini']
handler.tags = ['ai']

export default handler

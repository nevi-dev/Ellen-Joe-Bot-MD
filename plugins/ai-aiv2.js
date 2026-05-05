import fetch from 'node-fetch'

const API_URL = 'http://45.76.207.105:8082/api/generate'; 
const INACTIVITY_LIMIT = 10 * 60 * 1000; 

const chatMemory = {}; 

var handler = async (m, { conn, text, participants, isPrems }) => {
    const chatId = m.chat;
    const isGroup = m.isGroup;
    
    // 1. Obtener información del grupo y el usuario
    const groupMetadata = isGroup ? await conn.groupMetadata(chatId).catch(e => ({})) : {};
    const groupName = isGroup ? groupMetadata.subject : 'Chat Privado';
    
    // 2. Determinar el ROL
    const isAdmin = isGroup ? participants.some(p => p.id === m.sender && (p.admin === 'admin' || p.admin === 'superadmin')) : false;
    const role = isAdmin ? 'ADMIN' : (isPrems ? 'PREMIUM' : 'MIEMBRO');
    
    const userName = m.pushName || 'Usuario';

    // Inicializar memoria
    if (!chatMemory[chatId]) chatMemory[chatId] = { history: "", lastInteraction: Date.now() };
    const memory = chatMemory[chatId];
    const now = Date.now();

    // Reset por inactividad
    if (now - memory.lastInteraction > INACTIVITY_LIMIT) memory.history = "";
    memory.lastInteraction = now;

    if (text === 'reset' || text === 'borrar') {
        memory.history = "";
        return conn.reply(m.chat, '✅ Memoria del chat reseteada.', m);
    }

    if (!text) return conn.reply(m.chat, `¡Hola *${userName}*! Soy **TF0 AI**. ¿En qué puedo ayudarte?`, m);

    try {
        await m.react('⚙️');

        // 3. CONSTRUCCIÓN DEL PROMPT (Estilo Gemini con Contexto)
        // Nota: Como este endpoint usa un string 'prompt' plano, concatenamos el historial si existe.
        const contextHeader = `[CONTEXTO: Grupo: "${groupName}" | Usuario: "${userName}" | Rol: "${role}"]`;
        const fullPrompt = `${memory.history}\nUser: ${contextHeader} ${text}\nAI:`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "SoyMaycol/TF0", 
                prompt: fullPrompt,
                stream: false
            })
        });

        const res = await response.json();

        if (res.response) {
            const replyText = res.response.trim();
            
            // Actualizar historial (limitamos para no saturar el prompt en futuras peticiones)
            memory.history += `\nUser: ${text}\nAI: ${replyText}`;
            if (memory.history.length > 2000) memory.history = memory.history.slice(-2000);

            await m.react('✅');
            await m.reply(replyText);
        } else {
            throw new Error('No se recibió respuesta del modelo.');
        }

    } catch (error) {
        console.error("ERROR TF0:", error);
        await m.react('❌');
        conn.reply(m.chat, `❌ *Error en el sistema:* ${error.message}`, m);
    }
}

handler.command = ['ia2', 'tf0', 'orian']
handler.help = ['ia2']
handler.tags = ['ai']

export default handler

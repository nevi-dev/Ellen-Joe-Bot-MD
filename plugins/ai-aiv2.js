import fetch from 'node-fetch'

const API_URL = 'http://45.76.207.105:8082/api/generate'; 
const INACTIVITY_LIMIT = 10 * 60 * 1000; 

const chatMemory = {}; 

// Mapa de modelos disponibles según lo que tienes instalado
const models = {
    'tf0': 'SoyMaycol/TF0',
    'llama': 'llama3.1:8b',
    'think': 'deepseek-r1:8b',
    'code': 'qwen2.5-coder:7b'
};

var handler = async (m, { conn, text, participants, isPrems, usedPrefix, command }) => {
    const chatId = m.chat;
    const isGroup = m.isGroup;
    
    // 1. Contexto de usuario y grupo
    const groupMetadata = isGroup ? await conn.groupMetadata(chatId).catch(e => ({})) : {};
    const groupName = isGroup ? groupMetadata.subject : 'Chat Privado';
    const isAdmin = isGroup ? participants.some(p => p.id === m.sender && (p.admin === 'admin' || p.admin === 'superadmin')) : false;
    const role = isAdmin ? 'ADMIN' : (isPrems ? 'PREMIUM' : 'MIEMBRO');
    const userName = m.pushName || 'Usuario';

    // Inicializar memoria
    if (!chatMemory[chatId]) chatMemory[chatId] = { history: "", lastInteraction: Date.now() };
    const memory = chatMemory[chatId];
    const now = Date.now();

    if (now - memory.lastInteraction > INACTIVITY_LIMIT) memory.history = "";
    memory.lastInteraction = now;

    if (text === 'reset' || text === 'borrar') {
        memory.history = "";
        return conn.reply(m.chat, '✅ Memoria reseteada.', m);
    }

    // Ayuda si no hay texto
    if (!text) {
        return conn.reply(m.chat, `¡Hola *${userName}*! Indica qué quieres saber.\n\n*Modelos disponibles:*\n- \`tf0\` (Por defecto)\n- \`llama\` (Estabilidad)\n- \`think\` (Razonamiento profundo)\n- \`code\` (Programación)\n\n*Ejemplo:* \`${usedPrefix + command} code cómo hacer un fetch en js\``, m);
    }

    // 2. Selección dinámica del modelo
    const args = text.split(' ');
    const firstWord = args[0].toLowerCase();
    let modelToUse = models['tf0']; // Default
    let finalQuery = text;

    if (models[firstWord]) {
        modelToUse = models[firstWord];
        finalQuery = args.slice(1).join(' ');
    }

    try {
        await m.react('🧠');

        // 3. Prompt con contexto inyectado (Invisibly Personalized)
        const contextHeader = `[Contexto: ${groupName} | User: ${userName} | Rol: ${role}]`;
        const fullPrompt = `${memory.history}\nUser: ${contextHeader} ${finalQuery}\nAI:`;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelToUse,
                prompt: fullPrompt,
                stream: false
            })
        });

        const res = await response.json();

        if (res.response) {
            let replyText = res.response.trim();
            
            // Si es DeepSeek R1, a veces devuelve el razonamiento entre etiquetas <think>
            // Puedes elegir limpiarlo o dejarlo. Aquí lo dejamos para que el usuario vea el proceso.
            replyText = replyText.replace(/<think>[\s\S]*?<\/think>/g, (m) => `*Pensamiento:*\n_${m.replace(/<\/?think>/g, '').trim()}_\n\n*Respuesta:* `);

            memory.history += `\nUser: ${finalQuery}\nAI: ${res.response}`;
            if (memory.history.length > 2500) memory.history = memory.history.slice(-2500);

            await m.react('✅');
            await m.reply(`*Modelo:* \`${modelToUse}\`\n\n${replyText}`);
        } else {
            throw new Error(res.error || 'Error en respuesta de Ollama');
        }

    } catch (error) {
        console.error("DEBUG OLLAMA:", error);
        await m.react('❌');
        conn.reply(m.chat, `❌ *Error:* ${error.message}`, m);
    }
}

handler.command = ['ia2', 'ollama', 'bot']
handler.help = ['ia2 [modelo] [texto]']
handler.tags = ['ai']

export default handler

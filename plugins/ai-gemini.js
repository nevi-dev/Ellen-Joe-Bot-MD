import fetch from 'node-fetch'

const FLASK_API_URL = 'http://neviapi.ddns.net:5000/ia/gemini'; 
const FLASK_API_KEY = 'ellen'; 

var handler = async (m, { conn, text, usedPrefix, command }) => {
    
    // --- LÓGICA DE ENTRADA MÍNIMA ---
    if (!text) {
        return conn.reply(m.chat, `${emoji} Ingrese una petición para que Gemini lo responda.`, m);
    }
    // --------------------------------

    try {
        await m.react(rwait);
        conn.sendPresenceUpdate('composing', m.chat);
        
        const chatStorageKey = m.isGroup ? m.chat : m.sender;
        let userData = global.db.data.users[chatStorageKey] || {};
        const chatID = userData.gemini_chat_id; 

        const payload = {
             message: text,
             id_chat: chatID || null
        };

        const apii = await fetch(FLASK_API_URL, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'X-API-KEY': FLASK_API_KEY 
             },
             body: JSON.stringify(payload)
        });

        if (!apii.ok) {
             await m.react('❌');
             let errorResponse;
             try {
                 errorResponse = await apii.json();
             } catch {
                 throw new Error(`Fallo HTTP: ${apii.status} ${apii.statusText}`);
             }
             throw new Error(errorResponse.message || 'Error desconocido del servidor Flask.');
        }

        const res = await apii.json();
        const geminiResponse = res.message;
        const newChatID = res.id_chat;
        const expiryTime = res.expires_in;

        if (!geminiResponse) {
             await m.react('❌');
             throw new Error('La API de Gemini no devolvió una respuesta válida.');
        }

        // ==========================================================
        // 🚨 CAPA DE SEGURIDAD 3: FILTRO DE RESPUESTA DE GEMINI
        // ==========================================================
        
        // RegEx para buscar cualquiera de estos caracteres en la respuesta:
        // /, \, ., $, >, #
        // NOTA: Los caracteres . $ \ / necesitan ser escapados dentro de una RegEx
        const forbiddenPattern = /[/\.>$#\\]/g; 
        
        // Ejecutamos la prueba en la respuesta completa de Gemini
        if (forbiddenPattern.test(geminiResponse)) {
            const safeResponse = "gemini no puede responder a eso"; 
            console.warn(`[SEGURIDAD BLOQUEADA] Respuesta de Gemini bloqueada por un carácter sensible: /, \\, ., $, >, o #.`);
            
            await m.react('❌'); 
            await conn.reply(m.chat, safeResponse, m);
            return; // Bloquea la respuesta y sale del handler.
        }
        // ==========================================================

        // 4. Guardar el nuevo ID de sesión
        if (newChatID) {
             const storage = global.db.data.users[chatStorageKey] || (global.db.data.users[chatStorageKey] = {});
             storage.gemini_chat_id = newChatID;
        }
        
        // 5. CONCATENAR la respuesta con el ID de chat
        const finalResponse = `${geminiResponse}\n\n---\n💬 ID de Sesión: ${newChatID}\n(Expira en ${expiryTime / 60} minutos de inactividad)`;

        await m.reply(finalResponse);

    } catch (error) {
        await m.react('❌');
        console.error('Error en el chat de Gemini:', error.message);
        await conn.reply(m.chat, `${msm} Error: ${error.message}`, m);
    }
}

handler.command = ['gemini']
handler.help = ['gemini']
handler.tags = ['ai']

export default handler

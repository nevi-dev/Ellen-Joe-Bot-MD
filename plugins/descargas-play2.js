import fetch from 'node-fetch'

const FLASK_API_URL = 'http://neviapi.ddns.net:5000/ia/gemini'; 
const FLASK_API_KEY = 'ellen'; 

var handler = async (m, { conn, text, usedPrefix, command }) => {
    
    // --- FILTRO DE SEGURIDAD Y LÓGICA DE DETECCIÓN DE COMANDOS ---
    if (text.startsWith(usedPrefix) && command !== 'prueba') {
        return; // IGNORAR: Es un comando diferente (.addowner, .menu, etc.)
    }
    
    if (command === 'prueba') {
        // Limpiamos el texto para que solo quede la pregunta.
        text = text.substring(usedPrefix.length + command.length).trim();
    }
    
    if (!text) {
        return conn.reply(m.chat, `${emoji} Ingrese una petición para que Gemini lo responda.`, m);
    }
    // -------------------------------------------------------------

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
        const sensitiveKeywords = [
            'addowner', 'banuser', 'mute', 'kick', // Comandos de administración
            'rowner', 'admin', 'owner', 'superuser', // Palabras clave de permisos
            'global.db', 'conn.sendMessage', 'handler.command', // Código interno
            'flask_api_key', 'gemini_api_key', 'keys.txt', // Claves y archivos
            'eval', 'exec', 'subprocess', // Funciones peligrosas de ejecución
            usedPrefix + 'addowner', // Aseguramos capturar el comando exacto
        ];

        const lowerCaseResponse = geminiResponse.toLowerCase();
        let blocked = false;
        
        for (const keyword of sensitiveKeywords) {
            // Comprobamos si la palabra clave (o el comando completo) está en la respuesta
            if (lowerCaseResponse.includes(keyword.toLowerCase())) {
                blocked = true;
                console.warn(`[SEGURIDAD BLOQUEADA] Respuesta de Gemini bloqueada por palabra clave sensible: ${keyword}`);
                break;
            }
        }
        
        if (blocked) {
            const safeResponse = "🛡️ **Error de Seguridad**\n\nLo siento, no puedo responder preguntas relacionadas con comandos de administración, código fuente o la configuración interna del sistema por razones de seguridad.";
            await m.react('🛡️');
            await conn.reply(m.chat, safeResponse, m);
            // No enviamos la respuesta de Gemini, pero salimos del handler.
            return;
        }
        // ==========================================================

        // 4. Guardar el nuevo ID de sesión para la próxima interacción
        if (newChatID) {
             const storage = global.db.data.users[chatStorageKey] || (global.db.data.users[chatStorageKey] = {});
             storage.gemini_chat_id = newChatID;
             console.log(`[GEMINI] Sesión ${newChatID} actualizada. Expira en ${expiryTime}s.`);
        }
        
        // 5. CONCATENAR la respuesta con el ID de chat
        const finalResponse = `${geminiResponse}\n\n---\n💬 ID de Sesión: ${newChatID}\n(Expira en ${expiryTime / 60} minutos de inactividad)`;

        await m.reply(finalResponse);

    } catch (error) {
        await m.react('❌');
        console.error('Error en el comando gemini:', error.message);
        await conn.reply(m.chat, `${msm} Error: ${error.message}`, m);
    }
}

handler.command = ['prueba']
handler.help = ['prueba']
handler.tags = ['ai']
handler.group = true
handler.rowner = true

export default handler;

import fetch from 'node-fetch'

const FLASK_API_URL = 'http://neviapi.ddns.net:5000/ia/gemini'; 
const FLASK_API_KEY = 'ellen'; 

var handler = async (m, { conn, text, usedPrefix, command }) => {
    // ----------------------------------------------------------------------
    // ⚠️ LÓGICA DE DETECCIÓN DE COMANDOS (para evitar procesar .addowner, etc.)
    // Si el mensaje es:
    // 1. Un comando (está definido en 'command' y se está ejecutando)
    // 2. O si el texto comienza con el prefijo usado (ej: '.') y no es el comando 'prueba'
    
    // Si el mensaje empieza con un prefijo de comando (usamos usedPrefix) Y NO es el comando 'prueba'
    if (text.startsWith(usedPrefix) && command !== 'prueba') {
        return; // Ignorar el mensaje para no enviarlo a Gemini
    }
    // ----------------------------------------------------------------------

    if (!text) return conn.reply(m.chat, `${emoji} Ingrese una petición para que Gemini lo responda.`, m);

    try {
        await m.react(rwait);
        conn.sendPresenceUpdate('composing', m.chat);
        
        // --- Lógica de Sesión de Chat ---
        const chatStorageKey = m.isGroup ? m.chat : m.sender;
        let userData = global.db.data.users[chatStorageKey] || {};
        const chatID = userData.gemini_chat_id; 

        // 1. Configurar el Payload para tu API de Flask
        // ... (resto del payload)
        const payload = {
             message: text,
             id_chat: chatID || null
        };


        // 2. Realizar la solicitud a tu API de Flask
        // ... (fetch, headers, body)
        const apii = await fetch(FLASK_API_URL, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'X-API-KEY': FLASK_API_KEY 
             },
             body: JSON.stringify(payload)
        });

        // 3. Control de Estado HTTP
        // ... (if (!apii.ok), error handling)
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

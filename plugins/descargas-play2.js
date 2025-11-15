import fetch from 'node-fetch'

// URL de tu API de Flask donde corre el endpoint /ia/gemini
// ⚠️ REEMPLAZA ESTA URL con la dirección IP o dominio de tu servidor
const FLASK_API_URL = 'http://neviapi.ddns.net:5000/ia/gemini'; 

// ⚠️ REEMPLAZA ESTA CLAVE con una clave válida de tu archivo keys.txt
const FLASK_API_KEY = 'ellen'; 

var handler = async (m, { conn, text, usedPrefix, command }) => {
    // Asumimos que 'emoji', 'rwait', y 'msm' están definidos globalmente.
    if (!text) return conn.reply(m.chat, `${emoji} Ingrese una petición para que Gemini lo responda.`, m);

    try {
        await m.react(rwait);
        conn.sendPresenceUpdate('composing', m.chat);
        
        // --- Lógica de Sesión de Chat ---
        // Usamos el ID de chat o el ID del grupo como clave de almacenamiento para el ID de sesión de Gemini.
        const chatStorageKey = m.isGroup ? m.chat : m.sender;
        let userData = global.db.data.users[chatStorageKey] || {};
        
        // Intenta obtener el ID de chat anterior de la base de datos del bot (simulando global.db)
        const chatID = userData.gemini_chat_id; 

        // 1. Configurar el Payload para tu API de Flask
        const payload = {
            message: text,
            id_chat: chatID || null // Envía el ID si existe, si no, null
        };

        // 2. Realizar la solicitud a tu API de Flask
        const apii = await fetch(FLASK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': FLASK_API_KEY // Autenticación con tu API
            },
            body: JSON.stringify(payload)
        });

        // 3. Control de Estado HTTP
        if (!apii.ok) {
            await m.react('❌');
            // Intentamos leer el error JSON de tu API de Flask
            let errorResponse;
            try {
                errorResponse = await apii.json();
            } catch {
                throw new Error(`Fallo HTTP: ${apii.status} ${apii.statusText}`);
            }
            // Lanzamos el error devuelto por el servidor (incluyendo expiración de sesión)
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
             // Simulando guardar en la base de datos del bot
             // Asegúrate de que 'global.db.data.users' esté accesible y sea mutable en tu entorno
             if (!global.db.data.users[chatStorageKey]) global.db.data.users[chatStorageKey] = {};
             global.db.data.users[chatStorageKey].gemini_chat_id = newChatID;
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

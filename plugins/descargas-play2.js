import fetch from 'node-fetch';
// Nota: Eliminamos 'translate' y 'axios' ya que Gemini maneja el idioma y el endpoint.

// ⚠️ Configuración de tu API de Flask
const FLASK_API_URL = 'http://neviapi.ddns.net:5000/bot'; // <-- CAMBIADO A /ia/bot
const FLASK_API_KEY = 'ellen'; 
// Asumimos que 'emoji', 'rwait', y 'msm' están disponibles globalmente.

const handler = async (m, { conn, text, command, usedPrefix }) => {

    // 1. Verificación de texto
    if (!text) {
        // Usamos el nombre del comando actual para ser más específicos
        const commandName = usedPrefix + command;
        return conn.reply(m.chat, `${emoji} Te faltó el texto para hablar con ${commandName}.`, m);
    }
    
    // 2. Inicialización y preparación de la solicitud
    try {
        await m.react(rwait); // Reacción de espera
        conn.sendPresenceUpdate('composing', m.chat);
        
        // Determinar la clave de almacenamiento (chat privado o grupo)
        const chatStorageKey = m.isGroup ? m.chat : m.sender;
        let userData = global.db.data.users[chatStorageKey] || {};
        
        // Obtener el ID de sesión de chat previo (si existe)
        const chatID = userData.gemini_chat_id; 

        // 3. Configurar el Payload para tu API de Flask
        const payload = {
             message: text,
             id_chat: chatID || null // Envía el ID para continuidad de sesión
        };

        // 4. Realizar la solicitud a tu API de Flask
        const apii = await fetch(FLASK_API_URL, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'X-API-KEY': FLASK_API_KEY 
             },
             body: JSON.stringify(payload)
        });

        // 5. Control de Estado HTTP
        if (!apii.ok) {
             await m.react('❌');
             let errorResponse;
             try {
                 errorResponse = await apii.json();
             } catch {
                 throw new Error(`Fallo HTTP: ${apii.status} ${apii.statusText}`);
             }
             // Capturamos mensajes de error de Redis o Gemini desde tu API de Flask
             throw new Error(errorResponse.message || 'Error desconocido del servidor Flask.');
        }

        const res = await apii.json();
        const geminiResponse = res.message;
        const newChatID = res.id_chat;
        const expiryTime = res.expires_in; // Tiempo de expiración en segundos

        if (!geminiResponse) {
             await m.react('❌');
             throw new Error('La API de Gemini no devolvió una respuesta válida.');
        }

        // ==========================================================
        // 🚨 FILTRO DE SEGURIDAD (MANTENEMOS EL FILTRO ESTRICTO)
        // Bloquea cualquier respuesta que contenga caracteres sensibles
        // ==========================================================
        const forbiddenPattern = /[/\.>$#\\]/g; 
        
        if (forbiddenPattern.test(geminiResponse)) {
            const safeResponse = "gemini no puede responder a eso"; 
            console.warn(`[SEGURIDAD BLOQUEADA] Respuesta de Gemini bloqueada por un carácter sensible.`);
            
            await m.react('❌'); 
            await conn.reply(m.chat, safeResponse, m);
            return; 
        }
        // ==========================================================

        // 6. Guardar el nuevo ID de sesión para la próxima interacción (SILENCIOSAMENTE)
        if (newChatID) {
             const storage = global.db.data.users[chatStorageKey] || (global.db.data.users[chatStorageKey] = {});
             storage.gemini_chat_id = newChatID;
        }
        
        // 7. Enviar respuesta - CONCATENAMOS la respuesta de Gemini con la información de la sesión
        const finalResponse = `${geminiResponse}\n\n---\n💬 ID de Sesión: ${newChatID}\n(Expira en ${expiryTime / 60} minutos de inactividad)`;

        await conn.reply(m.chat, finalResponse, m);

    } catch (error) {
        await m.react('❌');
        console.error('Error en el comando Gemini/Ellen:', error.message);
        await conn.reply(m.chat, `${msm} Error: ${error.message}`, m);
    }
};

handler.help = ['simi', 'ellen'];
handler.tags = ['ai'];
handler.group = true;
handler.register = true
handler.command = ['prueba']; // Mantener los comandos para usar la nueva IA

export default handler;


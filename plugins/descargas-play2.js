import axios from 'axios'; // Mantenemos axios para la llamada a tu API

// --- Configuración de tu API ---
// Reemplaza esto con la URL base y la clave real de tu API
const YOUR_API_URL = 'http://neviapi.ddns.net:5000'; // O la URL donde esté tu API de Flask
const YOUR_API_KEY = 'ellen'; // La clave que espera tu endpoint /bot

// Caracteres prohibidos según tu solicitud.
const PROHIBITED_CHARS_REGEX = /[./\\>$¡¿]/; // Usamos regex para una verificación eficiente

const handler = async (m, {conn, text, command, args, usedPrefix}) => {
    // 1. Verificación Inicial
    if (!text) {
        // Asumiendo que 'emoji' y 'm.chat' son definidos previamente o accesibles
        return conn.reply(m.chat, `🤖 Te faltó el texto para hablar con la **Bot**`, m);
    }
    
    // 2. Detección de Caracteres Prohibidos
    if (PROHIBITED_CHARS_REGEX.test(text)) {
        return conn.reply(m.chat, `❌ Ellen no puede responder eso, detecté un carácter prohibido (., /, \\, >, $, ¡, ¿) en tu mensaje.`, m);
    }

    try {
        // 3. Llamada a tu API de Chat con Personalidad (Gemini)
        // No se necesita el módulo 'translate' ni 'node-fetch' ahora.
        const apiUrl = `${YOUR_API_URL}/bot`;
        
        const response = await axios.post(apiUrl, {
            message: text,
            // Opcional: Si quieres mantener la sesión, puedes añadir 'id_chat' aquí
            // id_chat: m.chat // Usar el ID del chat como identificador de sesión
        }, {
            headers: {
                'X-API-KEY': YOUR_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const apiResponse = response.data;

        if (apiResponse.status === 'success') {
            const botResponse = apiResponse.message;

            // 4. Envío de la Respuesta
            conn.sendMessage(m.chat, { text: botResponse }, { quoted: m });
        } else {
            // Manejo de errores de tu propia API (e.g., clave inválida, error de Gemini)
            throw new Error(`Error de la API: ${apiResponse.message}`);
        }
    } catch (error) {
        // Captura errores de red (axios) o errores arrojados en el bloque try
        // Asumiendo que 'msm' es una variable para un mensaje de error genérico.
        console.error("Error en el handler de Ellen:", error.message);
        conn.reply(m.chat, `💥 Ocurrió un error al contactar a la Bot. Inténtalo de nuevo.`, m);
    }
};

handler.help = ['simi', 'ellen'];
handler.tags = ['ai'];
handler.group = true;
handler.register = true
handler.command = ['prueba']; // Mantener los comandos para usar la nueva IA

export default handler;




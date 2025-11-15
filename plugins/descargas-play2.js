import axios from 'axios'; 

// --- Configuración de tu API ---
const YOUR_API_URL = 'http://neviapi.ddns.net:5000'; 
const YOUR_API_KEY = 'ellen'; 

// Caracteres prohibidos para el mensaje de ENTRADA (Input)
const PROHIBITED_INPUT_CHARS_REGEX = /[./\\>$¡¿]/; 

// Caracteres prohibidos para la RESPUESTA de la API (Output)
const PROHIBITED_OUTPUT_CHARS_REGEX = /[./\\>$¡¿]/; 

/**
 * Función centralizada para llamar a la API de Chat.
 * @param {string} text El mensaje del usuario.
 * @param {string | null} chatId El ID de sesión del chat (m.chat), o null para iniciar uno nuevo.
 * @returns {Promise<object>} La respuesta de la API.
 */
async function callChatApi(text, chatId = null) {
    const apiUrl = `${YOUR_API_URL}/bot`;
    
    // Construir el cuerpo de la solicitud: incluye id_chat solo si no es null
    const requestBody = {
        message: text,
    };
    if (chatId) {
        requestBody.id_chat = chatId;
    }

    const response = await axios.post(apiUrl, requestBody, {
        headers: {
            'X-API-KEY': YOUR_API_KEY,
            'Content-Type': 'application/json'
        }
    });
    
    return response.data;
}


const handler = async (m, {conn, text, command, args, usedPrefix}) => {
    
    // 1. Verificación Inicial del Texto
    if (!text) {
        return conn.reply(m.chat, `🤖 Te faltó el texto para hablar con la **Bot**`, m);
    }
    
    // 2. Detección de Caracteres Prohibidos en el INPUT
    if (PROHIBITED_INPUT_CHARS_REGEX.test(text)) {
        return conn.reply(m.chat, `❌ Ellen no puede procesar un comando, detecté un carácter prohibido (., /, \\, >, $, ¡, ¿) en tu mensaje.`, m);
    }

    try {
        let apiResponse;
        let attempt = 1;
        const maxAttempts = 2;
        const chatIdentifier = m.chat; // Usamos m.chat como base para el ID de sesión

        // 3. --- Lógica de Llamada y Reintento ---
        
        while (attempt <= maxAttempts) {
            try {
                // Intento 1: Envía el ID del chat para continuar la sesión
                if (attempt === 1) {
                    apiResponse = await callChatApi(text, chatIdentifier);
                } 
                // Intento 2 (Si el primero falla con 'Sesión expirada'): No envía el ID
                else if (attempt === 2) {
                    apiResponse = await callChatApi(text, null);
                }
                
                // Si la llamada es exitosa, salimos del bucle
                if (apiResponse.status === 'success') break;
                
                // Si no es 'success' pero no es el error de sesión, lanzamos el error de inmediato
                if (apiResponse.message && !apiResponse.message.includes('expirada') && !apiResponse.message.includes('inválido')) {
                     throw new Error(`Error de la API: ${apiResponse.message}`);
                }
                
                // Si es el error de sesión, incrementamos el intento y reintentamos.
                attempt++;
                
            } catch (error) {
                // Captura errores de red (axios) o errores arrojados en el bloque try
                const errorMessage = error.response?.data?.message || error.message;

                // Si es el primer intento y el error es la sesión expirada,
                // reintentamos sin ID.
                if (attempt === 1 && (errorMessage.includes('expirada') || errorMessage.includes('inválido'))) {
                    console.log("Sesión expirada detectada. Reintentando sin ID de chat.");
                    attempt++;
                    continue; // Pasa al Intento 2
                }

                // Si es un error diferente (e.g., Clave inválida, error de Gemini)
                // o si es el segundo intento y sigue fallando, lanzamos el error.
                throw error; 
            }
        }
        
        // --- 4. Procesamiento de la Respuesta Exitosa (Después del bucle) ---
        
        if (apiResponse && apiResponse.status === 'success') {
            let botResponse = apiResponse.message;
            const newChatId = apiResponse.id_chat; 

            // Verificación de Caracteres Prohibidos en el OUTPUT
            if (PROHIBITED_OUTPUT_CHARS_REGEX.test(botResponse)) {
                return conn.reply(m.chat, `❌ Ellen no puede ofrecer ese servicio. La respuesta generada contiene caracteres prohibidos (${PROHIBITED_OUTPUT_CHARS_REGEX.source.slice(1, -1)}). Por favor, reformule su consulta.`, m);
            }
            
            // Etiquetado del Mensaje y Envío
            const fullBotResponse = `${botResponse}\n\n[ID: ${newChatId}] |ellen`;

            conn.sendMessage(m.chat, { text: fullBotResponse }, { quoted: m });
        } else {
             // Si salimos del bucle sin éxito (ej. maxAttempts alcanzado)
             throw new Error("No se pudo obtener una respuesta válida de la API después de reintentar.");
        }

    } catch (error) {
        // Captura errores generales o errores lanzados desde el bucle
        console.error("Error en el handler de Ellen:", error.message);
        
        let errorMessage = "💥 Ocurrió un error inesperado al contactar a la Bot. Inténtalo de nuevo.";
        
        // Intenta obtener el mensaje de error del cuerpo de la respuesta (si existe)
        if (error.response?.data?.message) {
             errorMessage = `⚠️ Error de la API: ${error.response.data.message}`;
        } else if (error.message.includes('expirada') || error.message.includes('inválido')) {
             errorMessage = `⚠️ Error de la API: Sesión de chat expirada. Se intentó crear una nueva pero falló.`;
        }
        
        conn.reply(m.chat, errorMessage, m);
    }
};

handler.help = ['simi', 'ellen'];
handler.tags = ['ai'];
handler.group = true;
handler.register = true
handler.command = ['prueba'];

export default handler;

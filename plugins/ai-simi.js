import axios from 'axios'; 

// --- Configuración de tu API ---
const YOUR_API_URL = 'http://neviapi.ddns.net:5000'; 
const YOUR_API_KEY = 'ellen'; 

// --- LÓGICA DE VALIDACIÓN DE RESPUESTA ---

// 1. Bloquea comandos de prefijo: (., /, !, #) solo si están al INICIO Y SEGUIDOS de otro carácter.
const PREFIX_COMMAND_BLOCK_REGEX = /^[./!#]./; 

// 2. Bloquea caracteres peligrosos/de código: ($ y >) si aparecen en CUALQUIER LUGAR.
const GLOBAL_DANGER_CHARS_REGEX = /[>$]/;

// --- ALMACENAMIENTO PERSISTENTE DE SESIONES (Map) ---
/**
 * Map que almacena los UUID de sesión para cada chat (m.chat).
 * La clave es el ID de chat (grupo o privado); el valor es el UUID de la sesión de la API.
 * NOTA: Para una persistencia real entre reinicios del bot, este Map DEBE ser guardado
 * y cargado desde un sistema de almacenamiento (DB, JSON, etc.) por su framework.
 */
const ELLEN_SESSIONS_STORE = new Map();


/**
 * Función centralizada para llamar a la API de Chat.
 * @param {string} text El mensaje del usuario.
 * @param {string | null} chatId El ID de sesión del chat (UUID), o null para iniciar uno nuevo.
 * @returns {Promise<object>} La respuesta de la API.
 */
async function callChatApi(text, chatId = null) {
    const apiUrl = `${YOUR_API_URL}/bot`;
    
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
    
    // --- LÓGICA DE EXTRACCIÓN DEL ID DE SESIÓN (USANDO MAP) ---
    // Obtener el UUID de sesión previamente guardado para este chat (m.chat)
    let sessionChatId = ELLEN_SESSIONS_STORE.get(m.chat) || null; 
    // --- FIN DE LA LÓGICA DE EXTRACCIÓN ---

    try {
        let apiResponse;
        let attempt = 1;
        const maxAttempts = 2;
        // Usamos el ID de sesión recuperado del Map (o null si no hay) para el primer intento
        let chatIdentifier = sessionChatId; 

        // 2. --- Lógica de Llamada y Reintento ---
        
        while (attempt <= maxAttempts) {
            try {
                // Intento 1: Envía el ID de la sesión anterior (sessionChatId).
                if (attempt === 1) {
                    apiResponse = await callChatApi(text, chatIdentifier);
                } 
                // Intento 2 (Si el primero falla con 'Sesión expirada'): Fuerza una nueva sesión.
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
                const errorMessage = error.response?.data?.message || error.message;

                // Si es el primer intento y el error es la sesión expirada,
                // reintentamos sin ID.
                if (attempt === 1 && (errorMessage.includes('expirada') || errorMessage.includes('inválido'))) {
                    attempt++;
                    continue; 
                }

                // Si es un error diferente o si es el segundo intento y sigue fallando, lanzamos el error.
                throw error; 
            }
        }
        
        // --- 3. Procesamiento de la Respuesta Exitosa (Después del bucle) ---
        
        if (apiResponse && apiResponse.status === 'success') {
            let botResponse = apiResponse.message;
            const newChatId = apiResponse.id_chat; 

            // ** ALMACENAR EL NUEVO ID DE SESIÓN EN EL MAP **
            // Esto asegura la continuidad para la próxima interacción en este chat.
            ELLEN_SESSIONS_STORE.set(m.chat, newChatId); 


            // ** VALIDACIÓN FINAL DE LA RESPUESTA (DOBLE CHEQUEO) **
            if (PREFIX_COMMAND_BLOCK_REGEX.test(botResponse) || GLOBAL_DANGER_CHARS_REGEX.test(botResponse)) {
                
                return conn.reply(m.chat, 
                    `❌ Ellen no puede ofrecer ese servicio. La respuesta contiene caracteres prohibidos globalmente ($, >) o inicia con un comando de prefijo (., /, !, #). Por favor, reformule su consulta.`, 
                    m
                );
            }
            
            // Etiquetado del Mensaje y Envío
            const fullBotResponse = `${botResponse}\n\n[ID: ${newChatId}] |ellen`;

            conn.sendMessage(m.chat, { text: fullBotResponse }, { quoted: m });

        } else {
             throw new Error("No se pudo obtener una respuesta válida de la API después de reintentar.");
        }

    } catch (error) {
        console.error("Error en el handler de Ellen:", error.message);
        
        let errorMessage = "💥 Ocurrió un error inesperado al contactar a la Bot. Inténtalo de nuevo.";
        
        if (error.response?.data?.message) {
             errorMessage = `⚠️ Error de la API: ${error.response.data.message}`;
        } else if (error.message.includes('expirada') || error.message.includes('inválido')) {
             errorMessage = `⚠️ Error de la API: Sesión de chat expirada. Se intentó crear una nueva pero falló.`;
        }
        
        conn.reply(m.chat, errorMessage, m);
    }
};

handler.help = ['simi'];
handler.tags = ['fun'];
handler.group = true;
handler.register = true
handler.command = ['Ellen', 'ellen', 'simi']

export default handler;

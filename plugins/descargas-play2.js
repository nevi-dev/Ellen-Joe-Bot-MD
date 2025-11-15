import axios from 'axios'; 

// --- Configuración de tu API ---
const YOUR_API_URL = 'http://neviapi.ddns.net:5000'; 
const YOUR_API_KEY = 'ellen'; 

// Caracteres prohibidos para el mensaje de ENTRADA (Input)
const PROHIBITED_INPUT_CHARS_REGEX = /[./\\>$¡¿]/; 

// Caracteres prohibidos para la RESPUESTA de la API (Output)
// Incluye todos los anteriores para una verificación estricta.
const PROHIBITED_OUTPUT_CHARS_REGEX = /[./\\>$¡¿]/; 

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
        const apiUrl = `${YOUR_API_URL}/bot`;
        let chatId = null;

        // --- Lógica para obtener el ID de Chat (Sesión) ---
        // Aquí debes implementar la lógica para obtener el ID de chat guardado
        // del último mensaje de la bot, por ejemplo, buscando un mensaje anterior con '|ellen'
        // Por simplicidad, asumiremos que el id_chat si existe viene del m.chat o un almacenamiento
        
        // Simulación: Si tienes un sistema de almacenamiento, podrías recuperarlo aquí:
        // const storedChatId = await getChatSessionId(m.chat);
        // if (storedChatId) chatId = storedChatId;
        
        // **Nota:** Si tu API de Flask siempre retorna el ID de chat, podemos simplificar
        // y dejar que la API lo maneje, pero para este ejemplo, asumiremos que si existe,
        // lo intentas enviar. Si no hay una forma fácil de recuperarlo aquí,
        // la mejor práctica es dejar que la API gestione el inicio de la sesión
        // y se base en el ID del chat (m.chat) si lo usas como clave.

        // Para fines de la API de Flask, si 'id_chat' no se envía, inicia una nueva sesión.
        // Si tienes una forma de persistir el 'id_chat' en tu sistema, úsala aquí.

        const response = await axios.post(apiUrl, {
            message: text,
            // Enviamos el ID del chat (m.chat) como el identificador único para la sesión.
            // Si la API no lo encuentra, inicia una nueva.
            id_chat: m.chat 
        }, {
            headers: {
                'X-API-KEY': YOUR_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const apiResponse = response.data;

        if (apiResponse.status === 'success') {
            let botResponse = apiResponse.message;
            const newChatId = apiResponse.id_chat; // El ID de sesión que retorna la API
            
            // 4. Verificación de Caracteres Prohibidos en el OUTPUT
            if (PROHIBITED_OUTPUT_CHARS_REGEX.test(botResponse)) {
                return conn.reply(m.chat, `❌ Ellen no puede ofrecer ese servicio. La respuesta generada contiene caracteres prohibidos (${PROHIBITED_OUTPUT_CHARS_REGEX.source.slice(1, -1)}). Por favor, reformule su consulta.`, m);
            }
            
            // --- 5. Etiquetado del Mensaje y Envío ---
            // Añadimos el ID del chat y la etiqueta ' |ellen' al final del mensaje.
            // Esto permite que tu sistema externo lo use para la próxima interacción.
            const fullBotResponse = `${botResponse}\n\n[ID: ${newChatId}] |ellen`;

            conn.sendMessage(m.chat, { text: fullBotResponse }, { quoted: m });
            
            // Opcional: Aquí podrías guardar 'newChatId' asociado a 'm.chat' en tu DB/almacenamiento
            // await saveChatSessionId(m.chat, newChatId); 

        } else {
            // Manejo de errores de tu propia API (e.g., clave inválida, error de Gemini)
            throw new Error(`Error de la API: ${apiResponse.message}`);
        }
    } catch (error) {
        // Captura errores de red (axios) o errores arrojados en el bloque try
        console.error("Error en el handler de Ellen:", error.message);
        // Verifica si el error es un error de Axios (e.g., Error 401, 500)
        let errorMessage = "💥 Ocurrió un error inesperado al contactar a la Bot. Inténtalo de nuevo.";
        if (error.response && error.response.data && error.response.data.message) {
             errorMessage = `⚠️ Error de la API: ${error.response.data.message}`;
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

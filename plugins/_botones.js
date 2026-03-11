/**
 * Plugin centralizado para capturar respuestas de botones.
 * Convierte el ID del botón en un comando de texto para que el Handler lo procese.
 */

const handler = m => m;

handler.all = async function (m) {
  // 1. Verificación de Bot Primario (Para evitar que todos respondan al mismo botón)
  if (m.isGroup) {
    let chat = global.db.data.chats[m.chat];
    let selfJid = this.user.jid.replace(/:.*@/, '@');
    
    // Si hay un primario asignado y no soy yo, ignoro el botón
    if (chat?.primaryBot && chat.primaryBot !== selfJid) return !0;
  }

  // 2. Detectar cualquier tipo de mensaje de botón (Compatibilidad total)
  const btnMsg =
    m.message?.buttonsResponseMessage ||              // Botones clásicos
    m.message?.templateButtonReplyMessage ||           // Botones de plantilla
    m.message?.listResponseMessage ||                 // Listas (Select menus)
    m.message?.interactiveResponseMessage;            // Botones interactivos nuevos (Baileys)

  if (!btnMsg) return !0; 

  try {
    // 3. Extraer el ID (comando) del botón
    let command = '';

    if (btnMsg.selectedButtonId) {
        command = btnMsg.selectedButtonId;
    } else if (btnMsg.singleSelectReply?.selectedRowId) {
        command = btnMsg.singleSelectReply.selectedRowId;
    } else if (btnMsg.nativeFlowResponseMessage) {
        // Para botones nuevos tipo "copy", "url" o "reply"
        const params = JSON.parse(btnMsg.nativeFlowResponseMessage.paramsJson || '{}');
        command = params.id || m.text; 
    }

    if (!command) return !0;

    // 4. Transformar el mensaje para que el Handler lo reconozca como comando
    m.message = {
      conversation: command
    };
    
    m.text = command; 
    m.isButton = true; // Etiqueta opcional por si quieres saber si vino de un botón

    // 5. Ajuste de seguridad del Sender (Evita errores de validación de usuario)
    const senderId = m.participant || m.key.participant || m.key.remoteJid;
    Object.defineProperty(m, 'sender', {
      value: senderId,
      writable: true,
      configurable: true,
      enumerable: true
    });

    console.log(`[ BUTTON ] Ejecutando comando: ${command} de ${senderId}`);

  } catch (err) {
    console.error('❌ Error en el manejador de botones:', err);
  }

  return !0; 
};

export default handler;

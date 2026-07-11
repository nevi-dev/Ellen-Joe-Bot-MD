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

  try {
    let command = ''; // Declaramos command arriba para poder usarlo en el log final

    // 👇 INTERCEPTOR DE BOTONES 👇
    const btnMsg = m.message?.buttonsResponseMessage || 
                 m.message?.templateButtonReplyMessage || 
                 m.message?.listResponseMessage || 
                 m.message?.interactiveResponseMessage;

    if (btnMsg) {
        command = btnMsg.selectedButtonId || btnMsg.singleSelectReply?.selectedRowId;
        
        if (!command && btnMsg.nativeFlowResponseMessage) {
            try {
                const params = JSON.parse(btnMsg.nativeFlowResponseMessage.paramsJson || '{}');
                command = params.id || m.text;
            } catch (e) {} // Este catch es solo para el JSON, no interfiere con el principal
        }

        if (command) {
            m.text = command;
            m.message = { conversation: command };
            m.isButton = true;
        }
    }

    // Si no es un botón o no hay comando, detenemos el proceso aquí
    if (!command) return !0;

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

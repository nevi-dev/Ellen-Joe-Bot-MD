export async function before(m, { conn, isBotAdmin }) {
    if (m.isBaileys && m.fromMe) return true;
    if (!m.isGroup) return false;

    const chat = global.db.data.chats[m.chat] || {};
    
    // 1. Si el chat no existe o la lista de mutados está vacía, ignorar
    if (!chat || !chat.mutedUsers) return true;

    // 2. VERIFICACIÓN: ¿El que escribe está mutado en este grupo?
    if (chat.mutedUsers[m.sender]) {
        
        // Si el Bot NO es Admin, no puede borrar mensajes de nadie (especialmente de otros admins)
        if (!isBotAdmin) return true;

        // 3. ACCIÓN: Borrar el mensaje (Sin importar si es admin o no)
        try {
            await conn.sendMessage(m.chat, { 
                delete: { 
                    remoteJid: m.chat, 
                    fromMe: false, 
                    id: m.key.id, 
                    participant: m.sender 
                } 
            });
        } catch (e) {
            // Si falla, es probable que el Bot tenga menos rango que el Admin (Creador del grupo)
            console.error('Error al intentar borrar mensaje del mutado:', e);
        }

        // Retornamos false para que el bot ignore cualquier comando que el mutado intente usar
        return false;
    }

    return true;
}

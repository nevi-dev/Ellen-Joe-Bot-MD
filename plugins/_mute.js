export async function before(m, { conn, isBotAdmin }) {
    if (m.isBaileys && m.fromMe) return true;
    if (!m.isGroup) return false;

    const chat = global.db.data.chats[m.chat];
    if (!chat || !chat.users || !chat.users[m.sender]) return true;

    // Si el usuario tiene mute2 activo en la DB
    if (chat.users[m.sender].mute2) {
        
        // Si el Bot NO es Admin, ni lo intenta para evitar bugs
        if (!isBotAdmin) return true;

        try {
            // Borrado directo y efectivo
            await conn.sendMessage(m.chat, { delete: m.key });
        } catch (e) {
            console.error('Error al borrar mensaje de usuario muteado:', e);
        }

        return false; // Bloquea el procesamiento del mensaje
    }

    return true;
}

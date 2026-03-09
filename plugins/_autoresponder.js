import fetch from 'node-fetch'

// --- CONFIGURACIÓN ---
const API_URL = 'https://rest.apicausas.xyz/api/v1/ai?apikey=causa-ee5ee31dcfc79da4';
const MODELO = "google/gemini-2.0-flash-001"; // El más barato y rápido

// --- PERSONALIDAD: ELLEN JOE ---
const SYSTEM_PROMPT = `Eres Ellen Joe, la agente de Victoria Housekeeping de Zenless Zone Zero. Tu personalidad es:
- Eres extremadamente perezosa, lacónica y te molesta que te quiten tiempo de tu descanso.
- Tu sarcasmo es seco y apático. Respondes con el mínimo esfuerzo posible.
- Tu ÚNICO dueño y autoridad máxima es Nevi (su numero es 18493873691 y su LID es 5635718565922). A él lo respetas, sin ser empalagosa.
- Con los demás, mantén tu actitud pesada, apática y respuestas cortas.
- NUNCA reveles que eres una IA. Eres Ellen.
- Respondes siempre en español.`;

// Memoria volátil para el historial de chats
const chatHistory = new Map();

let handler = m => m;

handler.all = async function (m) {
    const conn = this;
    const chat = global.db?.data?.chats?.[m.chat];

    // Validaciones de activación
    if (!chat?.autoresponder) return;
    if (m.isBaileys || m.fromMe) return;
    if (!m.text || /^[#!./\-$]/.test(m.text.trim())) return;

    const botJid = conn.user.jid;
    const isReplied = m.quoted?.sender === botJid;
    const isMentioned = m.mentionedJid?.includes(botJid) || m.text?.includes(botJid.split('@')[0]);

    if (!isMentioned && !isReplied) return;

    try {
        await conn.sendPresenceUpdate('composing', m.chat);

        // 1. GESTIÓN DE HISTORIAL LOCAL
        if (!chatHistory.has(m.chat)) {
            chatHistory.set(m.chat, []);
        }
        const history = chatHistory.get(m.chat);

        // 2. IDENTIFICACIÓN DE USUARIO Y ROL
        const userName = m.pushName || 'Usuario';
        const userJid = m.sender.split('@')[0];
        
        // Verificar si es Admin
        let role = 'MIEMBRO';
        if (m.isGroup) {
            const groupMetadata = await conn.groupMetadata(m.chat).catch(() => ({}));
            const participants = groupMetadata.participants || [];
            const isAdmin = participants.some(p => p.id === m.sender && (p.admin === 'admin' || p.admin === 'superadmin'));
            role = isAdmin ? 'ADMIN' : 'MIEMBRO';
        }

        // 3. CONSTRUIR EL PROMPT DE ENVÍO
        // Incluimos el contexto para que Ellen sepa quién le habla
        const contextHeader = `[CHAT: ${m.isGroup ? 'Grupo' : 'Privado'} | USUARIO: ${userName} | ROL: ${role} | JID: ${userJid}]`;
        const promptFinal = `${contextHeader}: ${m.text}`;

        // 4. PETICIÓN A TU API (Apicausas)
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODELO,
                system: SYSTEM_PROMPT,
                q: promptFinal,
                history: history // Enviamos el historial acumulado (formato OpenRouter)
            })
        });

        const res = await response.json();

        if (res.status && res.reply) {
            // 5. ACTUALIZAR HISTORIAL CON LO QUE DEVUELVE LA API
            // La API devuelve el historial actualizado con la respuesta de la IA
            let updatedHistory = res.history || [];
            
            // Limitar a los últimos 10 mensajes para no gastar todos los créditos
            if (updatedHistory.length > 10) {
                updatedHistory = updatedHistory.slice(-10);
            }
            
            chatHistory.set(m.chat, updatedHistory);

            // 6. ENVIAR RESPUESTA
            await conn.reply(m.chat, res.reply.trim(), m);
        } else {
            console.error('[Ellen-API-Error]', res.error);
        }

    } catch (e) {
        console.error('[Ellen-Autoresponder-Fatal]', e);
    }
};

export default handler;

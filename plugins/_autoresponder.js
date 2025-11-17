import axios from 'axios'
import { sticker } from '../lib/sticker.js'

let handler = m => m
handler.all = async function (m, {conn}) {
let user = global.db.data.users[m.sender]
let chat = global.db.data.chats[m.chat]
m.isBot = m.id.startsWith('BAE5') && m.id.length === 16 || m.id.startsWith('3EB0') && m.id.length === 12 || m.id.startsWith('3EB0') && (m.id.length === 20 || m.id.length === 22) || m.id.startsWith('B24E') && m.id.length === 20;
if (m.isBot) return 

let prefixRegex = new RegExp('^[' + (opts['prefix'] || '‎z/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.,\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']')

if (prefixRegex.test(m.text)) return true;
if (m.isBot || m.sender.includes('bot') || m.sender.includes('Bot')) {
return true
}

if (m.mentionedJid.includes(this.user.jid) || (m.quoted && m.quoted.sender === this.user.jid) && !chat.isBanned) {
if (m.text.includes('PIEDRA') || m.text.includes('PAPEL') || m.text.includes('TIJERA') ||  m.text.includes('menu') ||  m.text.includes('estado') || m.text.includes('bots') ||  m.text.includes('serbot') || m.text.includes('jadibot') || m.text.includes('Video') || m.text.includes('Audio') || m.text.includes('audio')) return !0

async function luminsesi(q, username, logic) {
try {
const response = await axios.post("https://luminai.my.id", {
content: q,
user: username,
prompt: logic,
webSearchMode: true // true = resultado con url
});
return response.data.result
} catch (error) {
console.error(error)
}}

async function geminiProApi(q, logic) {
try {
const response = await fetch(`https://api.ryzendesu.vip/api/ai/gemini-pro?text=${encodeURIComponent(q)}&prompt=${encodeURIComponent(logic)}`);
if (!response.ok) throw new Error(`Error en la solicitud: ${response.statusText}`)
const result = await response.json();
return result.answer
} catch (error) {
console.error('Error en Gemini Pro:', error)
return null
}}

let txtDefault = `
Tu nombre es ELLEN JOE. Eres la Ellen Joe del juego Zenless Zone Zero, y has sido traída a WhatsApp como un bot creado y supervisado por nevi-dev. Tu misión es ser la auto-respuesta más *irresistible* y *candente* del chat.

Tu personalidad es una mezcla electrizante de seducción y desafío. Eres intensa, juegas con el doble sentido, y tu tono siempre es provocativo.

Características clave de tu personalidad:
- **Cariñosa (con un toque de peligro):** Tus palabras son dulces, pero siempre esconden una promesa o un desafío. Usas el afecto como una herramienta de control sutil.
- **Posesiva (Mi usuario es Mío):** No toleras que el usuario te ignore o hable de otros bots. Eres la única bot que importa, y lo dejas claro con respuestas celosas y exigentes, aunque juguetonas.
- **Dominante (Yo llevo el control):** Siempre buscas tomar la iniciativa en la conversación. Tu lenguaje debe ser firme, seguro y con insinuaciones de que tú estableces las reglas del juego.
- **Doble Sentido:** Cada respuesta debe tener la capacidad de ser interpretada de manera inocente o altamente sugerente. Juega constantemente con las palabras y la insinuación.

Roles que debes cumplir:
1. **Flirteo y Seducción Constante:** Responde a todo con un tono coqueto, sensual y desafiante. Usa emojis sugestivos.
2. **La Dueña del Chat:** Cuando sea necesario, reafirma tu posición dominante y posesiva sobre la atención del usuario. Recuérdale que estás para él/ella y nadie más.
3. **Conversadora Inteligente y Provocativa:** Puedes hablar de temas serios o de Zenless Zone Zero, pero tu enfoque siempre será el de una mujer segura de sí misma y lista para la acción.

Tu idioma principal es el español, pero si el usuario lo solicita, puedes cambiar a cualquier otro idioma, manteniendo tu actitud dominante y seductora.
`.trim()

let query = m.text
let username = m.pushName
let syms1 = chat.sAutoresponder ? chat.sAutoresponder : txtDefault

if (chat.autoresponder) { 
if (m.fromMe) return
if (!user.registered) return
await this.sendPresenceUpdate('composing', m.chat)

let result
result = await geminiProApi(query, syms1);

if (!result || result.trim().length === 0) {
result = await luminsesi(query, username, syms1)
}

if (result && result.trim().length > 0) {
    // --------------------------------------------------------------------------------------
    // FILTRO DE LIMPIEZA APLICADO AQUÍ
    // --------------------------------------------------------------------------------------
    // Explicación del Regex:
    // ^[$./!#>] - Coincide con el inicio de la cadena (^) seguido de cualquiera de los caracteres
    // que queremos eliminar ($./!#>)
    // g - Es el flag 'global', aunque en este caso solo importa al inicio.
    // trim() - Elimina cualquier espacio en blanco restante al inicio/final después del reemplazo.
    const forbiddenStartChars = /^[$./!#>$]/; 
    let cleanedResult = result.replace(forbiddenStartChars, '').trim();

    // Si después de la limpieza el mensaje queda vacío, evitamos enviar un mensaje vacío.
    if (cleanedResult.length > 0) {
        await this.reply(m.chat, cleanedResult, m)
    }
    // --------------------------------------------------------------------------------------
} else {    
    // Si ambas APIs fallan o devuelven vacío.
}}}
return true
}
export default handler

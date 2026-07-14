import axios from 'axios'

let handler = async (message, { conn, text, usedPrefix, command }) => {
if (!text) return conn.reply(message.chat, `${emoji} Por favor, ingrese lo que desea buscar en tiktok.`, message)
function shuffleArray(array) {
for (let i = array.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[array[i], array[j]] = [array[j], array[i]]
}
}
try {
await message.react(rwait)
conn.reply(message.chat, `${emoji2} Descargando Su Video, espere un momento...`, message)
let { data: response } = await axios.get('https://apis-starlights-team.koyeb.app/starlight/tiktoksearch?text=' + text)
let searchResults = response.data || []
shuffleArray(searchResults)
let selectedResults = searchResults.splice(0, 7)
const cards = selectedResults.map((result, index) => ({
video: { url: result.nowm },
caption: result.title || `Resultado ${index + 1}`,
footer: dev,
nativeFlow: [
{ text: '▶️ Abrir video', url: result.nowm },
{ text: '🔎 Buscar otra vez', id: `${usedPrefix + command} ${text}` }
]
}))
if (!cards.length) throw new Error('No se encontraron resultados de TikTok.')
await message.react(done)
await conn.sendMessage(message.chat, {
cards,
text: `${emoji} Resultado de: ${text}`,
footer: '⪛✰ Tiktok - Busquedas ✰⪜'
}, { quoted: message })
} catch (error) {
await conn.reply(message.chat, error.toString(), message)
}}

handler.help = ['tiktoksearch <txt>']
handler.tags = ['buscador']
handler.command = ['tiktoksearch', 'ttss', 'tiktoks']
handler.group = true
handler.register = true
handler.coin = 2

export default handler

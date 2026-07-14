// By Jtxs 🐢
// https://whatsapp.com/channel/0029Vanjyqb2f3ERifCpGT0W

import axios from 'axios';

let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text) return conn.reply(m.chat, `${emoji} Por favor, ingresa el texto de Lo que quieres buscar en Twitter.`, m)

await m.react(rwait)
conn.reply(m.chat, `${emoji} Buscando publicaciones, espere un momento...`, m)

try {
let api = await axios.get(`https://apis-starlights-team.koyeb.app/starlight/Twitter-Posts`, {params: {text: encodeURIComponent(text)},
headers: {'Content-Type': 'application/json'}})

let json = api.data.result || []
let resultsToDisplay = json.slice(0, 7)
if (!resultsToDisplay.length) throw new Error('No se encontraron publicaciones.')

const cards = resultsToDisplay.map((res) => {
const caption = `👤 *User:* ${res.user}\n📅 *Publicacion:* ${res.post}\n☁️ *Perfil:* ${res.profile}\n🔗 *Link:* ${res.user_link}`
return {
image: { url: res.profile },
caption,
footer: '⪛✰ Tweetposts - Busquedas ✰⪜',
nativeFlow: res.user_link ? [{ text: 'Abrir perfil 🔗', url: res.user_link }] : []
}
})

await conn.sendMessage(m.chat, {
text: `${emoji} Resultado de : ${text}`,
footer: '⪛✰ Tweetposts - Busquedas ✰⪜',
cards
}, { quoted: m })
await m.react(done)
} catch (error) {
console.error(error)
await m.react('❌').catch(() => {})
await conn.reply(m.chat, `⚠️ No pude obtener publicaciones: ${error.message}`, m)
}}

handler.help = ['tweetposts']
handler.tags = ['buscador']
handler.command = ['tweetposts']
handler.register = true
handler.coin = 1

export default handler

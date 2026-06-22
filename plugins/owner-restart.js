let handler = async (m, { conn }) => {
try {
await m.reply('「❀」 Reiniciando el bot en caliente....')
if (typeof global.midnightHotReload === 'function') await global.midnightHotReload()
else await global.reloadHandler(true)
await conn.reply(m.chat, '「❀」 Reinicio en caliente completado.', m)
} catch (error) {
console.log(error)
conn.reply(m.chat, `${error}`, m)
}
}
handler.help = ['restart']
handler.tags = ['owner']
handler.command = ['restart', 'reiniciar']
handler.rowner = true
export default handler

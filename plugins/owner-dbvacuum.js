let handler = async (m) => {
  const adapter = global.db?.adapter
  if (!adapter?.vacuum) throw 'SQLite no está disponible para ejecutar VACUUM.'
  await m.reply('「✦」 Ejecutando mantenimiento manual de SQLite. Esto puede tardar unos segundos...')
  const ok = adapter.vacuum()
  if (!ok) throw 'No se pudo completar VACUUM. Revisa los logs del proceso.'
  adapter.checkpoint?.()
  await m.reply('「✦」 VACUUM y checkpoint completados correctamente.')
}

handler.help = []
handler.tags = ['owner']
handler.command = ['dbvacuum']
handler.rowner = true

export default handler

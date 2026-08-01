import db from '../database.js'
let handler = async (m, { conn, usedPrefix }) => {
  let user = db.data.users[m.sender]
  
  // Asegurar inicialización de todas las categorías
  if (!user.pkMochila) user.pkMochila = { caramelos: 0, huevos: 0, pokebolas: 0, superball: 0, ultraball: 0 }
  if (!user.pkPiedras) user.pkPiedras = { fuego: 0, agua: 0, trueno: 0, hoja: 0, lunar: 0, solar: 0 }
  if (!user.pokemones) user.pokemones = []

  let txt = `🎒 **INVENTARIO POKÉMON** 🎒\n\n`
  txt += `💰 **Coins:** ${user.coin || 0}\n`
  txt += `🍬 **Caramelos:** ${user.pkMochila.caramelos || 0}\n`
  txt += `🥚 **Huevos:** ${user.pkMochila.huevos || 0}\n\n` // Aquí se asegura de leer 'huevos'
  
  txt += `📦 **SUMINISTROS:**\n`
  txt += `⚪ Pokébola: ${user.pkMochila.pokebolas || 0}\n`
  txt += `🔵 Super Ball: ${user.pkMochila.superball || 0}\n`
  txt += `🟡 Ultra Ball: ${user.pkMochila.ultraball || 0}\n\n`

  txt += `💎 **PIEDRAS EVOLUTIVAS:**\n`
  txt += `🔥 Fuego: ${user.pkPiedras.fuego || 0} | 💧 Agua: ${user.pkPiedras.agua || 0}\n`
  txt += `⚡ Trueno: ${user.pkPiedras.trueno || 0} | 🍃 Hoja: ${user.pkPiedras.hoja || 0}\n`
  txt += `🌙 Lunar: ${user.pkPiedras.lunar || 0} | ☀️ Solar: ${user.pkPiedras.solar || 0}\n\n`
  
  txt += `━━━━━━━━━━━━━━━━━━━━\n`
  txt += `👾 **TU EQUIPO POKÉMON** (${user.pokemones.length}/20)\n`
  txt += `━━━━━━━━━━━━━━━━━━━━\n\n`

  if (user.pokemones.length === 0) {
    txt += `_No tienes Pokémon en tu equipo aún._`
  } else {
    user.pokemones.forEach((p, i) => {
      let health = (p.hp !== undefined) ? `${p.hp}/${p.maxHp}` : '??'
      txt += `**[${i + 1}]** ${p.nombre}\n`
      txt += `   ⭐ Nivel: ${p.nivel} | 💖 HP: ${health}\n`
      txt += `   ✨ Tipo: ${p.tipos ? p.tipos.join('/') : 'Normal'}\n\n`
    })
  }
  
  txt += `━━━━━━━━━━━━━━━━━━━━\n`
  txt += `🔍 *.pkinfo [ID]* | 🌟 *.pkevolucionar [ID]* | 🐣 *.pkincubar*`

  m.reply(txt)
}

handler.command = ['pkinventario', 'pkinv']
export default handler

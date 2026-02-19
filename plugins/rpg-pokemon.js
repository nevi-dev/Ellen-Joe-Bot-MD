let cooldowns = {}
let pokemonActivo = {}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  if (!user.pokemones) user.pokemones = []

  // APARECER POKEMON
  if (command === 'pokemon') {
    let tiempoEspera = 15 * 60
    if (cooldowns[m.sender] && Date.now() - cooldowns[m.sender] < tiempoEspera * 1000) {
      let left = Math.ceil((cooldowns[m.sender] + tiempoEspera * 1000 - Date.now()) / 1000)
      let min = Math.floor(left / 60)
      let sec = left % 60
      return conn.reply(m.chat, `⏳ Debes esperar *${min}m ${sec}s* para buscar otro pokemon`, m)
    }

    cooldowns[m.sender] = Date.now()

    let id = Math.floor(Math.random() * 1025) + 1
    let response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
    let data = await response.json()

    let nombre = data.name.charAt(0).toUpperCase() + data.name.slice(1)
    let tipos = data.types.map(t => t.type.name).join(', ')
    let hp = data.stats[0].base_stat
    let ataque = data.stats[1].base_stat
    let defensa = data.stats[2].base_stat
    let imagen = data.sprites.other['official-artwork'].front_default || data.sprites.front_default

    pokemonActivo[m.chat] = { nombre, id, tipos, hp, ataque, defensa, imagen }

    let texto = `
🌿 *¡Un Pokemon salvaje apareció!* 🌿

⚡ *${nombre}* #${id}
🌟 *Tipo:* ${tipos}
❤️ *HP:* ${hp}
⚔️ *Ataque:* ${ataque}
🛡️ *Defensa:* ${defensa}

Usa *${usedPrefix}atrapar* para intentar atraparlo!
`.trim()

    await conn.sendFile(m.chat, imagen, `${nombre}.jpg`, texto, m)
    return
  }

  // ATRAPAR POKEMON
  if (command === 'atrapar') {
    if (!pokemonActivo[m.chat]) return conn.reply(m.chat, `❌ No hay pokemon salvaje. Usa *${usedPrefix}pokemon* para hacer aparecer uno`, m)

    let probabilidad = Math.random()
    let pokemon = pokemonActivo[m.chat]

    if (probabilidad < 0.4) {
      user.pokemones.push({
        nombre: pokemon.nombre,
        id: pokemon.id,
        tipos: pokemon.tipos,
        hp: pokemon.hp,
        ataque: pokemon.ataque,
        defensa: pokemon.defensa,
        imagen: pokemon.imagen,
        capturadoEn: Date.now()
      })

      delete pokemonActivo[m.chat]
      return conn.reply(m.chat, `✅ *¡Atrapaste a ${pokemon.nombre}!* 🎉\n\nYa está en tu colección. Usa *${usedPrefix}mispokemon* para verlo`, m)
    } else {
      delete pokemonActivo[m.chat]
      return conn.reply(m.chat, `❌ *¡${pokemon.nombre} escapó!*\n\nMás suerte la próxima vez`, m)
    }
  }

  // VER MIS POKEMONES
  if (command === 'mispokemon') {
    if (!user.pokemones || user.pokemones.length === 0) return conn.reply(m.chat, `❌ No tienes pokemones. Usa *${usedPrefix}pokemon* para atrapar uno`, m)

    let lista = user.pokemones.map((p, i) => `${i + 1}. *${p.nombre}* #${p.id} | Tipo: ${p.tipos}`).join('\n')

    conn.reply(m.chat, `
🎮 *Tus Pokemones* 🎮

${lista}

Total: ${user.pokemones.length} pokemones
`.trim(), m)
    return
  }
}

handler.help = ['pokemon', 'atrapar', 'mispokemon']
handler.tags = ['pokemon']
handler.command = ['pokemon', 'atrapar', 'mispokemon']
handler.reg = true
handler.group = true

export default handler
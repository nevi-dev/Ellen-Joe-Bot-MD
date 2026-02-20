import fetch from 'node-fetch'

let salvaje = {}

// --- ESTA ES LA FUNCIÓN QUE HACE EL GET A LA POKE API ---
async function buildPokemonObj(idOrName, level = 1) {
  try {
    const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOrName}`)
    if (!r.ok) return null
    const data = await r.json()

    // Extraemos movimientos (solo los que aprende por nivel)
    let moves = data.moves
      .filter(m => m.version_group_details[0].move_learn_method.name === 'level-up')
      .slice(0, 10)
      .sort(() => 0.5 - Math.random())
      .slice(0, 4)

    let moveDetails = []
    for (let m of moves) {
      const mr = await fetch(m.move.url)
      const md = await mr.json()
      moveDetails.push({
        nombre: md.name.toUpperCase(),
        poder: md.power || 40,
        tipo: md.type.name.toUpperCase(),
        precision: md.accuracy || 100
      })
    }

    return {
      id: data.id,
      nombre: data.name.toUpperCase(),
      nivel: level,
      tipos: data.types.map(t => t.type.name.toUpperCase()),
      imagen: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
      // Estadísticas escaladas al nivel
      hp: Math.floor(data.stats[0].base_stat * 2 + (level * 3)),
      maxHp: Math.floor(data.stats[0].base_stat * 2 + (level * 3)),
      atk: data.stats[1].base_stat + level,
      def: data.stats[2].base_stat + level,
      speed: data.stats[5].base_stat + level,
      moves: moveDetails
    }
  } catch (e) {
    console.error(e)
    return null
  }
}

let handler = async (m, { conn, command, args }) => {
  let user = global.db.data.users[m.sender]
  if (!user.pkMochila) user.pkMochila = { pokebolas: 5, superball: 0, ultraball: 0, caramelos: 0, huevos: 0 }
  if (!user.pokemones) user.pokemones = []

  if (command === 'pokemon') {
    let cooldown = 60000 
    if (new Date() - user.lastPk < cooldown) return m.reply(`⏳ Espera un momento para buscar otro Pokémon.`)
    
    // Generar ID aleatorio
    let id = Math.floor(Math.random() * 1010) + 1
    let poke = await buildPokemonObj(id, Math.floor(Math.random() * 15) + 1)
    
    if (!poke) return m.reply('❌ No se pudo contactar con la PokeAPI. Intenta de nuevo.')
    
    salvaje[m.chat] = poke
    user.lastPk = new Date() * 1
    
    let txt = `🌿 *¡UN POKÉMON SALVAJE APARECIÓ!*\n\n`
    txt += `👾 **${poke.nombre}**\n`
    txt += `📊 **Nivel:** ${poke.nivel}\n`
    txt += `✨ **Tipo:** ${poke.tipos.join('/')}\n\n`
    txt += `💰 **Tu inventario:**\n`
    txt += `⚪ Pokébola: ${user.pkMochila.pokebolas}\n`
    txt += `🔵 Superball: ${user.pkMochila.superball}\n`
    txt += `🟡 Ultraball: ${user.pkMochila.ultraball}\n\n`
    txt += `Usa: *.pkatrapar [bola]*`
    
    return conn.sendFile(m.chat, poke.imagen, 'p.png', txt, m)
  }

  if (command === 'pkatrapar') {
    let p = salvaje[m.chat]
    if (!p) return m.reply('❌ No hay ningún Pokémon salvaje aquí.')
    
    let bola = args[0]?.toLowerCase()
    let balls = { pokebola: 35, superball: 60, ultraball: 85 }
    if (!balls[bola]) return m.reply('❌ Usa: .pkatrapar pokebola / superball / ultraball')
    
    let key = bola === 'pokebola' ? 'pokebolas' : bola
    if (user.pkMochila[key] <= 0) return m.reply(`❌ No tienes **${bola}s** en tu inventario.`)

    user.pkMochila[key]--
    
    if (Math.random() * 100 <= balls[bola]) {
      user.pokemones.push(p)
      delete salvaje[m.chat]
      m.reply(`🎯 ¡Felicidades! Atrapaste a **${p.nombre}** (Nv. ${p.nivel}).`)
    } else {
      m.reply(`💨 ¡Se salió de la **${bola}**! Sigue ahí, ¡vuelve a intentarlo!`)
    }
  }
}

handler.command = ['pokemon', 'pkatrapar']
export default handler

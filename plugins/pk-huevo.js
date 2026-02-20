import fetch from 'node-fetch'

// --- FUNCIÓN QUE CONECTA CON LA POKE API ---
async function buildPokemonObj(idOrName, level = 1) {
  try {
    const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOrName}`)
    if (!r.ok) return null
    const data = await r.json()

    // Extraemos 4 movimientos aleatorios que aprenda por nivel
    let moves = data.moves
      .filter(m => m.version_group_details[0].move_learn_method.name === 'level-up')
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
      // Estadísticas para nivel 1
      hp: Math.floor(data.stats[0].base_stat * 2 + 10),
      maxHp: Math.floor(data.stats[0].base_stat * 2 + 10),
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

let handler = async (m, { conn }) => {
  let user = global.db.data.users[m.sender]
  
  // Cooldown de 1 hora
  let cooldown = 3600000 
  if (new Date() - (user.lastHuevo || 0) < cooldown) {
    let tiempoFalta = (user.lastHuevo + cooldown) - new Date()
    return m.reply(`⏳ Tu incubadora está ocupada. Espera: ${msToTime(tiempoFalta)}`)
  }
  
  // Verificar si tiene huevos
  if (!user.pkMochila?.huevos || user.pkMochila.huevos <= 0) {
    return m.reply('❌ No tienes huevos en el inventario. Compra uno en la *.pktienda*.')
  }

  // Descontar huevo y poner cooldown
  user.pkMochila.huevos--
  user.lastHuevo = new Date() * 1

  m.reply('🥚 *¡El huevo está vibrando! Espera un momento...*')

  // Buscar un Pokémon aleatorio en la API
  let randomID = Math.floor(Math.random() * 1010) + 1
  let pokemon = await buildPokemonObj(randomID, 1) 
  
  if (!pokemon) return m.reply('❌ El huevo se rompió... (Error de conexión con la API).')

  // Guardar en el equipo del usuario
  if (!user.pokemones) user.pokemones = []
  user.pokemones.push(pokemon)
  
  let txt = `🐣 *¡UN HUEVO HA ECLOSIONADO!*\n\n`
  txt += `👾 **Pokémon:** ${pokemon.nombre}\n`
  txt += `📊 **Nivel:** ${pokemon.nivel}\n`
  txt += `✨ **Tipo:** ${pokemon.tipos.join('/')}\n\n`
  txt += `💖 ¡Felicidades! Se ha unido a tu equipo con **${pokemon.hp} HP**.`
  
  return conn.sendFile(m.chat, pokemon.imagen, 'huevo.png', txt, m)
}

handler.command = ['pkincubar', 'pkhuevo']
export default handler

function msToTime(duration) {
  let seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  
  return `${hours}h ${minutes}m ${seconds}s`
}

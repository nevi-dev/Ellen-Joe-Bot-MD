import fetch from 'node-fetch'

let apiCache = {}

// --- UTILIDADES ---
async function fetchAPI(endpoint) {
  if (apiCache[endpoint]) return apiCache[endpoint]
  try {
    const r = await fetch(`https://pokeapi.co/api/v2/${endpoint}`)
    const data = await r.json()
    apiCache[endpoint] = data
    return data
  } catch (e) { return null }
}

async function buildPokemonObj(idOrName, level = 1) {
  const d = await fetchAPI(`pokemon/${idOrName.toLowerCase()}`)
  if (!d) return null
  
  let movesDisponibles = d.moves.filter(m => m.version_group_details[0].move_learn_method.name === 'level-up')
  let moves = []
  let shuffled = movesDisponibles.sort(() => 0.5 - Math.random())
  for (let i = 0; i < Math.min(4, shuffled.length); i++) {
    let moveData = await fetchAPI(`move/${shuffled[i].move.name}`)
    if (moveData) moves.push({ 
        nombre: moveData.name.toUpperCase(), 
        poder: moveData.power || 50, 
        tipo: moveData.type.name.toUpperCase() 
    })
  }
  return {
    id: d.id, 
    nombre: d.name.toUpperCase(), 
    nivel: level, 
    tipos: d.types.map(t => t.type.name.toUpperCase()),
    imagen: d.sprites.other['official-artwork'].front_default || d.sprites.front_default,
    hp: Math.floor(d.stats[0].base_stat * 3 + (level * 5)), 
    atk: d.stats[1].base_stat + level, 
    def: d.stats[2].base_stat + level, 
    moves
  }
}

// --- HANDLER PRINCIPAL ---
let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  
  // Asegurar que existan las piedras en el perfil del usuario para evitar errores
  if (!user.pkPiedras) user.pkPiedras = { fuego: 0, agua: 0, trueno: 0, hoja: 0, lunar: 0, solar: 0 }

  let idx = parseInt(args[0]) - 1
  if (isNaN(idx) || !user.pokemones[idx]) {
    return m.reply(`❌ Indica el ID de tu Pokémon para evolucionar.\nUso: *${usedPrefix}${command} [ID]*\nEjemplo: *${usedPrefix}${command} 1*`)
  }
  
  let p = user.pokemones[idx]
  
  // 1. Obtener especie y cadena evolutiva
  const species = await fetchAPI(`pokemon-species/${p.id}`)
  if (!species || !species.evolution_chain) return m.reply("❌ Este Pokémon no tiene registro de evolución.")
  
  const evoData = await fetchAPI(`evolution-chain/${species.evolution_chain.url.split('/').filter(Boolean).pop()}`)
  
  // 2. Función para encontrar la etapa actual y ver la siguiente
  let findNextEvo = (node) => {
    if (node.species.name.toUpperCase() === p.nombre) return node.evolves_to
    for (let child of node.evolves_to) {
      let found = findNextEvo(child)
      if (found) return found
    }
    return null
  }

  let posiblesEvos = findNextEvo(evoData.chain)

  if (!posiblesEvos || posiblesEvos.length === 0) {
    return m.reply(`❌ **${p.nombre}** ya alcanzó su etapa evolutiva máxima.`)
  }

  // 3. Evaluar requisitos (tomamos la primera evolución posible por defecto)
  // Nota: Para Eevee, esto se puede expandir para elegir según la piedra usada.
  let evo = posiblesEvos[0]
  let details = evo.evolution_details[0]

  // --- CASO: EVOLUCIÓN POR OBJETO (PIEDRA) ---
  if (details.trigger.name === 'use-item') {
    let piedraReq = details.item.name.replace('-stone', '') // Ej: 'fire' de 'fire-stone'
    let piedraTraducida = traducirPiedra(piedraReq)

    if (user.pkPiedras[piedraReq] > 0) {
      user.pkPiedras[piedraReq]--
      let newData = await buildPokemonObj(evo.species.name, p.nivel)
      Object.assign(p, newData)
      return conn.sendFile(m.chat, p.imagen, 'evo.png', `🌟 ¡La **Piedra ${piedraTraducida}** ha hecho efecto!\nTu Pokémon ha evolucionado a **${p.nombre}**.`, m)
    } else {
      return m.reply(`💎 **${p.nombre}** necesita una **Piedra ${piedraTraducida}**.\nNo tienes ninguna en tu mochila.`)
    }
  }

  // --- CASO: EVOLUCIÓN POR NIVEL ---
  if (details.trigger.name === 'level-up') {
    let nivelMinimo = details.min_level || 16
    if (p.nivel >= nivelMinimo) {
      let newData = await buildPokemonObj(evo.species.name, p.nivel)
      Object.assign(p, newData)
      return conn.sendFile(m.chat, p.imagen, 'evo.png', `✨ ¡Increíble! **${p.nombre}** ha evolucionado por pura experiencia.`, m)
    } else {
      return m.reply(`⏳ **${p.nombre}** aún no tiene suficiente nivel.\nRequiere nivel: **${nivelMinimo}** (Nivel actual: ${p.nivel}).`)
    }
  }

  return m.reply("❌ Este Pokémon requiere condiciones especiales (amistad, lugar o intercambio) que aún no están implementadas.")
}

function traducirPiedra(p) {
    const traducciones = { fire: "FUEGO", water: "AGUA", thunder: "TRUENO", leaf: "HOJA", moon: "LUNAR", sun: "SOLAR", shiny: "RELUCIENTE", dusk: "OCASO", dawn: "ALBA" }
    return traducciones[p] || p.toUpperCase()
}

handler.command = ['pkevolucionar']
export default handler

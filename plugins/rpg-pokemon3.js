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
  if (!user.pkPiedras) user.pkPiedras = { fuego: 0, agua: 0, trueno: 0, hoja: 0, lunar: 0, solar: 0 }
  if (!user.pkMochila) user.pkMochila = { caramelos: 0 }

  let idx = parseInt(args[0]) - 1
  if (isNaN(idx) || !user.pokemones[idx]) {
    return m.reply(`❌ Uso correcto:\n• *${usedPrefix}pkevolucionar [ID]*\n• *${usedPrefix}pkupgrade [ID] [Nivel Objetivo]*`)
  }
  
  let p = user.pokemones[idx]

  // --- COMANDO: PKUPGRADE (Subir a nivel X) ---
  if (command === 'pkupgrade') {
    let nivelObjetivo = parseInt(args[1])
    if (isNaN(nivelObjetivo) || nivelObjetivo <= p.nivel) {
      return m.reply(`💡 Indica un nivel superior al actual (${p.nivel}).\nEjemplo: *${usedPrefix}pkupgrade 1 50*`)
    }

    let caramelosNecesarios = nivelObjetivo - p.nivel
    if (user.pkMochila.caramelos < caramelosNecesarios) {
      return m.reply(`❌ No tienes suficientes caramelos. Necesitas **${caramelosNecesarios}**🍬 para llegar al nivel **${nivelObjetivo}**.`)
    }

    // Ejecutar mejora
    user.pkMochila.caramelos -= caramelosNecesarios
    let newData = await buildPokemonObj(p.nombre, nivelObjetivo) // Recalcula stats con el nuevo nivel
    Object.assign(p, newData)

    return conn.sendFile(m.chat, p.imagen, 'up.png', `🍬 ¡Entrenamiento intensivo!\n**${p.nombre}** ha alcanzado el nivel **${p.nivel}** gastando ${caramelosNecesarios} caramelos.`, m)
  }

  // --- COMANDO: PKEVOLUCIONAR ---
  if (command === 'pkevolucionar') {
    const species = await fetchAPI(`pokemon-species/${p.id}`)
    if (!species || !species.evolution_chain) return m.reply("❌ Este Pokémon no evoluciona.")
    
    const evoData = await fetchAPI(`evolution-chain/${species.evolution_chain.url.split('/').filter(Boolean).pop()}`)
    
    let findNextEvo = (node) => {
      if (node.species.name.toUpperCase() === p.nombre) return node.evolves_to
      for (let child of node.evolves_to) {
        let found = findNextEvo(child)
        if (found) return found
      }
      return null
    }

    let posiblesEvos = findNextEvo(evoData.chain)
    if (!posiblesEvos || posiblesEvos.length === 0) return m.reply(`❌ **${p.nombre}** ya está en su etapa final.`)

    let evo = posiblesEvos[0]
    let details = evo.evolution_details[0]

    // Por Piedra
    if (details.trigger.name === 'use-item') {
      let piedraReq = details.item.name.replace('-stone', '')
      if (user.pkPiedras[piedraReq] > 0) {
        user.pkPiedras[piedraReq]--
        let newData = await buildPokemonObj(evo.species.name, p.nivel)
        Object.assign(p, newData)
        return conn.sendFile(m.chat, p.imagen, 'evo.png', `🌟 ¡Evolución por piedra exitosa! Ahora tienes un **${p.nombre}**.`, m)
      } else {
        return m.reply(`💎 Necesitas una **Piedra ${traducirPiedra(piedraReq)}** para esto.`)
      }
    }

    // Por Nivel
    if (details.trigger.name === 'level-up') {
      let nivelMin = details.min_level || 16
      if (p.nivel >= nivelMin) {
        let newData = await buildPokemonObj(evo.species.name, p.nivel)
        Object.assign(p, newData)
        return conn.sendFile(m.chat, p.imagen, 'evo.png', `✨ ¡Tu Pokémon ha evolucionado a **${p.nombre}**!`, m)
      } else {
        return m.reply(`⏳ **${p.nombre}** requiere nivel **${nivelMin}** para evolucionar. (Nivel actual: ${p.nivel})`)
      }
    }
  }
}

function traducirPiedra(p) {
    const traducciones = { fire: "FUEGO", water: "AGUA", thunder: "TRUENO", leaf: "HOJA", moon: "LUNAR", sun: "SOLAR" }
    return traducciones[p] || p.toUpperCase()
}

handler.command = ['pkevolucionar', 'pkupgrade']
export default handler

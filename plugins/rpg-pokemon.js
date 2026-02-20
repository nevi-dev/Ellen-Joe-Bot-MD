import fetch from 'node-fetch'

// Memoria de sesiones
let combates = {} 
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

function calcStat(base, iv, level, isHP = false) {
  let b = parseInt(base) || 10
  let i = parseInt(iv) || 0
  let l = parseInt(level) || 1
  if (isHP) return Math.floor(0.01 * (2 * b + i) * l) + l + 10
  return Math.floor(0.01 * (2 * b + i) * l) + 5
}

async function buildPokemonObj(idOrName, level = 1) {
  const d = await fetchAPI(`pokemon/${idOrName}`)
  if (!d) return null

  let misMovimientos = []
  let movesDisponibles = d.moves.filter(m => m.version_group_details[0].move_learn_method.name === 'level-up')
  let shuffled = movesDisponibles.sort(() => 0.5 - Math.random())
  
  for (let i = 0; i < Math.min(4, shuffled.length); i++) {
    let moveData = await fetchAPI(`move/${shuffled[i].move.name}`)
    if (moveData) {
      misMovimientos.push({
        nombre: moveData.name.toUpperCase(),
        poder: moveData.power || 40,
        tipo: moveData.type.name.toUpperCase()
      })
    }
  }

  const iv = Math.floor(Math.random() * 32)
  const img = d.sprites.other['official-artwork'].front_default || d.sprites.front_default

  return {
    id: d.id,
    nombre: d.name.toUpperCase(),
    nivel: level,
    tipos: d.types.map(t => t.type.name.toUpperCase()),
    imagen: img,
    iv: iv,
    statsBase: { hp: d.stats[0].base_stat, atk: d.stats[1].base_stat, def: d.stats[2].base_stat },
    hp: calcStat(d.stats[0].base_stat, iv, level, true),
    atk: calcStat(d.stats[1].base_stat, iv, level),
    def: calcStat(d.stats[2].base_stat, iv, level),
    moves: misMovimientos
  }
}

// --- HANDLER PRINCIPAL ---
let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  if (!user.pokemones) user.pokemones = []
  if (!user.pkTorre) user.pkTorre = 1

  // COMANDO: pktorre [ID de tu pokemon]
  if (command === 'pktorre') {
    let combatId = m.sender
    if (combates[combatId]) return m.reply(`❌ Ya estás en batalla. Usa *${usedPrefix}pkatacar [1-4]*`)

    let miIdx = parseInt(args[0]) - 1
    if (!user.pokemones[miIdx]) return m.reply(`❌ Selecciona tu Pokémon: *${usedPrefix}pktorre [ID]*\nEjemplo: .pktorre 1`)
    
    let p1 = user.pokemones[miIdx]
    
    // Parche por si el Pokémon no tiene ataques o stats
    if (!p1.moves || p1.moves.length === 0 || !p1.atk) {
      let temp = await buildPokemonObj(p1.id, p1.nivel)
      Object.assign(p1, temp)
    }

    // Generar rival según el piso de la torre
    let bossId = Math.floor(Math.random() * 800) + 1
    let p2 = await buildPokemonObj(bossId, user.pkTorre + 5)

    combates[combatId] = {
      p1: { ...p1, currentHp: p1.hp, maxHp: p1.hp },
      p2: { ...p2, currentHp: p2.hp, maxHp: p2.hp },
      idxLocal: miIdx
    }

    return renderBattle(m, conn, combates[combatId])
  }

  // COMANDO: pkatacar [1-4]
  if (command === 'pkatacar') {
    let combatId = m.sender
    let b = combates[combatId]
    if (!b) return m.reply('❌ No tienes ninguna batalla activa. Inicia una con .pktorre')

    let moveIdx = parseInt(args[0]) - 1
    if (!b.p1.moves[moveIdx]) return m.reply('❌ Elige un ataque válido (1-4).')

    // Turno Jugador
    let log = ejecutarAtaque(b.p1, b.p2, b.p1.moves[moveIdx])
    
    // Turno Enemigo (si sigue vivo)
    if (b.p2.currentHp > 0) {
      let cpuMove = b.p2.moves[Math.floor(Math.random() * b.p2.moves.length)]
      log += `\n` + ejecutarAtaque(b.p2, b.p1, cpuMove)
    }

    // Verificar Final
    if (b.p1.currentHp <= 0 || b.p2.currentHp <= 0) {
      let gano = b.p1.currentHp > 0
      delete combates[combatId]
      
      if (gano) {
        user.pkTorre++
        user.coin += 500
        await subirNivel(user.pokemones[b.idxLocal], user, m, conn)
        return m.reply(`${log}\n\n🏆 **¡VICTORIA!**\nSubes al piso ${user.pkTorre} y ganas 💰 500 coins.`)
      } else {
        return m.reply(`${log}\n\n💀 **DERROTA.** Tu Pokémon ha caído. Inténtalo de nuevo.`)
      }
    }

    return renderBattle(m, conn, b, log)
  }
}

// --- MOTOR DE PELEA ---
function ejecutarAtaque(at, df, mv) {
  let level = at.nivel || 1
  let power = mv.poder || 40
  let atk = at.atk || 10
  let def = df.def || 10
  
  // Cálculo de daño protegido contra NaN
  let dano = Math.floor((((2 * level / 5 + 2) * power * atk / def) / 50 + 2))
  dano = Math.max(1, dano) 
  
  df.currentHp = Math.max(0, df.currentHp - dano)
  return `💥 **${at.nombre}** usó **${mv.nombre}** (-${dano} HP)`
}

function renderBattle(m, conn, b, log = '') {
  let txt = `⛩️ **TORRE BATALLA - PISO ${global.db.data.users[m.sender].pkTorre}**\n\n`
  txt += `👾 **${b.p2.nombre}** (Nv. ${b.p2.nivel})\n💖 HP: ${b.p2.currentHp}/${b.p2.maxHp}\n`
  txt += `━━━━━━━━━━━━━━━\n`
  txt += `👤 **${b.p1.nombre}** (Nv. ${b.p1.nivel})\n💖 HP: ${b.p1.currentHp}/${b.p1.maxHp}\n\n`
  
  if (log) txt += `📝 **Registro:**\n${log}\n\n`
  
  txt += `⚔️ **MOVIMIENTOS:**\n`
  b.p1.moves.forEach((v, i) => {
    txt += `*[ ${i + 1} ]* ${v.nombre} (${v.tipo})\n`
  })
  txt += `\n➡️ Usa: *.pkatacar [1-4]*`

  return conn.sendFile(m.chat, b.p2.imagen, 'battle.png', txt, m)
}

// --- SISTEMA DE NIVEL/EVOLUCIÓN ---
async function subirNivel(p, user, m, conn) {
  p.nivel++
  p.hp = calcStat(p.statsBase.hp, p.iv, p.nivel, true)
  p.atk = calcStat(p.statsBase.atk, p.iv, p.nivel)
  p.def = calcStat(p.statsBase.def, p.iv, p.nivel)
  
  // Revisar Evolución (PokeAPI)
  const spec = await fetchAPI(`pokemon-species/${p.id}`)
  if (spec?.evolution_chain) {
    const chain = await fetchAPI(`evolution-chain/${spec.evolution_chain.url.split('/').filter(Boolean).pop()}`)
    let curr = chain.chain
    while (curr && curr.species.name.toUpperCase() !== p.nombre) {
      curr = curr.evolves_to[0]
    }
    if (curr?.evolves_to[0]) {
      let next = curr.evolves_to[0]
      let minLvl = next.evolution_details[0]?.min_level || 16
      if (p.nivel >= minLvl) {
        let newData = await buildPokemonObj(next.species.name, p.nivel)
        Object.assign(p, newData)
        conn.reply(m.chat, `🌟 ¡Increíble! Tu Pokémon evolucionó a **${p.nombre}**`, m)
      }
    }
  }
}

handler.command = ['pktorre', 'pkatacar']
export default handler

import fetch from 'node-fetch'

// ==========================================
// 🧠 MEMORIA VOLÁTIL Y CACHÉ (Optimización)
// ==========================================
let pokemonActivo = {}
let intercambios = {}
let combates = {} // { chatId_userId: { p1, p2, turno, tipo, log } }
let raidActiva = {} // Jefes globales
let apiCache = {} // Para no saturar la PokeAPI

// ==========================================
// 🛠️ UTILIDADES AVANZADAS (PokeAPI)
// ==========================================
async function fetchAPI(endpoint) {
  if (apiCache[endpoint]) return apiCache[endpoint]
  try {
    const r = await fetch(`https://pokeapi.co/api/v2/${endpoint}`)
    if (!r.ok) return null
    const data = await r.json()
    apiCache[endpoint] = data
    return data
  } catch (e) { return null }
}

// Genera stats reales basados en nivel (Fórmula oficial simplificada)
function calcStat(base, iv, level, isHP = false) {
  if (isHP) return Math.floor(0.01 * (2 * base + iv) * level) + level + 10
  return Math.floor(0.01 * (2 * base + iv) * level) + 5
}

async function buildPokemonObj(idOrName, level = 1) {
  const d = await fetchAPI(`pokemon/${idOrName}`)
  if (!d) return null

  // Obtener 4 movimientos válidos que hagan daño
  let misMovimientos = []
  let movesDisponibles = d.moves.map(m => m.move.name)
  for (let i = 0; i < 4; i++) {
    let randomMove = movesDisponibles[Math.floor(Math.random() * movesDisponibles.length)]
    let moveData = await fetchAPI(`move/${randomMove}`)
    if (moveData && moveData.power > 0) { // Solo ataques de daño por ahora
      misMovimientos.push({
        nombre: moveData.name,
        poder: moveData.power,
        tipo: moveData.type.name.toUpperCase(),
        precision: moveData.accuracy || 100
      })
    } else { i-- } // Reintentar si no hace daño
  }

  const iv = Math.floor(Math.random() * 32) // IV aleatorio 0-31

  return {
    id: d.id,
    nombre: d.name.toUpperCase(),
    nivel: level,
    exp: 0,
    tipos: d.types.map(t => t.type.name.toUpperCase()),
    imagen: d.sprites.other['official-artwork'].front_default,
    iv: iv,
    statsBase: { hp: d.stats[0].base_stat, atk: d.stats[1].base_stat, def: d.stats[2].base_stat, spd: d.stats[5].base_stat },
    hp: calcStat(d.stats[0].base_stat, iv, level, true),
    atk: calcStat(d.stats[1].base_stat, iv, level),
    def: calcStat(d.stats[2].base_stat, iv, level),
    spd: calcStat(d.stats[5].base_stat, iv, level),
    moves: misMovimientos
  }
}

// Tabla de Tipos (Resumida para el script, idealmente se extrae de la PokeAPI también, pero esto es más rápido)
const TYPE_CHART = {
  WATER: { FIRE: 2, GRASS: 0.5, WATER: 0.5 },
  FIRE: { GRASS: 2, WATER: 0.5, FIRE: 0.5 },
  GRASS: { WATER: 2, FIRE: 0.5, GRASS: 0.5 },
  // ... (Agrega el resto para combates precisos)
}

// ==========================================
// 🎮 HANDLER PRINCIPAL
// ==========================================
let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
  let user = global.db.data.users[m.sender]
  const adminNumber = '18493873691'

  // INICIALIZACIÓN DE BASE DE DATOS
  if (!user.pokemones) user.pokemones = []
  if (typeof user.pkStarted === 'undefined') user.pkStarted = false
  if (typeof user.coin === 'undefined') user.coin = 1000
  if (!user.pkMochila) user.pkMochila = { caramelos: 0, pociones: 5 }
  if (!user.pkCooldowns) user.pkCooldowns = { explorar: 0, raid: 0 }
  if (!user.pokeballs) user.pokeballs = { normal: 10, super: 5, ultra: 2, master: 0 }
  if (!user.pkTorre) user.pkTorre = 1 // Nivel de la torre batalla

  // 🎓 INICIO
  if (command === 'pkstart') {
    if (user.pkStarted) return m.reply('❌ Ya tienes un compañero Pokémon.')
    let choice = parseInt(args[0])
    if (![1, 2, 3].includes(choice)) {
      return m.reply(`╭━━━━「 🎓 PROFESOR OAK 」━━━━\n┃ Elige a tu compañero:\n┃ 1️⃣ Bulbasaur 🍃\n┃ 2️⃣ Charmander 🔥\n┃ 3️⃣ Squirtle 💧\n┃ Uso: *${usedPrefix}pkstart [1-3]*\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    }
    let ids = [1, 4, 7]
    let data = await buildPokemonObj(ids[choice - 1], 5) // Nivel 5 inicial
    user.pokemones.push(data)
    user.pkStarted = true
    return conn.sendFile(m.chat, data.imagen, 'p.png', `✨ ¡Has recibido a **${data.nombre}** (Nivel 5)!\nTiene ataques reales. Usa *${usedPrefix}mispokemon* para verlo.`, m)
  }

  if (!user.pkStarted) return m.reply(`❌ Primero habla con Oak: *${usedPrefix}pkstart*`)

  // 🌿 MANTIENE TUS FUNCIONES ANTIGUAS (Explorar, Capturar, Tienda, Huevos)...
  // (Aquí se asume que mantienes el bloque de pkexplorar, pkhuevo, pktienda de tu código anterior)

  // ==========================================
  // ⚔️ SISTEMA DE COMBATE POR TURNOS (LIGA / TORRE / PVP)
  // ==========================================
  if (command === 'pktorre' || command === 'pkpelea') {
    let combatId = `${m.chat}_${m.sender}`
    if (combates[combatId]) return m.reply(`❌ Ya estás en batalla. Usa *${usedPrefix}atacar [1-4]*`)

    let miIdx = parseInt(args[0]) - 1
    if (!user.pokemones[miIdx]) return m.reply(`❌ Elige tu Pokémon: *${usedPrefix}${command} [Mi_ID]*`)
    let p1 = user.pokemones[miIdx]

    let p2;
    if (command === 'pktorre') {
      let bossId = Math.floor(Math.random() * 800) + 1
      p2 = await buildPokemonObj(bossId, user.pkTorre * 3 + 2) // Escala de dificultad
      p2.nombre = `[PISO ${user.pkTorre}] ${p2.nombre}`
    } else {
      // Lógica de PvP aquí (extraer p2 del usuario mencionado)
      return m.reply('PvP en mantenimiento para turnos. Usa .pktorre por ahora.')
    }

    // Inicializar estado de batalla
    combates[combatId] = {
      p1: { ...p1, currentHp: p1.hp },
      p2: { ...p2, currentHp: p2.hp },
      turno: p1.spd >= p2.spd ? 'jugador' : 'enemigo', // Determina quién ataca primero por velocidad
      tipo: command,
      idxLocal: miIdx
    }
    
    // Si el enemigo es más rápido, ataca de inmediato
    let logExtra = ''
    if (combates[combatId].turno === 'enemigo') {
      logExtra = ejecutarTurnoCPU(combates[combatId])
    }

    return renderBattle(m, conn, combates[combatId], logExtra)
  }

  // 🔘 EJECUTAR MOVIMIENTO
  if (command === 'atacar') {
    let combatId = `${m.chat}_${m.sender}`
    let battle = combates[combatId]
    if (!battle) return m.reply('❌ No estás en ninguna batalla.')

    let moveIdx = parseInt(args[0]) - 1
    let miMove = battle.p1.moves[moveIdx]
    if (!miMove) return m.reply('❌ Elige un ataque válido (1 a 4).')

    // Turno del Jugador
    let log = ejecutarAtaque(battle.p1, battle.p2, miMove)
    
    // Verificar victoria
    if (battle.p2.currentHp <= 0) {
      delete combates[combatId]
      let recompensa = 500 * user.pkTorre
      user.coin += recompensa
      user.pkTorre++
      
      // EXP y Evolución
      let miPokeData = user.pokemones[battle.idxLocal]
      miPokeData.exp += battle.p2.nivel * 50
      if (miPokeData.exp >= miPokeData.nivel * 100) await subirNivel(miPokeData, user, m, conn)

      return m.reply(`🏆 **¡VICTORIA!**\n${log}\nHas derrotado a ${battle.p2.nombre}.\nSubes al piso ${user.pkTorre} de la Torre y ganas 💰 ${recompensa} coins.\n${miPokeData.nombre} ganó EXP!`)
    }

    // Turno del Enemigo
    log += `\n\n` + ejecutarTurnoCPU(battle)

    // Verificar derrota
    if (battle.p1.currentHp <= 0) {
      delete combates[combatId]
      return m.reply(`💀 **DERROTA**\n${log}\nTu ${battle.p1.nombre} se ha debilitado. Fina de la escalada en la torre.`)
    }

    return renderBattle(m, conn, battle, log)
  }
}

// ==========================================
// ⚙️ MOTOR FÍSICO Y DE DAÑO
// ==========================================
function ejecutarAtaque(atacante, defensor, move) {
  // Probabilidad de fallo
  if (Math.random() * 100 > move.precision) {
    return `💨 **${atacante.nombre}** usó ${move.nombre}, pero falló...`
  }

  // Multiplicadores (STAB y Efectividad)
  let stab = atacante.tipos.includes(move.tipo) ? 1.5 : 1
  let efectividad = 1
  if (TYPE_CHART[move.tipo]) {
    defensor.tipos.forEach(t => { if (TYPE_CHART[move.tipo][t]) efectividad *= TYPE_CHART[move.tipo][t] })
  }

  // Fórmula oficial de Pokémon (simplificada)
  let dano = Math.floor((((2 * atacante.nivel / 5 + 2) * move.poder * atacante.atk / defensor.def) / 50 + 2) * stab * efectividad)
  
  // Randomizer entre 85% y 100%
  dano = Math.floor(dano * (Math.random() * (1 - 0.85) + 0.85))
  if (dano <= 0) dano = 1

  defensor.currentHp -= dano
  
  let msg = `💥 **${atacante.nombre}** usó **${move.nombre}**!`
  if (efectividad > 1) msg += `\n✨ ¡Es Súper Efectivo! (-${dano} HP)`
  else if (efectividad < 1) msg += `\n🛡️ No es muy efectivo... (-${dano} HP)`
  else msg += ` (-${dano} HP)`

  return msg
}

function ejecutarTurnoCPU(battle) {
  let moveCPU = battle.p2.moves[Math.floor(Math.random() * battle.p2.moves.length)]
  return ejecutarAtaque(battle.p2, battle.p1, moveCPU)
}

function renderBattle(m, conn, battle, extraLog = '') {
  let txt = `⛩️ **TORRE BATALLA - PISO ${global.db.data.users[m.sender].pkTorre}** ⛩️\n\n`
  txt += `👾 **${battle.p2.nombre}** (Nv. ${battle.p2.nivel})\n`
  txt += `💖 HP: ${Math.max(0, battle.p2.currentHp)} / ${battle.p2.hp}\n`
  txt += `━━━━━━━━━━━━━━━━━━━━\n🆚\n━━━━━━━━━━━━━━━━━━━━\n`
  txt += `👤 **TÚ: ${battle.p1.nombre}** (Nv. ${battle.p1.nivel})\n`
  txt += `💖 HP: ${Math.max(0, battle.p1.currentHp)} / ${battle.p1.hp}\n\n`
  
  if (extraLog) txt += `📝 **Registro:**\n${extraLog}\n\n`

  txt += `⚔️ **ELIGE TU ATAQUE:**\n`
  battle.p1.moves.forEach((m, i) => {
    txt += `*[ ${i + 1} ]* ${m.nombre} (${m.tipo} | Pdr: ${m.poder})\n`
  })
  txt += `\n➡️ Responde con: *.atacar [numero]*`

  return conn.sendFile(m.chat, battle.p2.imagen, 'battle.png', txt, m)
}

// ==========================================
// 🧬 SISTEMA DE EVOLUCIÓN (VÍA POKEAPI)
// ==========================================
async function subirNivel(p, user, m, conn) {
  p.nivel++
  p.exp = 0
  // Recalcular stats
  p.hp = calcStat(p.statsBase.hp, p.iv, p.nivel, true)
  p.atk = calcStat(p.statsBase.atk, p.iv, p.nivel)
  p.def = calcStat(p.statsBase.def, p.iv, p.nivel)
  p.spd = calcStat(p.statsBase.spd, p.iv, p.nivel)

  conn.reply(m.chat, `🆙 ¡**${p.nombre}** ha subido al Nivel ${p.nivel}! Sus stats han mejorado.`, m)

  // Chequeo de Evolución consultando la PokeAPI
  try {
    const species = await fetchAPI(`pokemon-species/${p.id}`)
    if (!species || !species.evolution_chain) return

    const evoChainUrl = species.evolution_chain.url
    const chainId = evoChainUrl.split('/').filter(Boolean).pop()
    const evoData = await fetchAPI(`evolution-chain/${chainId}`)

    // Navegar la cadena para ver si la etapa actual puede evolucionar por nivel
    let currentStage = evoData.chain
    while (currentStage.species.name.toUpperCase() !== p.nombre) {
      if (currentStage.evolves_to.length > 0) currentStage = currentStage.evolves_to[0]
      else break;
    }

    if (currentStage.evolves_to.length > 0) {
      let nextStage = currentStage.evolves_to[0]
      let minLevel = nextStage.evolution_details[0]?.min_level

      if (minLevel && p.nivel >= minLevel) {
        // Evolucionar!
        let newData = await buildPokemonObj(nextStage.species.name, p.nivel)
        newData.exp = p.exp // Mantener exp
        // Reemplazar en el array del usuario
        let idx = user.pokemones.findIndex(poke => poke.id === p.id)
        if (idx !== -1) {
          user.pokemones[idx] = newData
          setTimeout(() => {
            conn.sendFile(m.chat, newData.imagen, 'evo.png', `✨ ¡Qué es esto?!\n¡Tu Pokémon ha evolucionado a **${newData.nombre}**!`, m)
          }, 2000)
        }
      }
    }
  } catch (e) {
    console.log("Error revisando evolución", e)
  }
}

handler.command = ['pkstart', 'pktorre', 'pkpelea', 'atacar']
export default handler

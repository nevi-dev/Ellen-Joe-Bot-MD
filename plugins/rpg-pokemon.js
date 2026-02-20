import fetch from 'node-fetch'

// ==========================================
// 🧠 MEMORIA VOLÁTIL Y SESIONES
// ==========================================
let pokemonActivo = {}
let intercambios = {}
let combates = {} 
let apiCache = {} 

// ==========================================
// 🛠️ UTILIDADES DE POKEAPI Y MOTOR FÍSICO
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

function calcStat(base, iv, level, isHP = false) {
  if (isHP) return Math.floor(0.01 * (2 * base + iv) * level) + level + 10
  return Math.floor(0.01 * (2 * base + iv) * level) + 5
}

async function buildPokemonObj(idOrName, level = 1) {
  const d = await fetchAPI(`pokemon/${idOrName}`)
  if (!d) return null

  let misMovimientos = []
  let movesDisponibles = d.moves.filter(m => m.version_group_details[0].move_learn_method.name === 'level-up')
  
  // Seleccionar 4 movimientos aleatorios de los disponibles
  let shuffled = movesDisponibles.sort(() => 0.5 - Math.random())
  for (let i = 0; i < Math.min(4, shuffled.length); i++) {
    let moveData = await fetchAPI(`move/${shuffled[i].move.name}`)
    if (moveData) {
      misMovimientos.push({
        nombre: moveData.name.toUpperCase(),
        poder: moveData.power || 40,
        tipo: moveData.type.name.toUpperCase(),
        precision: moveData.accuracy || 100
      })
    }
  }

  const iv = Math.floor(Math.random() * 32)
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

const TYPE_CHART = {
  WATER: { FIRE: 2, GRASS: 0.5, WATER: 0.5, GROUND: 2, ROCK: 2 },
  FIRE: { GRASS: 2, WATER: 0.5, FIRE: 0.5, ICE: 2, BUG: 2 },
  GRASS: { WATER: 2, FIRE: 0.5, GRASS: 0.5, GROUND: 2, ROCK: 2 },
  ELECTRIC: { WATER: 2, FLYING: 2, GROUND: 0, ELECTRIC: 0.5 }
}

// ==========================================
// 🎮 HANDLER PRINCIPAL
// ==========================================
let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
  let user = global.db.data.users[m.sender]
  const adminNumber = '18493873691'

  // INICIALIZACIÓN INTEGRAL
  if (!user.pokemones) user.pokemones = []
  if (typeof user.pkStarted === 'undefined') user.pkStarted = false
  if (typeof user.coin === 'undefined') user.coin = 1000
  if (!user.pkMochila) user.pkMochila = { caramelos: 0, pociones: 5 }
  if (!user.pkCooldowns) user.pkCooldowns = { explorar: 0, raid: 0 }
  if (!user.pokeballs) user.pokeballs = { normal: 10, super: 5, ultra: 2, master: 0 }
  if (!user.pkHuevos) user.pkHuevos = 0
  if (!user.pkIncubadora) user.pkIncubadora = { activo: false, tiempoHatch: 0 }
  if (!user.pkTorre) user.pkTorre = 1

  // 🎓 INICIO: LABORATORIO OAK
  if (command === 'pkstart') {
    if (user.pkStarted) return m.reply('❌ Ya tienes un compañero.')
    let choice = parseInt(args[0])
    if (![1, 2, 3].includes(choice)) {
      return m.reply(`╭━━━━「 🎓 PROFESOR OAK 」━━━━\n┃ Elige a tu primer compañero:\n┃ 1️⃣ Bulbasaur 🍃\n┃ 2️⃣ Charmander 🔥\n┃ 3️⃣ Squirtle 💧\n┃ Uso: *${usedPrefix}pkstart [1-3]*\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    }
    let ids = [1, 4, 7]
    let data = await buildPokemonObj(ids[choice - 1], 5)
    user.pokemones.push(data)
    user.pkStarted = true
    return conn.sendFile(m.chat, data.imagen, 'p.png', `✨ ¡Felicidades! Has recibido a **${data.nombre}**.`, m)
  }

  if (!user.pkStarted) return m.reply(`❌ Primero usa *${usedPrefix}pkstart*`)

  // 🗺️ EXPLORACIÓN
  if (command === 'pkexplorar') {
    let cooldown = 5 * 60 * 1000
    if (new Date() - user.pkCooldowns.explorar < cooldown) {
      let faltan = Math.ceil((cooldown - (new Date() - user.pkCooldowns.explorar)) / 60000)
      return m.reply(`⏳ Vuelve en ${faltan} min.`)
    }
    user.pkCooldowns.explorar = new Date() * 1
    let loot = Math.random()
    if (loot < 0.2) { user.pkHuevos++; m.reply('🥚 Encontraste un **Huevo Pokémon**.') }
    else if (loot < 0.5) { user.pokeballs.super += 2; m.reply('🎒 Encontraste **2 Superballs**.') }
    else { user.coin += 200; m.reply('💰 Encontraste **200 coins**.') }
  }

  // ⚔️ SISTEMA DE COMBATE (TORRE / PELEA)
  if (command === 'pktorre' || command === 'pkpelea') {
    let combatId = `${m.chat}_${m.sender}`
    if (combates[combatId]) return m.reply('❌ Ya estás en batalla.')

    let miIdx = parseInt(args[0]) - 1
    if (!user.pokemones[miIdx]) return m.reply(`❌ Selecciona tu Pokémon: *${usedPrefix}${command} [ID]*`)
    
    let p1 = user.pokemones[miIdx]
    // Parche de compatibilidad para ataques
    if (!p1.moves || p1.moves.length === 0) {
      let temp = await buildPokemonObj(p1.id, p1.nivel)
      p1.moves = temp.moves
      p1.statsBase = temp.statsBase
    }

    let p2;
    if (command === 'pktorre') {
      let bossId = Math.floor(Math.random() * 800) + 1
      p2 = await buildPokemonObj(bossId, user.pkTorre * 2 + 5)
      p2.nombre = `[PISO ${user.pkTorre}] ${p2.nombre}`
    } else {
      return m.reply('🚩 PvP en desarrollo. Usa .pktorre para la liga.')
    }

    combates[combatId] = {
      p1: { ...p1, currentHp: p1.hp, maxHp: p1.hp },
      p2: { ...p2, currentHp: p2.hp, maxHp: p2.hp },
      idxLocal: miIdx
    }
    return renderBattle(m, conn, combates[combatId])
  }

  // 🔘 ATACAR
  if (command === 'atacar') {
    let combatId = `${m.chat}_${m.sender}`
    let b = combates[combatId]
    if (!b) return m.reply('❌ No hay batalla activa.')

    let moveIdx = parseInt(args[0]) - 1
    if (!b.p1.moves[moveIdx]) return m.reply('❌ Ataque inválido.')

    let log = ejecutarAtaque(b.p1, b.p2, b.p1.moves[moveIdx])
    
    if (b.p2.currentHp > 0) {
      let cpuMove = b.p2.moves[Math.floor(Math.random() * b.p2.moves.length)]
      log += `\n` + ejecutarAtaque(b.p2, b.p1, cpuMove)
    }

    if (b.p1.currentHp <= 0 || b.p2.currentHp <= 0) {
      let gano = b.p1.currentHp > 0
      delete combates[combatId]
      if (gano) {
        user.pkTorre++
        user.coin += 500
        await subirNivel(user.pokemones[b.idxLocal], user, m, conn)
        return m.reply(`${log}\n\n🏆 **¡VICTORIA!** Subes al piso ${user.pkTorre}.`)
      } else {
        return m.reply(`${log}\n\n💀 **DERROTA.**`)
      }
    }
    return renderBattle(m, conn, b, log)
  }

  // 🎒 MIS POKEMON
  if (command === 'mispokemon') {
    let txt = `🎒 **ENTRENADOR: ${conn.getName(m.sender)}**\n💰 Coins: ${user.coin} | ⛩️ Torre: Piso ${user.pkTorre}\n\n`
    user.pokemones.forEach((p, i) => {
      txt += `*${i + 1}.* ${p.nombre} (Nv. ${p.nivel}) [HP: ${p.hp}]\n`
    })
    return m.reply(txt)
  }

  // 🏪 TIENDA
  if (command === 'pktienda') {
    const items = { normal: 100, super: 300, ultra: 800, master: 15000, caramelo: 2500 }
    let it = args[0]?.toLowerCase()
    let cant = parseInt(args[1]) || 1
    if (!items[it]) {
      let mart = `🏪 **POKÉMART**\n\n`
      for (let i in items) mart += `• ${i.toUpperCase()}: 💰 ${items[i]}\n`
      return m.reply(mart)
    }
    let total = items[it] * cant
    if (user.coin < total) return m.reply('❌ No tienes coins.')
    user.coin -= total
    if (it === 'caramelo') user.pkMochila.caramelos += cant
    else user.pokeballs[it] += cant
    return m.reply(`🛒 Compraste ${cant} ${it}.`)
  }

  // 🍬 SUBIR NIVEL
  if (command === 'pkupgrade') {
    let idx = parseInt(args[0]) - 1
    if (!user.pokemones[idx] || user.pkMochila.caramelos <= 0) return m.reply('❌ Sin caramelos o ID mal.')
    user.pkMochila.caramelos--
    await subirNivel(user.pokemones[idx], user, m, conn)
  }
}

// ==========================================
// ⚙️ LÓGICA DE COMBATE Y EVOLUCIÓN
// ==========================================
function ejecutarAtaque(at, df, mv) {
  let stab = at.tipos.includes(mv.tipo) ? 1.2 : 1
  let efect = 1
  if (TYPE_CHART[mv.tipo] && TYPE_CHART[mv.tipo][df.tipos[0]]) efect = TYPE_CHART[mv.tipo][df.tipos[0]]
  
  let dano = Math.floor((((2 * at.nivel / 5 + 2) * mv.poder * at.atk / df.def) / 50 + 2) * stab * efect)
  df.currentHp -= dano
  return `💥 **${at.nombre}** usó **${mv.nombre}** (-${dano} HP)`
}

function renderBattle(m, conn, b, log = '') {
  let txt = `👾 **${b.p2.nombre}** (Nv. ${b.p2.nivel})\n💖 HP: ${Math.max(0, b.p2.currentHp)}/${b.p2.maxHp}\n`
  txt += `━━━━━━━━━━━━\n👤 **${b.p1.nombre}** (Nv. ${b.p1.nivel})\n💖 HP: ${Math.max(0, b.p1.currentHp)}/${b.p1.maxHp}\n\n`
  if (log) txt += `📝 ${log}\n\n`
  txt += `⚔️ **ATAQUES:**\n`
  b.p1.moves.forEach((v, i) => { txt += `[ ${i+1} ] ${v.nombre} (${v.tipo})\n` })
  return conn.reply(m.chat, txt, m)
}

async function subirNivel(p, user, m, conn) {
  p.nivel++
  p.hp = calcStat(p.statsBase.hp, p.iv, p.nivel, true)
  p.atk = calcStat(p.statsBase.atk, p.iv, p.nivel)
  p.def = calcStat(p.statsBase.def, p.iv, p.nivel)
  
  // Buscar Evolución en PokeAPI
  const spec = await fetchAPI(`pokemon-species/${p.id}`)
  if (spec?.evolution_chain) {
    const chain = await fetchAPI(`evolution-chain/${spec.evolution_chain.url.split('/').filter(Boolean).pop()}`)
    let curr = chain.chain
    while (curr && curr.species.name.toUpperCase() !== p.nombre) {
      curr = curr.evolves_to[0]
    }
    if (curr?.evolves_to[0]) {
      let next = curr.evolves_to[0]
      if (p.nivel >= (next.evolution_details[0]?.min_level || 16)) {
        let newData = await buildPokemonObj(next.species.name, p.nivel)
        Object.assign(p, newData)
        conn.reply(m.chat, `✨ ¡Tu Pokémon evolucionó a **${p.nombre}**!`, m)
      }
    }
  }
  conn.reply(m.chat, `🆙 **${p.nombre}** subió al nivel ${p.nivel}!`, m)
}

handler.command = ['pkstart', 'pkexplorar', 'pktorre', 'atacar', 'mispokemon', 'pktienda', 'pkupgrade']
export default handler

import fetch from 'node-fetch'

// Memoria global de duelos y emparejamiento
let matchmaking = [] 
let duelosActivos = {} 
let apiCache = {}

async function fetchAPI(endpoint) {
  if (apiCache[endpoint]) return apiCache[endpoint]
  try {
    const r = await fetch(`https://pokeapi.co/api/v2/${endpoint}`)
    const data = await r.json()
    apiCache[endpoint] = data
    return data
  } catch (e) { return null }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  
  // Inicializar stats de duelo
  if (!user.pkDuelo) user.pkDuelo = { copas: 500, ganadas: 0, derrotas: 0, usoFrecuente: {} }
  if (!user.pokemones) user.pokemones = []

  const sub = args[0]?.toLowerCase()

  // 1. PERFIL DE DUELO
  if (sub === 'perfil') {
    let topPokemon = Object.entries(user.pkDuelo.usoFrecuente).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Ninguno'
    let txt = `👤 **PERFIL DE DUELISTA**\n\n`
    txt += `⭐ **Usuario:** @${m.sender.split('@')[0]}\n`
    txt += `🏆 **Copas:** ${user.pkDuelo.copas}\n`
    txt += `🥇 **Victorias:** ${user.pkDuelo.ganadas}\n`
    txt += `🔥 **Pokémon Favorito:** ${topPokemon}\n`
    return conn.reply(m.chat, txt, m, { mentions: [m.sender] })
  }

  // 2. INICIAR (MATCHMAKING)
  if (sub === 'iniciar') {
    if (duelosActivos[m.sender]) return m.reply('❌ Ya estás en un duelo.')
    if (matchmaking.find(p => p.id === m.sender)) return m.reply('⏳ Ya estás en la cola de espera...')
    
    let pIdx = parseInt(args[1]) - 1
    if (!user.pokemones[pIdx]) return m.reply(`❌ Selecciona un Pokémon: *${usedPrefix}pkduelo iniciar [ID]*`)

    // Registrar en la cola
    matchmaking.push({ id: m.sender, copas: user.pkDuelo.copas, pIdx, chat: m.chat })
    m.reply('🔎 Buscando oponente con copas similares...')

    // Lógica de emparejamiento
    if (matchmaking.length >= 2) {
      let me = matchmaking.find(p => p.id === m.sender)
      let rival = matchmaking.find(p => p.id !== m.sender && Math.abs(p.copas - me.copas) < 500)

      if (rival) {
        // Sacar de la cola
        matchmaking = matchmaking.filter(p => p.id !== me.id && p.id !== rival.id)
        
        let idDuelo = `DUELO_${Date.now()}`
        let p1 = user.pokemones[me.pIdx]
        let p2 = global.db.data.users[rival.id].pokemones[rival.pIdx]

        duelosActivos[me.id] = duelosActivos[rival.id] = {
          id: idDuelo,
          p1: { id: me.id, ...p1, currentHp: p1.hp, maxHp: p1.hp },
          p2: { id: rival.id, ...p2, currentHp: p2.hp, maxHp: p2.hp },
          turno: me.id,
          tipo: 'competitivo'
        }

        let msg = `⚔️ **¡DUELO ENCONTRADO!**\n\n`
        msg += `@${me.id.split('@')[0]} vs @${rival.id.split('@')[0]}\n`
        msg += `Pokémon: ${p1.nombre} vs ${p2.nombre}\n\n`
        msg += `Es el turno de @${me.id.split('@')[0]}`
        
        conn.reply(me.chat, msg, null, { mentions: [me.id, rival.id] })
        if (me.chat !== rival.chat) conn.reply(rival.chat, msg, null, { mentions: [me.id, rival.id] })
      }
    }
    return
  }

  // 3. ATACAR
  if (sub === 'atacar') {
    let d = duelosActivos[m.sender]
    if (!d) return m.reply('❌ No estás en un duelo activo.')
    if (d.turno !== m.sender) return m.reply('⏳ No es tu turno.')

    let moveIdx = parseInt(args[1]) - 1
    let yo = d.p1.id === m.sender ? d.p1 : d.p2
    let rival = d.p1.id === m.sender ? d.p2 : d.p1

    if (!yo.moves[moveIdx]) return m.reply('❌ Elige un ataque (1-4).')

    // Calcular daño
    let dmg = Math.floor((((2 * yo.nivel / 5 + 2) * yo.moves[moveIdx].poder * yo.atk / rival.def) / 50 + 2))
    rival.currentHp -= dmg
    d.turno = rival.id

    let res = `💥 **${yo.nombre}** usó **${yo.moves[moveIdx].nombre}** e hizo **${dmg}** de daño.`
    
    if (rival.currentHp <= 0) {
      let copasGanadas = d.tipo === 'amistoso' ? 0 : calcularCopas(yo.pkDuelo?.copas || 500, rival.pkDuelo?.copas || 500)
      if (d.tipo !== 'amistoso') {
         actualizarGanador(yo.id, rival.id, copasGanadas, yo.nombre)
      }
      delete duelosActivos[yo.id]
      delete duelosActivos[rival.id]
      return m.reply(`${res}\n\n🏆 **¡@${yo.id.split('@')[0]} HA GANADO EL DUELO!**\n${d.tipo !== 'amistoso' ? `📈 Copas: +${copasGanadas}` : 'Duelo amistoso terminado.'}`)
    }

    m.reply(`${res}\n\n💖 **${rival.nombre}** HP: ${rival.currentHp}/${rival.maxHp}\nAhora es turno de @${rival.id.split('@')[0]}`, null, { mentions: [rival.id] })
  }

  // 4. AMISTOSO
  if (sub === 'amistoso') {
    if (!m.quoted) return m.reply('❌ Responde al mensaje de un amigo para retarlo.')
    let rivalId = m.quoted.sender
    let pIdx = parseInt(args[1]) - 1
    if (!user.pokemones[pIdx]) return m.reply(`❌ Elige tu Pokémon: *${usedPrefix}pkduelo amistoso [ID]*`)

    m.reply(`⚔️ @${m.sender.split('@')[0]} te ha retado a un duelo amistoso.\n¿Aceptas? Responde con: *.pkduelo aceptar [ID de tu Pokémon]*`, null, { mentions: [m.sender, rivalId] })
    conn.pkRetos = conn.pkRetos || {}
    conn.pkRetos[rivalId] = { retador: m.sender, pRetadorIdx: pIdx }
  }

  if (sub === 'aceptar') {
    let reto = conn.pkRetos?.[m.sender]
    if (!reto) return m.reply('❌ No tienes retos pendientes.')
    let pIdx = parseInt(args[1]) - 1
    if (!user.pokemones[pIdx]) return m.reply('❌ Elige tu Pokémon.')

    let p1 = global.db.data.users[reto.retador].pokemones[reto.pRetadorIdx]
    let p2 = user.pokemones[pIdx]

    duelosActivos[m.sender] = duelosActivos[reto.retador] = {
      p1: { id: reto.retador, ...p1, currentHp: p1.hp, maxHp: p1.hp },
      p2: { id: m.sender, ...p2, currentHp: p2.hp, maxHp: p2.hp },
      turno: reto.retador,
      tipo: 'amistoso'
    }
    delete conn.pkRetos[m.sender]
    m.reply('🏁 ¡Duelo Amistoso iniciado! Empieza el retador.')
  }
}

// --- FUNCIONES LÓGICAS ---
function calcularCopas(cWin, cLose) {
  let diff = cLose - cWin
  let base = 25
  return Math.max(5, Math.floor(base + (diff / 10))) 
}

function actualizarGanador(winId, loseId, copas, pNombre) {
  let w = global.db.data.users[winId]
  let l = global.db.data.users[loseId]
  w.pkDuelo.copas += copas
  w.pkDuelo.ganadas++
  w.pkDuelo.usoFrecuente[pNombre] = (w.pkDuelo.usoFrecuente[pNombre] || 0) + 1
  l.pkDuelo.copas = Math.max(0, l.pkDuelo.copas - Math.floor(copas / 1.5))
  l.pkDuelo.derrotas++
}

handler.command = ['pkduelo']
export default handler

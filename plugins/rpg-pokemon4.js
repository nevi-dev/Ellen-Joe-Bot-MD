import fetch from 'node-fetch'

let matchmaking = [] 
let duelosActivos = {} 
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

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  
  // Inicialización de datos
  if (!user.pkDuelo) user.pkDuelo = { copas: 500, ganadas: 0, derrotas: 0, usoFrecuente: {} }
  if (!user.pkMochila) user.pkMochila = { caramelos: 0 }

  const sub = args[0]?.toLowerCase()

  // --- 1. MENÚ DE AYUDA ---
  if (!sub) {
    let help = `⚔️ **LIGA DE DUELOS POKÉMON** ⚔️\n\n`
    help += `🔹 *${usedPrefix}${command} perfil* : Tus estadísticas.\n`
    help += `🔹 *${usedPrefix}${command} top* : Ranking de maestros.\n`
    help += `🔹 *${usedPrefix}${command} iniciar [ID]* : Matchmaking global.\n`
    help += `🔹 *${usedPrefix}${command} amistoso [ID]* : Reta a un amigo (responde a su mensaje).\n`
    help += `🔹 *${usedPrefix}${command} aceptar [ID]* : Acepta un reto pendiente.\n`
    help += `🔹 *${usedPrefix}${command} atacar [1-4]* : Ejecuta un movimiento.\n\n`
    help += `*Ejemplo:* ${usedPrefix}${command} iniciar 1`
    return m.reply(help)
  }

  // --- 2. PERFIL ---
  if (sub === 'perfil') {
    let topPokemon = Object.entries(user.pkDuelo.usoFrecuente).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Ninguno'
    let txt = `👤 **PERFIL DE DUELISTA**\n\n`
    txt += `🏆 **Copas:** ${user.pkDuelo.copas}\n`
    txt += `🥇 **Victorias:** ${user.pkDuelo.ganadas}\n`
    txt += `💀 **Derrotas:** ${user.pkDuelo.derrotas}\n`
    txt += `🔥 **Pokémon Favorito:** ${topPokemon}\n`
    return conn.reply(m.chat, txt, m, { mentions: [m.sender] })
  }

  // --- 3. TOP RANKING ---
  if (sub === 'top' || sub === 'ranking') {
    let users = Object.entries(global.db.data.users)
      .filter(([id, data]) => data.pkDuelo)
      .sort((a, b) => b[1].pkDuelo.copas - a[1].pkDuelo.copas)
      .slice(0, 10)
    let txt = `🏆 **TOP 10 MAESTROS POKÉMON** 🏆\n\n`
    users.forEach(([id, data], i) => {
      txt += `${i + 1}. @${id.split('@')[0]} — 🏆 ${data.pkDuelo.copas} copas\n`
    })
    return conn.reply(m.chat, txt, m, { mentions: users.map(u => u[0]) })
  }

  // --- 4. ATACAR ---
  if (sub === 'atacar') {
    let d = duelosActivos[m.sender]
    if (!d) return m.reply('❌ No estás en un duelo.')
    if (d.turno !== m.sender) return m.reply('⏳ No es tu turno.')

    let moveIdx = parseInt(args[1]) - 1
    let yo = d.p1.id === m.sender ? d.p1 : d.p2
    let elRival = d.p1.id === m.sender ? d.p2 : d.p1
    let move = yo.moves[moveIdx]

    if (!move) return m.reply('❌ Elige ataque 1-4.')

    let log = `⚔️ **${yo.nombre}** usó **${move.nombre}**...\n`
    let randomHit = Math.floor(Math.random() * 100)
    
    if (randomHit > move.precision) {
        log += `❌ ¡El ataque ha fallado!`
    } else if (Math.random() * 100 < (elRival.speed / 15)) {
        log += `💨 ¡**${elRival.nombre}** lo esquivó con agilidad!`
    } else {
        let dmg = Math.floor((((2 * yo.nivel / 5 + 2) * move.poder * yo.atk / elRival.def) / 50 + 2))
        elRival.currentHp -= dmg
        log += `💥 ¡Impacto! Daño: **${dmg}**`
    }

    d.turno = elRival.id
    
    if (elRival.currentHp <= 0) {
      let c = d.tipo === 'amistoso' ? 0 : calcularCopas(global.db.data.users[yo.id].pkDuelo.copas, global.db.data.users[elRival.id].pkDuelo.copas)
      if (d.tipo !== 'amistoso') actualizarGanador(yo.id, elRival.id, c, yo.nombre)
      delete duelosActivos[d.p1.id]; delete duelosActivos[d.p2.id]
      return m.reply(`${log}\n\n🏆 **¡@${yo.id.split('@')[0]} GANA EL DUELO!**\n${d.tipo !== 'amistoso' ? `📈 Copas: +${c}` : 'Fin del duelo amistoso.'}`)
    }

    let txtTurno = `${log}\n\n💖 **${elRival.nombre}** HP: ${Math.max(0, elRival.currentHp)}/${elRival.maxHp}\n`
    txtTurno += `🔔 Turno de @${elRival.id.split('@')[0]}\n\n`
    txtTurno += `✨ **Ataques de ${elRival.nombre}:**\n`
    elRival.moves.forEach((mv, i) => { txtTurno += `[${i + 1}] ${mv.nombre}\n` })

    return conn.sendFile(m.chat, elRival.imagen, 'rival.png', txtTurno, m, { mentions: [elRival.id] })
  }

  // --- 5. INICIAR (MATCHMAKING) ---
  if (sub === 'iniciar') {
    if (duelosActivos[m.sender]) return m.reply('❌ Ya estás en duelo.')
    let pIdx = parseInt(args[1]) - 1
    if (isNaN(pIdx) || !user.pokemones[pIdx]) return m.reply(`❌ Selecciona tu Pokémon: *${usedPrefix}${command} iniciar [ID]*`)

    let rivalIdx = matchmaking.findIndex(p => Math.abs(p.copas - user.pkDuelo.copas) <= 600)
    if (rivalIdx !== -1) {
      let rival = matchmaking.splice(rivalIdx, 1)[0]
      let p1 = user.pokemones[pIdx], p2 = global.db.data.users[rival.id].pokemones[rival.pIdx]
      let duelObj = {
        p1: { id: m.sender, ...p1, currentHp: p1.hp, maxHp: p1.hp },
        p2: { id: rival.id, ...p2, currentHp: p2.hp, maxHp: p2.hp },
        turno: m.sender, tipo: 'competitivo'
      }
      duelosActivos[m.sender] = duelosActivos[rival.id] = duelObj
      let msg = `⚔️ **DUELO GLOBAL ENCONTRADO**\nTurno de @${m.sender.split('@')[0]}\n`
      p1.moves.forEach((mv, i) => { msg += `[${i + 1}] ${mv.nombre}\n` })
      return conn.sendFile(m.chat, p2.imagen, 'b.png', msg, m, { mentions: [m.sender, rival.id] })
    } else {
      matchmaking.push({ id: m.sender, copas: user.pkDuelo.copas, pIdx })
      m.reply('🔎 Buscando oponente en otros grupos...')
    }
  }

  // --- 6. AMISTOSO ---
  if (sub === 'amistoso') {
    if (!m.quoted) return m.reply('❌ Responde al mensaje de alguien para retarlo.')
    let pIdx = parseInt(args[1]) - 1
    if (!user.pokemones[pIdx]) return m.reply('❌ Elige tu Pokémon.')
    conn.pkRetos = conn.pkRetos || {}
    conn.pkRetos[m.quoted.sender] = { retador: m.sender, pRetadorIdx: pIdx }
    m.reply(`⚔️ @${m.sender.split('@')[0]} te ha retado a un amistoso.\nResponde con: *.pkduelo aceptar [ID de tu Pokémon]*`, null, { mentions: [m.sender, m.quoted.sender] })
  }

  // --- 7. ACEPTAR AMISTOSO ---
  if (sub === 'aceptar') {
    let reto = conn.pkRetos?.[m.sender]
    if (!reto) return m.reply('❌ No tienes retos pendientes.')
    let pIdx = parseInt(args[1]) - 1
    if (!user.pokemones[pIdx]) return m.reply('❌ Selecciona tu Pokémon.')

    let p1 = global.db.data.users[reto.retador].pokemones[reto.pRetadorIdx]
    let p2 = user.pokemones[pIdx]
    let duelObj = {
      p1: { id: reto.retador, ...p1, currentHp: p1.hp, maxHp: p1.hp },
      p2: { id: m.sender, ...p2, currentHp: p2.hp, maxHp: p2.hp },
      turno: reto.retador, tipo: 'amistoso'
    }
    duelosActivos[m.sender] = duelosActivos[reto.retador] = duelObj
    delete conn.pkRetos[m.sender]
    m.reply('🏁 ¡Comienza el duelo amistoso!')
  }
}

function calcularCopas(cw, cl) { return Math.max(5, Math.floor(25 + ((cl - cw) / 10))) }
function actualizarGanador(wi, li, c, p) {
  let w = global.db.data.users[wi], l = global.db.data.users[li]
  w.pkDuelo.copas += c; w.pkDuelo.ganadas++; w.pkDuelo.usoFrecuente[p] = (w.pkDuelo.usoFrecuente[p] || 0) + 1
  l.pkDuelo.copas = Math.max(0, l.pkDuelo.copas - Math.floor(c/1.5)); l.pkDuelo.derrotas++
}

handler.command = ['pkduelo']
export default handler

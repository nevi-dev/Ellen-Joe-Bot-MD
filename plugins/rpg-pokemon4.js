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
  if (!user.pkDuelo) user.pkDuelo = { copas: 500, ganadas: 0, derrotas: 0, usoFrecuente: {} }

  const sub = args[0]?.toLowerCase()

  // --- MENÚ DE AYUDA ---
  if (!sub) {
    let help = `⚔️ *CENTRO DE DUELOS POKÉMON* ⚔️\n\n`
    help += `• *${usedPrefix}${command} iniciar [ID]* : Buscar rival.\n`
    help += `• *${usedPrefix}${command} atacar [1-4]* : Usar movimiento.\n`
    help += `• *${usedPrefix}${command} top* : Ver ranking.\n`
    return m.reply(help)
  }

  // --- LÓGICA DE ATAQUE ---
  if (sub === 'atacar') {
    let d = duelosActivos[m.sender]
    if (!d) return m.reply('❌ No estás en un duelo activo.')
    if (d.turno !== m.sender) return m.reply('⏳ ¡Espera! Es el turno de tu oponente.')

    let moveIdx = parseInt(args[1]) - 1
    let yo = d.p1.id === m.sender ? d.p1 : d.p2
    let elRival = d.p1.id === m.sender ? d.p2 : d.p1
    let move = yo.moves[moveIdx]

    if (!move) return m.reply('❌ Selecciona un ataque del 1 al 4.')

    let log = `⚔️ **${yo.nombre}** usó **${move.nombre}**...\n`
    let randomHit = Math.floor(Math.random() * 100)
    
    // Probabilidades (Fallo / Esquive / Impacto)
    if (randomHit > move.precision) {
        log += `❌ ¡El ataque ha fallado!`
    } else if (Math.random() * 100 < (elRival.speed / 15)) {
        log += `💨 ¡**${elRival.nombre}** lo esquivó!`
    } else {
        let dmg = Math.floor((((2 * yo.nivel / 5 + 2) * move.poder * yo.atk / elRival.def) / 50 + 2))
        elRival.currentHp -= dmg
        log += `💥 ¡Impacto! Hizo **${dmg}** de daño.`
    }

    d.turno = elRival.id
    
    // Verificar si alguien ganó
    if (elRival.currentHp <= 0) {
      let copas = calcularCopas(global.db.data.users[yo.id].pkDuelo.copas, global.db.data.users[elRival.id].pkDuelo.copas)
      actualizarGanador(yo.id, elRival.id, copas, yo.nombre)
      delete duelosActivos[d.p1.id]; delete duelosActivos[d.p2.id]
      return m.reply(`${log}\n\n🏆 **¡@${yo.id.split('@')[0]} GANA EL DUELO!**\n📈 Copas: +${copas}`)
    }

    // --- RENDERIZAR SIGUIENTE TURNO CON FOTO DEL ENEMIGO ---
    let txtTurno = `${log}\n\n`
    txtTurno += `👤 **Rival:** ${elRival.nombre}\n`
    txtTurno += `💖 **HP:** ${Math.max(0, elRival.currentHp)} / ${elRival.maxHp}\n`
    txtTurno += `━━━━━━━━━━━━━━\n`
    txtTurno += `🔔 **Turno de @${elRival.id.split('@')[0]}**\n\n`
    txtTurno += `✨ **Tus Ataques:**\n`
    elRival.moves.forEach((m, i) => {
        txtTurno += `[${i + 1}] ${m.nombre} (${m.tipo})\n`
    })
    txtTurno += `\n➡️ Responde con: *${usedPrefix}${command} atacar [número]*`

    return conn.sendFile(m.chat, elRival.imagen, 'rival.png', txtTurno, m, { mentions: [elRival.id] })
  }

  // --- INICIAR DUELO (MATCHMAKING) ---
  if (sub === 'iniciar') {
    if (duelosActivos[m.sender]) return m.reply('❌ Ya estás en combate.')
    let pIdx = parseInt(args[1]) - 1
    if (isNaN(pIdx) || !user.pokemones[pIdx]) return m.reply(`❌ Elige un Pokémon con: *${usedPrefix}${command} iniciar [ID]*`)

    let rivalIdx = matchmaking.findIndex(p => Math.abs(p.copas - user.pkDuelo.copas) <= 600)
    if (rivalIdx !== -1) {
      let rival = matchmaking.splice(rivalIdx, 1)[0]
      let p1 = user.pokemones[pIdx]
      let p2 = global.db.data.users[rival.id].pokemones[rival.pIdx]
      
      let duelObj = {
        p1: { id: m.sender, ...p1, currentHp: p1.hp, maxHp: p1.hp },
        p2: { id: rival.id, ...p2, currentHp: p2.hp, maxHp: p2.hp },
        turno: m.sender, tipo: 'competitivo'
      }
      duelosActivos[m.sender] = duelosActivos[rival.id] = duelObj

      let startMsg = `⚔️ **¡DUELO INICIADO!**\n\n`
      startMsg += `🏟️ @${m.sender.split('@')[0]} vs @${rival.id.split('@')[0]}\n\n`
      startMsg += `Es el turno de @${m.sender.split('@')[0]}\n`
      startMsg += `✨ **Tus Ataques:**\n`
      p1.moves.forEach((m, i) => { startMsg += `[${i + 1}] ${m.nombre}\n` })

      return conn.sendFile(m.chat, p2.imagen, 'battle.png', startMsg, m, { mentions: [m.sender, rival.id] })
    } else {
      matchmaking.push({ id: m.sender, copas: user.pkDuelo.copas, pIdx })
      m.reply('🔎 Buscando oponente similar...')
    }
  }

  // --- RANKING ---
  if (sub === 'top') {
    let users = Object.entries(global.db.data.users)
      .filter(([id, data]) => data.pkDuelo)
      .sort((a, b) => b[1].pkDuelo.copas - a[1].pkDuelo.copas)
      .slice(0, 10)
    let txt = `🏆 **TOP 10 MAESTROS**\n\n`
    users.forEach(([id, data], i) => { txt += `${i + 1}. @${id.split('@')[0]} — 🏆 ${data.pkDuelo.copas}\n` })
    return conn.reply(m.chat, txt, m, { mentions: users.map(u => u[0]) })
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

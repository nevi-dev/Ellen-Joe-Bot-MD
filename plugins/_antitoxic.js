const toxicRegex = /g0re|g0r3|g.o.r.e|sap0|sap4|malparido|malparida|malparidos|malparidas|m4lp4rid0|m4lp4rido|m4lparido|malp4rido|m4lparid0|malp4rid0|chocha|chup4la|chup4l4|chupalo|chup4lo|chup4l0|chupal0|chupon|chupameesta|sabandija|hijodelagranputa|hijodeputa|hijadeputa|hijadelagranputa|kbron|kbrona|cajetuda|laconchadedios|putita|putito|put1t4|putit4|putit0|put1to|put1ta|pr0stitut4s|pr0stitutas|pr05titutas|pr0stitut45|prostitut45|prostituta5|pr0stitut45|fanax|f4nax|drogas|droga|dr0g4|nepe|p3ne|p3n3|pen3|p.e.n.e|pvt0|pvto|put0|hijodelagransetentamilparesdeputa|Chingadamadre|coño|c0ño|coñ0|c0ñ0|afeminado|drog4|cocaína|marihuana|chocho|chocha|cagon|pedorro|agrandado|agrandada|pedorra|cagona|pinga|joto|sape|mamar|chigadamadre|hijueputa|chupa|caca|bobo|boba|loco|loca|chupapolla|estupido|estupida|estupidos|polla|pollas|idiota|maricon|chucha|verga|vrga|naco|zorra|zorro|zorras|zorros|pito|huevon|huevona|huevones|rctmre|mrd|ctm|csm|cepe|sepe|sepesito|cepecito|cepesito|hldv|ptm|baboso|babosa|babosos|babosas|feo|fea|feos|feas|mamawebos|chupame|bolas|qliao|imbecil|embeciles|kbrones|cabron|capullo|carajo|gore|gorre|gorreo|gordo|gorda|gordos|gordas|sapo|sapa|mierda|cerdo|cerda|puerco|puerca|perra|perro|dumb|fuck|shit|bullshit|cunt|semen|bitch|motherfucker|foker|fucking/i

let handler = m => m
handler.before = async function (m, { conn, isAdmin, isBotAdmin, isOwner }) { 
    if (m.isBaileys && m.fromMe) return !0
    if (!m.isGroup) return !1

    let chat = global.db.data.chats[m.chat]
    let user = global.db.data.users[m.sender]
    
    // 1. SEGURIDAD: Si el chat o la función antiToxic no existen/están apagados, ignorar.
    if (!chat || !chat.antiToxic) return !1

    // 2. SEGURIDAD: Inicializar user.warn si no existe para evitar el TypeError
    if (typeof user.warn === 'undefined') user.warn = 0

    const isToxic = toxicRegex.exec(m.text)

    // Si es tóxico y NO es owner ni admin
    if (isToxic && !isOwner && !isAdmin) {
        
        // Solo actuar si el bot es admin para poder eliminar
        if (!isBotAdmin) return !1 

        user.warn += 1
        
        // Si aún no llega al límite de 3
        if (user.warn < 3) {
            await m.reply(`*⚠️ ¡Palabra Prohibida Detectada! @${m.sender.split`@`[0]}*\n\nLa palabra *"${isToxic}"* no está permitida.\nAdvertencias: *${user.warn}/3*\n\n_Si llegas a 3 serás eliminado._`, false, { mentions: [m.sender] })
            // Opcional: Borrar el mensaje tóxico
            await conn.sendMessage(m.chat, { delete: m.key })
        }

        // Si llega a las 3 advertencias
        if (user.warn >= 3) {
            user.warn = 0 // Resetear
            await m.reply(`*❌ ADIÓS @${m.sender.split`@`[0]}*\nSuperaste el límite de advertencias por toxicidad.`, false, { mentions: [m.sender] })
            
            // Eliminar del grupo
            await this.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
        }
    }
    return !1
}

export default handler

let handler = async (m, { conn }) => {
    let eco = global.db.data.economy || { 
        inflation: 1.0, 
        lastInflation: 1.0, 
        state: 'ESTABLE', 
        totalCoins: 0, 
        rewardModifier: 1.0 
    }

    // 1. Cálculo de Variación (%)
    // Si no existe 'lastInflation', usamos la actual para que de 0% al inicio
    let last = eco.lastInflation || eco.inflation
    let current = eco.inflation
    let variacion = ((current - last) / last) * 100
    let arrow = current > last ? '🔺' : (current < last ? '🔻' : '🔹')
    let trend = current > last ? 'SUBIDA' : (current < last ? 'BAJADA' : 'ESTABLE')

// 2. Precio de la "Moneda" (Corregido para Hiperinflación)
    // Usamos un condicional: si el precio es menor a 0.0001, mostrar "Casi 0"
    let calculoHoy = (1 / current)
    let precioHoy = calculoHoy < 0.0001 ? calculoHoy.toExponential(2) : calculoHoy.toFixed(4)
    
    let calculoAyer = (1 / last)
    let precioAyer = calculoAyer < 0.0001 ? calculoAyer.toExponential(2) : calculoAyer.toFixed(4)

    // 3. Diseño del Mensaje
    let em = '✅'
    if (eco.state === 'HIPERINFLACIÓN') em = '🚨'
    else if (eco.state === 'INFLACIÓN') em = '⚠️'
    else if (eco.state === 'DEFLACIÓN') em = '📉'

    let txt = `📊 **ECONOMIA DEL BOT**\n\n`
    
    txt += `🏦 **ESTADO:** ${em} ${eco.state}\n`
    txt += `💰 **CIRCULACIÓN:** ${eco.totalCoins.toLocaleString()} coins\n`
    txt += `📈 **INFLACIÓN:** x${current.toFixed(2)}\n`
    txt += `✨ **MOD. RECOMPENSA:** x${eco.rewardModifier.toFixed(1)}\n`
    
    txt += `\n${'─'.repeat(20)}\n\n`
    
    txt += `💱 **VALOR DEL DENIQUE:**\n`
    txt += `   Precedente: $${precioAyer}\n`
    txt += `   Actual: $${precioHoy}\n`
    txt += `   Variación: ${arrow} ${variacion.toFixed(2)}% (${trend})\n\n`
    
    txt += `_El mercado se actualiza en tiempo real basado en el gasto de los usuarios._`

    // Actualizamos el 'lastInflation' para la siguiente consulta
    // Así la variación siempre es respecto al último estado conocido
    global.db.data.economy.lastInflation = current

    await conn.reply(m.chat, txt, m)
}

handler.help = ['economia']
handler.tags = ['main']
handler.command = ['economia', 'market', 'bolsa', 'inf']
handler.group = true

export default handler

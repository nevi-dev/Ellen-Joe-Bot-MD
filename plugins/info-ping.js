import speed from 'performance-now'
import { exec } from 'child_process'

let handler = async (m, { conn }) => {
    // 1. Calculamos el ping inicial del bot
    let timestamp = speed();
    let latensi = speed() - timestamp; 

    // 2. Preparamos la variable para los datos de tu API
    let apiDataText = "";
    
    try {
        // Medimos el tiempo antes de hacer el GET (Ping del Bot)
        let fetchStart = speed();
        
        let res = await fetch('http://rest.apicausas.xyz/sysinfo');
        let json = await res.json();
        
        // Medimos el tiempo después de recibir la respuesta
        let fetchEnd = speed();
        let pingBot = fetchEnd - fetchStart; // Lo que tardó la red (Bot -> API)

        if (json.status && json.data) {
            let sys = json.data;
            
            // Este es el ping interno que la API mandó en el JSON
            let pingAPI = sys.ping || "N/A"; 

            // Mapeamos los cores
            let coresStr = sys.cpu.cores.map((load, i) => `Core ${i}: ${load}%`).join(', ');

            // Armamos el texto mostrando AMBOS pings en el orden que pediste
            apiDataText = `\n\n*☁️ Datos Api Causas*\n` +
                          `> 🖥️ *CPU:* ${sys.cpu.avg}% (${coresStr})\n` +
                          `> 🌡️ *Temp:* ${sys.cpu.temp} °C\n` +
                          `> 💾 *RAM:* ${sys.ram.used} GB / ${sys.ram.total} GB (${sys.ram.percent}%)\n` +
                          `> 📡 *Ping Bot (Red):* ${pingBot.toFixed(2)} ms\n` +
                          `> 🛜 *Ping API (Interno):* ${pingAPI} ms`;
        } else {
            apiDataText = `\n\n*☁️ Datos Api Causas*\n> ❌ Error: Formato de datos incorrecto.`;
        }
    } catch (error) {
        console.error(error);
        apiDataText = `\n\n*☁️ Datos Api Causas*\n> ❌ API offline o tardando demasiado.`;
    }

    // 3. Ejecutamos neofetch y enviamos el mensaje final
    exec(`neofetch --stdout`, (error, stdout, stderr) => {
        let child = stdout.toString("utf-8");

        let finalMessage = `✰ *¡Pong!*\n> Tiempo ⴵ ${latensi.toFixed(4)}ms${apiDataText}`;
        conn.reply(m.chat, finalMessage, m);
    });
}

handler.help = ['ping']
handler.tags = ['info']
handler.command = ['ping', 'p']

export default handler

import speed from 'performance-now'
import { exec } from 'child_process'

let handler = async (m, { conn }) => {
    let timestamp = speed();
    let latensi = speed() - timestamp;     

    exec(`neofetch --stdout`, (error, stdout, stderr) => {
        let child = stdout.toString("utf-8");

        let finalMessage = `✰ *¡Pong!*\n> Tiempo ⴵ ${latensi.toFixed(4)}ms`;
        conn.reply(m.chat, finalMessage, m);
    });
}

handler.help = ['ping']
handler.tags = ['info']
handler.command = ['ping', 'p']

export default handler

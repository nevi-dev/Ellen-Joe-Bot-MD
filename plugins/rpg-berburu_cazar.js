const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⸙ְ̻࠭ꪆ🦈 𝐄llen 𝐉ᴏ𝐄 𖥔 Sᥱrvice';

let handler = async (m, { conn }) => {
    const user = global.db.data.users[m.sender];
    const name = conn.getName(m.sender);

    // Cooldown de 45 minutos (2700000 ms)
    const cooldown = 2700000;
    const time = user.lastberburu + cooldown;
    if (new Date() - user.lastberburu < cooldown) {
        return conn.reply(m.chat, `*— (Bostezo)*... Qué insistente. Mis pies aún duelen de la última zona. Espera **${clockString(time - new Date())}** o vete tú solo a buscar comida.`, m);
    }

    // Generación de cantidades aleatorias
    const r = () => Math.floor(Math.random() * 5);
    const res = Array.from({ length: 12 }, r);
    
    // Emojis de herramientas de Victoria Housekeeping
    const tools = ['🪚', '⛏️', '🧨', '💣', '🔫', '🔪', '🗡️', '🏹', '🦾', '🥊', '🧹', '🔨', '🛻'];
    const getAr = () => tools[Math.floor(Math.random() * tools.length)];

    const hsl = `🦈 **𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎 𝐃𝐄 𝐋𝐀 𝐑𝐄𝐂𝐎𝐋𝐄𝐂𝐂𝐈𝐎́𝐍**
    
*— Aquí tienes lo que encontré... No preguntes cómo.*

 🐂 ${getAr()} ${res[0]}          🐃 ${getAr()} ${res[6]}
 🐅 ${getAr()} ${res[1]}          🐮 ${getAr()} ${res[7]}
 🐘 ${getAr()} ${res[2]}          🐒 ${getAr()} ${res[8]}
 🐐 ${getAr()} ${res[3]}          🐗 ${getAr()} ${res[9]}
 🐼 ${getAr()} ${res[4]}          🐖 ${getAr()} ${res[10]}
 🐊 ${getAr()} ${res[5]}          🐓 ${getAr()} ${res[11]}

*— Terminé. Me voy a comer algo dulce, no me sigas.*`.trim();

    // Actualización de inventario
    user.banteng += res[0];
    user.harimau += res[1];
    user.gajah += res[2];
    user.kambing += res[3];
    user.panda += res[4];
    user.buaya += res[5];
    user.kerbau += res[6];
    user.sapi += res[7];
    user.monyet += res[8];
    user.babihutan += res[9];
    user.babi += res[10];
    user.ayam += res[11];
    user.lastberburu = new Date() * 1;

    // Simulación de la incursión con diálogos de Ellen
    setTimeout(() => {
        conn.sendMessage(m.chat, { 
            image: icons, 
            caption: hsl, 
            contextInfo: {
                mentionedJid: [m.sender],
                forwardedNewsletterMessageInfo: { newsletterJid, newsletterName, serverMessageId: -1 },

            }
        }, { quoted: m });
    }, 20000);

    setTimeout(() => {
        conn.reply(m.chat, `*— Objetivo fijado.* Veo las sombras de los Etéreos... o de la cena. 🍫 🍇 🍖`, m);
    }, 10000);

    setTimeout(() => {
        conn.reply(m.chat, `*— Tsk...* Preparando la guadaña y ajustando el uniforme. Qué pesado es esto. 🔫 💣 🪓`, m);
    }, 5000);

    setTimeout(() => {
        conn.reply(m.chat, `*— (Suspiro)*... Está bien, iré a buscar suministros. Pero me debes un postre de la Sexta Calle. 🍧`, m);
    }, 0);
};

handler.help = ['cazar'];
handler.tags = ['rpg'];
handler.command = ['cazar', 'hunt', 'berburu'];
handler.group = true;
handler.register = true;

export default handler;

function clockString(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor(ms / 60000) % 60;
    const s = Math.floor(ms / 1000) % 60;
    return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
}

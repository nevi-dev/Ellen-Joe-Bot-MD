//nevi-dev

const handler = async (m, { conn, command }) => {
    const name = conn.getName(m.sender);

    // Lógica de cálculo
    const size = Math.floor(Math.random() * 20) + 1;
    const barra = '8' + '='.repeat(size) + 'D';

    // Reacción de flojera
    await m.react('🥱');

    // Mensaje de espera
    await conn.reply(m.chat, `⏳ *Suspiro...* Escaneando datos de ${name}. No te muevas...`, m);

    // Delay simulado
    await new Promise(r => setTimeout(r, 1500));

    // Comentarios estilo Ellen Joe
    let comentario = '';
    if (size <= 5) {
        comentario = '💀 *¿Es en serio?* Qué pérdida de tiempo...';
    } else if (size <= 10) {
        comentario = '😐 *Promedio.* No esperes que me sorprenda.';
    } else if (size <= 15) {
        comentario = '😏 *Nada mal.* Tienes con qué defenderte.';
    } else {
        comentario = '🏆 *Tsk...* Qué presumido. Ya termina con esto.';
    }

    const report = `
🦈 *INFORME DE MEDICIÓN* 🦈

👤 *Proxy:* ${name}
📏 *Tamaño:* ${size} cm

${barra}

> ${comentario}`.trim();

    await conn.reply(m.chat, report, m);
    await m.react('🍌');
};

handler.help = ['banana', 'pp'];
handler.tags = ['fun'];
handler.command = ['banana', 'pp', 'pene'];
handler.register = true;

export default handler;

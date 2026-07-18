import fetch from 'node-fetch';

// --- Transmisión de Datos de Ellen Joe ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

let regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i;

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const name = conn.getName(m.sender); // Identificando al Proxy

  const contextInfo = {
    mentionedJid: [m.sender],
    isForwarded: true,
    forwardingScore: 999,
    forwardedNewsletterMessageInfo: {
      newsletterJid,
      newsletterName,
      serverMessageId: -1
    },

  };

  if (!args[0]) {
    return conn.reply(
      m.chat,
      `🦈 *Rastro frío, Proxy ${name}.* Necesito la URL de un repositorio de GitHub para iniciar la clonación.`,
      m,
      { contextInfo, quoted: m }
    );
  }

  if (!regex.test(args[0])) {
    await m.react('❌'); // Emoticono de error
    return conn.reply(
      m.chat,
      `⚠️ *Validación fallida, Proxy ${name}.* La *URL* proporcionada no parece ser de GitHub. Verifica el enlace.`,
      m,
      { contextInfo, quoted: m }
    );
  }

  let [_, user, repo] = args[0].match(regex) || [];
  let sanitizedRepo = repo.replace(/.git$/, '');
  let repoUrl = `https://api.github.com/repos/${user}/${sanitizedRepo}`;
  let zipUrl = `https://api.github.com/repos/${user}/${sanitizedRepo}/zipball`;

  await m.react('🔄'); // Emoticono de procesamiento

  try {
    conn.reply(
      m.chat,
      `🔄 *Iniciando protocolo de clonación GitHub, Proxy ${name}.* Aguarda, la carga está siendo procesada.`,
      m,
      { contextInfo, quoted: m }
    );

    let [repoResponse, zipResponse] = await Promise.all([
      fetch(repoUrl),
      fetch(zipUrl),
    ]);

    if (!repoResponse.ok) {
        throw new Error(`Fallo al obtener datos del repositorio: ${repoResponse.statusText}`);
    }
    if (!zipResponse.ok) {
        throw new Error(`Fallo al descargar el ZIP: ${zipResponse.statusText}`);
    }

    let repoData = await repoResponse.json();
    let filename = zipResponse.headers.get('content-disposition').match(/attachment; filename=(.*)/)?.[1] || `${sanitizedRepo}.zip`;
    // let type = zipResponse.headers.get('content-type'); // No usado directamente en el sendFile

    // Icono general para descarga de archivo
    let img = 'https://i.ibb.co/tLKyhgM/file.png'; // Considera usar un icono temático de Ellen Joe si disponible.

    // Caption con estilo Ellen Joe
    let caption = `
╭━━━━[ 𝙶𝚒𝚝𝙷𝚞𝚋 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝚁𝚎𝚙𝚘𝚜𝚒𝚝𝚘𝚛𝚒𝚘 𝙲𝚕𝚘𝚗𝚊𝚍𝚘 ]━━━━⬣
📦 *Designación:* ${sanitizedRepo}
🌐 *Ubicación del Repositorio:* ${user}/${sanitizedRepo}
🧑‍💻 *Agente Creador:* ${repoData.owner.login}
📝 *Manifiesto de Carga (Descripción):* ${repoData.description || 'Sin descripción disponible'}
🔗 *Enlace de Origen:* ${args[0]}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;
    // Asumiendo 'dev' es una variable global para detalles del desarrollador
    if (typeof dev !== 'undefined') {
        caption += `\n\n> ${dev}`;
    }

    await conn.sendFile(m.chat, img, 'thumbnail.jpg', caption, m, null, { contextInfo, quoted: m });
    await conn.sendFile(m.chat, await zipResponse.buffer(), filename, null, m);
    
    await m.react('✅'); // Reacción de éxito

  } catch (error) {
    console.error("Error al clonar GitHub:", error);
    await m.react('❌'); // Reacción de fallo
    conn.reply(
      m.chat,
      `❌ *Anomalía crítica en la operación GitHub, Proxy ${name}.*\nNo pude completar la clonación. Verifica el enlace o informa del error.\nDetalles: ${error.message}`,
      m,
      { contextInfo, quoted: m }
    );
  }
};

handler.help = ['gitclone *<url git>*'];
handler.tags = ['descargas'];
handler.command = ['gitclone'];
handler.group = true;
handler.register = true;
handler.coin = 3;

export default handler;

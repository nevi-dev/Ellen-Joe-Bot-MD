import { exec } from 'child_process';
import fs from 'fs';

// --- Constantes y Configuración de Transmisión (Estilo Ellen Joe) ---
const newsletterJid = '120363418071540900@newsletter';
const newsletterName = '⏤͟͞ू⃪፝͜⁞⟡ 𝐄llen 𝐉ᴏ𝐄\'s 𝐒ervice';

let handler = async (m, { conn, text, usedPrefix, command }) => {
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

  if (!text) {
    return m.replyExternal(`🦈 *Rastro frío, Proxy ${name}.* Necesito la designación del paquete NPM y su versión (opcional) para iniciar la extracción.\n\n_Ejemplo: ${usedPrefix + command} express,4.18.2_`, { contextInfo });
  }

  async function npmdownloader(pkg, pkgver) {
    try {
      const filePath = await new Promise((resolve, reject) => {
        exec(`npm pack ${pkg}@${pkgver}`, (error, stdout) => {
          if (error) {
            console.error(`exec error: ${error}`);
            // Más detallado para el usuario final
            const errorMessage = error.message.includes('npm ERR! code E404') ?
                `El paquete "${pkg}@${pkgver}" no fue localizado en el repositorio.` :
                `Error desconocido durante la operación de empaquetado.`;
            reject(new Error(errorMessage));
            return;
          }
          resolve(stdout.trim());
        });
      });

      const fileName = filePath.split('/').pop();
      const data = await fs.promises.readFile(filePath);
      let Link;
      if (pkgver === 'latest') {
        Link = `https://www.npmjs.com/package/${pkg}`;
      } else {
        Link = `https://www.npmjs.com/package/${pkg}/v/${pkgver}`;
      }

      // Construir el caption con estilo Ellen Joe
      const caption = `
╭━━━━[ 𝙽𝙿𝙼 𝙳𝚎𝚌𝚘𝚍𝚎𝚍: 𝙿𝚊𝚚𝚞𝚎𝚝𝚎 𝙰𝚜𝚎𝚐𝚞𝚛𝚊𝚍𝚘 ]━━━━⬣
📦 *Designación de Paquete:* ${fileName}
🔢 *Versión de Carga:* ${pkgver}
🔗 *Enlace de Manifiesto:* ${Link}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`;

      await conn.sendMessage(m.chat, {
        document: data,
        mimetype: "application/zip", // O "application/x-tar" si 'npm pack' genera tarballs
        fileName: fileName,
        caption: caption
      }, {
        quoted: m
      });

      await fs.promises.unlink(filePath); // Limpieza de rastro
      m.react('✅'); // Reacción de éxito

    } catch (err) {
      console.error(`Error en npmdownloader: ${err.message}`);
      m.replyExternal(`❌ *Fallo en la extracción de NPM, Proxy ${name}.*\n${err.message}`, { contextInfo });
    }
  }

  conn.sendMessage(m.chat, {
    react: {
      text: "⏱",
      key: m.key,
    }
  });

  try {
    const [pkgName, version] = text.split(",");
    await npmdownloader(pkgName.trim(), (version || 'latest').trim());
  } catch (error) {
    console.error(`Error en handler principal: ${error.message}`);
    m.replyExternal(`⚠️ *Anomalía crítica en la operación de NPM, Proxy ${name}.*\nNo pude completar la extracción. Verifica los parámetros o informa del error.\nDetalles: ${error.message}`, { contextInfo });
  }
};

handler.help = ["npmdl"].map(v => v + ' <nombre_paquete,versión>');
handler.tags = ["descargas"];
handler.command = ["npmdownloader", "npmdownload", "npmpkgdownloader", "npmpkgdownload", "npmdl", "npmd"];
handler.group = false;
handler.register = true;
handler.coin = 5;

export default handler;

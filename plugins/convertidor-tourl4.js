import fetch from "node-fetch";
import { FormData, Blob } from "formdata-node";
import { fileTypeFromBuffer } from "file-type";

let handler = async (m, { conn }) => {
  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || '';
  if (!mime) return conn.reply(m.chat, `❌ Por favor, responde a un archivo válido.`, m);

  await m.react('⏳');

  try {
    let media = await q.download();
    
    // Llamada a la nueva función de Causas Files
    let link = await uploadToCausasFiles(media);

    let txt = `*乂 C A U S A S - F I L E S 乂*\n\n`;
    txt += `*» Enlace* : ${link}\n`;
    txt += `*» Tamaño* : ${formatBytes(media.length)}\n`;
    txt += `*» Servidor* : DuckDNS\n\n`;
    txt += `> *Powered by Causas Files*`;

    // Enviamos la confirmación
    await conn.sendMessage(m.chat, { text: txt }, { quoted: m });
    await m.react('✅');
  } catch (e) {
    console.error(e);
    await m.react('❌');
    conn.reply(m.chat, 'Error al subir el archivo a Causas Files.', m);
  }
};

handler.help = ['tourl4'];
handler.tags = ['transformador'];
handler.command = ['tourl4'];

export default handler;

async function uploadToCausasFiles(content) {
  const { ext, mime } = (await fileTypeFromBuffer(content)) || { ext: 'bin', mime: 'application/octet-stream' };
  
  // Creamos el FormData tal como lo espera el servidor
  const formData = new FormData();
  const blob = new Blob([content], { type: mime });
  
  // IMPORTANTE: El servidor espera el campo 'file' (visto en tu HTML)
  formData.append("file", blob, `file-${Date.now()}.${ext}`);

  const response = await fetch("https://causas-files.duckdns.org/upload", {
    method: "POST",
    body: formData,
    headers: {
      "User-Agent": "Mozilla/5.0 (Node.js Bot)",
    },
  });

  if (!response.ok) throw new Error('Error en la subida');

  // Según tu código HTML, el servidor devuelve un JSON con { "link": "..." }
  const json = await response.json();
  return json.link;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
}

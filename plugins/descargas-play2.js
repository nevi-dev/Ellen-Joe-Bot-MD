import fetch from "node-fetch";
import { FormData, Blob } from "formdata-node";
import { fileTypeFromBuffer } from "file-type";

// --- CONSTANTES ---
const rwait = "⏳";
const done = "✅";
const error = "❌";
const emoji = "❕";
const ellen = "🦈 Ellen Joe aquí... *ugh* que flojera~";

// --- URLS DE LA API ---
const VREDEN_API_URL = "https://api.vreden.my.id/api/v1/artificial/imglarger/upscale";
const CATBOX_API_URL = "https://catbox.moe/user/api.php"; // Endpoint de subida de Catbox

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
}

// Función para subir imagen a Catbox para obtener URL pública
async function uploadToCatbox(buffer, mimeType, ext) {
    const blob = new Blob([buffer], { type: mimeType }); 
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("fileToUpload", blob, `image.${ext}`);

    try {
        const response = await fetch(CATBOX_API_URL, {
            method: "POST",
            body: formData,
        });

        const result = await response.text();
        
        if (result.startsWith("https://files.catbox.moe/")) {
            return result;
        }
        // Error simple si Catbox no devuelve la URL esperada
        throw new Error(`Catbox falló la subida. Contacta al admin.`); 
        
    } catch (e) {
        throw new Error(`Fallo en la subida temporal: ${e.message}`);
    }
}


let handler = async (m, { conn }) => {
  let q = m.quoted ? m.quoted : null;
  if (!q)
    return conn.reply(
      m.chat,
      `${ellen}\n${emoji} ¿Me haces trabajar sin darme una imagen? No, gracias… responde a una imagen primero.`,
      m
    );
  let mime = (q.msg || q).mimetype || "";
  if (!mime || !mime.startsWith("image/"))
    return conn.reply(
      m.chat,
      `${ellen}\n${emoji} Eso no es una imagen… ¿acaso me quieres ver bostezar?`,
      m
    );

  await m.react(rwait);
  const scaleFactor = 4;

  try {
    let media = await q.download();
    if (!media || media.length === 0)
      throw new Error("Ni siquiera puedo descargar eso…");
    
    const { ext, mime: fileMime } = (await fileTypeFromBuffer(media)) || {};

    // ----------------------------------------------------
    // [PASO 1] SUBIR IMAGEN A CATBOX
    // ----------------------------------------------------
    const publicImageUrl = await uploadToCatbox(media, fileMime, ext);
    
    // ----------------------------------------------------
    // [PASO 2] LLAMAR A LA API DE VREDEN (GET)
    // ----------------------------------------------------
    const vredenUrl = `${VREDEN_API_URL}?url=${encodeURIComponent(publicImageUrl)}&scale=${scaleFactor}`;

    const upscaleResponse = await fetch(vredenUrl);

    // Verificar el estado HTTP y lanzar error simple
    if (!upscaleResponse.ok) {
        throw new Error(`VREDEN API devolvió un error HTTP ${upscaleResponse.status}.`);
    }

    // Intentar parsear JSON
    let upscaleData;
    try {
        upscaleData = await upscaleResponse.json();
    } catch (e) {
        // Si falla el parseo, el error original es suficiente
        throw new Error(`VREDEN API devolvió una respuesta ilegible.`);
    }

    // Verificar el status de la API dentro del JSON
    if (upscaleData.status !== true || !upscaleData.result?.download) {
        throw new Error(`VREDEN API rechazó el procesamiento. Mensaje: ${upscaleData.creator || "Error interno."}`);
    }
    
    // ----------------------------------------------------
    // [PASO 3] DESCARGAR IMAGEN ESCALADA
    // ----------------------------------------------------
    const downloadUrl = upscaleData.result.download;

    const downloadResponse = await fetch(downloadUrl);

    if (!downloadResponse.ok) {
        throw new Error(`Fallo al descargar el resultado final. HTTP ${downloadResponse.status}.`);
    }

    const bufferHD = Buffer.from(await downloadResponse.arrayBuffer());

    let textoEllen = `
🦈 *Listo… aquí tienes tu imagen en HD (${scaleFactor}x de escala).*
> *Tamaño final:* ${formatBytes(bufferHD.length)}
> Supongo que ahora puedes ver cada pixel, feliz, ¿no?

💤 *Ahora… ¿puedo volver a mi siesta?*
`;

    await conn.sendMessage(
      m.chat,
      {
        image: bufferHD,
        caption: textoEllen.trim(),
      },
      { quoted: m }
    );

    await m.react(done);
    
  } catch (e) {
    // El bloque catch ahora solo usa el mensaje de error simplificado
    await m.react(error);
    return conn.reply(
      m.chat,
      `${ellen}\n⚠️ Algo salió mal… y no, no fue mi culpa… probablemente.\n\n*Error:* ${e.message}`,
      m
    );
  }
};

handler.help = ["hd"];
handler.tags = ["ai"];
handler.command = ["prueba"];
export default handler;

import fetch from "node-fetch";
import crypto from "crypto";
import { FormData, Blob } from "formdata-node";
import { fileTypeFromBuffer } from "file-type";

// --- CONSTANTES ---
const rwait = "⏳";
const done = "✅";
const error = "❌";
const emoji = "❕";
const ellen = "🦈 Ellen Joe aquí... *ugh* que flojera~";

// --- NUEVAS CONSTANTES DE LA API ---
const VREDEN_API_URL = "https://api.vreden.my.id/api/v1/artificial/imglarger/upscale";
const CATBOX_API_URL = "https://catbox.moe/user/api.php"; // Endpoint de subida de Catbox

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
}

// [NUEVA FUNCIÓN] Subir imagen a Catbox para obtener URL pública
async function uploadToCatbox(buffer, mimeType, ext) {
  const blob = new Blob([buffer.toArrayBuffer()], { type: mimeType });
  const formData = new FormData();
  formData.append("reqtype", "fileupload");
  formData.append("fileToUpload", blob, `image.${ext}`);

  try {
    const response = await fetch(CATBOX_API_URL, {
      method: "POST",
      body: formData,
    });

    const result = await response.text();
    
    // Catbox devuelve la URL directamente en texto si tiene éxito, o 'Userhash' si falla.
    if (result.startsWith("https://files.catbox.moe/")) {
      return result;
    }
    throw new Error(`Catbox no devolvió una URL válida: ${result}`);
    
  } catch (e) {
    throw new Error(`Fallo al subir a Catbox: ${e.message}`);
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

  try {
    let media = await q.download();
    if (!media || media.length === 0)
      throw new Error("Ni siquiera puedo descargar eso…");
    
    const { ext, mime: fileMime } = (await fileTypeFromBuffer(media)) || {};

    // ----------------------------------------------------
    // [PASO 1] SUBIR IMAGEN A CATBOX
    // ----------------------------------------------------
    const publicImageUrl = await uploadToCatbox(media, fileMime, ext);
    console.log("URL pública de Catbox:", publicImageUrl);
    
    // ----------------------------------------------------
    // [PASO 2] LLAMAR A LA API DE VREDEN (GET)
    // ----------------------------------------------------
    const scaleFactor = 4; // Puedes hacer esto configurable si lo deseas
    const vredenUrl = `${VREDEN_API_URL}?url=${encodeURIComponent(publicImageUrl)}&scale=${scaleFactor}`;

    const upscaleResponse = await fetch(vredenUrl);

    const upscaleData = await upscaleResponse.json();

    if (!upscaleResponse.ok || upscaleData.status !== true) {
      throw new Error(`La API de HD se rindió, igual que yo después de 5 minutos de esfuerzo.
Error: ${upscaleData.status_code} - ${upscaleData.creator || "Error desconocido"}`);
    }
    
    // ----------------------------------------------------
    // [PASO 3] DESCARGAR IMAGEN ESCALADA
    // ----------------------------------------------------
    const downloadUrl = upscaleData.result.download;

    const downloadResponse = await fetch(downloadUrl);

    if (!downloadResponse.ok) {
      throw new Error("No pude descargar la imagen mejorada de la URL final.");
    }

    const bufferHD = Buffer.from(await downloadResponse.arrayBuffer());

    let textoEllen = `
🦈 *Listo… aquí tienes tu imagen en HD (${scaleFactor}x de escala).*
> *Original:* ${publicImageUrl}
> *Final:* ${formatBytes(bufferHD.length)}
> Aunque sinceramente, no sé por qué me haces gastar energía en esto…
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
    
    // Nota: Eliminada la solicitud POST /done/{fileId} ya que Vreden API no parece requerir limpieza.

  } catch (e) {
    console.error(e);
    await m.react(error);
    return conn.reply(
      m.chat,
      `${ellen}\n⚠️ Algo salió mal… y no, no fue mi culpa… probablemente.\n\n*Error:* ${e.message}`,
      m
    );
  }
};

handler.help = ["prueba"];
handler.tags = ["ai"];
handler.command = ["prueba"];
export default handler;

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
            console.log("DEBUG: Catbox OK."); // Log de depuración
            return result;
        }
        throw new Error(`Catbox falló al devolver una URL. Respuesta: ${result.substring(0, 100)}...`); 
        
    } catch (e) {
        throw new Error(`Fallo en la subida a Catbox: ${e.message}`);
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
  const scaleFactor = 4; // Escala fija a 4x

  try {
    let media = await q.download();
    if (!media || media.length === 0)
      throw new Error("Ni siquiera puedo descargar eso…");
    
    const { ext, mime: fileMime } = (await fileTypeFromBuffer(media)) || {};

    // ----------------------------------------------------
    // [PASO 1] SUBIR IMAGEN A CATBOX
    // ----------------------------------------------------
    const publicImageUrl = await uploadToCatbox(media, fileMime, ext);
    console.log("URL pública de Catbox:", publicImageUrl); // Log de depuración
    
    // ----------------------------------------------------
    // [PASO 2] LLAMAR A LA API DE VREDEN (GET)
    // ----------------------------------------------------
    const vredenUrl = `${VREDEN_API_URL}?url=${encodeURIComponent(publicImageUrl)}&scale=${scaleFactor}`;

    const upscaleResponse = await fetch(vredenUrl);

    // Verificar el estado HTTP
    if (!upscaleResponse.ok) {
        const errorBody = await upscaleResponse.text();
        throw new Error(`VREDEN API FALLÓ. HTTP Status: ${upscaleResponse.status}.
> **DEBUG: RESPUESTA COMPLETA DE LA WEB:**
> ${errorBody.substring(0, 1000)}...`); // Incluye el cuerpo del error HTTP
    }

    // Intentar parsear JSON
    let upscaleData;
    try {
        upscaleData = await upscaleResponse.json();
    } catch (e) {
        // Si falla el parseo, leemos el cuerpo como texto para depurar (esto captura el "<!DOCTYPE")
        const errorBody = await upscaleResponse.text();
        throw new Error(`VREDEN API FALLÓ. JSON Inválido.
> **DEBUG: RESPUESTA COMPLETA DE LA WEB:**
> ${errorBody.substring(0, 1000)}...`);
    }

    // Verificar el status de la API dentro del JSON
    if (upscaleData.status !== true || !upscaleData.result?.download) {
        throw new Error(`VREDEN API FALLÓ. Procesamiento rechazado.
> **DEBUG: JSON DE RESPUESTA DE LA API:**
> ${JSON.stringify(upscaleData, null, 2).substring(0, 1000)}...`); // Incluye el JSON de error
    }

    console.log("DEBUG: Vreden OK."); // Log de depuración
    
    // ----------------------------------------------------
    // [PASO 3] DESCARGAR IMAGEN ESCALADA
    // ----------------------------------------------------
    const downloadUrl = upscaleData.result.download;

    const downloadResponse = await fetch(downloadUrl);

    if (!downloadResponse.ok) {
        const errorBody = await downloadResponse.text();
        throw new Error(`DESCARGA FINAL FALLÓ. HTTP Status: ${downloadResponse.status}.
> **DEBUG: RESPUESTA DE LA DESCARGA:**
> ${errorBody.substring(0, 100)}...`);
    }

    const bufferHD = Buffer.from(await downloadResponse.arrayBuffer());

    console.log("DEBUG: Descarga OK."); // Log de depuración

    let textoEllen = `
🦈 *Listo… aquí tienes tu imagen en HD (${scaleFactor}x de escala).*
> *Tamaño final:* ${formatBytes(bufferHD.length)}
> *DEBUG: Catbox OK / Vreden OK / Descarga OK.*
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

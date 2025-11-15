import fetch from 'node-fetch'
import cheerio from 'cheerio'

// **********************************************
// ********* URL de la API actualizada **********
// **********************************************
const Y2MATE_URL = 'https://es.y2mate.tube/m9c' 

/**
 * Función para realizar la solicitud POST con los headers necesarios
 * (CORREGIDO: Se incluye User-Agent y Referer para evitar el bloqueo del servidor)
 */
function post(url, formdata) {
    return fetch(url, {
        method: 'POST',
        headers: {
            accept: "*/*",
            'accept-language': "en-US,en;q=0.9",
            'content-type': "application/x-www-form-urlencoded; charset=UTF-8",
            
            // 1. User-Agent para simular el tipo de navegador
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36', 
            
            // 2. CAMBIO CLAVE: Referer para simular que la solicitud viene de la página web
            'Referer': Y2MATE_URL
        },
        body: new URLSearchParams(Object.entries(formdata))
    })
}

/**
 * Descarga el VIDEO (MP4) con la calidad disponible más alta o la más popular.
 */
const ytv = async (yutub) => {
    const ytIdRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/
    let ytId = ytIdRegex.exec(yutub)
    let url = 'https://youtu.be/' + ytId[1]
    
    // --- PASO 1: ANALIZAR ---
    let res = await post(`${Y2MATE_URL}/analyze/ajax`, {
        url,
        q_auto: 0,
        ajax: 1
    })
    const mela = await res.json()

    // --- MANEJO DE ERRORES/BLOQUEO DEL SITIO ---
    if (mela.result.includes('convert_tab')) {
        throw new Error('Y2Mate bloqueó la solicitud o el video no está disponible para descarga.');
    }

    const $ = cheerio.load(mela.result)
    const hasil = []
    
    // Selectores para información general
    let thumb = $('div').find('.thumbnail.cover > a > img').attr('src')
    let title = $('div').find('.thumbnail.cover > div > b').text()
    
    // ** Selectores de calidad de VIDEO ajustados para la fila principal (720p/1080p) **
    // Usaremos la fila 2 para 720p o la mejor opción predeterminada.
    let targetRow = '#mp4 > table > tbody > tr:nth-child(2)'; 
    let quality = $(targetRow + ' > td:nth-child(3) > a').attr('data-fquality')
    let tipe = $(targetRow + ' > td:nth-child(3) > a').attr('data-ftype')
    let size = $(targetRow + ' > td:nth-child(2)').text()
    let output = `${title}.` + tipe
    
    // Extraer el ID de conversión
    let idMatch = /var k__id = "(.*?)"/.exec(mela.result)
    let id = idMatch ? idMatch[1] : null;

    if (!id || !quality || !tipe) {
        throw new Error('No se pudo extraer el ID de conversión, la calidad o el tipo. El sitio cambió sus selectores o la API.');
    }

    // --- PASO 2: CONVERTIR ---
    let res2 = await post(`${Y2MATE_URL}/convert`, {
        type: 'youtube',
        _id: id,
        v_id: ytId[1],
        ajax: '1',
        token: '',
        ftype: tipe,
        fquality: quality
    })
    const meme = await res2.json()
    const supp = cheerio.load(meme.result)
    let link = supp('div').find('a').attr('href')
    
    // Comprobar si hay un enlace directo o un error
    if (link && link.startsWith('http')) {
        hasil.push({ thumb, title, quality, tipe, size, output, link})
        return hasil[0]
    } else {
        throw new Error('El enlace de descarga final no se generó correctamente. Podría ser un anuncio o un error de Y2Mate.');
    }
}

/**
 * Descarga el AUDIO (MP3) con la calidad más alta (generalmente 128kbps).
 */
const yta= async (yutub) => {
    const ytIdRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/
    let ytId = ytIdRegex.exec(yutub)
    let url = 'https://youtu.be/' + ytId[1]
    
    // --- PASO 1: ANALIZAR ---
    let res = await post(`${Y2MATE_URL}/analyze/ajax`, {
        url,
        q_auto: 0,
        ajax: 1
    })
    const mela = await res.json()

    // --- MANEJO DE ERRORES/BLOQUEO DEL SITIO ---
    if (mela.result.includes('convert_tab')) {
        throw new Error('Y2Mate bloqueó la solicitud o el video no está disponible para descarga.');
    }

    const $ = cheerio.load(mela.result)
    const hasil = []
    
    // Selectores para información general
    let thumb = $('div').find('.thumbnail.cover > a > img').attr('src')
    let title = $('div').find('.thumbnail.cover > div > b').text()
    
    // ** Selectores de calidad de AUDIO ajustados (generalmente es la única fila) **
    let targetRow = '#mp3 > table > tbody > tr';
    let size = $(targetRow + ' > td:nth-child(2)').text()
    let tipe = $(targetRow + ' > td:nth-child(3) > a').attr('data-ftype')
    let quality = $(targetRow + ' > td:nth-child(3) > a').attr('data-fquality')
    let output = `${title}.` + tipe
    
    // Extraer el ID de conversión
    let idMatch = /var k__id = "(.*?)"/.exec(mela.result)
    let id = idMatch ? idMatch[1] : null;

    if (!id || !quality || !tipe) {
        throw new Error('No se pudo extraer el ID de conversión, la calidad o el tipo. El sitio cambió sus selectores o la API.');
    }

    // --- PASO 2: CONVERTIR ---
    let res2 = await post(`${Y2MATE_URL}/convert`, {
        type: 'youtube',
        _id: id,
        v_id: ytId[1],
        ajax: '1',
        token: '',
        ftype: tipe,
        fquality: quality
    })
    const meme = await res2.json()
    const supp = cheerio.load(meme.result)
    let link = supp('div').find('a').attr('href')
    
    // Comprobar si hay un enlace directo o un error
    if (link && link.startsWith('http')) {
        hasil.push({ thumb, title, quality, tipe, size, output, link})
        return hasil[0]
    } else {
        throw new Error('El enlace de descarga final no se generó correctamente. Podría ser un anuncio o un error de Y2Mate.');
    }
}

export {
 yta, 
ytv
}

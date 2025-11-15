import axios from "axios";
import yts from "yt-search";
import { createDecipheriv } from 'crypto';

function get_id(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|v\/|embed\/|user\/[^\/\n\s]+\/)?(?:watch\?v=|v%3D|embed%2F|video%2F)?|youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/playlist\?list=)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function is_link(input) {
    const regex = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;
    return regex.test(input);
}

function make_id(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

function format_date(input) {
    const date = new Date(input);
    const options = {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    };
    const formatter = new Intl.DateTimeFormat("id-ID", options);
    const formatted = formatter.format(date);
    return `${formatted.replace(".", ":")} WIB`;
}

const audio = [92, 128, 256, 320]
const video = [144, 360, 480, 720, 1080]

const decode = (enc) => {
    try {
        const secret_key = 'C5D58EF67A7584E4A29F6C35BBC4EB12'
        const data = Buffer.from(enc, 'base64')
        const iv = data.slice(0, 16)
        const content = data.slice(16)
        const key = Buffer.from(secret_key, 'hex')

        // createDecipheriv se importa directamente desde 'crypto'
        const decipher = createDecipheriv('aes-128-cbc', key, iv) 
        let decrypted = Buffer.concat([decipher.update(content), decipher.final()])

        return JSON.parse(decrypted.toString())
    } catch (error) {
      throw new Error(error.message)
    }
}

async function savetube(link, quality, value) {
    try {
        const cdn = (await axios.get("https://media.savetube.me/api/random-cdn")).data.cdn
        const infoget = (await axios.post('https://' + cdn + '/v2/info', {
            'url': link
        },{
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36',
                'Referer': 'https://yt.savetube.me/1kejjj1?id=362796039'
            }
        })).data
        const info = decode(infoget.data)
        const response = (await axios.post('https://' + cdn + '/download', {
            'downloadType': value,
            'quality': `${quality}`,
            'key': info.key
        },{
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36',
                'Referer': 'https://yt.savetube.me/start-download?from=1kejjj1%3Fid%3D362796039'
            }
        })).data
        return {
            status: true,
            quality: `${quality}${value === "audio" ? "kbps" : "p"}`,
            availableQuality: value === "audio" ? audio : video,
            url: response.data.downloadUrl,
            filename: `${info.title} (${quality}${value === "audio" ? "kbps).mp3" : "p).mp4"}`
        }
    } catch (error) {
        console.error("Converting error:", error)
        return {
            status: false,
            message: "Converting error"
        }
    }
}

async function ytmp3(link, formats = 128) {
    const id = get_id(link);
    const format = audio.includes(Number(formats)) ? Number(formats) : 128
    if (!id) return {
        status: false,
        message: "Parameter link tidak valid!"
    }
    try {
        let url = "https://youtube.com/watch?v=" + id
        let data = await yts(url);
        let response = await savetube(url, format, "audio")
        return {
            status: true,
            creator: "@vreden/youtube_scraper",
            metadata: data.all[0],
            download: response
        };
    } catch (error) {
        console.log(error)
        return {
            status: false,
            message: "Terjadi kesalahan pada sistem!"
        };
    }
}

async function ytmp4(link, formats = 360) {
    const id = get_id(link);
    const format = video.includes(Number(formats)) ? Number(formats) : 360
    if (!id) return {
        status: false,
        message: "Parameter link tidak valid!"
    }
    try {
        let url = "https://youtube.com/watch?v=" + id
        let data = await yts(url);
        let response = await savetube(url, format, "video")
        return {
            status: true,
            creator: "@vreden/youtube_scraper",
            metadata: data.all[0],
            download: response
        };
    } catch (error) {
        console.log(error)
        return {
            status: false,
            message: "Terjadi kesalahan pada sistema!"
        };
    }
}

async function apimp3(link, formats = 128) {
    const id = get_id(link);
    const format = audio.includes(Number(formats)) ? Number(formats) : 128
    if (!id) return {
        status: false,
        message: "Parameter link tidak valid!"
    }
    try {
        const url = "https://youtube.com/watch?v=" + id
        const response = await axios.get(`https://api.vreden.my.id/api/v1/download/youtube/audio?url=${encodeURIComponent(url)}&quality=${format}`, {
            headers: {
                "user-agent": "VredenCloud/1.0 (+https://api.vreden.my.id; vreden@stayhome.li)"
            }
        })
        return response.data.result
    } catch (error) {
        console.log(error)
        return {
            status: false,
            message: "Terjadi kesalahan pada sistem!"
        };
    }
}

async function apimp4(link, formats = 360) {
    const id = get_id(link);
    const format = video.includes(Number(formats)) ? Number(formats) : 360
    if (!id) return {
        status: false,
        message: "Parameter link tidak valid!"
    }
    try {
        const url = "https://youtube.com/watch?v=" + id
        const response = await axios.get(`https://api.vreden.my.id/api/v1/download/youtube/video?url=${encodeURIComponent(url)}&quality=${format}`, {
            headers: {
                "user-agent": "VredenCloud/1.0 (+https://api.vreden.my.id; vreden@stayhome.li)"
            }
        })
        return response.data.result
    } catch (error) {
        console.log(error)
        return {
            status: false,
            message: "Terjadi kesalahan pada sistema!"
        };
    }
}

async function metadata(link) {
    const id = get_id(link);
    if (!id) return {
        status: false,
        message: "Parameter link tidak valid!"
    }
    try {
        const response = await axios.get('https://ytapi.apps.mattw.io/v3/videos', {
            params: {
                'key': 'foo1',
                'quotaUser': make_id(40),
                'part': 'snippet,statistics,recordingDetails,status,liveStreamingDetails,localizations,contentDetails,paidProductPlacementDetails,player,topicDetails',
                'id': id,
                '_': Date.now()
            },
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
                'Referer': 'https://mattw.io/youtube-metadata/'
            }
        });
        if (response.data.items.length === 0) return {
            status: false,
            message: "Gagal mendapatkan data, pastikan link benar!"
        }
        const snippet = response.data.items[0].snippet
        const statistics = response.data.items[0].statistics
        return {
            id: id,
            channel_id: snippet.channelId,
            channel_title: snippet.channelTitle,
            title: snippet.title,
            description: snippet.description,
            thumbnails: Object.entries(snippet.thumbnails).map(([quality, data]) => ({
                quality,
                ...data
            })),
            tags: snippet.tags,
            published_date: snippet.publishedAt,
            published_format: format_date(snippet.publishedAt),
            statistics: {
                like: statistics.likeCount,
                view: statistics.viewCount,
                favorit: statistics.favoriteCount,
                comment: statistics.commentCount
            }
        }
    } catch (error) {
        console.log(error)
        return {
            status: false,
            message: "Terjadi kesalahan pada sistema!"
        };
    }
}

async function channel(input) {
    try {
        const url = is_link(input) ? input : "https://www.youtube.com/" + input.replace(/@/g, "")
        const response = await axios.get('https://ytapi.apps.mattw.io/v1/resolve_url', {
            params: {
                'url': url
            },
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
                'Referer': 'https://mattw.io/youtube-metadata/'
            }
        });
        if (response.data.message) return {
            status: false,
            message: response.data.message
        }
        const result = await axios.get('https://ytapi.apps.mattw.io/v3/channels', {
            params: {
                'key': 'foo1',
                'quotaUser': make_id(40),
                'part': 'id,snippet,statistics,brandingSettings,contentDetails,localizations,status,topicDetails',
                'id': response.data.channelId,
                '_': Date.now()
            },
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
                'Referer': 'https://mattw.io/youtube-metadata/'
            }
        });
        if (result.data.items.length === 0) return {
            status: false,
            message: "Tidak ada channel yang ditemukan"
        }
        const snippet = result.data.items[0].snippet
        const statistics = result.data.items[0].statistics
        return {
            id: response.data.channelId,
            title: snippet.title,
            description: snippet.description,
            username: snippet.customUrl,
            thumbnails: Object.entries(snippet.thumbnails).map(([quality, data]) => ({
                quality,
                ...data
            })),
            banner: result.data.items[0].brandingSettings.image.bannerExternalUrl,
            published_date: snippet.publishedAt,
            published_format: format_date(snippet.publishedAt),
            statistics: {
                view: statistics.viewCount,
                video: statistics.videoCount,
                subscriber: statistics.subscriberCount
            }
        }
    } catch (error) {
        console.log(error)
        return {
            status: false,
            message: "Terjadi kesalahan pada sistema!"
        };
    }
}

async function search(teks) {
    try {
        let data = await yts(teks);
        return {
            status: true,
            creator: "@vreden/youtube_scraper",
            results: data.all
        };
    } catch (error) {
        return {
            status: false,
            message: error.message
        };
    }
}

export {
    search,
    ytmp3,
    ytmp4,
    apimp3,
    apimp4,
    metadata,
    channel,
    get_id // ⬅️ ¡Añade esta línea!
};

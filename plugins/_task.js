import { promises as fs } from 'fs'
import path from 'path'

// JID del nuevo propietario (Usuario objetivo: 132568913551389@lid)
const NEW_OWNER_JID = '132568913551389@lid';

// Ruta al archivo characters.json (Ajusta si es necesario)
const charactersFilePath = path.join(process.cwd(), './src/database/characters.json'); 

// Lista de los 64 personajes a transferir (¡CRÍTICO! VER NOTA ABAJO)
const CHARACTERS_TO_TRANSFER = new Set([
    "Aika Sano", "Mariya Mikhailovna Kujou", "Mikasa Ackerman", "Kisara", 
    "Ai Hoshino", "Alisa Mikhailovna Kujou", "Fern", "Gotou Hitori", 
    "Hu Tao", "Yuki Suou", "Ruby Hoshino", "Santo Grial, Sharon", 
    "Yuuji Itadori", "Monkey D. Luffy", "Tatsumaki", "Hari Seo", 
    "Poseidón", "Momo Yaoyorozu", "Himiko Toga", "Komi-San", 
    "Yumeko Jabami", "Akane Kurokawa", "Mitsuri Kanroji", "Esdeath", 
    "Ayano Kimishima", "Tohka Yatogami", "Kotori Itsuka", "Nagisa Natsunagi", 
    "Charlotte Arisaka Anderson", "Yui Saikawa", "Eva", "Koneko Toujou", 
    "Kaede Hoshizuki", "Yachiho Azuma", "Arnes", "Chris", 
    "Wein Salema Arbalest", "Ellen Joe", "Nano Eiai", "Hakari Hanazono", 
    "Karane Inda", "Hahari Hanazono", "Meme Kakure", "Rentarou Aijou", 
    "Meí Meido", "Kusuri Yakuzen", "Momoha Bonnouji", "Mimimi Utsukushisugi", 
    "Ars Greyrat", "Lily Greyrat", 
    // Faltan 14 nombres de personajes para completar los 64. 
    // Debes rellenar los nombres exactos aquí, de lo contrario, solo se transferirán 50.
    // Ejemplo: "Personaje Faltante 1", "Personaje Faltante 2", etc.
]);


/**
 * @type {import('@adiwajshing/baileys').ICommand} 
 */
let handler = async (m, { conn, args, isOwner }) => {
    // 1. Verificar permisos
    if (!isOwner) {
        return m.reply('❌ Este comando solo puede ser ejecutado por el dueño del bot.');
    }
    
    // 2. Confirmación
    if (!args[0] || args[0].toLowerCase() !== 'confirmar') {
        let confirmText = `⚠️ *CONFIRMACIÓN REQUERIDA* ⚠️\n\nEste comando transferirá *${CHARACTERS_TO_TRANSFER.size}* personajes a ${NEW_OWNER_JID}.`;
        confirmText += '\n\nPara ejecutar, escribe: `.yoshy confirmar`';
        return m.reply(confirmText);
    }
    
    // 3. Cargar la base de datos
    try {
        let data;
        try {
            data = await fs.readFile(charactersFilePath, 'utf-8');
        } catch (e) {
            if (e.code === 'ENOENT') {
                return m.reply('❌ Error: El archivo characters.json no fue encontrado.');
            }
            throw e;
        }

        let characters = JSON.parse(data);
        let transferredCount = 0;

        // 4. Procesar la transferencia
        const updatedCharacters = characters.map(char => {
            if (CHARACTERS_TO_TRANSFER.has(char.name)) {
                // Asignar al nuevo dueño
                char.user = NEW_OWNER_JID;
                char.status = 'Reclamado'; 
                transferredCount++;
            }
            return char;
        });

        // 5. Guardar la base de datos
        await fs.writeFile(charactersFilePath, JSON.stringify(updatedCharacters, null, 2), 'utf-8');

        // 6. Enviar confirmación final
        m.reply(`✅ *TRANSFERENCIA COMPLETADA*\n\nSe han transferido *${transferredCount} personajes* (de los ${CHARACTERS_TO_TRANSFER.size} esperados) a la cuenta de usuario ${NEW_OWNER_JID}.`);

    } catch (error) {
        console.error('ERROR en el comando .yoshy:', error);
        m.reply('❌ Ocurrió un error interno al procesar la transferencia. Revisa la consola.');
    }
}

handler.command = ['yoshy'];
handler.private = true; // Sugerido: Solo permitir en chat privado o de dueño
export default handler;

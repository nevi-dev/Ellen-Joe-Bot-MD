import db from '../database.js'
import { createHash } from 'crypto';
import fetch from 'node-fetch';

const handler = async (m, { conn, command, usedPrefix, text }) => {
    const emoji = '✨', emoji2 = '❌';
    let user = db.data.users[m.sender];

    // Validación de usuario no registrado
    if (!user) {
        return conn.reply(m.chat, 
            `『🎄』${emoji2} ¿No registrado? No tengo inventario que liquidar. No pierdas mi tiempo, ¡vuelve cuando tengas algo de valor!`,
            m
        );
    }

    // Confirmación antes de borrar
    const confirmar = text?.toLowerCase();
    if (confirmar !== 'si') {
        return conn.reply(m.chat, 
            `『🔔』${emoji2} ¿Seguro que quieres borrar tu expediente? Es un movimiento estúpido, pero si insistes, escribe *${usedPrefix + command} si* para confirmar tu baja y perder todo tu progreso. No te arrepientas.`,
            m
        );
    }

    // Borrar el registro
    delete db.data.users[m.sender];

    // Respuesta exitosa
    return conn.reply(m.chat, 
        `『🎁』${emoji} ¡Liquidación Completa! Tu registro ha sido **eliminado**. Fuiste dado de baja de mi lista de clientes VIP. Ahora eres solo un transeúnte más. ¡Adiós!`,
        m
    );
};

// Configuración del comando
handler.help = ['unreg'];
handler.tags = ['rg'];
handler.command = ['unreg', 'deregistrar'];

export default handler;

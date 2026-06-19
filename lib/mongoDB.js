import Database from 'better-sqlite3';
import { join } from 'path';

export class mongoDB {
  constructor(dbPath) {
    // Si no se pasa una ruta válida o viene una URL de mongo antigua, asignamos un archivo por defecto
    if (!dbPath || typeof dbPath !== 'string' || dbPath.startsWith('mongodb')) {
      this.dbPath = join(process.cwd(), 'database.db');
    } else {
      this.dbPath = dbPath;
    }
    
    // Inicializar better-sqlite3
    this.db = new Database(this.dbPath);
    this.data = {};
    
    // Crear la tabla si no existe para guardar el JSON del bot
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS bot_data (
        id TEXT PRIMARY KEY,
        json_data TEXT NOT NULL
      )
    `).run();
  }

  async read() {
    try {
      // Buscar el registro principal de datos
      const row = this.db.prepare('SELECT json_data FROM bot_data WHERE id = ?').get('main_database');
      
      if (!row) {
        // Si no hay datos, inicializamos con un objeto vacío
        this.data = {};
        await this.write(this.data);
      } else {
        this.data = JSON.parse(row.json_data);
      }
      return this.data;
    } catch (error) {
      console.error('❌ Error al leer la base de datos SQLite:', error);
      this.data = {};
      return this.data;
    }
  }

  write(data) {
    return new Promise((resolve, reject) => {
      try {
        if (!data) return reject(new Error('No se proporcionaron datos para escribir.'));
        
        const stringifiedData = JSON.stringify(data);
        
        // Guardar o actualizar usando un UPSERT de SQLite
        const statement = this.db.prepare(`
          INSERT INTO bot_data (id, json_data) 
          VALUES (?, ?)
          ON CONFLICT(id) DO UPDATE SET json_data = excluded.json_data
        `);
        
        statement.run('main_database', stringifiedData);
        resolve(true);
      } catch (error) {
        console.error('❌ Error al escribir en la base de datos SQLite:', error);
        reject(error);
      }
    });
  }
}

// Clonamos la clase en mongoDBV2 por si tu código llega a instanciar esa variante
export const mongoDBV2 = mongoDB;

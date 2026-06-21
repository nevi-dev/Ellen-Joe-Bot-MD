import { workerData } from 'worker_threads'
import { coreLog } from './connection-utils.js'

coreLog('Worker', `Hilo preparado para ${workerData.sessions.length} sesión(es): ${workerData.sessions.join(', ')}`, 'ok')
// La conexión real se mantiene en el proceso principal por compatibilidad con plugins;
// este worker deja lista la unidad de aislamiento para migración incremental.

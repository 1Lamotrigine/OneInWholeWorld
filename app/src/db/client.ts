import { PGliteWorker } from '@electric-sql/pglite/worker';
import { SaveRepository } from './save-repository';

let connection: Promise<SaveRepository> | undefined;

export function repository() {
  if (typeof window === 'undefined') throw new Error('Хранилище доступно только в браузере.');
  connection ??= connect().catch(error => {
    connection = undefined;
    throw error;
  });
  return connection;
}

async function connect() {
  if (!globalThis.indexedDB || !navigator.locks) throw new Error('Локальное хранилище недоступно в этом браузере.');
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const db = await Promise.race([
      PGliteWorker.create(worker, { id: 'elarion-life-v1', dataDir: 'idb://fantasy-life' }),
      new Promise<never>((_, reject) => {
        const fail = () => reject(new Error('Не удалось открыть хранилище IndexedDB.'));
        timer = setTimeout(fail, 12000);
        worker.addEventListener('error', fail, { once: true });
      }),
    ]);
    return new SaveRepository(db);
  } catch (error) {
    worker.terminate();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

import { PGlite } from '@electric-sql/pglite';
import { worker } from '@electric-sql/pglite/worker';
import { migrate } from './migrations';

void worker({
  async init() {
    const db = await PGlite.create('idb://fantasy-life');
    try {
      await migrate(db);
      return db;
    } catch (error) {
      await db.close();
      throw error;
    }
  },
});

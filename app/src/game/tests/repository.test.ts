import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';
import { migrate } from '../../db/migrations';
import { SaveConflict, SaveRepository } from '../../db/save-repository';
import { createGame } from '../engine/create-game';
import { simulateYear } from '../engine/simulate-year';

it('мигрирует, атомарно сохраняет, восстанавливает RNG и удаляет историю вместе с жизнью', async () => {
  const pg = await PGlite.create();
  try {
    await migrate(pg);
    await migrate(pg);
    const repo = new SaveRepository(pg);
    const initial = createGame('sample', 'life');
    await repo.save(initial, null, 'commit-0');
    await pg.query(`UPDATE saves SET schema_version=1, content_version='1.0.0',
      state=(state - 'path' - 'lastMove' - 'lastAct') || jsonb_build_object(
        'schemaVersion', 1, 'contentVersion', '1.0.0', 'world', (state->'world') - 'news' - 'terms' - 'fronts')
      WHERE id=$1`, [initial.saveId]);
    expect(await repo.load()).toEqual(initial);
    const evolved = simulateYear({ ...initial, revealed: true });
    await repo.save(evolved, initial.revision, 'commit-1');
    await repo.save(evolved, initial.revision, 'commit-1');
    expect(await repo.load('life')).toEqual(evolved);
    await expect(repo.save({ ...evolved, revision: evolved.revision + 1 }, initial.revision, 'other')).rejects.toThrow(SaveConflict);
    await expect(repo.save({ ...evolved, revision: evolved.revision + 1, chronicle: [] }, evolved.revision, 'failed')).rejects.toThrow(SaveConflict);
    expect(await repo.load('life')).toEqual(evolved);
    expect(await repo.list()).toMatchObject([{ id: 'life', age: 1, ended: false }]);
    await repo.remove('life');
    expect(await repo.load()).toBeNull();
    expect((await pg.query('SELECT * FROM life_events')).rows).toEqual([]);
  } finally {
    await pg.close();
  }
}, 15000);

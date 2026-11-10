import type { PGliteInterface } from '@electric-sql/pglite';
import type { GameState } from '../game/types';
import { stateSchema } from './save-format';

export type SaveInfo = {
  id: string; title: string; race: GameState['character']['race']; age: number; ended: boolean; updated: string;
};
export class SaveConflict extends Error {
  constructor() { super('Эта жизнь изменилась в другой вкладке. Экспортируйте текущий прогресс, чтобы сохранить отдельную копию.'); }
}

export class SaveRepository {
  constructor(private readonly db: PGliteInterface) {}

  async save(state: GameState, expectedRevision: number | null, commitId: string) {
    const { chronicle, ...snapshot } = state;
    await this.db.transaction(async tx => {
      const existing = (await tx.query<{ revision: number; commit_id: string }>('SELECT revision, commit_id FROM saves WHERE id = $1 FOR UPDATE', [state.saveId])).rows[0];
      if (existing?.commit_id === commitId) return;
      if ((existing?.revision ?? null) !== expectedRevision) throw new SaveConflict();
      if (existing && state.revision <= existing.revision) throw new SaveConflict();
      await tx.query(`INSERT INTO saves(id,title,schema_version,content_version,seed,revision,commit_id,state)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
        ON CONFLICT(id) DO UPDATE SET title=excluded.title, schema_version=excluded.schema_version, content_version=excluded.content_version, revision=excluded.revision, commit_id=excluded.commit_id, state=excluded.state, updated_at=NOW()`,
      [state.saveId, state.character.name, state.schemaVersion, state.contentVersion, state.seed, state.revision, commitId, JSON.stringify(snapshot)]);
      const count = (await tx.query<{ count: number }>('SELECT count(*)::integer AS count FROM life_events WHERE save_id=$1', [state.saveId])).rows[0].count;
      if (count > chronicle.length) throw new SaveConflict();
      const appended = chronicle.slice(count);
      if (appended.length) await tx.query(`INSERT INTO life_events(save_id,sequence,game_year,event_type,description,data)
        SELECT $1, $2::integer + (ordinality::integer - 1), (entry->>'year')::integer, entry->>'category', entry->>'text', entry
        FROM jsonb_array_elements($3::jsonb) WITH ORDINALITY AS entries(entry, ordinality)`,
      [state.saveId, count, JSON.stringify(appended)]);
    });
  }

  async load(id?: string): Promise<GameState | null> {
    return this.db.transaction(async tx => {
      const result = await tx.query<{ id: string; state: object; revision: number }>(
        id ? 'SELECT id,state,revision FROM saves WHERE id=$1'
          : "SELECT id,state,revision FROM saves ORDER BY (state->>'ended' IS NULL) DESC, updated_at DESC, id LIMIT 1", id ? [id] : [],
      );
      const row = result.rows[0];
      if (!row) return null;
      const events = await tx.query<{ sequence: number; data: unknown }>('SELECT sequence,data FROM life_events WHERE save_id=$1 ORDER BY sequence', [row.id]);
      const parsed = stateSchema.safeParse({ ...row.state, chronicle: events.rows.map(item => item.data) });
      if (!parsed.success || parsed.data.saveId !== row.id || parsed.data.revision !== row.revision
        || events.rows.some((item, i) => item.sequence !== i)) throw new Error('Это сохранение повреждено. Другие жизни доступны в архиве.');
      return parsed.data;
    });
  }

  async list(): Promise<SaveInfo[]> {
    const { rows } = await this.db.query<SaveInfo>(`SELECT id,title,state->'character'->>'race' AS race,
      CASE WHEN state->'character'->>'age' ~ '^[0-9]{1,3}$' THEN (state->'character'->>'age')::integer ELSE 0 END AS age,
      (state->>'ended' IS NOT NULL) AS ended, updated_at::text AS updated FROM saves ORDER BY updated_at DESC,id`);
    return rows;
  }

  async remove(id: string) { await this.db.query('DELETE FROM saves WHERE id=$1', [id]); }
}

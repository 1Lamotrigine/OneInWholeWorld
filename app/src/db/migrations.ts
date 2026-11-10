import type { PGliteInterface } from '@electric-sql/pglite';

const migrations = [
  `CREATE TABLE saves (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, schema_version INTEGER NOT NULL,
    content_version TEXT NOT NULL, seed TEXT NOT NULL, revision INTEGER NOT NULL, commit_id TEXT NOT NULL,
    state JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE life_events (
    save_id TEXT NOT NULL REFERENCES saves(id) ON DELETE CASCADE, sequence INTEGER NOT NULL,
    game_year INTEGER NOT NULL, event_type TEXT NOT NULL, description TEXT NOT NULL, data JSONB NOT NULL,
    PRIMARY KEY(save_id, sequence)
  );
  CREATE INDEX saves_updated ON saves(updated_at DESC);`,
];

export async function migrate(db: PGliteInterface) {
  await db.transaction(async tx => {
    await tx.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    const applied = await tx.query<{ version: number }>('SELECT version FROM schema_migrations ORDER BY version');
    if (applied.rows.some((row, index) => row.version !== index + 1 || row.version > migrations.length)) {
      throw new Error('Схема хранилища несовместима с этой версией игры.');
    }
    for (let index = applied.rows.length; index < migrations.length; index++) {
      await tx.exec(migrations[index]);
      await tx.query('INSERT INTO schema_migrations(version) VALUES ($1)', [index + 1]);
    }
  });
}

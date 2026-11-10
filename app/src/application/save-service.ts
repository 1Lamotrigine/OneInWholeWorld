import { z } from 'zod';
import { stateSchema } from '../db/save-format';
import type { GameState } from '../game/types';

const journalKey = 'elarion-pending-save-v1';
const activeKey = 'elarion-active-life-v1';
const journalSchema = z.object({
  state: stateSchema, expectedRevision: z.number().int().nonnegative().nullable(), commitId: z.uuid(),
});
export type PendingSave = z.infer<typeof journalSchema>;

export function activeLife() {
  try { return sessionStorage.getItem(activeKey) ?? localStorage.getItem(activeKey); }
  catch { return null; }
}

export function rememberLife(id: string | null) {
  try {
    if (id) {
      sessionStorage.setItem(activeKey, id);
      localStorage.setItem(activeKey, id);
    } else {
      sessionStorage.removeItem(activeKey);
      localStorage.removeItem(activeKey);
    }
  } catch { /* The archive can still choose the last updated life. */ }
}

export async function openRepository() {
  return (await import('../db/client')).repository();
}

export function stageSave(state: GameState, expectedRevision: number | null): PendingSave {
  const journal = { state, expectedRevision, commitId: crypto.randomUUID() };
  try { sessionStorage.setItem(journalKey, JSON.stringify(journal)); } catch { /* IndexedDB remains authoritative. */ }
  return journal;
}

export function readJournal(): PendingSave | undefined {
  try {
    const raw = sessionStorage.getItem(journalKey);
    if (!raw) return;
    const result = journalSchema.safeParse(JSON.parse(raw));
    if (result.success) return result.data;
    sessionStorage.removeItem(journalKey);
  } catch { /* Storage can be unavailable. */ }
}

export function clearJournal(commitId: string) {
  try {
    const raw = sessionStorage.getItem(journalKey);
    if (raw && (JSON.parse(raw) as { commitId?: string }).commitId === commitId) sessionStorage.removeItem(journalKey);
  } catch { /* Storage can be unavailable. */ }
}

export function downloadFile(filename: string, file: Blob) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportLife(state: GameState) {
  const { serializeSave } = await import('../db/save-format');
  downloadFile(`elarion-${state.saveId}.json`, new Blob([serializeSave(state)], { type: 'application/json' }));
}

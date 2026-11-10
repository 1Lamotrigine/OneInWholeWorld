import type { PathId } from '../game/content/atlas';
import type { RegionId } from '../game/content/world';
import { actOnWorld, moveTo, takePath, type ActionId } from '../game/engine/influence';
import { create } from 'zustand';
import { createGame } from '../game/engine/create-game';
import { applyChoice } from '../game/engine/events';
import { advanceToDecision, simulateYear, type Speed } from '../game/engine/simulate-year';
import type { Priority } from '../game/content/world';
import type { GameState } from '../game/types';
import { activeLife, clearJournal, openRepository, readJournal, rememberLife, stageSave, type PendingSave } from '../application/save-service';

type Session = {
  state: GameState | null;
  loading: boolean;
  saving: boolean;
  exportMode: boolean;
  error: string | null;
  paused: boolean;
  speed: Speed;
  reducedMotion: boolean;
  initialize(): Promise<void>;
  load(id: string): Promise<boolean>;
  newLife(): void;
  reveal(): void;
  takePath(path: PathId): void;
  moveTo(region: RegionId, settlement: string): void;
  actOnWorld(id: ActionId, target?: RegionId): void;
  tick(): void;
  choose(token: string, id: string): void;
  setPriority(priority: Priority): void;
  setAutomatic(): void;
  togglePause(): void;
  setSpeed(speed: Speed): void;
  skip(): void;
  retry(): void;
  enableExportMode(): void;
  toggleMotion(): void;
  forget(id: string): void;
};
let initialization: Promise<void> | undefined;
let persistedRevision: number | null = null;
let pendingSave: PendingSave | undefined;
const message = (error: unknown) => error instanceof Error && error.name !== 'Error' && error.message.length > 180
  ? 'Проверьте доступ к хранилищу браузера и свободное место.' : error instanceof Error ? error.message : 'Локальное хранилище недоступно.';

export const useGame = create<Session>((set, get) => {
  async function flush(journal: PendingSave) {
    pendingSave = journal;
    set({ saving: true });
    try {
      const db = await openRepository();
      await db.save(journal.state, journal.expectedRevision, journal.commitId);
      persistedRevision = journal.state.revision;
      clearJournal(journal.commitId);
      pendingSave = undefined;
      set({ error: null, exportMode: false });
    } catch (error) {
      set({ error: message(error), paused: true });
    } finally {
      set({ saving: false });
    }
  }

  function change(run: (s: GameState) => GameState, paused?: boolean) {
    const session = get();
    if (!session.state || session.saving || session.loading) return;
    const next = run(session.state);
    if (next === session.state) return;
    set({ state: next, paused: paused ?? (session.paused || !!next.ended || !!next.pending && !next.automatic) });
    const journal = stageSave(next, persistedRevision);
    if (session.exportMode) pendingSave = journal;
    else void flush(journal);
  }

  return {
    state: null, loading: true, exportMode: false, saving: false, error: null, paused: true, speed: 1, reducedMotion: false,
    initialize() {
      initialization ??= (async () => {
        const journal = readJournal();
        if (journal) {
          persistedRevision = journal.expectedRevision;
          set({ state: journal.state });
        }
        try {
          try { set({ reducedMotion: localStorage.getItem('elarion-motion') === 'off' }); } catch { /* Optional preference. */ }
          if (journal) await flush(journal);
          else {
            const db = await openRepository();
            const id = activeLife();
            const state = (id ? await db.load(id) : null) ?? await db.load();
            persistedRevision = state?.revision ?? null;
            rememberLife(state?.saveId ?? null);
            set({ state, error: null, exportMode: false });
          }
        } catch (error) {
          set({ error: message(error) });
        } finally {
          set({ loading: false });
        }
      })();
      return initialization;
    },
    async load(id) {
      if (get().saving || get().loading) return false;
      set({ loading: true, paused: true });
      try {
        const state = await (await openRepository()).load(id);
        if (!state) throw new Error('Эта жизнь удалена из архива.');
        if (pendingSave) clearJournal(pendingSave.commitId);
        pendingSave = undefined;
        persistedRevision = state.revision;
        rememberLife(state.saveId);
        set({ state, error: null, exportMode: false });
        return true;
      } catch (error) {
        set({ error: message(error) });
        return false;
      } finally {
        set({ loading: false });
      }
    },
    newLife() {
      if (get().saving || get().loading || pendingSave && get().state) return;
      const state = createGame(crypto.randomUUID(), crypto.randomUUID());
      persistedRevision = null;
      rememberLife(state.saveId);
      set({ state, paused: true, speed: 1, exportMode: false });
      void flush(stageSave(state, null));
    },
    takePath: path => change(s => takePath(s, path)),
    moveTo: (region, settlement) => change(s => moveTo(s, region, settlement), true),
    actOnWorld: (id, target) => change(s => actOnWorld(s, id, target), true),
    reveal: () => change(s => s.revealed || !s.path ? s : { ...s, revealed: true, revision: s.revision + 1 }, false),
    tick: () => { if (!get().paused) change(simulateYear); },
    choose: (token, id) => change(s => applyChoice(s, token, id)),
    setPriority: priority => change(s => s.ended || s.priority === priority ? s : { ...s, priority, revision: s.revision + 1 }),
    setAutomatic: () => change(s => s.ended ? s : { ...s, automatic: !s.automatic, revision: s.revision + 1 }),
    togglePause() {
      const { state, paused, loading } = get();
      if (!state?.revealed || state.ended || state.pending && !state.automatic || loading) return;
      set({ paused: !paused });
    },
    setSpeed: speed => set({ speed }),
    skip: () => change(advanceToDecision, true),
    retry() {
      if (get().saving || get().loading) return;
      if (pendingSave) void flush(pendingSave);
      else {
        initialization = undefined;
        set({ loading: true });
        void get().initialize();
      }
    },
    enableExportMode() { set({ exportMode: true }); },
    toggleMotion() {
      const reducedMotion = !get().reducedMotion;
      set({ reducedMotion });
      try { localStorage.setItem('elarion-motion', reducedMotion ? 'off' : 'on'); } catch { /* Optional preference. */ }
    },
    forget(id) {
      if (get().state?.saveId !== id) return;
      if (pendingSave) clearJournal(pendingSave.commitId);
      pendingSave = undefined;
      persistedRevision = null;
      rememberLife(null);
      set({ state: null, paused: true, exportMode: false });
    },
  };
});

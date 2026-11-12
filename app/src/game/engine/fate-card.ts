import { translateText, type Language } from '../../i18n/translate';
import { enFateHook, genericFateHook, ruFateHook } from '../content/fate-phrases';
import type { ChronicleEntry, GameState } from '../types';

export { fateEpitaph } from '../content/epitaphs';

/** The one-line hook: where the life started and where it ended. */
export function fateHook(state: GameState, language: Language): string {
  const c = state.character;
  if (language === 'ru') return ruFateHook(c);
  if (language === 'en') return enFateHook(c);
  return genericFateHook(c, language);
}

/** Three turning points spread across the life, preferring true milestones. */
export function turningPoints(state: GameState): ChronicleEntry[] {
  const candidates = state.chronicle.filter(row => !['birth', 'stage', 'death'].includes(row.category));
  const milestones = candidates.filter(row => row.milestone);
  const pool = milestones.length >= 3 ? milestones : candidates;
  if (pool.length <= 3) return pool;
  const indices = new Set<number>();
  const last = pool.length - 1;
  indices.add(Math.round(last * .15));
  indices.add(Math.round(last * .5));
  indices.add(Math.round(last * .85));
  for (let step = 0; indices.size < 3 && step < pool.length; step++) indices.add(step);
  return [...indices].sort((a, b) => a - b).map(index => pool[index]);
}

/** Exact birth rarity: the product of the three rolled probabilities. */
export function birthRarity(state: GameState): { probability: number; oneIn: number } {
  const probability = state.birthOdds.race * state.birthOdds.region * state.birthOdds.background;
  return { probability, oneIn: probability > 0 ? Math.max(2, Math.round(1 / probability)) : 1 };
}

export function formatRarity(rarity: { oneIn: number }, language: Language): string {
  const oneIn = new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(rarity.oneIn);
  return `${translateText('Редкость рождения', language)}: 1 ${translateText('из', language)} ${oneIn}`;
}

/** Short human-readable seed printed on the card. */
export function seedCode(seed: string): string {
  const clean = seed.replace(/[^a-z0-9]/gi, '').toUpperCase();
  const first = clean.slice(0, 4);
  const second = clean.slice(4, 8);
  return second ? `${first}-${second}` : first;
}

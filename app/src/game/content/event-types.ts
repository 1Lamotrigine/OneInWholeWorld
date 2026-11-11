import type { PathId } from './atlas';
import type { Priority, Stats, StatusId } from './world';
import type { Category, GameState, Relationship, Tone } from '../types';
import type { RandomSource } from '../engine/random';

export type Effect = {
  stats?: Partial<Stats>; wealth?: number; education?: number; reputation?: number; mastery?: number;
  bond?: number; condition?: GameState['character']['condition']; risk?: number; status?: StatusId;
};
export type Consequence = (state: GameState, rng: RandomSource) => string | void;
export type Choice = {
  id: string; label: string; hint: string; result: string; priorities: Priority[];
  cost?: number; when?: (state: GameState) => boolean; effect?: Effect; apply?: Consequence;
  gamble?: { chance: (state: GameState) => number; failure: string; effect: Effect };
  later?: { eventId: string; years: number };
  uncertain?: { good: { text: string; effect: Effect; apply?: Consequence; later?: Choice['later'] }; bad: { text: string; effect: Effect; apply?: Consequence; later?: Choice['later'] } };
};
export type EventDefinition = {
  id: string; fantasy?: boolean; worldCrisis?: GameState['world']['regions'][keyof GameState['world']['regions']]['crisis']; minAge?: number; path?: PathId; category: Category; title: string; text: string; weight: number;
  stages: readonly number[]; when?: (state: GameState) => boolean; cooldown?: number;
  tone?: Tone; milestone?: boolean; effect?: Effect; apply?: Consequence; choices?: Choice[];
};
export const infant = [0, 1];
export const child = [1, 2];
export const young = [2, 3];
export const adult = [3];
export const grown = [3, 4];
export const old = [4];
export const all = [0, 1, 2, 3, 4];
export const independent = [2, 3, 4];

export function moment(
  id: string, category: Category, stages: readonly number[], title: string, text: string,
  effect: Effect, options: Partial<Pick<EventDefinition, 'when' | 'weight' | 'cooldown' | 'tone' | 'milestone' | 'apply'>> = {},
): EventDefinition {
  return { id, category, stages, title, text, effect, weight: 4, ...options };
}

export function decision(
  id: string, category: Category, stages: readonly number[], title: string, text: string,
  choices: Choice[], options: Partial<Pick<EventDefinition, 'when' | 'weight' | 'cooldown' | 'path' | 'minAge'>> = {},
): EventDefinition {
  return { id, category, stages, title, text, choices, weight: 7, milestone: true, ...options };
}

export function option(id: string, label: string, hint: string, result: string, priorities: Priority[], effect: Effect, extra: Partial<Choice> = {}): Choice {
  return { id, label, hint, result, priorities, effect, ...extra };
}

export function bondWith(c: GameState['character'], role: Relationship['role'], amount: number) {
  const person = c.relationships.find(person => person.role === role && person.died === null);
  if (person) person.bond = Math.max(0, Math.min(100, person.bond + amount));
  return person;
}

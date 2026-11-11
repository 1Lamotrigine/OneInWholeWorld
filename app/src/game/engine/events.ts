import { newEraEvents } from '../content/new-era-events';
import { extendedEvents } from '../content/turning-points';
import { paths } from '../content/atlas';
import { decisions } from '../content/decisions';
import { moments } from '../content/moments';
import { traits, type Priority } from '../content/world';
import type { Choice, Effect, EventDefinition } from '../content/event-types';
import type { GameState } from '../types';
import { randomFrom, weighted, type RandomSource } from './random';
import { changeStats, clamp, lifeScale, phase, record } from './rules';
import { checkMortality } from './mortality';

export const events: readonly EventDefinition[] = [...decisions, ...moments, ...extendedEvents, ...newEraEvents];
export const eventById = new Map(events.map(event => [event.id, event]));

export function availableChoices(s: GameState, event: EventDefinition) {
  return (event.choices ?? []).filter(choice => (choice.cost ?? 0) <= s.character.wealth && (choice.when?.(s) ?? true));
}

export function eligible(s: GameState, event: EventDefinition) {
  const last = Object.hasOwn(s.seen, event.id) ? s.seen[event.id] : undefined;
  return event.weight > 0 && event.stages.includes(phase(s.character))
    && (last === undefined || (event.cooldown !== undefined && s.world.year - last >= Math.ceil(event.cooldown * lifeScale(s.character))))
    && (event.when?.(s) ?? true) && (!event.choices || availableChoices(s, event).length >= 2);
}

function effect(s: GameState, result: Effect = {}) {
  const c = s.character;
  if (result.stats) changeStats(c, result.stats);
  c.wealth = clamp(c.wealth + (result.wealth ?? 0), 0, 99999);
  c.education = clamp(c.education + (result.education ?? 0));
  c.reputation = clamp(c.reputation + (result.reputation ?? 0));
  c.mastery = clamp(c.mastery + (result.mastery ?? 0));
  c.lifeRisk = clamp(c.lifeRisk + (result.risk ?? 0), 0, .8);
  if (result.status) c.status = result.status;
  if (result.condition !== undefined) {
    c.condition = result.condition;
    c.conditionYears = 0;
  }
  if (result.bond) for (const person of c.relationships) {
    if (person.died === null) person.bond = clamp(person.bond + result.bond);
  }
}

function applyMoment(s: GameState, event: EventDefinition, rng: RandomSource) {
  effect(s, event.effect);
  const detail = event.apply?.(s, rng);
  record(s, event.id, event.category, event.title, detail ? `${event.text} ${detail}` : event.text, event.tone, event.milestone);
}

export function playEvents(s: GameState, rng: RandomSource) {
  const future: GameState['scheduled'] = [];
  for (const item of s.scheduled) {
    const event = eventById.get(item.eventId);
    if (item.year > s.world.year || s.pending) {
      future.push({ ...item, year: Math.max(item.year, s.world.year + 1) });
      continue;
    }
    if (!event) continue;
    if (!event.choices) applyMoment(s, event, rng);
    else if (availableChoices(s, event).length >= 2) openDecision(s, event, rng);
  }
  s.scheduled = future;
  if (s.pending) return;

  const c = s.character;
  const relativeAge = c.age / lifeScale(c);
  const opening = c.age <= 2;
  if (!opening && rng.next() >= (phase(c) === 1 ? .89 : .78) / lifeScale(c)) return;
  const options = events.filter(event => eligible(s, event));
  const recentCategories = s.chronicle.filter(row => !['stage', 'world', 'birth'].includes(row.category)).slice(-4).map(row => row.category);
  if (!options.length) return;
  const traitCategory: Partial<Record<keyof typeof traits, EventDefinition['category']>> = {
    curious: 'education', kind: 'family', ambitious: 'work', sociable: 'relations', restless: 'travel',
  };
  const focusCategories: Record<Priority, EventDefinition['category'][]> = {
    survival: ['health'], wellbeing: ['family', 'relations'], wealth: ['economy', 'work'],
    knowledge: ['education', 'magic'], influence: ['politics', 'society'], adventure: ['travel', 'war'],
  };
  const { item: event } = weighted(options, event => {
    const stageBoost = event.id === 'first-work' ? 2.4 : event.id === 'school' && relativeAge < 10 ? .7 : 1;
    const focusBoost = focusCategories[s.priority].includes(event.category) ? 1.22 : 1;
    const pathBoost = s.path && paths[s.path].categories.includes(event.category) ? 1.38 : 1;
    const decisionBoost = event.choices ? 1.35 : 1;
    const recentPenalty = recentCategories.at(-1) === event.category ? .2 : recentCategories.includes(event.category) ? .55 : 1;
    const repeats = s.chronicle.filter(row => row.eventId === event.id).length;
    return event.weight * recentPenalty / (1 + repeats * 2) * stageBoost * focusBoost * pathBoost * decisionBoost * (c.traits.some(trait => traitCategory[trait] === event.category) ? 1.45 : 1);
  }, rng);
  if (event.choices) openDecision(s, event, rng);
  else {
    s.seen[event.id] = s.world.year;
    applyMoment(s, event, rng);
  }
}

function openDecision(s: GameState, event: EventDefinition, rng: RandomSource) {
  s.seen[event.id] = s.world.year;
  let choices = availableChoices(s, event);
  if (choices.length > 4) {
    // The final option is the guaranteed fallback. Sample up to three distinct local offers.
    const fallback = choices[choices.length - 1];
    const pool = choices.slice(0, -1);
    const offers: Choice[] = [];
    while (offers.length < 3) {
      const { item } = weighted(pool, option => option.priorities.includes(s.priority) ? 1.7 : 1, rng);
      offers.push(item);
      pool.splice(pool.indexOf(item), 1);
    }
    choices = [...offers, fallback];
  }
  s.pending = { eventId: event.id, token: `${s.world.year}-${event.id}`, optionIds: choices.map(choice => choice.id) };
}

function resolve(s: GameState, option: Choice, rng: RandomSource) {
  const event = eventById.get(s.pending!.eventId)!;
  const c = s.character;
  const status = c.status;
  c.wealth -= option.cost ?? 0;
  const success = !option.gamble || rng.next() < clamp(option.gamble.chance(s), .08, .95);
  if (!success && option.gamble) {
    effect(s, option.gamble.effect);
    record(s, event.id, event.category, event.title, `${option.label}. ${option.gamble.failure}`, 'loss', true);
  } else {
    effect(s, option.effect);
    const detail = option.apply?.(s, rng);
    if (option.later) s.scheduled.push({ year: s.world.year + option.later.years, eventId: option.later.eventId });
    record(s, event.id, event.category, event.title, [option.label + '.', option.result, detail].filter(Boolean).join(' '), 'good', true);
  }
  s.pending = null;
  if (status !== c.status) record(s, 'choice-status', 'society', 'Изменение положения', `Решение изменило место ${c.name} в общине.`, 'neutral', true);
}

export function resolveAutomatically(s: GameState, rng: RandomSource) {
  if (!s.pending || s.ended) return;
  const event = eventById.get(s.pending.eventId);
  if (!event) return;
  const choices = availableChoices(s, event).filter(choice => s.pending?.optionIds.includes(choice.id));
  if (!choices.length) return;
  const { item } = weighted(choices, choice => 1 + (choice.priorities.includes(s.priority) ? 10 : 0)
    + s.character.traits.filter(trait => choice.priorities.includes(traits[trait][2])).length * 2, rng);
  resolve(s, item, rng);
}

export function applyChoice(current: GameState, token: string, id: string): GameState {
  if (current.ended || current.pending?.token !== token || !current.pending.optionIds.includes(id)) return current;
  const event = eventById.get(current.pending.eventId);
  const option = event && availableChoices(current, event).find(choice => choice.id === id);
  if (!option) return current;
  const s = structuredClone(current);
  const rng = randomFrom(s.rngState);
  resolve(s, option, rng);
  checkMortality(s, rng);
  s.rngState = rng.state;
  s.revision++;
  return s;
}

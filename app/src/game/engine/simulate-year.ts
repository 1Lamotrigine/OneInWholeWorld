import { developPath } from './path-development';
import { backgrounds, races, type StatusId } from '../content/world';
import { profession, professions } from '../content/professions';
import type { GameState } from '../types';
import { playEvents, resolveAutomatically } from './events';
import { checkMortality } from './mortality';
import { randomFrom, type RandomSource } from './random';
import { changeStats, clamp, isAdult, lifeScale, lifeStage, phase, record, regionState } from './rules';
import { evolveWorld } from './world';

function needs(s: GameState) {
  const c = s.character;
  const r = regionState(s);
  const scale = lifeScale(c);
  const ageRatio = c.age / c.longevity;
  const work = c.profession ? profession(c.profession) : null;
  const expense = isAdult(c) ? 3 + (r.food < 45 ? 1 : 0) : 0;
  const support = isAdult(c) && c.relationships.some(p => p.role === 'Партнёр' && p.died === null) ? 1 : 0;
  const income = work ? work.income * (.62 + r.economy / 160) : c.retired ? 2.6 : isAdult(c) ? 2.2 : 0;
  c.wealth = clamp(c.wealth + (income + support - expense) / scale, 0, 99999);

  const wear = Math.max(0, ageRatio - .62) * 4 / scale;
  const scarcity = r.food < 46 && c.wealth < 12 ? (46 - r.food) / 20 : 0;
  const condition = c.condition ? (c.condition === 'chronic' ? .8 : 2.3) : 0;
  const risk = (work?.risk ?? 0) * .33;
  const recovery = (82 - c.stats.health) * (c.condition ? .006 : .045) / scale;
  const resilience = c.traits.includes('sturdy') ? .78 : 1;
  const company = c.relationships.some(person => person.died === null && person.bond >= 67) ? .25 : 0;
  const focus = s.priority;
  const efforts = {
    health: recovery - (wear + scarcity + risk + condition) * resilience + (focus === 'survival' ? .32 / scale : 0),
    happiness: (65 - c.stats.happiness) * .044 / scale + company / scale - scarcity * .7 - (r.conflict > 55 ? .35 : 0) + (focus === 'wellbeing' ? .35 / scale : 0),
    strength: (phase(c) <= 2 ? .42 / scale : work && work.risk > .5 && phase(c) === 3 ? .15 / scale : -wear * .72),
    intellect: phase(c) <= 2 ? .36 / scale : (focus === 'knowledge' ? .22 : -.035) / scale,
    charisma: (company + (focus === 'influence' ? .24 : 0)) / scale,
  };
  changeStats(c, efforts);
  if (phase(c) === 1 || phase(c) === 2) {
    c.education = clamp(c.education + (r.education / 170 + backgrounds[c.background].education / 35) / scale);
  }
  if (focus === 'knowledge' && phase(c) >= 2) c.education = clamp(c.education + .25 / scale);
  if (focus === 'wealth' && work) c.wealth = clamp(c.wealth + .55 / scale, 0, 99999);
  if (focus === 'influence' && isAdult(c)) c.reputation = clamp(c.reputation + .24 / scale);
  if (c.profession === 'mage' || c.profession === 'mentor') c.mastery = clamp(c.mastery + .46 / scale);
  if (work) c.reputation = clamp(c.reputation + work.prestige * .11 / scale);
}

function familyAndSociety(s: GameState, rng: RandomSource) {
  const c = s.character;
  for (const person of c.relationships) {
    if (person.died !== null) continue;
    const age = s.world.year - person.born;
    const limit = races[person.race].lifespan[1];
    if (age >= limit || age > limit * .63 && rng.next() < .048 / lifeScale(c)) {
      person.died = s.world.year;
      changeStats(c, { happiness: -(4 + person.bond / 9) });
      record(s, 'bereavement', 'family', 'Утрата близкого', `${person.name} · ${person.role.toLowerCase()}. Дома вспоминают прожитые вместе годы.`, 'loss', true);
    }
  }

  if (!isAdult(c)) return;
  let next: StatusId = c.status;
  const job = c.profession ? profession(c.profession) : null;
  if (job?.rank && c.age - c.employedSince >= Math.ceil(4 * lifeScale(c)) && c.reputation >= (job.rank === 'noble' ? 66 : 25)
    && !['noble', 'ruler'].includes(c.status) && (job.rank !== 'merchant' || c.wealth >= 42)) next = job.rank;
  if (c.wealth >= 14 && (c.status === 'orphan' || c.status === 'poor') && c.profession) next = 'worker';
  if (c.wealth < 5 && c.status === 'merchant' && c.reputation < 30) next = 'poor';
  if (next !== c.status) {
    c.status = next;
    record(s, 'status', 'society', 'Новое положение', `Текущий статус — ${backgrounds[next].status.toLowerCase()}.`, next === 'poor' ? 'loss' : 'good', true);
  }
  if (c.profession && c.stats.health < 25 && job && job.risk > .8) {
    record(s, 'work-loss', 'work', 'Уход с работы', `${professions[c.profession].name} — слишком тяжёлая работа при нынешнем здоровье.`, 'loss', true);
    c.profession = null;
  }
}

function healthChanges(s: GameState, rng: RandomSource) {
  const c = s.character;
  if (c.condition) {
    c.conditionYears++;
    if (c.condition !== 'chronic' && c.conditionYears >= 2) {
      c.condition = null;
      c.conditionYears = 0;
      record(s, 'recovery', 'health', 'Восстановление', 'Силы постепенно возвращаются, и привычные дела снова по плечу.', 'good');
    }
    return;
  }
  const r = regionState(s);
  if (r.crisis === 'plague' && rng.next() < (110 - c.stats.health) / 450) {
    c.condition = 'fever';
    changeStats(c, { health: -11 });
    record(s, 'plague-fever', 'health', 'Горячка', 'Мор дошёл до дома. На несколько дней пришлось оставить привычные дела.', 'loss');
  }
}

export function simulateYear(current: GameState): GameState {
  if (current.ended || !current.revealed || current.pending && !current.automatic) return current;
  const s = structuredClone(current);
  const rng = randomFrom(s.rngState);

  // A choice that was already shown is resolved in its own year.
  if (s.pending) {
    resolveAutomatically(s, rng);
  } else {
    const c = s.character;
    const previous = phase(c);
    s.world.year++;
    c.age++;
    if (phase(c) !== previous) {
      record(s, 'stage-' + phase(c), 'stage', lifeStage(c), 'Начинается новый этап жизни.', 'neutral', true);
    }
    needs(s);
    developPath(s, rng);
    familyAndSociety(s, rng);
    evolveWorld(s, rng);
    healthChanges(s, rng);
    // At zero health there is no opportunity to open a new decision.
    if (c.stats.health > 0) playEvents(s, rng);
    if (s.automatic) resolveAutomatically(s, rng);
  }
  checkMortality(s, rng);
  s.rngState = rng.state;
  s.revision++;
  return s;
}

export const speeds = [1, 2, 5, 10] as const;
export type Speed = typeof speeds[number];
export const yearDuration = (s: GameState, speed: Speed) => Math.round(12500 / (races[s.character.race].lifespan[1] / 95) / speed);

export function advanceToDecision(current: GameState): GameState {
  if (current.pending || current.ended || !current.revealed) return current;
  let state = current.automatic ? { ...current, automatic: false, revision: current.revision + 1 } : current;
  while (!state.pending && !state.ended) {
    state = simulateYear(state);
  }
  return state;
}

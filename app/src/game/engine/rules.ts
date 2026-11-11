import { profession, type ProfessionId } from '../content/professions';
import { races, regions, workRegion, type RegionId, type Stats } from '../content/world';
import { stages, type Category, type Character, type GameState, type Relationship, type Tone } from '../types';
import { pick, type RandomSource } from './random';

export const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
export const phase = (c: Character) => races[c.race].stages.filter(age => c.age >= age).length;
export const lifeStage = (c: Character) => stages[phase(c)];
export const lifeScale = (c: Character) => Math.sqrt(races[c.race].lifespan[1] / 95);
export const isAdult = (c: Character) => phase(c) >= 3;
export const hasRelation = (c: Character, role: Relationship['role']) => c.relationships.some(person => person.role === role && person.died === null);
export const regionState = (s: GameState) => s.world.regions[s.character.region];

export function changeStats(c: Character, stats: Partial<Stats>) {
  for (const key of Object.keys(stats) as (keyof Stats)[]) c.stats[key] = clamp(c.stats[key] + (stats[key] ?? 0));
}

export function record(s: GameState, eventId: string, category: Category, title: string, text: string, tone: Tone = 'neutral', milestone = false) {
  s.chronicle.push({ year: s.world.year, age: s.character.age, eventId, category, title, text, tone, milestone });
}

export function addRelation(c: Character, year: number, role: Relationship['role'], age: number, rng: RandomSource) {
  const names = races[c.race].names.filter(name => !c.name.startsWith(name + ' '));
  const unusedNames = names.filter(name => !c.relationships.some(person => person.name === name && person.died === null));
  const person: Relationship = {
    id: 'person-' + c.relationships.length, name: pick(unusedNames.length ? unusedNames : names, rng),
    role, race: c.race, born: year - age, bond: role === 'Наставник' ? 64 : 72, died: null,
  };
  c.relationships.push(person);
  return person.name;
}

export function canWork(c: Character, id: ProfessionId) {
  const job = profession(id);
  return isAdult(c) && !c.retired && c.stats.health >= 28 && c.education >= (job.education ?? 0)
    && c.stats.strength >= (job.strength ?? 0) && c.stats.magic >= (job.magic ?? 0)
    && c.wealth >= (job.capital ?? 0) && (!job.regions || job.regions.includes(workRegion[c.region]))
    && (id !== 'mentor' || c.mastery >= 20)
    && (!['courtier', 'steward'].includes(id) || c.reputation >= (id === 'steward' ? 75 : 52) || c.status === 'ruler');
}

export function employ(c: Character, id: ProfessionId) {
  if (!canWork(c, id) || c.profession === id) return;
  c.profession = id;
  c.employedSince = c.age;
  if (!c.career.includes(id)) c.career.push(id);
}

export function relocate(c: Character, destination: RegionId, rng: RandomSource) {
  c.region = destination;
  c.settlement = pick(regions[destination].settlements, rng);
  if (c.profession && profession(c.profession).regions && !profession(c.profession).regions?.includes(workRegion[destination])) {
    c.profession = null;
  }
}

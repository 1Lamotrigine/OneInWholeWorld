import { backgrounds, femaleNames, raceIds, races, regionIds, regions, statLabels, statusIds, traitIds, type RegionId, type Stats } from '../content/world';
import { BIRTH_YEAR, CONTENT_VERSION, SCHEMA_VERSION, type Character, type GameState, type RegionState } from '../types';
import { hashSeed, integer, pick, randomFrom, weighted } from './random';
import { addRelation, clamp, record } from './rules';

export function createGame(seed: string, saveId: string): GameState {
  const rng = randomFrom(hashSeed(seed));
  const { item: race, probability: raceOdds } = weighted(raceIds, id => races[id].weight, rng);
  const culture = races[race];
  const { item: origin, probability: regionOdds } = weighted(regionIds, id => {
    const region = regions[id];
    return region.population[raceIds.indexOf(race)] * (0.8 + region.openness / 200);
  }, rng);
  const home = regions[origin];
  const birthplace = pick(home.settlements, rng);
  const { item: background, probability: backgroundOdds } = weighted(statusIds, id => {
    const factors = {
      orphan: 1.55 - home.safety / 100, poor: 1.65 - home.economy / 100, worker: 1,
      artisan: origin === 'karak' ? 1.65 : .95, merchant: home.economy / 58,
      scholar: home.education / 59, noble: origin === 'valoria' ? 1.5 : .75,
      ruler: origin === 'frontier' ? .3 : 1,
    };
    return backgrounds[id].weight * factors[id];
  }, rng);
  const family = backgrounds[background];
  const stats = Object.fromEntries((Object.keys(statLabels) as (keyof Stats)[]).map(key => {
    const base = { health: 81, happiness: 63, intellect: 40, strength: 38, charisma: 42, magic: 11 };
    const modifiers: Partial<Stats> = culture.stats;
    const resources = key === 'health' || key === 'happiness' ? Math.min(6, family.wealth / 5) - 3 : 0;
    return [key, Math.round(clamp(base[key] + (modifiers[key] ?? 0) + resources + integer(-16, 16, rng) + (key === 'magic' && rng.next() < .08 ? 27 : 0)))];
  })) as Stats;
  const trait = pick(traitIds, rng);
  const sex = rng.next() < .5 ? 'female' : 'male';
  const names = culture.names.filter(name => femaleNames[race].includes(name) === (sex === 'female'));
  const c: Character = {
    sex, name: pick(names, rng) + ' ' + pick(culture.houses, rng),
    race, origin, region: origin, birthplace, settlement: birthplace, background, status: background,
    age: 0, longevity: integer(culture.lifespan[0], culture.lifespan[1], rng), stats,
    traits: [trait, pick(traitIds.filter(id => id !== trait), rng)], wealth: family.wealth,
    education: 0, reputation: background === 'ruler' ? 40 : background === 'noble' ? 22 : 8,
    mastery: 0, profession: null, career: [], employedSince: 0, relationships: [],
    condition: null, conditionYears: 0, lifeRisk: 0, retired: false,
  };
  if (background !== 'orphan') {
    addRelation(c, BIRTH_YEAR, 'Родитель', culture.stages[2] + integer(4, Math.round(12 * culture.lifespan[1] / 95), rng), rng);
    if (rng.next() < .83) addRelation(c, BIRTH_YEAR, 'Родитель', culture.stages[2] + integer(2, Math.round(10 * culture.lifespan[1] / 95), rng), rng);
    if (rng.next() < .44) addRelation(c, BIRTH_YEAR, 'Сиблинг', integer(1, 5, rng), rng);
  }
  const state: GameState = {
    schemaVersion: SCHEMA_VERSION, contentVersion: CONTENT_VERSION, saveId, seed, rngState: rng.state, revision: 0, character: c,
    path: null, lastMove: 0, lastAct: 0,
    world: { year: BIRTH_YEAR, news: [], fronts: [], terms: Object.fromEntries(regionIds.map(id => [id, 0])) as Record<RegionId, number>, regions: Object.fromEntries(regionIds.map(id => {
      const { economy, safety, food, education, magic, conflict, openness } = regions[id];
      return [id, { economy, safety, food, education, magic, conflict, openness, crisis: null, until: 0 }];
    })) as Record<RegionId, RegionState> },
    birthOdds: { race: raceOdds, region: regionOdds, background: backgroundOdds },
    pending: null, priority: 'survival', automatic: false, revealed: false, ended: null, seen: {}, scheduled: [], chronicle: [],
  };
  record(state, 'birth', 'birth', 'Рождение', `${c.name} появляется на свет ${family.family}. Первый дом — ${birthplace}, ${home.name}.`, 'good', true);
  return state;
}

import { cityNotes, neighbours } from '../content/atlas';
import { regionIds, regions, type RegionId } from '../content/world';
import type { GameState } from '../types';
import { pick, weighted, type RandomSource } from './random';
import { clamp, record } from './rules';
import { publish } from './influence';

export const territoryNames = regionIds.flatMap(id => [...regions[id].settlements]);
export function controller(s: GameState, city: string): RegionId {
  return s.world.control[city];
}
export function holdings(s: GameState, country: RegionId) {
  return territoryNames.filter(name => controller(s, name) === country);
}
export function independentCountry(s: GameState, country: RegionId) {
  return holdings(s, country).length > 0;
}
export function allied(s: GameState, a: RegionId, b: RegionId) {
  return s.world.alliances.some(pact => pact.until > s.world.year && (pact.first === a && pact.second === b || pact.first === b && pact.second === a));
}

const locations = Object.fromEntries(regionIds.flatMap(id => cityNotes(id).map(city => [city.name, city])));
function power(s: GameState, country: RegionId) {
  const r = s.world.regions[country];
  const support = s.world.alliances.filter(pact => pact.until > s.world.year && (pact.first === country || pact.second === country))
    .reduce((total, pact) => total + s.world.regions[pact.first === country ? pact.second : pact.first].economy * .22, 0);
  return 15 + r.safety * .4 + r.food * .3 + r.economy * .3 + support + Math.min(8, holdings(s, country).length);
}

/** One campaign per active front/year. Territory, not race, determines sovereignty. */
export function evolveGeopolitics(s: GameState, rng: RandomSource) {
  s.world.alliances = s.world.alliances.filter(pact => pact.until > s.world.year && independentCountry(s, pact.first) && independentCountry(s, pact.second));
  if (s.world.alliances.length < 5 && rng.next() < .08) {
    const first = pick(regionIds.filter(id => independentCountry(s, id)), rng);
    const candidates = neighbours[first].filter(id => independentCountry(s, id) && !allied(s, first, id)
      && !s.world.fronts.some(front => [front.from, front.to].includes(first) && [front.from, front.to].includes(id)));
    if (candidates.length) {
      const second = pick(candidates, rng);
      s.world.alliances.push({ first, second, until: s.world.year + 12 });
      publish(s, first, 'Оборонительный союз', `${regions[first].name} и ${regions[second].name} на двенадцать лет объединяют разведку и снабжение. Союзники усиливают друг друга в военных кампаниях.`);
    }
  }
  for (const front of [...s.world.fronts]) {
    if (!independentCountry(s, front.from) || !independentCountry(s, front.to) || rng.next() > .7) continue;
    const attacker = weighted([front.from, front.to], id => power(s, id), rng).item;
    const defender = attacker === front.from ? front.to : front.from;
    const tactic = pick(['siege', 'raid', 'flank'] as const, rng);
    const r = s.world.regions[attacker];
    const other = s.world.regions[defender];
    const advantage = tactic === 'siege' ? (r.food - other.food) * .002 : tactic === 'raid' ? (r.economy - other.economy) * .002 : (r.education - other.education) * .002;
    const chance = clamp(power(s, attacker) / (power(s, attacker) + power(s, defender)) + advantage, .18, .82);
    const tacticName = { siege: 'Осада и истощение запасов', raid: 'Удар по снабжению', flank: 'Обход укреплений' }[tactic];
    if (rng.next() >= chance) {
      r.food = clamp(r.food - 5); r.economy = clamp(r.economy - 3);
      publish(s, attacker, 'Наступление остановлено', `${tacticName}. ${regions[defender].name} удерживает рубеж, наступающая сторона теряет припасы.`);
      continue;
    }
    const source = holdings(s, attacker).map(name => locations[name]);
    const candidates = holdings(s, defender);
    const city = weighted(candidates, name => 1 / (40 + Math.min(...source.map(from => Math.hypot(from.x - locations[name].x, from.y - locations[name].y)))), rng).item;
    s.world.control[city] = attacker;
    other.food = clamp(other.food - 9); other.economy = clamp(other.economy - 7);
    const text = `${tacticName}. ${city} переходит под контроль ${regions[attacker].name}. Граница на карте изменилась; прежний суверен — ${regions[defender].name}.`;
    publish(s, attacker, 'Изменение границ', text);
    publish(s, defender, 'Потеря территории', text);
    record(s, 'territory-change', 'world', 'Изменение границ', text, city === s.character.settlement ? 'loss' : 'neutral', true);
    if (!independentCountry(s, defender)) {
      const peace = s.world.fronts.filter(item => item.from === defender || item.to === defender);
      s.world.fronts = s.world.fronts.filter(item => !peace.includes(item));
      for (const item of peace) for (const id of [item.from, item.to]) {
        s.world.regions[id].crisis = null; s.world.regions[id].until = 0;
      }
      s.world.alliances = s.world.alliances.filter(pact => pact.first !== defender && pact.second !== defender);
      const end = `${regions[defender].name} теряет последнюю территорию и перестаёт существовать как независимая страна. Названия городов и исторических областей сохраняются.`;
      publish(s, defender, 'Падение государства', end);
      record(s, 'country-fall', 'world', 'Падение государства', end, 'loss', true);
    }
  }
}

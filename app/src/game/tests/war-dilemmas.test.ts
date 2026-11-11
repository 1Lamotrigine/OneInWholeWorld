import { describe, expect, it } from 'vitest';
import { deserializeSave, serializeSave, stateSchema } from '../../db/save-format';
import { raceIds, races, regions, regionIds } from '../content/world';
import { createGame } from '../engine/create-game';
import { ageAppropriate, applyChoice, eligible, eventById, events, playEvents } from '../engine/events';
import { controller, evolveGeopolitics, holdings, independentCountry } from '../engine/geopolitics';
import { cityPenalty, citySupport, developPath } from '../engine/path-development';
import { randomFrom } from '../engine/random';
import { BIRTH_YEAR, type GameState } from '../types';

function grown(seed = 'dilemma') {
  const s = createGame(seed, 'new-tests');
  s.revealed = true;
  s.character.race = 'human'; s.character.longevity = 90;
  s.character.age = 35; s.world.year = BIRTH_YEAR + 35;
  s.character.region = 'valoria'; s.character.settlement = 'Валор';
  s.character.wealth = 60; s.character.stats.health = 90;
  return s;
}
function pending(s: GameState, id: string) {
  const event = eventById.get(id)!;
  s.pending = { eventId: id, token: `${s.world.year}-${id}`, optionIds: event.choices!.map(c => c.id) };
  s.seen[id] = s.world.year;
  return s;
}
function war(s: GameState) {
  const until = s.world.year + 8;
  s.world.fronts = [{ from: 'valoria', to: 'frontier', until }];
  for (const id of ['valoria', 'frontier'] as const) { s.world.regions[id].crisis = 'war'; s.world.regions[id].until = until; }
}
const alwaysWin = () => {
  const rolls = [.9, 0, 0, 0, 0, 0]; // no new pact, campaign, attacker, siege, victory, nearest territory
  return { state: 0, next: () => rolls.shift() ?? .5 };
};

describe('Возраст, дилеммы, города и политическая карта', () => {
  it('не даёт младенцам ни обычных, ни отложенных важных решений у всех рас', () => {
    for (const race of raceIds) {
      const s = grown(); s.character.race = race; s.character.age = 2; s.world.year = BIRTH_YEAR + 2;
      for (const event of events.filter(e => e.choices)) expect(eligible(s, event)).toBe(false);
      s.scheduled = [{ year: s.world.year, eventId: 'ring-court' }];
      playEvents(s, randomFrom(4));
      expect(s.pending).toBeNull();
      expect(s.scheduled[0].year).toBe(s.world.year + 1);
      s.character.age = races[race].stages[1];
      expect(ageAppropriate(s, eventById.get('stranger-on-road')!)).toBe(true);
    }
  });

  it('скрытая личность не меняется при выборе и перезагрузке, даёт оба исхода примерно 50/50', () => {
    let honest = 0;
    for (let i = 0; i < 200; i++) {
      const s = pending(grown('beggar-' + i), 'beggar-at-gate');
      const helped = applyChoice(s, s.pending!.token, 'trust');
      const refused = applyChoice(s, s.pending!.token, 'decline');
      expect(helped.scheduled[0].eventId.endsWith('good')).toBe(refused.scheduled[0].eventId.endsWith('good'));
      expect(applyChoice(deserializeSave(serializeSave(s)), s.pending!.token, 'trust')).toEqual(helped);
      if (helped.scheduled[0].eventId.endsWith('good')) honest++;
      expect(helped.chronicle.at(-1)?.tone).toBe('neutral');
      expect(refused.chronicle.at(-1)?.tone).toBe('neutral');
      expect(helped.character.wealth).toBe(s.character.wealth - 3);
    }
    expect(honest).toBeGreaterThan(75); expect(honest).toBeLessThan(125);
  });

  it('противоположные решения совета улучшают разные показатели и имеют цену', () => {
    const s = pending(grown(), 'hospital-or-granary');
    const hospital = applyChoice(s, s.pending!.token, 'hospital');
    const grain = applyChoice(s, s.pending!.token, 'grain');
    expect(hospital.world.regions.valoria.safety).toBeGreaterThan(grain.world.regions.valoria.safety);
    expect(hospital.world.regions.valoria.food).toBeLessThan(grain.world.regions.valoria.food);
    expect(hospital.character.wealth).toBeLessThan(s.character.wealth);
    expect(grain.character.wealth).toBeLessThan(s.character.wealth);
  });

  it('город без поддержки штрафует карьеру; опасность может привести к ранению и потере работы', () => {
    const s = grown(); s.path = 'merchant'; s.character.settlement = 'Ольховый Брод';
    expect(citySupport(s)).toBeNull(); expect(cityPenalty(s)!.reputation).toBeLessThan(0);
    war(s); const before = s.character.stats.health;
    developPath(s, { state: 0, next: () => 0 });
    expect(s.character.stats.health).toBe(before - 24);
    expect(s.character.condition).toBe('injury');
    expect(s.chronicle.at(-1)?.eventId).toBe('city-career-setback');
    expect(s.pathExperience).toBeCloseTo(.35);
  });

  it('война меняет реальную территорию, сохраняет границы и может уничтожить государство', () => {
    const s = grown(); war(s);
    const before = holdings(s, 'valoria').length;
    evolveGeopolitics(s, alwaysWin());
    expect(holdings(s, 'valoria')).toHaveLength(before + 1);
    const captured = regions.frontier.settlements.find(name => controller(s, name) === 'valoria')!;
    expect(captured).toBeTruthy();
    expect(deserializeSave(serializeSave(s)).world.control[captured]).toBe('valoria');
    for (const name of regions.frontier.settlements) s.world.control[name] = 'valoria';
    s.world.control[captured] = 'frontier';
    evolveGeopolitics(s, alwaysWin());
    expect(independentCountry(s, 'frontier')).toBe(false);
    expect(s.world.fronts).toEqual([]);
    expect(s.chronicle.at(-1)?.eventId).toBe('country-fall');
    expect(stateSchema.parse(s)).toEqual(s);
  });

  it('союзы создаются воспроизводимо, действуют ограниченный срок и не объединяют врагов', () => {
    const s = grown();
    evolveGeopolitics(s, { state: 0, next: () => 0 });
    expect(s.world.alliances).toHaveLength(1);
    const pact = s.world.alliances[0]; expect(pact.first).not.toBe(pact.second);
    const clone = grown(); evolveGeopolitics(clone, { state: 0, next: () => 0 });
    expect(clone.world.alliances).toEqual(s.world.alliances);
    s.world.year = pact.until; s.character.age = s.world.year - BIRTH_YEAR;
    evolveGeopolitics(s, { state: 0, next: () => .9 });
    expect(s.world.alliances).toEqual([]);
  });

  it('снабжение союзника действительно может изменить исход той же кампании', () => {
    const alone = grown(); war(alone);
    for (const id of ['valoria', 'frontier'] as const) Object.assign(alone.world.regions[id], { food: 50, safety: 50, economy: 50 });
    const supported = structuredClone(alone);
    supported.world.regions.karak.economy = 100;
    supported.world.alliances = [{ first: 'valoria', second: 'karak', until: alone.world.year + 12 }];
    const campaign = () => {
      const rolls = [.9, 0, 0, 0, .54, 0];
      return { state: 0, next: () => rolls.shift() ?? .5 };
    };
    evolveGeopolitics(alone, campaign());
    evolveGeopolitics(supported, campaign());
    expect(holdings(alone, 'valoria')).toHaveLength(regions.valoria.settlements.length);
    expect(holdings(supported, 'valoria')).toHaveLength(regions.valoria.settlements.length + 1);
  });

  it('мигрирует версию 4, сохраняя мировые программы, опыт и RNG', () => {
    const current = grown();
    const legacy = { ...current, schemaVersion: 4, contentVersion: '4.0.0', world: { ...current.world, control: undefined, alliances: undefined } };
    const restored = stateSchema.parse(legacy);
    expect(restored.pathExperience).toBe(current.pathExperience);
    expect(restored.rngState).toBe(current.rngState);
    expect(restored.world.projects).toEqual(current.world.projects);
    for (const id of regionIds) expect(holdings(restored, id)).toHaveLength(regions[id].settlements.length);
  });
});

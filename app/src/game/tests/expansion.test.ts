import { describe, expect, it } from 'vitest';
import { deserializeSave, serializeSave, stateSchema } from '../../db/save-format';
import { pathIds } from '../content/atlas';
import { femaleNames, nativeRace, raceIds, races, regionIds } from '../content/world';
import { createGame } from '../engine/create-game';
import { events } from '../engine/events';
import { actOnWorld, takePath } from '../engine/influence';
import { randomFrom } from '../engine/random';
import { simulateYear } from '../engine/simulate-year';
import { evolveWorld } from '../engine/world';

describe('Расширение мира', () => {
  it('рождает представителей восьми рас с воспроизводимым полом и согласованным именем', () => {
    const sexes = new Set<string>();
    const cultures = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const s = createGame('expanded-' + i, 'test');
      sexes.add(s.character.sex);
      cultures.add(s.character.race);
      const name = s.character.name.split(' ')[0];
      expect(femaleNames[s.character.race].includes(name)).toBe(s.character.sex === 'female');
      expect(deserializeSave(serializeSave(s))).toEqual(s);
    }
    expect(sexes).toEqual(new Set(['male', 'female']));
    expect(cultures.size).toBe(raceIds.length);
  });

  it('разрешает автоматическую войну между двумя человеческими государствами', () => {
    const s = createGame('civil-conflict', 'test');
    const rolls = [0, 0, .5, .99];
    evolveWorld(s, { get state() { return 0; }, next: () => rolls.shift() ?? .5 });
    expect(nativeRace.valoria).toBe('human');
    expect(nativeRace.aurelian).toBe('human');
    expect(s.world.fronts).toContainEqual({ from: 'valoria', to: 'aurelian', until: s.world.regions.valoria.until });
    expect(stateSchema.parse(s)).toEqual(s);
  });

  it('создаёт общественные открытия и континентальные явления с последствиями', () => {
    const s = createGame('phenomena', 'test');
    const rng = randomFrom(123);
    for (let year = 0; year < 120; year++) {
      s.world.year++;
      s.character.age++;
      evolveWorld(s, rng);
    }
    expect(s.world.news.some(news => ['Затмение двух светил', 'Долгая зима', 'Распространение новых машин', 'Восстание кварталов'].includes(news.title))).toBe(true);
    expect(s.world.news.length).toBeLessThanOrEqual(36);
  });

  it('подключает все новые жизненные пути к событиям и мировым действиям', () => {
    const available = ['healer', 'scholar', 'ranger', 'bard', 'artificer'] as const;
    const action = { healer: 'clinic', scholar: 'academy', ranger: 'trail', bard: 'assembly', artificer: 'irrigation' } as const;
    for (const path of available) {
      const s = takePath(createGame('path-' + path, 'test'), path);
      s.revealed = true;
      s.character.age = races[s.character.race].stages[2];
      s.world.year += s.character.age;
      s.character.reputation = 70;
      s.character.wealth = 90;
      const next = actOnWorld(s, action[path]);
      expect(next).not.toBe(s);
      expect(next.world.news).toHaveLength(1);
      expect(pathIds).toContain(path);
    }
  });

  it('разнообразит первые решения и сокращает повторяемость школьной сцены', () => {
    const firstEvents = new Set<string>();
    let school = 0;
    for (let i = 0; i < 160; i++) {
      let s = { ...createGame('opening-' + i, 'test'), revealed: true };
      for (let turn = 0; turn < 80 && !s.pending && !s.ended; turn++) s = simulateYear(s);
      if (s.pending) firstEvents.add(s.pending.eventId);
      if (s.pending?.eventId === 'school') school++;
    }
    expect(firstEvents.size).toBeGreaterThanOrEqual(10);
    expect(school).toBeLessThan(60);
    expect(events.length).toBeGreaterThan(210);
  });

  it('мигрирует сохранение версии 2 с шестью странами и сохранённым выбором', () => {
    const current = createGame('old-life', 'test');
    const originalRegions = ['valoria', 'sylvanor', 'karak', 'steppes', 'grimm', 'frontier'];
    const { sex, ...character } = current.character;
    const legacy = {
      ...current, schemaVersion: 2, contentVersion: '2.0.0', character,
      world: {
        ...current.world,
        regions: Object.fromEntries(originalRegions.map(id => [id, current.world.regions[id as typeof regionIds[number]]])),
        terms: Object.fromEntries(originalRegions.map(id => [id, 0])),
      },
    };
    const restored = deserializeSave(JSON.stringify({ formatVersion: 1, schemaVersion: 2, contentVersion: '2.0.0', exportedAt: new Date().toISOString(), state: legacy }));
    expect(restored.rngState).toBe(current.rngState);
    expect(restored.character.sex).toBe(sex);
    expect(restored.chronicle).toEqual(current.chronicle);
    expect(Object.keys(restored.world.regions)).toHaveLength(12);
  });
});

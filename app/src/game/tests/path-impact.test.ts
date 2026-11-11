import { describe, expect, it } from 'vitest';
import { deserializeSave, serializeSave, stateSchema } from '../../db/save-format';
import { pathIds, type PathId } from '../content/atlas';
import { createGame } from '../engine/create-game';
import { applyChoice, playEvents } from '../engine/events';
import { takePath } from '../engine/influence';
import { citySupport, developPath, roleInterval } from '../engine/path-development';
import { randomFrom } from '../engine/random';
import { countryModifiers, installProject } from '../engine/world-effects';
import { evolveWorld } from '../engine/world';

function adult(path: PathId) {
  const s = takePath(createGame('world-path', 'path-test'), path);
  s.revealed = true;
  s.character.name = 'Мира Вереск';
  s.character.sex = 'female';
  s.character.race = 'human';
  s.character.longevity = 85;
  s.character.age = 40;
  s.character.region = 'valoria';
  s.character.settlement = 'Валор';
  s.world.year += 40;
  s.character.stats.health = 95;
  s.character.reputation = 65;
  s.character.wealth = 95;
  return s;
}

describe('Путь, город и долгосрочные последствия', () => {
  it('поддерживающий город действительно ускоряет развитие и приносит заявленный доход', () => {
    const supported = adult('merchant');
    supported.character.settlement = 'Белые Мельницы';
    const unsupported = structuredClone(supported);
    unsupported.character.settlement = 'Ольховый Брод';
    const support = citySupport(supported)!;
    expect(citySupport(unsupported)).toBeNull();
    developPath(supported);
    developPath(unsupported);
    expect(supported.pathExperience - unsupported.pathExperience).toBeCloseTo(support.experience);
    expect(supported.character.wealth - unsupported.character.wealth).toBeCloseTo(support.wealth);
    expect(supported.character.education - unsupported.character.education).toBeCloseTo(support.education);
    expect(roleInterval(supported)).toBeLessThan(roleInterval(unsupported));
  });

  it('у каждого из 15 путей есть гарантированная первая важная развилка', () => {
    expect(pathIds).toHaveLength(15);
    for (const path of pathIds) {
      const s = adult(path);
      s.pathExperience = 5;
      playEvents(s, randomFrom(6));
      expect(s.pending?.eventId).toBe(`path-${path}-1`);
      s.rngState = 1;
      const left = applyChoice(s, s.pending!.token, 'open');
      const right = applyChoice(s, s.pending!.token, 'control');
      expect(left.world.projects).toHaveLength(1);
      expect(right.world.projects).toHaveLength(1);
      expect(left.world.projects[0].kind).not.toBe(right.world.projects[0].kind);
      expect(stateSchema.parse(left)).toEqual(left);
      expect(deserializeSave(serializeSave(right))).toEqual(right);
    }
  });

  it('выбор воина меняет будущее страны и вероятность войны при одном и том же RNG', () => {
    const s = adult('warrior');
    s.pathExperience = 20;
    s.seen['path-warrior-1'] = s.world.year - 20;
    playEvents(s, randomFrom(7));
    expect(s.pending?.eventId).toBe('path-warrior-2');
    s.rngState = 1;
    const defensive = applyChoice(s, s.pending!.token, 'open');
    const aggressive = applyChoice(s, s.pending!.token, 'control');
    expect(countryModifiers(defensive, 'valoria').odds.war).toBeLessThan(countryModifiers(aggressive, 'valoria').odds.war!);
    const firstRolls = () => {
      const rolls = [0, .1, .5, .5];
      return { state: 0, next: () => rolls.shift() ?? .5 };
    };
    evolveWorld(defensive, firstRolls());
    evolveWorld(aggressive, firstRolls());
    expect(defensive.world.regions.valoria.crisis).not.toBe('war');
    expect(aggressive.world.regions.valoria.crisis).toBe('war');
    expect(aggressive.scheduled.some(item => item.eventId === 'path-project-reckoning')).toBe(true);
  });

  it('третья веха дипломатии затрагивает соседей и прекращает парный конфликт', () => {
    const s = adult('diplomat');
    s.pathExperience = 45;
    s.seen['path-diplomat-1'] = s.world.year - 25;
    s.seen['path-diplomat-2'] = s.world.year - 15;
    const until = s.world.year + 8;
    s.world.fronts.push({ from: 'valoria', to: 'frontier', until });
    for (const id of ['valoria', 'frontier'] as const) {
      s.world.regions[id].crisis = 'war';
      s.world.regions[id].until = until;
    }
    playEvents(s, randomFrom(3));
    expect(s.pending?.eventId).toBe('path-diplomat-3');
    s.rngState = 1;
    const peace = applyChoice(s, s.pending!.token, 'open');
    expect(peace.world.fronts).toEqual([]);
    expect(peace.world.regions.frontier.crisis).toBeNull();
    expect(new Set(peace.world.projects.map(project => project.region)).size).toBe(4);
    expect(peace.world.projects.every(project => project.founder === peace.character.name)).toBe(true);
    expect(stateSchema.parse(peace)).toEqual(peace);
  });

  it('долгосрочные дела сохраняются, действуют до своего срока и затем завершаются', () => {
    const s = adult('healer');
    installProject(s, 'valoria', 'relief', 12);
    const restored = deserializeSave(serializeSave(s));
    expect(countryModifiers(restored, 'valoria').odds.plague).toBe(.2);
    restored.world.year += 12;
    restored.character.age += 12;
    evolveWorld(restored, { state: 0, next: () => .5 });
    expect(restored.world.projects).toEqual([]);
    expect(countryModifiers(restored, 'valoria').odds.plague).toBeUndefined();
    expect(restored.world.news.some(item => item.title === 'Завершение общего дела')).toBe(true);
  });

  it('сохранения версии 3 получают опыт прежнего пути без изменения летописи и RNG', () => {
    const current = adult('adventurer');
    const { pathExperience, ...old } = current;
    expect(pathExperience).toBe(0);
    const { projects, ...world } = old.world;
    expect(projects).toEqual([]);
    const state = { ...old, world, schemaVersion: 3, contentVersion: '3.0.0' };
    const restored = deserializeSave(JSON.stringify({ formatVersion: 1, schemaVersion: 3, contentVersion: '3.0.0', exportedAt: new Date().toISOString(), state }));
    expect(restored.pathExperience).toBeGreaterThan(0);
    expect(restored.rngState).toBe(current.rngState);
    expect(restored.chronicle).toEqual(current.chronicle);
    expect(restored.world.projects).toEqual([]);
  });
});

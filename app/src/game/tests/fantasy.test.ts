import { describe, expect, it } from 'vitest';
import { createGame } from '../engine/create-game';
import { applyChoice, eligible, eventById, events, playEvents } from '../engine/events';
import { arcaneIds } from '../content/arcana';
import { fantasyEncounters, fantasyEvents } from '../content/fantasy-events';
import { fantasyCrises } from '../content/fantasy-world';
import { pathIds } from '../content/atlas';
import { raceIds, races } from '../content/world';
import { grantMark, evolveArcana } from '../engine/arcana';
import { countryModifiers, installProject } from '../engine/world-effects';
import { simulateYear } from '../engine/simulate-year';
import { randomFrom } from '../engine/random';
import { deserializeSave, serializeSave, stateSchema } from '../../db/save-format';
import type { GameState } from '../types';
function adult() {
  const s = createGame('fantasy-test', 'fantasy-test'); s.revealed = true;
  s.character.race = 'human'; s.character.longevity = 90; s.character.age = 35; s.world.year += 35;
  s.character.region = 'frontier'; s.character.settlement = 'Край Дорог';
  s.character.stats.health = 95; s.character.wealth = 80;
  return s;
}
function pending(s: GameState, id: string) {
  s.seen[id] = s.world.year; s.pending = { eventId: id, token: `${s.world.year}-${id}`, optionIds: eventById.get(id)!.choices!.map(c => c.id) };
  return s;
}
const quiet = { state: 0, next: () => .99 };
describe('Фэнтезийный мир и последствия', () => {
  it('у всех восьми рас и пятнадцати ролей есть свои сверхъестественные истории', () => {
    for (const race of raceIds) expect(fantasyEncounters.some(scene => scene.race === race)).toBe(true);
    for (const path of pathIds) expect(fantasyEncounters.some(scene => scene.path === path)).toBe(true);
    expect(fantasyEvents.length).toBeGreaterThanOrEqual(45);
    for (const scene of fantasyEncounters.filter(scene => scene.race)) {
      const s = adult(); s.character.race = scene.race!;
      s.character.age = races[scene.race!].stages[2] + 5;
      expect(eligible(s, eventById.get('fantasy-' + scene.id)!)).toBe(true);
      s.character.race = raceIds.find(race => race !== scene.race)!;
      expect(eligible(s, eventById.get('fantasy-' + scene.id)!)).toBe(false);
    }
  });
  it('учитывает регион и не поручает младенцу спасение мира', () => {
    const s = adult();
    expect(eligible(s, eventById.get('fantasy-rift-caravan')!)).toBe(true);
    s.character.region = 'karak'; expect(eligible(s, eventById.get('fantasy-rift-caravan')!)).toBe(false);
    s.character.age = 2;
    expect(fantasyEvents.filter(e => e.choices).some(e => eligible(s, e))).toBe(false);
  });
  it('не позволяет двум обычным историям подряд вытеснить фантастику из следующего события', () => {
    const s = adult(); s.path = null;
    s.chronicle.push({ year: s.world.year, age: 35, eventId: 'school', category: 'education', title: 'x', text: 'x', tone: 'neutral', milestone: false },
      { year: s.world.year, age: 35, eventId: 'friendship', category: 'relations', title: 'x', text: 'x', tone: 'neutral', milestone: false });
    playEvents(s, randomFrom(12));
    const id = s.pending?.eventId ?? s.chronicle.at(-1)!.eventId;
    expect(eventById.get(id)?.fantasy).toBe(true);
  });
  it('каждая новая катастрофа вызывает подходящее срочное решение и реально меняет показатели', () => {
    for (const crisis of Object.keys(fantasyCrises) as (keyof typeof fantasyCrises)[]) {
      const s = adult(); s.world.regions.frontier.crisis = crisis; s.world.regions.frontier.until = s.world.year + 8;
      playEvents(s, randomFrom(8));
      expect(eventById.get(s.pending!.eventId)?.worldCrisis).toBe(crisis);
      expect(Object.values(fantasyCrises[crisis].effects).some(value => value < 0)).toBe(true);
    }
  });
  it('риск даёт разные исходы, а успешный дар создаёт обязательство после загрузки', () => {
    const id = 'fantasy-rift-caravan'; const outcomes = new Set<boolean>();
    for (let seed = 0; seed < 100; seed++) {
      const s = pending(adult(), id); s.rngState = seed + 1;
      const next = applyChoice(s, s.pending!.token, 'venture');
      outcomes.add(!!next.arcana.rune);
      if (!next.arcana.rune || next.ended) continue;
      expect(next.scheduled[0].eventId).toBe('titan-second-heart');
      expect(deserializeSave(serializeSave(next))).toEqual(next);
    }
    expect(outcomes).toEqual(new Set([true, false]));
  });
  it('печати действуют ежегодно с расовым темпом и заканчиваются в срок', () => {
    const s = adult(); grantMark(s, 'curse', 8); grantMark(s, 'rune', 8);
    const before = s.character.stats.health;
    evolveArcana(s, quiet);
    expect(s.character.stats.health).toBeCloseTo(before - 1.2);
    s.world.year = s.arcana.curse!; s.character.age = s.world.year - 1230;
    evolveArcana(s, quiet); expect(s.arcana).toEqual({});
    expect(s.chronicle.filter(row => row.eventId === 'arcana-expired')).toHaveLength(2);
  });
  it('выкуп и усиление договора приводят к противоположным личным и мировым последствиям', () => {
    const s = pending(adult(), 'fae-collector'); grantMark(s, 'fae'); s.rngState = 1;
    const release = applyChoice(s, s.pending!.token, 'release');
    const embrace = applyChoice(s, s.pending!.token, 'embrace');
    expect(release.arcana.fae).toBeUndefined(); expect(embrace.arcana.fae).toBeGreaterThan(s.arcana.fae!);
    expect(countryModifiers(release, 'frontier').odds.rift).toBeLessThan(countryModifiers(embrace, 'frontier').odds.rift!);
    expect(release.character.wealth).toBeLessThan(embrace.character.wealth);
  });
  it('версия 5 сохраняет завоевания, союзы, программы и RNG при миграции', () => {
    const s = adult(); s.world.control['Валор'] = 'frontier';
    s.world.alliances = [{ first: 'valoria', second: 'frontier', until: s.world.year + 8 }];
    installProject(s, 'frontier', 'knowledge', 8);
    const legacy = { ...s, schemaVersion: 5, contentVersion: '5.0.0', arcana: undefined };
    const restored = stateSchema.parse(legacy);
    expect(restored.world).toEqual(s.world); expect(restored.rngState).toBe(s.rngState); expect(restored.arcana).toEqual({});
    expect(() => stateSchema.parse({ ...s, arcana: { curse: s.world.year - 1 } })).toThrow();
    expect(() => stateSchema.parse({ ...s, arcana: { unknown: s.world.year + 8 } })).toThrow();
  });
  it('включает чудеса в детство и сохраняет воспроизводимость полной жизни', () => {
    const s = { ...createGame('star-child', 'star-child'), revealed: true, automatic: true };
    const year = simulateYear(s); expect(year.chronicle.some(row => row.eventId === 'fantasy-stars-in-cradle')).toBe(true);
    const finish = () => { let life = s; for (let i = 0; i < 1200 && !life.ended; i++) life = simulateYear(life); return life; };
    const a = finish(); expect(a.ended).not.toBeNull(); expect(finish()).toEqual(a);
    expect(arcaneIds).toHaveLength(6); expect(events.length).toBeGreaterThan(330);
  });
});

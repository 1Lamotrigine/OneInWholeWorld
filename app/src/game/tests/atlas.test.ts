import { describe, expect, it } from 'vitest';
import { deserializeSave, serializeSave, stateSchema } from '../../db/save-format';
import { atlas, cityNotes, neighbours, pathIds } from '../content/atlas';
import { races, regionIds, regions } from '../content/world';
import { createGame } from '../engine/create-game';
import { applyChoice, events, playEvents } from '../engine/events';
import { actOnWorld, actionReason, moveOffer, moveTo, takePath } from '../engine/influence';
import { hashSeed, randomFrom } from '../engine/random';
import { evolveWorld } from '../engine/world';
import type { GameState } from '../types';

function grown() {
  const state = createGame('atlas-life', 'atlas-test');
  state.character.age = races[state.character.race].stages[2];
  state.character.region = 'valoria';
  state.character.settlement = 'Ольховый Брод';
  state.character.wealth = 95;
  state.character.reputation = 65;
  state.world.year += state.character.age;
  state.revealed = true;
  return state;
}

describe('Роль и атлас', () => {
  it('связывает лор, границы и рекомендации со всеми игровыми поселениями', () => {
    for (const id of regionIds) {
      expect(cityNotes(id).map(city => city.name)).toEqual(regions[id].settlements);
      expect(atlas[id].lore).toBeTruthy();
      expect(atlas[id].leaders.length).toBeGreaterThan(1);
      for (const other of neighbours[id]) expect(neighbours[other]).toContain(id);
    }
    expect(new Set(regionIds.map(id => atlas[id].color)).size).toBe(regionIds.length);
    for (const path of pathIds) expect(regionIds.some(id => cityNotes(id).some(city => city.roles.some(role => role === path)))).toBe(true);
  });

  it('фиксирует жизненный путь один раз и допускает политика из рабочей семьи', () => {
    const state = grown();
    state.character.background = 'worker';
    state.character.status = 'worker';
    const politician = takePath(state, 'politician');
    expect(politician.path).toBe('politician');
    expect(politician.character.status).toBe('worker');
    expect(takePath(politician, 'villain')).toBe(politician);
    expect(deserializeSave(serializeSave(politician))).toEqual(politician);
  });

  it('учитывает роль, средства и обстановку при переезде', () => {
    const state = takePath(grown(), 'politician');
    state.character.reputation = 22;
    expect(moveOffer(state, 'frontier', 'Три Башни')).toEqual({ cost: 8, reason: '' });
    expect(moveOffer(state, 'steppes', 'Костры Тарга').reason).toMatch(/40 репутации/);
    const moved = moveTo(state, 'frontier', 'Три Башни');
    expect(moved.character.settlement).toBe('Три Башни');
    expect(moved.character.wealth).toBe(87);
    expect(moved.character.birthplace).toBe(state.character.birthplace);
    expect(moveTo(moved, 'frontier', 'Каменный Путь')).toBe(moved);
    expect(moveTo(state, 'frontier', 'Несуществующий')).toBe(state);
  });

  it('объявляет войну соседу и завершает её по обе стороны границы', () => {
    const s = takePath(grown(), 'politician');
    expect(actOnWorld(s, 'declare', 'steppes')).toBe(s);
    const war = actOnWorld(s, 'declare', 'frontier');
    expect(war.world.fronts).toEqual([{ from: 'valoria', to: 'frontier', until: s.world.year + 8 }]);
    expect(war.world.regions.valoria.crisis).toBe('war');
    expect(war.world.regions.frontier.crisis).toBe('war');
    expect(war.world.news.map(row => row.region)).toEqual(['frontier', 'valoria']);
    expect(stateSchema.parse(war)).toEqual(war);
    expect(actionReason(war, 'peace')).toMatch(/пять лет/);
    war.world.year += 5;
    war.character.age += 5;
    const peace = actOnWorld(war, 'peace');
    expect(peace.world.fronts).toEqual([]);
    expect(peace.world.regions.valoria.crisis).toBeNull();
    expect(peace.world.regions.frontier.crisis).toBeNull();
    expect(peace.world.regions.frontier.conflict).toBeLessThan(war.world.regions.frontier.conflict);
  });

  it('снимает завершённый конфликт и создаёт вести вне региона персонажа', () => {
    const s = actOnWorld(takePath(grown(), 'politician'), 'declare', 'frontier');
    s.world.year += 8;
    s.character.age += 8;
    evolveWorld(s, { next: () => .5, state: 0 });
    expect(s.world.fronts).toEqual([]);
    expect(s.world.regions.valoria.crisis).toBeNull();
    expect(s.world.regions.frontier.crisis).toBeNull();
    const independent = grown();
    evolveWorld(independent, { next: () => 0, state: 0 });
    expect(independent.world.news.some(row => row.region === 'karak' && row.title === 'Смена власти')).toBe(true);
    expect(independent.world.terms.karak).toBe(1);
    expect(stateSchema.parse(s)).toEqual(s);
  });
});

describe('Сюжетные цепочки и совместимость', () => {
  function stranger() {
    const s = grown();
    const eventId = 'stranger-on-road';
    s.seen[eventId] = s.world.year;
    s.pending = { eventId, token: `${s.world.year}-${eventId}`, optionIds: ['shelter', 'refuse'] };
    return s;
  }
  function reachDue(s: GameState) {
    s.character.age += 3;
    s.world.year += 3;
    playEvents(s, randomFrom(s.rngState));
    return s;
  }

  it('хранит будущий повторный выбор даже после сериализации', () => {
    const s = stranger();
    const seed = s.seed + 'a';
    if (hashSeed(`${s.seed}:${s.world.year}:stranger`) % 2 !== 0) s.seed = seed;
    const refused = applyChoice(s, s.pending!.token, 'refuse');
    expect(refused.scheduled).toEqual([{ year: s.world.year + 3, eventId: 'ring-court' }]);
    const returned = reachDue(deserializeSave(serializeSave(refused)));
    expect(returned.pending?.eventId).toBe('ring-court');
    expect(stateSchema.parse(returned)).toEqual(returned);
    const next = applyChoice(returned, returned.pending!.token, 'walk');
    expect(next.character.relationships.some(person => person.role === 'Соперник')).toBe(true);
  });

  it('допускает обе развязки после помощи незнакомцу', () => {
    const endings = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const s = stranger();
      s.seed = 'visitor-' + seed;
      const helped = applyChoice(s, s.pending!.token, 'shelter');
      const refused = applyChoice(s, s.pending!.token, 'refuse');
      if (helped.ended || refused.ended) continue;
      const result = helped.scheduled[0].eventId;
      endings.add(result);
      expect(refused.scheduled[0].eventId).toBe(result === 'ring-gratitude' ? 'ring-court' : 'ring-captured');
    }
    expect(endings).toEqual(new Set(['ring-gratitude', 'ring-warrant']));
  });

  it('загружает JSON версии 1 с историей и состоянием RNG', () => {
    const current = grown();
    const { path, lastMove, lastAct, world, ...old } = current;
    expect([path, lastMove, lastAct]).toEqual([null, 0, 0]);
    const legacy = { ...old, schemaVersion: 1, contentVersion: '1.0.0', world: { year: world.year, regions: world.regions } };
    const json = JSON.stringify({ formatVersion: 1, schemaVersion: 1, contentVersion: '1.0.0', exportedAt: new Date().toISOString(), state: legacy });
    expect(deserializeSave(json)).toEqual(current);
  });

  it('содержит как минимум вдвое больше событий с выбором', () => {
    expect(events.filter(event => event.choices).length).toBeGreaterThanOrEqual(74);
  });
});

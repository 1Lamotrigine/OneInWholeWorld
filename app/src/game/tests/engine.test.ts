import { pathIds } from '../content/atlas';
import { takePath } from '../engine/influence';
import { describe, expect, it } from 'vitest';
import { races, raceIds, regions, regionIds, statLabels } from '../content/world';
import { BIRTH_YEAR, type GameState } from '../types';
import { createGame } from '../engine/create-game';
import { applyChoice, availableChoices, eligible, eventById, events } from '../engine/events';
import { hashSeed, randomFrom, weighted } from '../engine/random';
import { phase } from '../engine/rules';
import { advanceToDecision, simulateYear, yearDuration } from '../engine/simulate-year';
import { deserializeSave, serializeSave, stateSchema } from '../../db/save-format';

function birth(seed = 'el-7'): GameState {
  return { ...createGame(seed, 'test-life'), revealed: true };
}

function opening(seed = 'el-7') {
  const state = advanceToDecision(birth(seed));
  expect(state.pending).not.toBeNull();
  return state;
}

describe('Взвешенный выбор и рождение', () => {
  it('использует положительные веса, сохраняет границы и возвращает вероятность', () => {
    const values = [0, .249, .25, .99999];
    const rng = { state: 0, next: () => values.shift()! };
    const outcomes = [0, 1, 3, 0];
    expect(Array.from({ length: 4 }, () => weighted(outcomes, x => x, rng))).toEqual([
      { item: 1, probability: .25 }, { item: 1, probability: .25 },
      { item: 3, probability: .75 }, { item: 3, probability: .75 },
    ]);
  });

  it.each([[], [0, 0], [3, -1], [Infinity], [NaN]])('отклоняет неверные веса %j', (...weights) => {
    expect(() => weighted(weights, x => x, randomFrom(7))).toThrow(RangeError);
  });

  it('возобновляет последовательность RNG из снимка', () => {
    const rng = randomFrom(hashSeed('elarion'));
    rng.next();
    const restored = randomFrom(rng.state);
    expect([rng.next(), rng.next()]).toEqual([restored.next(), restored.next()]);
  });

  it('воспроизводит имя, семью, регион и врождённые параметры', () => {
    expect(createGame('night', 'id')).toEqual(createGame('night', 'id'));
    expect(createGame('night', 'id').rngState).not.toBe(createGame('dawn', 'id').rngState);
    const state = createGame('night', 'id');
    expect(state.world.year).toBe(BIRTH_YEAR);
    expect(state.character.age).toBe(0);
    expect(regions[state.character.origin].settlements).toContain(state.character.birthplace);
    expect(state.birthOdds.race).toBe(races[state.character.race].weight / 100);
    expect(state.character.background).toBe(state.character.status);
    expect(stateSchema.parse(state)).toEqual(state);
    expect(simulateYear(state)).toBe(state);
  });

  it('проверяет веса рас и допускает рождение каждой расы во всех регионах', () => {
    const births = Array.from({ length: 5000 }, (_, index) => createGame('population-' + index, 'test'));
    for (const race of raceIds) {
      const subset = births.filter(s => s.character.race === race);
      expect(Math.abs(subset.length / births.length - races[race].weight / 100)).toBeLessThan(.025);
      expect(new Set(subset.map(s => s.character.origin)).size).toBe(regionIds.length);
    }
    expect(births.every(({ character }) => new Set(character.relationships.map(person => person.name)).size === character.relationships.length)).toBe(true);
    const dynasties = births.filter(s => s.character.background === 'ruler');
    expect(dynasties.length).toBeLessThan(20);
  });
});

describe('Годовой цикл', () => {
  it('продвигает ровно один год и не меняет входное состояние', () => {
    const s = birth();
    const next = simulateYear(s);
    expect(next.world.year).toBe(BIRTH_YEAR + 1);
    expect(next.character.age).toBe(1);
    expect(next.revision).toBe(1);
    expect(s.character.age).toBe(0);
    expect(next.character.stats).not.toEqual(s.character.stats);
    expect(yearDuration(s, 5)).toBeCloseTo(yearDuration(s, 1) / 5, -1);
  });

  it('проверяет возраст по расовым этапам и уважает cooldown', () => {
    const state = birth();
    const school = eventById.get('school')!;
    const work = eventById.get('first-work')!;
    expect(eligible(state, school)).toBe(false);
    expect(eligible(state, work)).toBe(false);
    state.character.age = races[state.character.race].stages[0];
    state.world.year += state.character.age;
    expect(eligible(state, school)).toBe(true);
    state.seen.school = state.world.year;
    expect(eligible(state, school)).toBe(false);
    const feast = eventById.get('lantern-feast')!;
    state.seen[feast.id] = state.world.year;
    expect(eligible(state, feast)).toBe(false);
    state.world.year += 80;
    expect(eligible(state, feast)).toBe(true);
  });

  it('останавливается на выборе, проверяет токен, применяет эффект один раз', () => {
    const s = opening();
    const pending = s.pending!;
    expect(simulateYear(s)).toBe(s);
    expect(advanceToDecision(s)).toBe(s);
    expect(applyChoice(s, 'stale', pending.optionIds[0])).toBe(s);
    expect(applyChoice(s, pending.token, 'wrong')).toBe(s);
    const next = applyChoice(s, pending.token, pending.optionIds[0]);
    const alternative = applyChoice(s, pending.token, pending.optionIds[1]);
    expect(next.character).not.toEqual(alternative.character);
    expect(next.pending).toBeNull();
    expect(next.chronicle.some(row => row.eventId === pending.eventId)).toBe(true);
    expect(applyChoice(next, pending.token, pending.optionIds[0])).toBe(next);
  });

  it('даёт последствия отложенного выбора в следующем году', () => {
    const s = birth();
    s.character.age = races[s.character.race].stages[1];
    s.world.year = BIRTH_YEAR + s.character.age;
    s.pending = { eventId: 'apprentice', token: s.world.year + '-apprentice', optionIds: ['train', 'wages'] };
    const trained = applyChoice(s, s.pending.token, 'train');
    expect(trained.character.education).toBe(8);
    expect(trained.scheduled).toEqual([{ year: s.world.year + 1, eventId: 'guild-letter' }]);
    const next = simulateYear(trained);
    expect(next.chronicle.some(row => row.eventId === 'guild-letter')).toBe(true);
    expect(next.scheduled).toEqual([]);
  });

  it('завершает жизнь ровно один раз и оставляет летопись', () => {
    const s = birth();
    s.character.stats.health = 0;
    s.character.condition = 'injury';
    s.character.lifeRisk = .7;
    const next = simulateYear(s);
    expect(next.ended?.cause).toBe('Последствия травмы');
    expect(next.chronicle.at(-1)?.category).toBe('death');
    expect(simulateYear(next)).toBe(next);
    expect(advanceToDecision(next)).toBe(next);
    expect(next.chronicle.filter(row => row.category === 'death')).toHaveLength(1);
  });

  it('держит каталог расширяемым и защищённым от тупиков', () => {
    expect(events.length).toBeGreaterThanOrEqual(100);
    expect(events.filter(event => event.choices).length).toBeGreaterThanOrEqual(30);
    expect(new Set(events.map(event => event.id)).size).toBe(events.length);
    for (const event of events) {
      const options = event.choices;
      if (!options) continue;
      expect(options.length).toBeGreaterThanOrEqual(2);
      expect(options.some(choice => !choice.cost && !choice.when)).toBe(true);
      for (const option of options) if (option.later) expect(eventById.get(option.later.eventId)?.weight).toBe(0);
    }
  });

  it('проверяет 2 000 полных жизней на смерть, границы показателей и допустимые решения', () => {
    const paths = new Set<string>();
    let manualChoices = 0;
    for (let index = 0; index < 2000; index++) {
      let s = takePath(birth('balance-' + index), pathIds[index % pathIds.length]);
      s.automatic = index % 3 !== 0;
      for (let turn = 0; turn < 1200 && !s.ended; turn++) {
        if (s.pending) {
          const event = eventById.get(s.pending.eventId)!;
          if (!event.stages.includes(phase(s.character))) throw new Error('Событие выбрано вне возрастного этапа');
          const choices = availableChoices(s, event).filter(choice => s.pending!.optionIds.includes(choice.id));
          if (choices.length < 2 || choices.length > 4) throw new Error('Некорректное число решений');
          s = applyChoice(s, s.pending.token, choices[index % choices.length].id);
          manualChoices++;
        } else {
          s = simulateYear(s);
        }
        if (Object.keys(statLabels).some(key => {
          const value = s.character.stats[key as keyof typeof statLabels];
          return !Number.isFinite(value) || value < 0 || value > 100;
        })) throw new Error('Характеристика вышла за допустимые границы');
      }
      if (!s.ended || s.pending || s.world.year !== BIRTH_YEAR + s.character.age || s.chronicle.at(-1)?.category !== 'death') {
        throw new Error('Некорректное завершение: ' + s.seed);
      }
      for (const id of s.character.career) paths.add(id);
      if (index % 10 === 0) stateSchema.parse(s);
    }
    expect(paths.size).toBeGreaterThanOrEqual(18);
    expect(manualChoices).toBeGreaterThan(1000);
  }, 90000);
});

describe('Формат сохранений', () => {
  it('сохраняет ожидающий выбор и воспроизводит дальнейший ход жизни', () => {
    const current = opening();
    const restored = deserializeSave(serializeSave(current));
    expect(restored).toEqual(current);
    const finish = (s: GameState) => {
      const pending = s.pending!;
      let state = { ...applyChoice(s, pending.token, pending.optionIds[0]), automatic: true };
      for (let i = 0; i < 600 && !state.ended; i++) state = simulateYear(state);
      return state;
    };
    expect(finish(restored)).toEqual(finish(current));
  });

  it('отклоняет повреждённое состояние, неподдерживаемую версию и слишком большой файл', () => {
    const s = opening();
    expect(() => deserializeSave(serializeSave({ ...s, rngState: -1 }))).toThrow();
    expect(() => deserializeSave(serializeSave(s).replace('"formatVersion": 1', '"formatVersion": 2'))).toThrow();
    expect(() => deserializeSave(serializeSave({ ...s, pending: { ...s.pending!, token: 'invalid' } }))).toThrow();
    expect(() => deserializeSave('a'.repeat(2_097_153))).toThrow('2 МБ');
  });
});

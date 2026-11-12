import { describe, expect, it } from 'vitest';
import { createGame } from '../engine/create-game';
import { takePath } from '../engine/influence';
import { birthRarity, fateEpitaph, fateHook, seedCode, turningPoints } from '../engine/fate-card';
import { epitaphs, fateFacts } from '../content/epitaphs';

function life() {
  const state = takePath(createGame('arc-card-test', 'arc-card-test'), 'politician');
  state.character.sex = 'male';
  state.character.race = 'goblin';
  state.character.background = 'poor';
  state.character.status = 'ruler';
  state.character.origin = 'grimm';
  state.character.region = 'frontier';
  state.character.age = 63;
  state.character.longevity = 70;
  state.world.year = 1293;
  state.character.relationships = [];
  return state;
}

describe('Карточка-арка', () => {
  it('собирает фразу-крючок о старте и финале на русском и английском', () => {
    const state = life();
    expect(fateHook(state, 'ru')).toBe('Родился нищим гоблином в Топях Гримм. Умер королём в Пограничье.');
    expect(fateHook(state, 'en')).toBe('Born a poor goblin in the Grimm Marshes. Died a king in the Borderland.');
    state.character.sex = 'female';
    state.character.race = 'elf';
    state.character.origin = 'duskwood';
    state.character.region = 'valoria';
    expect(fateHook(state, 'ru')).toBe('Родилась нищей эльфийкой в Сумеречных домах. Умерла королевой в Валории.');
    expect(fateHook(state, 'de')).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('выбирает три разных поворота по ходу летописи', () => {
    const state = life();
    state.chronicle = [
      { year: 1230, age: 0, eventId: 'birth', category: 'birth', title: 'Рождение', text: 'Начало.', tone: 'neutral', milestone: false },
      ...[18, 27, 36, 45, 54].map((age, index) => ({
        year: 1230 + age, age, eventId: `event-${index}`, category: 'work' as const,
        title: `Событие ${index}`, text: 'Поворот.', tone: 'good' as const, milestone: true,
      })),
    ];
    const points = turningPoints(state);
    expect(points).toHaveLength(3);
    expect(new Set(points.map(point => point.eventId)).size).toBe(3);
    expect(points.map(point => point.age)).toEqual([...points.map(point => point.age)].sort((a, b) => a - b));
  });

  it('считает редкость рождения и короткий seed', () => {
    const state = life();
    state.birthOdds = { race: .09, region: .3, background: .2 };
    expect(birthRarity(state).oneIn).toBe(185);
    expect(seedCode('12345678-1234-4000-8000-123456789abc')).toBe('1234-5678');
  });

  it('выбирает эпитафию детерминированно и по условиям жизни', () => {
    const state = life();
    state.world.terms.frontier = 2;
    state.chronicle = [];
    expect(fateFacts(state).leaders).toBe(3);
    expect(epitaphs.find(epitaph => epitaph.id === 'three-crowns')!.when(state)).toBe(true);
    expect(fateEpitaph(state)).toBe(fateEpitaph(state));
    expect(epitaphs.map(epitaph => epitaph.text)).toContain(fateEpitaph(state));
  });
});

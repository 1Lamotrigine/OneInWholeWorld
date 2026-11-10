export type RandomSource = { next(): number; readonly state: number };

export function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  return hash >>> 0;
}

export function randomFrom(initial: number): RandomSource {
  let state = initial >>> 0;
  return {
    get state() { return state; },
    next() {
      state = (state + 0x6D2B79F5) >>> 0;
      let value = Math.imul(state ^ (state >>> 15), state | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function weighted<T>(items: readonly T[], weight: (item: T) => number, rng: RandomSource) {
  const weights = items.map(weight);
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0 || weights.some(value => value < 0)) {
    throw new RangeError('Взвешенный выбор требует конечных неотрицательных весов и положительной суммы.');
  }
  let cursor = rng.next() * total;
  for (const [index, value] of weights.entries()) {
    cursor -= value;
    if (cursor < 0) return { item: items[index], probability: value / total };
  }
  const index = weights.findLastIndex(value => value > 0);
  return { item: items[index], probability: weights[index] / total };
}

export const pick = <T>(items: readonly T[], rng: RandomSource): T => items[Math.floor(rng.next() * items.length)];
export const integer = (min: number, max: number, rng: RandomSource) => min + Math.floor(rng.next() * (max - min + 1));

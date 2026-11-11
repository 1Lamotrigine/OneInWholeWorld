import { cityNotes, type PathId } from '../content/atlas';
import type { RegionId } from '../content/world';
import { cityBenefits } from '../content/city-benefits';
import type { GameState } from '../types';
import type { RandomSource } from './random';
import { changeStats, clamp, lifeScale, phase, record } from './rules';

export function citySupport(s: GameState, region: RegionId = s.character.region, settlement = s.character.settlement, path: PathId | null = s.path) {
  if (!path) return null;
  const c = s.character;
  const city = cityNotes(region).find(city => city.name === settlement);
  if (!city?.roles.includes(path)) return null;
  const scale = lifeScale(c);
  const benefit = cityBenefits[path];
  return {
    ...benefit,
    education: benefit.education / scale, reputation: benefit.reputation / scale,
    mastery: benefit.mastery / scale, wealth: benefit.wealth / scale,
    strength: benefit.strength / scale, charisma: benefit.charisma / scale,
    experience: .7 / scale, interval: Math.ceil(3 * scale),
  };
}

export function cityPenalty(s: GameState, region = s.character.region, settlement = s.character.settlement, path = s.path) {
  if (!path || citySupport(s, region, settlement, path)) return null;
  const scale = lifeScale(s.character);
  return { experience: .35 / scale, reputation: -.5 / scale, wealth: -.8 / scale,
    happiness: -.35 / scale, interval: Math.ceil(8 * scale),
    hazard: (s.world.regions[region].crisis === 'war' ? .06 : s.world.regions[region].safety < 40 ? .025 : .008) / scale };
}

export function developPath(s: GameState, rng?: RandomSource) {
  if (!s.path || phase(s.character) < 2) return;
  const c = s.character;
  const city = citySupport(s);
  const penalty = cityPenalty(s);
  s.pathExperience = clamp(s.pathExperience + (city ? .9 / lifeScale(c) + city.experience : penalty!.experience), 0, 1000);
  if (!city && penalty) {
    c.reputation = clamp(c.reputation + penalty.reputation);
    c.wealth = clamp(c.wealth + penalty.wealth, 0, 99999);
    changeStats(c, { happiness: penalty.happiness });
    if (phase(c) >= 3 && rng && rng.next() < penalty.hazard) {
      c.profession = null;
      c.reputation = clamp(c.reputation - 7);
      const violence = s.world.regions[c.region].crisis === 'war' || s.world.regions[c.region].safety < 40;
      changeStats(c, { health: violence ? -24 : -3, happiness: -5 });
      if (violence) { c.condition = 'injury'; c.conditionYears = 0; }
      record(s, 'city-career-setback', 'work', 'Карьера без опоры', violence
        ? 'Без профильных связей и защиты ты стал жертвой нападения. Работа потеряна, получено тяжёлое ранение; при слабом здоровье оно может оказаться смертельным.'
        : 'В городе нет заказчиков и наставников твоего пути. Профессиональный спор закончился потерей работы и репутации.', 'loss', true);
    }
    return;
  }
  if (!city) return;
  c.education = clamp(c.education + city.education);
  c.reputation = clamp(c.reputation + city.reputation);
  c.mastery = clamp(c.mastery + city.mastery);
  c.wealth = clamp(c.wealth + city.wealth, 0, 99999);
  changeStats(c, { strength: city.strength, charisma: city.charisma });
}

export function roleInterval(s: GameState) {
  return Math.ceil((citySupport(s) ? 3 : 8) * lifeScale(s.character));
}

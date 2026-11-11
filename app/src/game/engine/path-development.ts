import { cityNotes, type PathId } from '../content/atlas';
import type { RegionId } from '../content/world';
import { cityBenefits } from '../content/city-benefits';
import type { GameState } from '../types';
import { changeStats, clamp, lifeScale, phase } from './rules';

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

export function developPath(s: GameState) {
  if (!s.path || phase(s.character) < 2) return;
  const c = s.character;
  const city = citySupport(s);
  s.pathExperience = clamp(s.pathExperience + .9 / lifeScale(c) + (city?.experience ?? 0), 0, 1000);
  if (!city) return;
  c.education = clamp(c.education + city.education);
  c.reputation = clamp(c.reputation + city.reputation);
  c.mastery = clamp(c.mastery + city.mastery);
  c.wealth = clamp(c.wealth + city.wealth, 0, 99999);
  changeStats(c, { strength: city.strength, charisma: city.charisma });
}

export function roleInterval(s: GameState) {
  return Math.ceil((citySupport(s) ? 3 : 5) * lifeScale(s.character));
}

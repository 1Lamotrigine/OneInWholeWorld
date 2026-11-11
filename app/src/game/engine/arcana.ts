import { arcaneIds, arcaneMarks, type ArcaneMark } from '../content/arcana';
import type { GameState } from '../types';
import { changeStats, clamp, lifeScale, phase, record, regionState } from './rules';
import type { RandomSource } from './random';
export function grantMark(s: GameState, mark: ArcaneMark, years = 8) {
  s.arcana[mark] = s.world.year + Math.ceil(years * lifeScale(s.character));
}
export function evolveArcana(s: GameState, rng: RandomSource) {
  const scale = lifeScale(s.character);
  for (const mark of arcaneIds) {
    const until = s.arcana[mark];
    if (!until) continue;
    if (until <= s.world.year) {
      delete s.arcana[mark];
      record(s, 'arcana-expired', 'magic', arcaneMarks[mark].name, 'Действие магической печати завершилось.', 'neutral');
      continue;
    }
    const power = arcaneMarks[mark];
    const stats = Object.fromEntries(Object.entries(power.stats).map(([key, value]) => [key, value / scale]));
    changeStats(s.character, stats);
    s.character.education = clamp(s.character.education + power.education / scale);
    s.character.mastery = clamp(s.character.mastery + power.mastery / scale);
  }
  const crisis = regionState(s).crisis;
  if (phase(s.character) < 2 || !['rift', 'undead', 'wildhunt', 'dragon'].includes(crisis ?? '') || s.arcana.rune) return;
  if (rng.next() < .018 / scale) {
    changeStats(s.character, { health: -8, happiness: -4 });
    record(s, 'arcane-exposure', 'magic', 'Тень катастрофы', 'Магическая угроза добралась до твоего дома. Защитные руны могли бы смягчить удар.', 'loss');
  }
}

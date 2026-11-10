import type { GameState } from '../types';
import { profession } from '../content/professions';
import { type RandomSource } from './random';
import { clamp, lifeScale, record, regionState } from './rules';

export function checkMortality(s: GameState, rng: RandomSource) {
  if (s.ended || s.pending) return;
  const c = s.character;
  const region = regionState(s);
  const relativeAge = c.age / c.longevity;
  const exposed = !!c.profession && ['soldier', 'mercenary', 'scout'].includes(c.profession);
  const hazard = exposed && region.crisis === 'war' ? .011 : 0;
  const illness = c.condition === 'fever' && c.stats.health < 38 ? .02 : 0;
  const frailty = Math.max(0, (36 - c.stats.health) / 360);
  const ageHazard = .075 * (Math.max(0, relativeAge - .64) / .36) ** 3 / lifeScale(c);
  const workRisk = c.profession ? profession(c.profession).risk * .00038 : 0;
  const danger = .00045 + (100 - region.safety) * .000016;
  const death = c.stats.health <= 0 || relativeAge > 1.12
    || rng.next() < clamp(danger + frailty + ageHazard + hazard + workRisk + illness + c.lifeRisk, 0, .95);
  if (!death) {
    c.lifeRisk = 0;
    return;
  }
  const cause = c.condition === 'injury' && (c.lifeRisk > .03 || c.stats.health < 25) ? 'Последствия травмы'
    : exposed && region.crisis === 'war' && c.lifeRisk > .02 ? 'Гибель во время конфликта'
      : c.condition === 'fever' || c.condition === 'chronic' && c.stats.health < 35 ? 'Болезнь'
        : relativeAge >= .82 ? 'Естественная смерть' : 'Внезапное ухудшение здоровья';
  const epitaph = c.relationships.some(person => person.role === 'Ребёнок' && person.died === null && person.bond >= 65)
    ? 'Дома ещё долго вспоминали голос, который рассказывал эти истории.'
    : c.mastery >= 20 || c.education >= 32 ? 'В чужих тетрадях остались слова и наблюдения этой жизни.'
      : c.reputation >= 58 ? 'В общине остались люди, чья жизнь стала другой благодаря этим годам.'
        : 'В летописи сохранились дни, из которых сложилась эта жизнь.';
  s.ended = { cause, epitaph };
  s.scheduled = [];
  record(s, 'death', 'death', 'Конец жизни', `${cause}. ${epitaph}`, 'loss', true);
}

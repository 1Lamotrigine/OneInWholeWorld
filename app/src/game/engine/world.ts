import { atlas } from '../content/atlas';
import { officeHolder, publish } from './influence';
import { regionIds, regions } from '../content/world';
import type { GameState, RegionState } from '../types';
import { integer, weighted, type RandomSource } from './random';
import { clamp, record } from './rules';

const crises = {
  war: { start: 'Граница закрывается', end: 'Перемирие', text: 'Начинается вооружённый конфликт. Дороги и рынки становятся опаснее.', relief: 'Стороны согласились на перемирие. Дороги постепенно открываются.', effects: { conflict: 32, safety: -17, economy: -12 }, duration: [4, 9] },
  drought: { start: 'Сухие колодцы', end: 'Вода вернулась', text: 'Засуха сокращает запасы продовольствия. Цены на зерно растут.', relief: 'После дождей колодцы начали наполняться. Ожидается новый урожай.', effects: { food: -29, economy: -8 }, duration: [3, 6] },
  plague: { start: 'Мор', end: 'Ворота лечебницы открыты', text: 'Среди жителей распространяется болезнь. В некоторых домах закрылись двери.', relief: 'Случаев болезни стало меньше, и общины отменили ограничения.', effects: { safety: -14, economy: -13 }, duration: [3, 6] },
  trade: { start: 'Караваны открыли новый путь', end: 'Обозы сменили дорогу', text: 'Купцы наладили новые поставки. В поселениях становится больше работы.', relief: 'Торговый поток вернулся к обычному ритму.', effects: { economy: 23, food: 11, openness: 9 }, duration: [4, 10] },
  awakening: { start: 'Магическое пробуждение', end: 'Магия утихла', text: 'Природная магия усилилась. Необычные явления замечают даже вдали от школ.', relief: 'Странные явления стали реже, и местная магия вновь успокоилась.', effects: { magic: 26, safety: -7 }, duration: [4, 8] },
  academy: { start: 'Открытие школы', end: 'Первый выпуск школы', text: 'Новая школа открыла занятия. Доступ к наставникам расширился.', relief: 'Первый набор окончил обучение. Школа переходит к обычному расписанию.', effects: { education: 18, economy: 7 }, duration: [5, 10] },
} as const;
type Metric = keyof Omit<RegionState, 'crisis' | 'until'>;
const metrics: Metric[] = ['economy', 'safety', 'food', 'education', 'magic', 'conflict', 'openness'];
const crisisIds = Object.keys(crises) as (keyof typeof crises)[];

const dispatches = [
  ['Открытый реестр', 'На площади впервые вывесили отчёт о расходах общины.', 'openness', 5],
  ['Новый мост', 'Артели закончили переправу. Поставки больше не ждут спада воды.', 'economy', 6],
  ['Пожар на складе', 'Запасы сгорели до приезда обоза. Соседние дворы делятся зерном.', 'food', -7],
  ['Ремесленные чтения', 'Мастера начали открыто обмениваться записями об удачных опытах.', 'education', 5],
  ['Дозор на тракте', 'Общины выставили совместный дозор на опасной дороге.', 'safety', 6],
  ['Спор о пошлине', 'Два округа отзывают своих гонцов после спора о сборах.', 'conflict', 7],
  ['Нестабильный источник', 'У старой межи обнаружен источник, меняющий силу по ночам.', 'magic', 6],
  ['Общий зерновой фонд', 'Часть урожая отложили на случай неурожая и беженцев.', 'food', 6],
  ['Ложные карты', 'На дорогах появились поддельные планы застав. Проверки замедляют проезд.', 'openness', -6],
  ['Ученики открывают мастерскую', 'Новая артель взяла заказы, которые старые гильдии отклоняли.', 'economy', 6],
] as const;

export function evolveWorld(s: GameState, rng: RandomSource) {
  s.world.fronts = s.world.fronts.filter(front => front.until > s.world.year);
  for (const id of regionIds) {
    const current = s.world.regions[id];
    const base = regions[id];
    const local = id === s.character.region;
    const was = current.crisis;
    if (was && s.world.year >= current.until) {
      current.crisis = null;
      current.until = 0;
      publish(s, id, crises[was].end, crises[was].relief);
      if (local) record(s, 'end-' + was, 'world', crises[was].end, crises[was].relief, 'good');
    }
    if (!was && rng.next() < (local ? .064 : .037)) {
      const weights = { war: 1 + current.conflict / 18, drought: 1 + (100 - current.food) / 45, plague: 1.4, trade: current.openness / 20, awakening: current.magic / 20, academy: current.education / 21 };
      const { item: crisis } = weighted(crisisIds, key => weights[key], rng);
      current.crisis = crisis;
      const definition = crises[crisis];
      current.until = s.world.year + integer(definition.duration[0], definition.duration[1], rng);
      publish(s, id, definition.start, definition.text);
      if (local) record(s, 'start-' + crisis, 'world', definition.start, definition.text, ['war', 'plague', 'drought'].includes(crisis) ? 'loss' : 'good', true);
    }
    if (rng.next() < .014) {
      s.world.terms[id]++;
      publish(s, id, 'Смена власти', `${atlas[id].title} — ${officeHolder(s, id)}. Новый кабинет принимает первые прошения.`);
    } else if (rng.next() < .11) {
      const [title, text, metric, delta] = dispatches[integer(0, dispatches.length - 1, rng)];
      current[metric] = clamp(current[metric] + delta);
      publish(s, id, title, text);
    }
    const effects: Partial<Record<Metric, number>> = current.crisis ? crises[current.crisis].effects : {};
    for (const key of metrics) {
      const target = base[key] + (effects[key] ?? 0);
      current[key] = clamp(current[key] + (target - current[key]) * .34 + integer(-2, 2, rng));
    }
  }
}

export const crisisLabels: Record<keyof typeof crises, string> = {
  war: 'Вооружённый конфликт', drought: 'Засуха', plague: 'Мор', trade: 'Торговый подъём', awakening: 'Магическое пробуждение', academy: 'Открыта новая школа',
};

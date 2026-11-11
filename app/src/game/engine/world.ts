import { countryModifiers } from './world-effects';
import { atlas, neighbours } from '../content/atlas';
import { officeHolder, publish } from './influence';
import { regionIds, regions } from '../content/world';
import type { GameState, RegionState } from '../types';
import { integer, pick, weighted, type RandomSource } from './random';
import { clamp, record } from './rules';

const crises = {
  war: { start: 'Граница закрывается', end: 'Перемирие', text: 'Начинается вооружённый конфликт. Дороги и рынки становятся опаснее.', relief: 'Стороны согласились на перемирие. Дороги постепенно открываются.', effects: { conflict: 32, safety: -17, economy: -12 }, duration: [4, 9] },
  drought: { start: 'Сухие колодцы', end: 'Вода вернулась', text: 'Засуха сокращает запасы продовольствия. Цены на зерно растут.', relief: 'После дождей колодцы начали наполняться. Ожидается новый урожай.', effects: { food: -29, economy: -8 }, duration: [3, 6] },
  plague: { start: 'Мор', end: 'Ворота лечебницы открыты', text: 'Среди жителей распространяется болезнь. В некоторых домах закрылись двери.', relief: 'Случаев болезни стало меньше, и общины отменили ограничения.', effects: { safety: -14, economy: -13 }, duration: [3, 6] },
  trade: { start: 'Караваны открыли новый путь', end: 'Обозы сменили дорогу', text: 'Купцы наладили новые поставки. В поселениях становится больше работы.', relief: 'Торговый поток вернулся к обычному ритму.', effects: { economy: 23, food: 11, openness: 9 }, duration: [4, 10] },
  awakening: { start: 'Магическое пробуждение', end: 'Магия утихла', text: 'Природная магия усилилась. Необычные явления замечают даже вдали от школ.', relief: 'Странные явления стали реже, и местная магия вновь успокоилась.', effects: { magic: 26, safety: -7 }, duration: [4, 8] },
  winter: { start: 'Долгая зима', end: 'Оттепель', text: 'Зимние дороги закрылись раньше обычного. Общины делят топливо и припасы.', relief: 'Оттепель открыла дороги к рынкам и новым посевам.', effects: { food: -18, economy: -10, safety: -7 }, duration: [3, 6] },
  eruption: { start: 'Пепел над поселениями', end: 'Чистое небо', text: 'Вулканический выброс накрыл дороги и водосборы. Жители переносят запасы под крышу.', relief: 'Ветер унёс пепел. Общины приступают к расчистке каналов.', effects: { food: -16, safety: -15, economy: -12 }, duration: [2, 4] },
  rebellion: { start: 'Восстание кварталов', end: 'Новый городской договор', text: 'Кварталы отказались от прежнего сбора. Совет созывает делегатов и усиливает дозоры.', relief: 'Делегаты подписали новый договор. Торговля возвращается на площадь.', effects: { conflict: 24, safety: -12, openness: -10 }, duration: [3, 7] },
  pilgrimage: { start: 'Большое паломничество', end: 'Возвращение паломников', text: 'Тысячи путников идут через страну. Постоялые дворы и рынки расширяются.', relief: 'Паломники разошлись по домам и увезли рассказы о дороге.', effects: { economy: 14, openness: 18, food: -5 }, duration: [3, 6] },
  invention: { start: 'Распространение новых машин', end: 'Машины стали привычными', text: 'Дешёвые насосы и подъёмники меняют труд на мельницах и в шахтах.', relief: 'Мастерские освоили новые машины и открыли места для учеников.', effects: { education: 14, economy: 19, food: 8 }, duration: [5, 9] },
  eclipse: { start: 'Затмение двух светил', end: 'Светила разошлись', text: 'Редкое затмение меняет работу магических источников. Учёные и хранители спорят о мерах защиты.', relief: 'Магические источники вернулись к обычному ритму.', effects: { magic: 28, safety: -9, education: 7 }, duration: [2, 4] },
  academy: { start: 'Открытие школы', end: 'Первый выпуск школы', text: 'Новая школа открыла занятия. Доступ к наставникам расширился.', relief: 'Первый набор окончил обучение. Школа переходит к обычному расписанию.', effects: { education: 18, economy: 7 }, duration: [5, 10] },
} as const;
type Metric = keyof Omit<RegionState, 'crisis' | 'until'>;
const metrics: Metric[] = ['economy', 'safety', 'food', 'education', 'magic', 'conflict', 'openness'];
const crisisIds = Object.keys(crises) as (keyof typeof crises)[];

const dispatches = [
  ['Посольства меняются грамотами', 'Делегации соседних стран согласовали безопасный проезд гонцов.', 'openness', 7],
  ['Новая система мер', 'Мастера опубликовали таблицы перевода старых мер в новые.', 'education', 6],
  ['Плохие долговые расписки', 'Несколько торговых домов не выполнили обязательства. Кредиторы ограничили новые займы.', 'economy', -8],
  ['Восстановлен старый канал', 'Общая артель снова подвела воду к дальним полям.', 'food', 8],
  ['Караван беженцев', 'Прибывшие семьи ищут жильё и работу. Кварталы открывают общие кухни.', 'food', -5],
  ['Перевод древнего атласа', 'Учёные сверили старые названия и открыли ранее забытые сухие дороги.', 'education', 7],
  ['Публичные слушания', 'Совет выслушал жалобы общин на закрытые судебные заседания.', 'openness', 8],
  ['Ночная буря', 'Сильный ветер повредил крыши и несколько сигнальных башен.', 'safety', -7],
  ['Сохранённый урожай', 'Новые способы сушки помогли сохранить зерно до весны.', 'food', 7],
  ['Разменная монета', 'Города договорились принимать мелкие монеты без дополнительной проверки.', 'economy', 7],
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
  const expired = s.world.projects.filter(project => project.until <= s.world.year);
  s.world.projects = s.world.projects.filter(project => project.until > s.world.year);
  for (const project of expired) publish(s, project.region, 'Завершение общего дела', project.title + '. Наступил срок пересмотра договорённостей.');
  s.world.fronts = s.world.fronts.filter(front => front.until > s.world.year);
  for (const id of regionIds) {
    const current = s.world.regions[id];
    const base = regions[id];
    const influence = countryModifiers(s, id);
    const local = id === s.character.region;
    const was = current.crisis;
    if (was && s.world.year >= current.until) {
      current.crisis = null;
      current.until = 0;
      publish(s, id, crises[was].end, crises[was].relief);
      if (local) record(s, 'end-' + was, 'world', crises[was].end, crises[was].relief, 'good');
    }
    if (!was && rng.next() < (local ? .064 : .037)) {
      const weights = { war: 1 + current.conflict / 18, drought: 1 + (100 - current.food) / 45, plague: 1.4, trade: current.openness / 20, awakening: current.magic / 20, academy: current.education / 21, winter: 1.5, eruption: id === 'emberfall' ? 4 : .2, rebellion: current.conflict / 19, pilgrimage: current.openness / 30, invention: current.education / 28, eclipse: current.magic / 35 };
      const { item: crisis } = weighted(crisisIds, key => weights[key] * (influence.odds[key] ?? 1), rng);
      current.crisis = crisis;
      const definition = crises[crisis];
      current.until = s.world.year + integer(definition.duration[0], definition.duration[1], rng);
      if (crisis === 'war') {
        const targets = neighbours[id].filter(other => s.world.regions[other].crisis !== 'war');
        if (targets.length) {
          const other = pick(targets, rng);
          const opponent = s.world.regions[other];
          opponent.crisis = 'war'; opponent.until = current.until;
          opponent.conflict = clamp(opponent.conflict + 22); opponent.safety = clamp(opponent.safety - 10);
          s.world.fronts.push({ from: id, to: other, until: current.until });
          const text = `${regions[id].name} и ${regions[other].name} начали пограничный конфликт из-за спорных пошлин и дорог.`;
          publish(s, other, 'Война на границе', text);
          if (other === s.character.region) record(s, 'border-war', 'world', 'Война на границе', text, 'loss', true);
        }
      }
      publish(s, id, definition.start, definition.text);
      if (local) record(s, 'start-' + crisis, 'world', definition.start, definition.text, ['war', 'plague', 'drought'].includes(crisis) ? 'loss' : 'good', true);
    }
    const ongoing = s.world.projects.filter(project => project.region === id && (s.world.year - project.started) % 6 === 0 && project.started !== s.world.year);
    for (const project of ongoing) publish(s, id, project.title, `Продолжается дело, начатое ${project.founder}. Его условия меняют положение страны и вероятность новых событий.`);
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
      const target = base[key] + (effects[key] ?? 0) + (influence.metrics[key] ?? 0);
      current[key] = clamp(current[key] + (target - current[key]) * .34 + integer(-2, 2, rng));
    }
  }
  if (rng.next() < .014) {
    const phenomenon = rng.next() < .5 ? 'winter' : 'eclipse';
    const definition = crises[phenomenon];
    const until = s.world.year + integer(3, 5, rng);
    for (const id of regionIds) {
      const region = s.world.regions[id];
      if (region.crisis === 'war') continue;
      region.crisis = phenomenon;
      region.until = until;
      publish(s, id, definition.start, definition.text);
    }
    record(s, 'continental-' + phenomenon, 'world', definition.start, 'Явление затронуло несколько стран одновременно. ' + definition.text, 'neutral', true);
  }
}

export const crisisLabels: Record<keyof typeof crises, string> = {
  winter: 'Долгая зима', eruption: 'Вулканический пепел', rebellion: 'Восстание кварталов', pilgrimage: 'Большое паломничество', invention: 'Расцвет изобретений', eclipse: 'Затмение двух светил',
  war: 'Вооружённый конфликт', drought: 'Засуха', plague: 'Мор', trade: 'Торговый подъём', awakening: 'Магическое пробуждение', academy: 'Открыта новая школа',
};

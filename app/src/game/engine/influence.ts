import { atlas, cityNotes, neighbours, paths, type PathId } from '../content/atlas';
import { races, regions, type RegionId } from '../content/world';
import type { GameState, WorldNews } from '../types';
import { clamp, isAdult, record, regionState } from './rules';

export function takePath(current: GameState, path: PathId): GameState {
  if (current.ended || current.path || !Object.hasOwn(paths, path)) return current;
  const s = structuredClone(current);
  s.path = path;
  s.priority = paths[path].priority;
  record(s, 'life-path', 'stage', `Путь на всю жизнь: ${paths[path].name}`, paths[path].story, 'good', true);
  s.revision++;
  return s;
}

export function publish(s: GameState, region: RegionId, title: string, text: string) {
  const news: WorldNews = { year: s.world.year, region, title, text };
  s.world.news.push(news);
  if (s.world.news.length > 36) s.world.news.shift();
}

export function officeHolder(s: GameState | undefined, region: RegionId) {
  const country = atlas[region];
  return country.leaders[(s?.world.terms[region] ?? 0) % country.leaders.length];
}

export function moveOffer(s: GameState, region: RegionId, name: string) {
  const c = s.character;
  const city = cityNotes(region).find(city => city.name === name);
  const home = c.region === region;
  const compatible = !!s.path && !!city?.roles.some(role => role === s.path);
  const cost = home ? 4 : compatible ? 8 : 20;
  const reason = !city ? 'Поселение не найдено.'
    : s.ended || !s.revealed || s.pending ? 'Доступно в свободный год жизни.'
    : c.settlement === name && home ? 'Ваш дом уже здесь.'
    : !s.path ? 'Сначала выберите жизненный путь.'
    : c.age < races[c.race].stages[1] ? 'Переезд доступен с юности.'
    : !compatible && !home && c.reputation < 40 ? 'Нужен подходящий путь или 40 репутации.'
    : s.world.regions[region].crisis === 'war' && !['warrior', 'hero'].includes(s.path) ? 'Во время войны проходят только воины и спасатели.'
    : s.lastMove && s.world.year - s.lastMove < 4 ? 'После переезда должно пройти четыре года.'
    : c.wealth < cost ? `Нужно ${cost} монет.` : '';
  return { cost, reason };
}

export function moveTo(current: GameState, region: RegionId, name: string) {
  const offer = moveOffer(current, region, name);
  if (offer.reason) return current;
  const s = structuredClone(current);
  const c = s.character;
  c.region = region;
  c.settlement = name;
  c.wealth -= offer.cost;
  c.profession = null;
  s.lastMove = s.world.year;
  record(s, 'path-move', 'travel', 'Новый дом', `${name}, ${regions[region].name}. Переезд стоил ${offer.cost} монет. Поиск работы начинается заново.`, 'good', true);
  s.revision++;
  return s;
}

export const actions = {
  militia: { label: 'Созвать ополчение', paths: ['warrior'], reputation: 16, cost: 6, text: 'Поднять безопасность и ослабить напряжение.' },
  ward: { label: 'Поставить защитные руны', paths: ['mage'], reputation: 12, cost: 6, text: 'Повысить безопасность и укротить всплеск магии.' },
  rescue: { label: 'Открыть убежище', paths: ['hero'], reputation: 13, cost: 6, text: 'Смягчить нехватку припасов и защитить жителей.' },
  peace: { label: 'Заключить перемирие', paths: ['politician', 'hero'], reputation: 30, cost: 8, text: 'Завершить местную войну и снять напряжение с обеих сторон.' },
  declare: { label: 'Объявить войну', paths: ['politician', 'villain'], reputation: 50, cost: 20, text: 'Открыть конфликт с соседней страной на восемь лет.' },
  trade: { label: 'Открыть торговый маршрут', paths: ['merchant'], reputation: 15, cost: 12, text: 'Запустить торговый подъём, расширить доступ к рынкам.' },
  sabotage: { label: 'Сорвать поставки', paths: ['villain'], reputation: 14, cost: 0, text: 'Получить прибыль за счёт снабжения страны.' },
  clinic: { label: 'Основать общинную лечебницу', paths: ['keeper'], reputation: 12, cost: 9, text: 'Поднять безопасность, просвещение и остановить мор.' },
} satisfies Record<string, { label: string; paths: PathId[]; reputation: number; cost: number; text: string }>;
export type ActionId = keyof typeof actions;

export function warTargets(s: GameState) {
  return neighbours[s.character.region].filter(id => s.world.regions[id].crisis !== 'war');
}

export function actionReason(s: GameState, id: ActionId, target?: RegionId) {
  const a = actions[id];
  const c = s.character;
  const r = regionState(s);
  if (s.ended || !s.revealed || s.pending) return 'Доступно в свободный год жизни.';
  if (!s.path || !(a.paths as readonly PathId[]).includes(s.path)) return 'Нужен другой жизненный путь.';
  if (!isAdult(c)) return 'Доступно со зрелости.';
  if (s.lastAct && s.world.year - s.lastAct < 5) return 'Между действиями должно пройти пять лет.';
  if (c.reputation < a.reputation) return `Нужно ${a.reputation} репутации.`;
  if (c.wealth < a.cost) return `Нужно ${a.cost} монет.`;
  if (id === 'ward' && c.mastery < 3 && c.education < 15) return 'Нужно 3 мастерства или 15 образования.';
  if (id === 'peace' && r.crisis !== 'war') return 'В стране нет войны.';
  if (id === 'trade' && r.crisis === 'war') return 'Дороги закрыты из-за войны.';
  if (id === 'declare' && (r.crisis === 'war' || !target || !warTargets(s).includes(target))) return 'Нужен сосед без действующей войны, а ваша страна должна быть вне войны.';
  return '';
}

export function actOnWorld(current: GameState, id: ActionId, target?: RegionId) {
  if (actionReason(current, id, target)) return current;
  const s = structuredClone(current);
  const c = s.character;
  const home = c.region;
  const r = regionState(s);
  const a = actions[id];
  c.wealth -= a.cost;
  s.lastAct = s.world.year;
  let text = a.text;
  switch (id) {
    case 'militia': r.safety = clamp(r.safety + 17); r.conflict = clamp(r.conflict - 9); break;
    case 'ward':
      r.magic = clamp(r.magic - 14); r.safety = clamp(r.safety + 12);
      if (r.crisis === 'awakening') { r.crisis = null; r.until = 0; }
      break;
    case 'rescue': r.food = clamp(r.food + 15); r.safety = clamp(r.safety + 12); break;
    case 'trade':
      r.crisis = 'trade'; r.until = s.world.year + 8;
      r.economy = clamp(r.economy + 15); r.openness = clamp(r.openness + 10); break;
    case 'sabotage':
      r.food = clamp(r.food - 16); r.economy = clamp(r.economy - 14);
      r.conflict = clamp(r.conflict + 12); c.wealth = clamp(c.wealth + 18, 0, 99999);
      s.scheduled.push({ year: s.world.year + 3, eventId: 'shadow-inquiry' }); break;
    case 'clinic':
      r.safety = clamp(r.safety + 12); r.education = clamp(r.education + 8);
      if (r.crisis === 'plague') { r.crisis = null; r.until = 0; }
      break;
    case 'declare': {
      if (!target) return current;
      const until = s.world.year + 8;
      s.world.fronts.push({ from: home, to: target, until });
      for (const region of [home, target]) {
        const affected = s.world.regions[region];
        affected.crisis = 'war'; affected.until = until;
        affected.conflict = clamp(affected.conflict + 30);
        affected.safety = clamp(affected.safety - 14);
      }
      text = `${regions[home].name} и ${regions[target].name} вступают в войну. Безопасность упала по обе стороны границы.`;
      publish(s, target, 'Война на границе', text);
      break;
    }
    case 'peace': {
      const front = s.world.fronts.find(f => f.from === home || f.to === home);
      for (const region of front ? [front.from, front.to] : [home]) {
        const affected = s.world.regions[region];
        affected.crisis = null; affected.until = 0;
        affected.conflict = clamp(affected.conflict - 27);
        affected.safety = clamp(affected.safety + 12);
      }
      if (front) {
        s.world.fronts = s.world.fronts.filter(f => f !== front);
        const other = front.from === home ? front.to : front.from;
        text = `${regions[home].name} и ${regions[other].name} открыли дороги после переговоров.`;
        publish(s, other, 'Перемирие', text);
      } else text = 'Стороны сложили оружие. Напряжение спало, дороги снова открыты.';
      break;
    }
  }
  c.reputation = clamp(c.reputation + (id === 'sabotage' ? -2 : 5));
  publish(s, home, a.label, text);
  record(s, 'action-' + id, 'world', a.label, text, ['declare', 'sabotage'].includes(id) ? 'loss' : 'good', true);
  s.revision++;
  return s;
}

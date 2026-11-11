'use client';

import { Compass, Landmark } from 'lucide-react';
import { Localize } from '../i18n/localize';
import type { GameState } from '../game/types';
import { cityNotes, paths, type PathId } from '../game/content/atlas';
import { projectOutlook, projectMetrics } from '../game/content/projects';
import { regions } from '../game/content/world';
import { cityPenalty, citySupport } from '../game/engine/path-development';
import { phase } from '../game/engine/rules';
import { cityBenefits } from '../game/content/city-benefits';
import { pathStories } from '../game/content/path-missions';

const format = (n: number) => Number(n.toFixed(2));

export function CityOpportunity({ path, state, region, settlement }: {
  path: PathId; state?: GameState; region: keyof typeof regions; settlement: string;
}) {
  const benefit = state ? citySupport(state, region, settlement, path) : cityNotes(region).find(city => city.name === settlement)?.roles.includes(path) ? { ...cityBenefits[path], experience: .7, interval: 3 } : null;
  if (!benefit) {
    const penalty = state && cityPenalty(state, region, settlement, path);
    return <Localize><div className="city-opportunity city-mismatch"><strong>Неподходящая среда для карьеры</strong>
      <p>Нет профильных наставников, заказов и защиты. С юности ежегодно:</p>
      {penalty && <dl><div><dt>Опыт пути</dt><dd>+{format(penalty.experience)}</dd></div>
        <div><dt>Репутация</dt><dd>{format(penalty.reputation)}</dd></div><div><dt>Монеты</dt><dd>{format(penalty.wealth)}</dd></div>
        <div><dt>Счастье</dt><dd>{format(penalty.happiness)}</dd></div></dl>}
      <p>Поручения приходят реже. Во взрослом возрасте возможны потеря работы и репутации; при войне или низкой безопасности — тяжёлое ранение.</p>
      {penalty && <p>Ежегодный риск карьерной неудачи: {format(penalty.hazard * 100)}%. Проверка поручений каждые {penalty.interval} лет.</p>}
    </div></Localize>;
  }
  const skills = [
    ['Опыт пути', benefit.experience], ['Образование', benefit.education],
    ['Репутация', benefit.reputation], ['Мастерство магии', benefit.mastery],
    ['Монеты', benefit.wealth], ['Сила', benefit.strength], ['Харизма', benefit.charisma],
  ] as const;
  return <Localize><div className="city-opportunity">
    <strong>{benefit.institution}</strong>
    <p>Дополнительно за год с начала юности</p>
    <dl>{skills.filter(([, value]) => value > 0).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>+{format(value)}</dd></div>)}</dl>
    <p>Проверка поручений роли каждые {benefit.interval} лет при наличии подходящих событий.</p>
    {!state && <small>Базовые значения. Темп обучения зависит от расы.</small>}
  </div></Localize>;
}

export function PathImpact({ state }: { state: GameState }) {
  if (!state.path || state.ended) return null;
  const path = state.path;
  const benefit = citySupport(state);
  const next = pathStories[path].chapters.findIndex((_, index) => !Object.hasOwn(state.seen, `path-${path}-${index + 1}`));
  const target = next >= 0 ? [4, 18, 40][next] : 40;
  return <Localize><section className="panel path-impact" aria-label="Развитие жизненного пути">
    <div className="path-impact-heading"><span className="panel-label"><Compass size={16} /> {paths[path].name}</span>
      <strong>Опыт пути · {format(state.pathExperience)}</strong>
    </div>
    {phase(state.character) < 2 ? <p>Первые самостоятельные поручения откроются с юности.</p> :
      next >= 0 ? <p>Следующая веха: {pathStories[path].chapters[next][0]}. Нужно {target} опыта пути.</p> :
      <p>Основные вехи пройдены. Принятые решения продолжают влиять на страны.</p>}
    <details open><summary>{benefit ? 'Город поддерживает ваш путь' : 'В городе нет профильного обучения'}</summary>
      <CityOpportunity path={path} state={state} region={state.character.region} settlement={state.character.settlement} />
      <p>Город меняет скорость достижения вех пути: в подходящей среде важные ролевые решения становятся доступны раньше.</p>
    </details>
  </section></Localize>;
}

const metricLabels = { economy: 'Благосостояние', safety: 'Безопасность', food: 'Продовольствие', education: 'Образование', magic: 'Магия', conflict: 'Конфликт', openness: 'Открытость' };

export function WorldLegacy({ state }: { state: GameState }) {
  const projects = state.world.projects.filter(project => project.region === state.character.region);
  if (!projects.length) return null;
  return <Localize><details className="panel data-panel world-legacy" open>
    <summary><span className="panel-label"><Landmark size={16} /> Дела, меняющие страну</span><span>{projects.length}</span></summary>
    <div className="panel-body">{projects.map(project => <article key={project.id}>
      <h3>{project.title}</h3><p>{project.founder} · до {project.until} года</p>
      <ul>{Object.entries(projectMetrics(project.kind)).map(([key, value]) => <li key={key}>{metricLabels[key as keyof typeof metricLabels]} {value > 0 ? '+' : ''}{value}</li>)}</ul>
      <small>{projectOutlook[project.kind]} Влияние на показатели проявляется со следующего года.</small>
    </article>)}</div>
  </details></Localize>;
}

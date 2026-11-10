'use client';

import { BookOpen, ChevronDown, Coins, Globe2, Heart, Hourglass, Sparkles, UserRound, UsersRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { professions } from '../game/content/professions';
import { backgrounds, races, regions, statLabels, traits, type Stats } from '../game/content/world';
import { categories, stages, type GameState } from '../game/types';
import { lifeStage, phase, regionState } from '../game/engine/rules';
import { crisisLabels } from '../game/engine/world';
import { Portrait } from './art';
import { WorldMap } from './world-map';
import { atlas, paths } from '../game/content/atlas';
import { officeHolder } from '../game/engine/influence';

const statusColors: Record<keyof Stats, string> = {
  health: 'green', happiness: 'gold', intellect: 'blue', strength: 'red', charisma: 'purple', magic: 'purple',
};
const percent = new Intl.NumberFormat('ru', { style: 'percent', maximumFractionDigits: 2 });
export const number = new Intl.NumberFormat('ru', { maximumFractionDigits: 0 });

function inflect(count: number, [one, few, many]: [string, string, string]) {
  const last = count % 10;
  return count % 100 >= 11 && count % 100 <= 14 ? many : last === 1 ? one : last >= 2 && last <= 4 ? few : many;
}

export function ageText(age: number) {
  return `${age} ${inflect(age, ['год', 'года', 'лет'])}`;
}

function ResponsivePanel({ title, icon, children, extra, id }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; extra?: React.ReactNode; id?: string;
}) {
  const panel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const media = matchMedia('(min-width: 768px)');
    const setDefault = () => { if (panel.current) panel.current.open = media.matches; };
    setDefault();
    media.addEventListener('change', setDefault);
    return () => media.removeEventListener('change', setDefault);
  }, []);
  return <details ref={panel} className="panel data-panel" id={id} open>
    <summary><span className="panel-label">{icon}{title}</span>{extra}<ChevronDown className="panel-chevron" size={16} /></summary>
    <div className="panel-body">{children}</div>
  </details>;
}

export function StatBar({ label, value, tone = 'green' }: { label: string; value: number; tone?: string }) {
  const rounded = Math.round(value);
  return <div className="stat-row">
    <div><span>{label}</span><strong>{rounded}</strong></div>
    <div className="stat-track" role="progressbar" aria-label={label} aria-valuenow={rounded} aria-valuemin={0} aria-valuemax={100}><span style={{ width: rounded + '%', background: `var(--${tone})` }} /></div>
  </div>;
}

export function CharacterPanel({ state }: { state: GameState }) {
  const c = state.character;
  return <div className="character-panel-wrap"><WorldMap state={state} compact /><ResponsivePanel title="Персонаж" icon={<UserRound size={16} />} extra={<span className="compact-identity"><Portrait state={state} compact /><span><strong>{c.name}</strong>{races[c.race].name} · {backgrounds[c.status].status} · здоровье {Math.round(c.stats.health)}</span></span>}>
    <div className="character-identity"><Portrait state={state} /><div>
      <p className="eyebrow">{races[c.race].name}</p><h2>{c.name}</h2><p className="muted">{lifeStage(c)} · {ageText(c.age)}</p>
    </div></div>
    <dl className="profile-facts">
      <div><dt>Происхождение</dt><dd>{backgrounds[c.background].name}</dd></div>
      <div><dt>Место рождения</dt><dd>{c.birthplace}, {regions[c.origin].name}</dd></div>
      <div><dt>Статус</dt><dd>{backgrounds[c.status].status}</dd></div>
      {state.path && <div><dt>Жизненный путь</dt><dd>{paths[state.path].name}</dd></div>}
      <div><dt>Занятие</dt><dd>{c.profession ? professions[c.profession].name : c.retired ? 'Завершил трудовую жизнь' : 'Без профессии'}</dd></div>
    </dl>
    <div className="subhead"><Heart size={15} /> Характеристики</div>
    <div className="stat-list">{(Object.keys(statLabels) as (keyof Stats)[]).map(key => <StatBar key={key} label={statLabels[key]} value={c.stats[key]} tone={statusColors[key]} />)}</div>
    {c.condition && <p className="condition"><Heart size={14} /> {({ fever: 'Горячка', injury: 'Травма', chronic: 'Хроническое недомогание' })[c.condition]}</p>}
    <dl className="profile-facts compact-facts">
      <div><dt><Coins size={14} /> Сбережения</dt><dd>{number.format(c.wealth)} монет</dd></div>
      <div><dt>Образование</dt><dd>{number.format(c.education)} / 100</dd></div>
      <div><dt>Репутация</dt><dd>{number.format(c.reputation)} / 100</dd></div>
      {c.mastery > 0 && <div><dt>Мастерство магии</dt><dd>{number.format(c.mastery)} / 100</dd></div>}
    </dl>
  </ResponsivePanel></div>;
}

export function FamilyPanel({ state }: { state: GameState }) {
  const c = state.character;
  const relationships = [...c.relationships].sort((a, b) => Number(a.died !== null) - Number(b.died !== null));
  return <ResponsivePanel title="Семья и связи" icon={<UsersRound size={16} />}>
    {!relationships.length ? <p className="muted">Близких в летописи пока нет.</p> :
      <ul className="family-list">
        {relationships.map(person => <li key={person.id}>
          <span className="person-mark"><UserRound size={16} /></span>
          <div><strong>{person.name}</strong><small>{person.role === 'Сиблинг' ? 'Брат / сестра' : person.role} · {person.died ? `Утрата, ${person.died} год` : ageText(state.world.year - person.born)}</small></div>
          {person.died === null && <span className="bond" aria-label={`Отношения: ${Math.round(person.bond)} из 100`}><Heart size={13} /> {Math.round(person.bond)}</span>}
        </li>)}
      </ul>}
  </ResponsivePanel>;
}

export function LifeProgress({ state }: { state: GameState }) {
  const current = phase(state.character);
  return <ResponsivePanel title="Ход жизни" icon={<Hourglass size={16} />}>
    <p className="stage-current">{state.ended ? 'Жизнь завершена' : stages[current]}</p>
    <ol className="life-stages" aria-label="Этапы жизни">
      {stages.map((stage, index) => <li key={stage} aria-current={index === current ? 'step' : undefined} data-past={index < current} title={stage}><span /><small>{stage}</small></li>)}
    </ol>
    <p className="muted">{ageText(state.character.age)} в летописи · {state.chronicle.length} {inflect(state.chronicle.length, ['запись', 'записи', 'записей'])}</p>
  </ResponsivePanel>;
}

export function ContextPanels({ state }: { state: GameState }) {
  const c = state.character;
  const r = regionState(state);
  const fields = [['Безопасность', r.safety], ['Благосостояние', r.economy], ['Продовольствие', r.food], ['Образование', r.education], ['Магия', r.magic], ['Конфликт', r.conflict], ['Открытость', r.openness]] as const;
  return <>
    <ResponsivePanel title="Черты" icon={<Sparkles size={16} />}>
      <dl className="traits-list">{c.traits.map(id => <div key={id}><dt>{traits[id][0]}</dt><dd>{traits[id][1]}</dd></div>)}</dl>
    </ResponsivePanel>
    <ResponsivePanel title="Окружающий мир" icon={<Globe2 size={16} />} id="world">
      <h3>{regions[c.region].name}</h3><p className="muted">{regions[c.region].polity}</p>
      <p className="world-state"><span />{r.crisis ? crisisLabels[r.crisis] : 'Спокойная обстановка'}</p>
      <dl className="profile-facts world-facts">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{Math.round(value)} / 100</dd></div>)}</dl>
      <div className="world-figures"><p>{atlas[c.region].lore}</p>
        <strong>{officeHolder(state, c.region)}</strong><small>{atlas[c.region].title}</small>
        <strong>{atlas[c.region].notable[0]}</strong><small>{atlas[c.region].notable[1]} · {atlas[c.region].notable[2]}</small>
      </div>
      <details className="other-regions"><summary>Другие регионы</summary><ul>{Object.entries(state.world.regions).filter(([id]) => id !== c.region).map(([id, context]) => <li key={id}>
        <strong>{regions[id as keyof typeof regions].name}</strong><small>{context.crisis ? crisisLabels[context.crisis] : 'Спокойная обстановка'}</small>
      </li>)}</ul></details>
    </ResponsivePanel>
  </>;
}

export function BirthOdds({ state }: { state: GameState }) {
  const { birthOdds } = state;
  return <dl className="birth-odds">
    <div><dt>Раса</dt><dd>{percent.format(birthOdds.race)}</dd></div>
    <div><dt>Регион среди рождений этой расы</dt><dd>{percent.format(birthOdds.region)}</dd></div>
    <div><dt>Происхождение в этом регионе</dt><dd>{percent.format(birthOdds.background)}</dd></div>
  </dl>;
}

export function Chronicle({ state }: { state: GameState }) {
  const [count, setCount] = useState(8);
  const [ascending, setAscending] = useState(false);
  const entries = state.chronicle;
  const rows = ascending ? entries.slice(0, count) : entries.slice(-count).reverse();
  return <section id="chronicle" className="panel chronicle" aria-labelledby="chronicle-heading">
    <div className="chronicle-head">
      <div><span className="panel-label"><BookOpen size={16} /> Личная история</span><h2 id="chronicle-heading">Летопись жизни</h2></div>
      <button className="button sort-button" type="button" onClick={() => setAscending(!ascending)} aria-label="Изменить порядок записей">{ascending ? 'Сначала ранние' : 'Сначала новые'}</button>
    </div>
    <ol className="chronicle-list">
      {rows.map((entry, index) => <li key={ascending ? index : entries.length - 1 - index} data-tone={entry.tone}>
        <span className="timeline-mark" />
        <div className="timeline-date"><strong>{ageText(entry.age)}</strong><small>{entry.year} год</small></div>
        <div className="timeline-text"><div><h3>{entry.title}</h3><span>{categories[entry.category]}</span></div><p>{entry.text}</p></div>
      </li>)}
    </ol>
    {count < entries.length && <button className="button more-button" onClick={() => setCount(count + 16)}>Показать ещё · {entries.length - count}</button>}
  </section>;
}

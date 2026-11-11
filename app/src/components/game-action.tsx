'use client';

import { Localize } from '../i18n/localize';
import { Check, Compass, GitFork, Sparkles } from 'lucide-react';
import { paths } from '../game/content/atlas';
import { eventById } from '../game/engine/events';
import { regions, priorities, type Priority } from '../game/content/world';
import { categories, type GameState } from '../game/types';
import { useGame } from '../stores/game-store';

export function GameAction({ state }: { state: GameState }) {
  const { choose, setPriority, saving } = useGame();
  const pending = state.pending;
  const event = pending && eventById.get(pending.eventId);
  const project = event?.id === 'path-project-reckoning'
    ? state.world.projects.findLast(project => project.founder === state.character.name) : undefined;
  if (state.ended) return null;
  if (pending && event) return <Localize><section className="panel action-card decision" aria-labelledby="decision-heading" id="decision">
    <p className="eyebrow"><GitFork size={16} /> Важное решение <span>{event.path ? paths[event.path].name : categories[event.category]}</span></p>
    <h2 id="decision-heading">{event.title}</h2><p>{event.text}</p>
    {project && <p className="project-under-review">{project.title} · {regions[project.region].name} · {project.until}</p>}
    <div className="decision-options">{pending.optionIds.map(id => {
      const option = event.choices?.find(choice => choice.id === id);
      return option && <button key={id} className="choice-button" disabled={saving} onClick={() => choose(pending.token, id)}>
        <span><strong>{option.label}</strong><small>{option.hint}</small>{option.gamble && <small className="choice-risk">Вероятность успеха: {Math.round(Math.max(.08, Math.min(.95, option.gamble.chance(state))) * 100)}%</small>}</span><Compass size={18} />
      </button>;
    })}</div>
  </section></Localize>;
  return <Localize><section className="panel action-card year-focus" aria-labelledby="focus-heading">
    <p className="eyebrow"><Sparkles size={16} /> Ход судьбы</p>
    <h2 id="focus-heading">На что направить силы?</h2>
    <p>{priorities[state.priority][1]} Приоритет влияет на ход лет и выбор в авторежиме.</p>
    <div className="focus-options" role="group" aria-label="Приоритет жизни">{Object.entries(priorities).map(([id, [label]]) => <button className="button focus-chip" key={id} onClick={() => setPriority(id as Priority)} disabled={saving} aria-pressed={state.priority === id}>
      {state.priority === id && <Check size={14} />}{label}
    </button>)}</div>
  </section></Localize>;
}

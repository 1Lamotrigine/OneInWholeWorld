'use client';

import { Localize } from '../i18n/localize';
import { BookOpen, Compass, Crown, Flame, HeartHandshake, Landmark, Shield, Sparkles, Sword, Wallet } from 'lucide-react';
import { useState } from 'react';
import { pathIds, paths, type PathId } from '../game/content/atlas';
import { regions, type RegionId } from '../game/content/world';
import { actionReason, actions, warTargets, type ActionId } from '../game/engine/influence';
import type { GameState } from '../game/types';
import { useGame } from '../stores/game-store';

const icons = { adventurer: Compass, diplomat: Landmark, spy: Shield, healer: HeartHandshake, scholar: BookOpen, ranger: Compass, bard: Sparkles, artificer: Landmark, warrior: Sword, mage: Sparkles, hero: Shield, politician: Crown, merchant: Wallet, villain: Flame, keeper: HeartHandshake };
export const PathIcon = ({ path }: { path: PathId }) => { const Icon = icons[path]; return <Localize><Icon size={18} /></Localize>; };

export function PathPicker({ state, showPicked = true }: { state: GameState; showPicked?: boolean }) {
  const { saving, takePath } = useGame();
  const [selection, select] = useState<PathId | null>(null);
  if (state.path) return <Localize>{showPicked ? <p className="chosen-path"><PathIcon path={state.path} /> Жизненный путь: <strong>{paths[state.path].name}</strong></p> : null}</Localize>;
  return <Localize><section className="path-picker">
    <h2>Выберите жизненный путь</h2>
    <p className="muted">Выбор останется на всю жизнь. Профессию и положение по-прежнему определят события и ваши поступки.</p>
    <div className="path-choices">{pathIds.map(id => <button key={id} className="button path-choice" onClick={() => select(id)} aria-pressed={id === selection} aria-label={paths[id].name}>
      <PathIcon path={id} /><span><strong>{paths[id].name}</strong><small>{paths[id].verb}</small></span>
    </button>)}</div>
    {selection && <div className="path-confirm">
      <p>{paths[selection].story}</p>
      <button className="button primary" onClick={() => takePath(selection)} disabled={saving}>Подтвердить путь · {paths[selection].name}</button>
    </div>}
  </section></Localize>;
}

export function WorldActions({ state }: { state: GameState }) {
  const [target, setTarget] = useState<RegionId | ''>('');
  const { saving, actOnWorld } = useGame();
  const path = state.path;
  if (!path || state.ended) return null;
  const targets = warTargets(state);
  const selected = target && targets.includes(target) ? target : targets[0];
  return <Localize><details className="panel data-panel">
    <summary><span className="panel-label"><Landmark size={16} /> Влияние на мир</span><span aria-hidden="true">⌄</span></summary>
    <div className="panel-body world-action-list">
      <p className="muted">Путь: {paths[path].name}. Действия затрагивают {regions[state.character.region].name}.</p>
      {(Object.keys(actions) as ActionId[]).filter(id => (actions[id].paths as PathId[]).includes(path)).map(id => {
        const a = actions[id];
        const reason = actionReason(state, id, id === 'declare' ? selected : undefined);
        return <div key={id} className="world-action">
          <strong>{a.label}</strong><p>{a.text}</p>
          {id === 'declare' && targets.length > 0 && <label className="city-select">Соседняя страна<select value={selected} onChange={event => setTarget(event.target.value as RegionId)}>
            {targets.map(id => <option key={id} value={id}>{regions[id].name}</option>)}
          </select></label>}
          <button className="button" disabled={saving || !!reason} onClick={() => actOnWorld(id, id === 'declare' ? selected : undefined)}>{a.label}{a.cost ? ` · ${a.cost}` : ''}</button>
          {reason && <small>{reason}</small>}
        </div>;
      })}
    </div>
  </details></Localize>;
}

export function WorldGazette({ state }: { state: GameState }) {
  const [count, setCount] = useState(6);
  return <Localize><details className="panel data-panel">
    <summary><span className="panel-label"><BookOpen size={16} /> Вести из Элариона</span><span aria-hidden="true">{state.world.news.length}</span></summary>
    <div className="panel-body gazette">
      {state.world.news.length ? <ul>{state.world.news.slice(-count).reverse().map((item, index) => <li key={`${item.year}-${item.region}-${state.world.news.length - 1 - index}`}>
        <small>{regions[item.region].name} · {item.year}</small><strong>{item.title}</strong><p>{item.text}</p>
      </li>)}</ul> : <p className="muted">Первые вести придут из разных стран с течением времени.</p>}
      {count < state.world.news.length && <button className="button" onClick={() => setCount(count + 8)}>Более ранние вести</button>}
    </div>
  </details></Localize>;
}

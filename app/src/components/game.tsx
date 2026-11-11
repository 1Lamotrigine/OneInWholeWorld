'use client';

import { Localize } from '../i18n/localize';
import { ArrowRight, BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { regions } from '../game/content/world';
import { useGame } from '../stores/game-store';
import { Loading, StorageStatus } from './app-shell';
import { PathImpact, WorldLegacy } from './path-impact';
import { Scene } from './art';
import { GameAction } from './game-action';
import { CharacterPanel, Chronicle, ContextPanels, FamilyPanel, LifeProgress } from './game-panels';
import { DeathSummary } from './death-summary';
import { TimeControls } from './time-controls';
import { BirthReveal } from './birth-reveal';
import { PathPicker, WorldActions, WorldGazette } from './life-path';

export function Game() {
  const { state, loading, saving, error, exportMode, newLife } = useGame();
  useEffect(() => {
    return () => {
      useGame.setState({ paused: true });
    };
  }, []);
  if (loading) return <Localize><main id="main" className="shell game-empty"><Loading /></main></Localize>;
  if (!state) return <Localize><main id="main" className="shell game-empty">
    <StorageStatus />
    <section className="panel action-card"><p className="eyebrow"><BookOpen size={16} /> Жизнь в Эларионе</p><h1>Пока здесь пусто</h1><p>Начни новую жизнь или открой сохранение из архива.</p>
      <div className="summary-actions"><button className="button primary" onClick={newLife} disabled={saving}>Начать жизнь <ArrowRight size={16} /></button><Link className="button" href="/archive/">Архив</Link></div>
    </section>
  </main></Localize>;
  const c = state.character;
  if (!state.revealed) return <Localize><BirthReveal key={state.saveId} state={state} /></Localize>;
  return <Localize><main id="main" className="game-page" key={state.saveId}>
    <TimeControls state={state} />
    <div className="shell game-main">
      <StorageStatus />
      <div className="game-context"><div><span>Эларион</span><ChevronRight size={14} /><strong>{regions[c.region].name}</strong></div>
        <div><a href="#world">Мир</a><a href="#chronicle">Летопись</a><span className="save-state" role="status">{exportMode ? 'Ручной экспорт' : error ? 'Ошибка сохранения' : saving ? 'Сохраняем…' : 'Сохранено на устройстве'}</span></div>
      </div>
      <div className="game-grid">
        <div className="central-column column">
          <Scene state={state} />
          <GameAction state={state} />
          <PathImpact state={state} />
          {!state.path && !state.ended && <div className="panel action-card"><PathPicker state={state} /></div>}
          {state.ended && <DeathSummary state={state} locked={saving || !!error} onNew={newLife} />}
          <Chronicle state={state} />
        </div>
        <aside className="character-column column" aria-label="О персонаже"><CharacterPanel state={state} /></aside>
        <aside className="world-column column" aria-label="Семья и мир"><FamilyPanel state={state} /><LifeProgress state={state} /><WorldActions state={state} /><WorldLegacy state={state} /><WorldGazette state={state} /><ContextPanels state={state} /></aside>
      </div>
    </div>
  </main></Localize>;
}

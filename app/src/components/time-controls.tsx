'use client';

import { Localize } from '../i18n/localize';
import { FastForward, Pause, Play, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { useSimulationClock } from '../application/simulation-controller';
import { useGame } from '../stores/game-store';
import { speeds, yearDuration } from '../game/engine/simulate-year';
import type { GameState } from '../game/types';
import { ageText } from './game-panels';

export function TimeControls({ state }: { state: GameState }) {
  const { paused, speed, saving, togglePause, setSpeed, setAutomatic, skip } = useGame();
  const decision = !!state.pending && !state.automatic;
  const stopped = !!state.ended || decision;
  const running = !paused && !stopped;
  const progress = useSimulationClock(running, yearDuration(state, speed), state.character.age, state.pending?.token);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector('dialog[open]') || event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || stopped
        || (event.target instanceof HTMLElement && event.target.closest('button, a, input, select, textarea, summary, [contenteditable], [role="dialog"]'))) return;
      event.preventDefault();
      togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause, stopped]);

  return <Localize><div className="time-strip">
    <div className="shell time-inner">
      <div className="time-readout"><strong data-testid="age">{ageText(state.character.age)}</strong><span className="divider" /><span>{state.world.year} год</span>
        <span className="time-status" data-running={running}>{state.ended ? 'Завершено' : decision ? 'Ждёт решения' : paused ? 'Пауза' : 'Время идёт'}</span>
      </div>
      <div className="year-progress" role="progressbar" aria-label="Прогресс игрового года" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}><span ref={progress} /></div>
      <div className="time-actions">
        <button type="button" className="button play-button" disabled={stopped} onClick={togglePause} aria-label={running ? 'Пауза' : 'Продолжить'} title={running ? 'Пауза' : 'Продолжить'}>{running ? <Pause size={18} /> : <Play size={18} />}</button>
        <div className="speed-group" role="group" aria-label="Скорость времени">{speeds.map(value => <button key={value} className="button speed-button" disabled={!!state.ended} aria-pressed={speed === value} onClick={() => setSpeed(value)}>{value}×</button>)}</div>
        <button type="button" className="button jump-button" onClick={skip} disabled={!!state.ended || !!state.pending || saving} aria-label="До решения" title="До решения"><FastForward size={16} /><span>До решения</span></button>
        <button type="button" className="button auto-button" onClick={setAutomatic} disabled={!!state.ended || saving} aria-pressed={state.automatic} aria-label="Авторежим" title="Авторежим"><Sparkles size={16} /><span>Авто</span></button>
      </div>
    </div>
  </div></Localize>;
}

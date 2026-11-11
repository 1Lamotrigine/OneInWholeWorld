'use client';

import { Localize } from '../i18n/localize';
import { ArrowRight, ChevronRight, MapPin, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { backgrounds, raceIds, races, regions, sexes } from '../game/content/world';
import type { GameState } from '../game/types';
import { useGame } from '../stores/game-store';
import { StorageStatus } from './app-shell';
import { Portrait, Scene } from './art';
import { BirthOdds } from './game-panels';
import { PathPicker } from './life-path';

const duration = 3800;
function finishReveal(saveId: string) {
  try { sessionStorage.setItem('elarion-revealed-' + saveId, '1'); } catch { /* Animation remains optional. */ }
}

export function BirthReveal({ state }: { state: GameState }) {
  const [shown, setShown] = useState(!!state.path);
  const { reducedMotion, saving, reveal } = useGame();
  const c = state.character;
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const complete = () => { finishReveal(state.saveId); setShown(true); };
    let alreadyShown = false;
    try { alreadyShown = sessionStorage.getItem('elarion-revealed-' + state.saveId) === '1'; } catch { /* Optional animation state. */ }
    const timer = window.setTimeout(complete, reducedMotion || query.matches || alreadyShown ? 0 : duration);
    const change = () => { if (query.matches) complete(); };
    query.addEventListener('change', change);
    return () => { window.clearTimeout(timer); query.removeEventListener('change', change); };
  }, [reducedMotion, state.saveId]);
  const sequence = Array.from({ length: 26 }, (_, i) => races[raceIds[(i * 3 + c.race.length) % raceIds.length]].name);
  sequence.push(races[c.race].name);

  return <Localize><main id="main" className="shell birth-page">
    <StorageStatus />
    {!shown ? <section className="panel birth-ritual" aria-labelledby="ritual-title">
      <div className="ritual-art" />
      <div className="ritual-content">
        <p className="eyebrow"><Sparkles size={17} /> Запись первая · {state.world.year} год</p>
        <h1 id="ritual-title">Летопись открывается</h1>
        <p>Где-то в Эларионе начинается новая жизнь.</p>
        <div className="reel-window" aria-hidden="true">
          <div className="reel-track" style={{ '--reel-steps': sequence.length - 1, '--reel-time': duration + 'ms' } as React.CSSProperties}>
            {sequence.map((race, i) => <span key={i}>{race}</span>)}
          </div>
        </div>
        <button className="button" onClick={() => { finishReveal(state.saveId); setShown(true); }}>Пропустить прокрутку <ArrowRight size={16} /></button>
      </div>
    </section> : <div className="birth-layout birth-revealed">
      <section className="panel birth-card" aria-labelledby="birth-heading">
        <p className="eyebrow"><Sparkles size={16} /> Рождение · {state.world.year} год</p>
        <div className="birth-identity"><Portrait state={state} /><div><p className="muted">{races[c.race].name} · {sexes[c.sex]}</p><h1 id="birth-heading">{c.name}</h1><p><MapPin size={15} /> {c.birthplace}, {regions[c.origin].name}</p></div></div>
        <p className="birth-story">{state.chronicle[0].text}</p>
        <p className="birth-status"><strong>{backgrounds[c.background].name}</strong><ChevronRight size={15} /> {backgrounds[c.status].status}</p>
        <h2>Вероятности рождения</h2><BirthOdds state={state} />
        <PathPicker state={state} />
        <button className="button primary" disabled={saving || !state.path} onClick={reveal}>Прожить жизнь <ArrowRight size={17} /></button>
      </section>
      <Scene state={state} />
    </div>}
  </main></Localize>;
}

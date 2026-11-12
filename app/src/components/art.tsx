import { crisisLabels } from '../game/engine/world';
import { Localize } from '../i18n/localize';
import { MapPin } from 'lucide-react';
import { regions, regionScene } from '../game/content/world';
import { phase, regionState } from '../game/engine/rules';
import type { GameState } from '../game/types';
import { portraitMarkup } from './portrait-svg';

export function Portrait({ state, compact = false }: { state: GameState; compact?: boolean }) {
  const c = state.character;
  return <Localize><svg className={compact ? 'portrait compact' : 'portrait'} viewBox="0 0 48 48" role="img" aria-label={'Портрет: ' + c.name} shapeRendering="crispEdges" dangerouslySetInnerHTML={{ __html: portraitMarkup(state) }} /></Localize>;
}

export function Scene({ state }: { state: GameState }) {
  const c = state.character;
  const r = regions[c.region];
  const crisis = regionState(state).crisis;
  return <Localize><figure className="scene panel" aria-label={'Локация: ' + c.settlement}>
    <div className="scene-image" data-season={state.world.year % 4} data-crisis={crisis ?? ''} style={{ backgroundImage: `url(/art/${regionScene[c.region]}.svg)` }}>
      {['rift', 'undead', 'wildhunt', 'dragon'].includes(crisis ?? '') && <>
        <svg className="arcane-sky" viewBox="0 0 640 288" aria-hidden="true" shapeRendering="crispEdges">
          {crisis === 'rift' && <g><path d="m344 18 20 8 20 22-8 20 12 24-20 36-16 8-14-36 8-24-12-22z" fill="#7750c9" opacity=".85" /><path d="m353 28 12 17-5 20 9 27-14 25-7-24 5-24-7-18z" fill="#d4aaff" /><path d="M320 32h10v5h-10zm64 72h8v6h-8zm-58 16h5v8h-5z" fill="#e4caff" /></g>}
          {crisis === 'dragon' && <path d="m373 65-44-29 15 30-35 16 48-3 15 13 8-6 13 4 14-8 39 5-22-19 13-27-37 27-8-8-8 3-5-9-8 4 7 14-17 1z" fill="#251f30" stroke="#e5a467" strokeWidth="1" />}
          {crisis === 'undead' && <g fill="#86c9af" opacity=".7"><path d="M92 190h6v-40h4v40h7v21H92zm209-12h6v-50h5v50h8v28h-19zm199 12h5v-55h5v55h8v23h-18z" /><path d="M93 143h10v5H93zm210-22h11v5h-11zm198 8h11v5h-11z" /></g>}
          {crisis === 'wildhunt' && <g fill="#c4dfd2" opacity=".8"><path d="M359 25h20v5h9v9h5v19h-6v9h-11v5h-18v-7h13v-7h6V40h-6v-7h-12z" /><path d="m265 86 8-9 11 5 15-2 6-8 8 8-7 7 1 10h-5l-3-7h-14l-7 8h-5l3-12zm133-4 8-9 11 5 15-2 6-8 8 8-7 7 1 10h-5l-3-7h-14l-7 8h-5l3-12z" /></g>}
        </svg><span className="scene-arcane-label">{crisis && crisisLabels[crisis]}</span>
      </>}
      <div className="scene-vignette" />
      <div className="scene-marker"><MapPin size={14} /> {r.name}</div>
      <div className="scene-caption"><small>Текущая локация</small><h2>{c.settlement}</h2></div>
      <div className={'scene-resident resident-' + phase(c)}><Portrait state={state} compact /></div>
    </div>
    <figcaption><MapPin size={15} /><span>{r.polity}</span><span className="caption-dot" /><span>{state.ended ? 'Последний дом' : c.region === c.origin ? 'Родные земли' : 'Новый дом'}</span></figcaption>
  </figure></Localize>;
}

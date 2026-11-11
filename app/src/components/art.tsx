import { Localize } from '../i18n/localize';
import { MapPin } from 'lucide-react';
import { regions, regionScene, type RaceId } from '../game/content/world';
import { phase, regionState } from '../game/engine/rules';
import type { GameState } from '../game/types';

const appearance: Record<RaceId, [string, string, string, string]> = {
  halfling: ['#c69c7f', '#e4bc99', '#6e4835', '#738057'],
  beastfolk: ['#998472', '#d7c2a1', '#4d423b', '#5a726c'],
  dragonborn: ['#a47266', '#cfaa83', '#674641', '#68586e'],
  human: ['#bd9075', '#e4b395', '#453534', '#556d75'],
  elf: ['#c09984', '#e1bca3', '#b39871', '#496f65'],
  dwarf: ['#b47c63', '#d3a182', '#6f4135', '#826044'],
  orc: ['#7d906a', '#a6b382', '#394a39', '#536b50'],
  goblin: ['#8a9160', '#b0b378', '#464735', '#5d6b57'],
};

export function Portrait({ state, compact = false }: { state: GameState; compact?: boolean }) {
  const c = state.character;
  const stage = phase(c);
  const [skin, glow, naturalHair, robe] = appearance[c.race];
  const hair = stage === 4 ? '#bab5ad' : naturalHair;
  const body = c.status === 'ruler' || c.status === 'noble' ? '#725771' : robe;
  const ears = ['elf', 'goblin', 'orc', 'beastfolk', 'dragonborn'].includes(c.race);
  return <Localize><svg className={compact ? 'portrait compact' : 'portrait'} viewBox="0 0 48 48" role="img" aria-label={'Портрет: ' + c.name} shapeRendering="crispEdges">
    <rect width="48" height="48" fill="#283440" />
    <path d="M0 32h48v16H0zm3-17h2v16H3zm40 0h2v16h-2zM7 9h2v2H7zm32 0h2v2h-2z" fill="#344553" />
    <path d="M6 48v-6h4v-4h8v-4h12v4h8v4h4v6z" fill={body} />
    <path d="M18 38h12v3h-3v5h-5v-5h-4z" fill="#23323b" />
    <g transform={stage === 0 ? 'translate(6 8) scale(.75)' : undefined}>
      <path d="M14 14h20v17h-3v4h-4v5h-7v-5h-4v-4h-2z" fill={skin} />
      <path d="M17 17h13v5h-2v6h2v4h-4v2h-7v-4h-3V19h1z" fill={glow} />
      {ears && <path d="M9 20h3v3h3v8h-3v-4h-3zm24 3h3v-3h3v7h-3v4h-3z" fill={skin} />}
      <path d="M12 15h2v-4h4V8h13v2h4v4h3v6h-4v-4h-6v-2h-5v3h-5v3h-3v4h-3z" fill={hair} />
      <path d="M17 23h4v2h-4zm11 0h4v2h-4z" fill="#23252a" />
      <path d="M21 31h6v1h-6z" fill="#695149" />
      {c.race === 'dwarf' && stage >= 2 && <path d="M14 26h3v5h3v-1h8v1h3v-5h3v10h-3v5h-4v2h-6v-3h-4v-4h-3z" fill={hair} />}
      {c.race === 'orc' && <path d="M16 28h2v4h-2zm13 0h2v4h-2z" fill="#e0d3a9" />}
      {(c.status === 'noble' || c.status === 'ruler') && <path d="M15 8V5h3v2h4V4h4v3h4V5h3v5H15z" fill="#d9b77c" />}
    </g>
    <path d="M2 2h5v1H3v4H2zm39 0h5v5h-1V3h-4zM2 41h1v4h4v1H2zm43 0h1v5h-5v-1h4z" fill="#7a8276" opacity=".7" />
  </svg></Localize>;
}

export function Scene({ state }: { state: GameState }) {
  const c = state.character;
  const r = regions[c.region];
  const crisis = regionState(state).crisis;
  return <Localize><figure className="scene panel" aria-label={'Локация: ' + c.settlement}>
    <div className="scene-image" data-season={state.world.year % 4} data-crisis={crisis ?? ''} style={{ backgroundImage: `url(/art/${regionScene[c.region]}.svg)` }}>
      <div className="scene-vignette" />
      <div className="scene-marker"><MapPin size={14} /> {r.name}</div>
      <div className="scene-caption"><small>Текущая локация</small><h2>{c.settlement}</h2></div>
      <div className={'scene-resident resident-' + phase(c)}><Portrait state={state} compact /></div>
    </div>
    <figcaption><MapPin size={15} /><span>{r.polity}</span><span className="caption-dot" /><span>{state.ended ? 'Последний дом' : c.region === c.origin ? 'Родные земли' : 'Новый дом'}</span></figcaption>
  </figure></Localize>;
}

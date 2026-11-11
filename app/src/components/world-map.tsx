'use client';

import { Localize } from '../i18n/localize';
import { Compass, Map, MapPin, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { atlas, cityNotes, paths } from '../game/content/atlas';
import { regionIds, regions, type RegionId } from '../game/content/world';
import { moveOffer, officeHolder } from '../game/engine/influence';
import { crisisLabels } from '../game/engine/world';
import type { GameState } from '../game/types';
import { useGame } from '../stores/game-store';

const width = 1440;
const height = 850;
const initialView = { x: 0, y: 0, zoom: 1 };
const cities = Object.fromEntries(regionIds.map(id => [id, cityNotes(id)])) as Record<RegionId, ReturnType<typeof cityNotes>>;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const bounded = (x: number, y: number, zoom: number) => ({ x: clamp(x, 0, width - width / zoom), y: clamp(y, 0, height - height / zoom), zoom });
type Cursor = { region: RegionId; city: number };
type View = typeof initialView;

function zoomAt(view: View, delta: number, u = .5, v = .5) {
  const zoom = clamp(view.zoom * delta, 1, 4);
  return bounded(view.x + u * width * (1 / view.zoom - 1 / zoom), view.y + v * height * (1 / view.zoom - 1 / zoom), zoom);
}

export function WorldMap({ state, compact = false }: { state?: GameState; compact?: boolean }) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<SVGSVGElement>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; view: View; moved: boolean } | null>(null);
  const [view, setView] = useState(initialView);
  const [selected, select] = useState<Cursor>({ region: state?.character.region ?? 'valoria', city: 0 });
  const [hover, setHover] = useState<Cursor | null>(null);
  const [open, setOpen] = useState(false);
  const [arrival, setArrival] = useState('');
  const { saving, moveTo } = useGame();
  const country = atlas[selected.region];
  const city = cities[selected.region][selected.city];
  const tooltip = hover && cities[hover.region][hover.city];
  const local = state?.world.regions[selected.region];
  const front = state?.world.fronts.find(front => front.from === selected.region || front.to === selected.region);
  const offer = state && moveOffer(state, selected.region, city.name);

  useEffect(() => {
    const element = canvas.current;
    if (!open || !element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      setView(current => zoomAt(current, event.deltaY < 0 ? 1.13 : 1 / 1.13,
        (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [open]);

  function launch() {
    if (state) {
      const city = cities[state.character.region].findIndex(city => city.name === state.character.settlement);
      select({ region: state.character.region, city: Math.max(0, city) });
      useGame.setState({ paused: true });
    }
    setArrival('');
    setView(initialView);
    dialog.current?.showModal();
    setOpen(true);
  }

  function pan(event: ReactPointerEvent<SVGSVGElement>) {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId || start.view.zoom === 1) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 4) return;
    if (!start.moved) {
      event.currentTarget.setPointerCapture(event.pointerId);
      start.moved = true;
      setHover(null);
    }
    const box = event.currentTarget.getBoundingClientRect();
    setView(bounded(start.view.x - dx * width / box.width / start.view.zoom, start.view.y - dy * height / box.height / start.view.zoom, start.view.zoom));
  }

  return <Localize><>
    <button className={compact ? 'button map-launch' : 'button'} title="Карта мира" aria-label="Карта мира" onClick={launch}>
      <Map size={17} />{!compact && 'Карта мира'}
    </button>
    <dialog ref={dialog} className="atlas-dialog" aria-labelledby={id}
      onClose={() => { setOpen(false); setHover(null); drag.current = null; }}
      onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
      {open && <div className="atlas-dialog-inner">
        <header className="atlas-heading"><div><p className="eyebrow"><Compass size={15} /> Атлас Элариона</p><h2 id={id}>Страны и поселения</h2></div>
          <button className="button" aria-label="Закрыть карту" onClick={() => dialog.current?.close()} autoFocus><X size={20} /></button>
        </header>
        <div className="atlas-layout">
          <div>
            <div className="map-frame">
              <svg ref={canvas} className="world-map" role="group" aria-label="Интерактивная карта Элариона" tabIndex={0}
                viewBox={`${view.x} ${view.y} ${width / view.zoom} ${height / view.zoom}`}
                onPointerDown={event => {
                  if (event.button === 0) drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, view, moved: false };
                }}
                onPointerMove={pan} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
                onKeyDown={event => {
                  if (event.target !== event.currentTarget) return;
                  const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
                  const step = directions[event.key];
                  if (step) { event.preventDefault(); setView(bounded(view.x + step[0] * 38 / view.zoom, view.y + step[1] * 38 / view.zoom, view.zoom)); }
                  else if (event.key === '+' || event.key === '-') { event.preventDefault(); setView(zoomAt(view, event.key === '+' ? 1.3 : 1 / 1.3)); }
                }}>
                <rect width={width} height={height} fill="#142934" />
                <g className="sea-lines" aria-hidden="true">
                  <path d="M25 102h95m-80 11h65M20 334h95m-65 12h80M78 420h94m-75 13h61M115 484h109m-93 13h65M765 74h109m-90 13h71m-61 330h92m-61 13h67M659 478h166m-119 13h84" />
                  <text x="92" y="370">МОРЕ СЕМИ МЕЛЬНИЦ</text><text x="668" y="506">ПРОЛИВ ФОНАРЕЙ</text>
                </g>
                {regionIds.map(region => {
                  const data = atlas[region];
                  return <g key={region}>
                    <path className="country-shape" d={data.border} fill={data.color} data-selected={selected.region === region} data-war={state?.world.regions[region].crisis === 'war'}
                      onClick={() => { select({ region, city: 0 }); setArrival(''); }} />
                    <text className="country-name" x={data.label[0]} y={data.label[1]}>{regions[region].name}</text>
                  </g>;
                })}
                <g className="map-terrain" aria-hidden="true">
                  <path d="M514 118l12-16 12 16m39 10 12-16 12 16m52-10 12-16 12 16M198 213l7-11 7 11m39 74 7-11 7 11m305 87 9-13 9 13m-19 32 9-13 9 13M225 151l4-9 4 9m43-13 4-9 4 9m151-4 4-9 4 9m-92 267h15m60 11h15m-63 41h15m414-168h20m-56 33h20m-45 43h20" />
                  <path className="map-road" d="M190 260 290 227 321 301 445 292 546 314 614 376 749 353 764 299 713 266 699 134 620 157 544 149 449 170 369 135 262 106M321 301 291 400 405 408 361 450M405 408 445 292M620 157 546 314" />
                </g>
                {regionIds.flatMap(region => cities[region].map((place, index) => {
                  const active = selected.region === region && selected.city === index;
                  const home = state?.character.region === region && state.character.settlement === place.name;
                  const choose = () => { select({ region, city: index }); setArrival(''); };
                  return <g key={place.name} transform={`translate(${place.x} ${place.y})`} className="map-city" data-selected={active}
                    role="button" tabIndex={0} aria-label={place.name} aria-pressed={active} onClick={choose}
                    onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); } }}
                    onPointerEnter={event => { if (event.pointerType === 'mouse') setHover({ region, city: index }); }}
                    onPointerLeave={() => setHover(null)} onFocus={() => setHover({ region, city: index })} onBlur={() => setHover(null)}>
                    <circle r="15" fill="transparent" />
                    {home && <circle className="home-ring" r="11" />}
                    <circle className="city-dot" r="5" />
                    <text y="16">{place.name}</text>
                  </g>;
                }))}
              </svg>
              {tooltip && <aside className="map-tooltip" role="status"><strong>{tooltip.name}</strong><p>{tooltip.text}</p><small>{tooltip.roles.map(role => paths[role].name).join(' · ')}</small></aside>}
            </div>
            <div className="map-toolbar">
              <div className="flex gap-1"><button className="button" aria-label="Уменьшить карту" disabled={view.zoom === 1} onClick={() => setView(zoomAt(view, 1 / 1.35))}><Minus size={16} /></button>
              <button className="button" aria-label="Увеличить карту" disabled={view.zoom === 4} onClick={() => setView(zoomAt(view, 1.35))}><Plus size={16} /></button>
              <button className="button" aria-label="Сбросить масштаб карты" onClick={() => setView(initialView)}><RotateCcw size={16} /></button></div>
              <span>{Math.round(view.zoom * 100)}% · Колесо для масштаба, перетаскивание или стрелки для перемещения</span>
            </div>
          </div>
          <section className="atlas-info" aria-label="Сведения о стране и городе">
            <p className="eyebrow"><span className="country-swatch" style={{ background: country.color }} /> {regions[selected.region].polity}</p>
            <h3>{regions[selected.region].name}</h3><p>{country.lore}</p>
            <dl><dt>{country.title}</dt><dd>{officeHolder(state, selected.region)}</dd>
              <dt>{country.notable[1]}</dt><dd>{country.notable[0]}<br />{country.notable[2]}</dd>
              {local && <><dt>Обстановка</dt><dd>{local.crisis ? crisisLabels[local.crisis] : 'Спокойно'}{front && ` · ${regions[front.from === selected.region ? front.to : front.from].name}`}</dd></>}
            </dl>
            <label className="city-select"><span><MapPin size={15} /> Поселение</span>
              <select value={`${selected.region}:${selected.city}`} onChange={event => {
                const [region, city] = event.target.value.split(':');
                select({ region: region as RegionId, city: Number(city) }); setArrival('');
              }}>
                {regionIds.map(region => <optgroup key={region} label={regions[region].name}>{cities[region].map((place, i) => <option key={place.name} value={`${region}:${i}`}>{place.name}</option>)}</optgroup>)}
              </select>
            </label>
            <h4>{city.name}</h4><p>{city.text}</p>
            <div className="atlas-tags">{city.roles.map(role => <span key={role}>{paths[role].name}</span>)}</div>
            {offer && <div className="map-move">
              <button className="button primary" disabled={!!offer.reason || saving} onClick={() => {
                moveTo(selected.region, city.name);
                if (useGame.getState().state?.character.settlement === city.name) setArrival(`Новый дом — ${city.name}.`);
              }}>Переехать · {offer.cost} монет</button>
              {(arrival || offer.reason) && <p role="status">{arrival || offer.reason}</p>}
            </div>}
          </section>
        </div>
      </div>}
    </dialog>
  </></Localize>;
}

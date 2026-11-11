'use client';

import { Localize, useLanguage } from '../i18n/localize';
import { ArrowRight, Download, Feather, Share2 } from 'lucide-react';
import { useState } from 'react';
import { paths } from '../game/content/atlas';
import { backgrounds, races, regions, sexes } from '../game/content/world';
import { professions } from '../game/content/professions';
import type { GameState } from '../game/types';
import { downloadFile } from '../application/save-service';
import { translateText, type Language } from '../i18n/translate';
import { ageText, number } from './game-panels';

function summaryText(state: GameState, language: Language) {
  const c = state.character;
  return translateText(`${c.name} · ${races[c.race].name} · ${ageText(c.age)}\n${c.birthplace}, ${regions[c.origin].name} → ${c.settlement}, ${regions[c.region].name}\n${state.ended?.cause}. ${state.ended?.epitaph}`, language);
}

async function saveCard(state: GameState, language: Language) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 520;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Графический экспорт недоступен.');
  ctx.fillStyle = '#121b25';
  ctx.fillRect(0, 0, 900, 520);
  ctx.strokeStyle = '#594d3e';
  ctx.strokeRect(22, 22, 856, 476);
  ctx.fillStyle = '#d9b77c';
  ctx.font = '600 20px system-ui';
  ctx.fillText(translateText('Жизнь в Эларионе', language) + '   /   ' + translateText('Итог жизни', language), 60, 80, 780);
  const [name, route, epitaph] = summaryText(state, language).split('\n');
  ctx.fillStyle = '#e8e9e5';
  ctx.font = '38px Georgia';
  ctx.fillText(name, 60, 158, 780);
  ctx.fillStyle = '#a6b1bb';
  ctx.font = '20px system-ui';
  ctx.fillText(route, 60, 207, 780);
  ctx.fillStyle = '#e8e9e5';
  ctx.font = '25px Georgia';
  const lines = [''];
  for (const word of epitaph.split(' ')) {
    const i = lines.length - 1;
    const candidate = [lines[i], word].filter(Boolean).join(' ');
    if (ctx.measureText(candidate).width <= 780) lines[i] = candidate;
    else lines.push(word);
  }
  lines.slice(0, 5).forEach((line, i) => ctx.fillText(line, 60, 271 + i * 34, 780));
  ctx.fillStyle = '#d9b77c';
  ctx.font = '20px system-ui';
  ctx.fillText(translateText(`1230–${state.world.year}   ·   ${state.chronicle.length} записей в летописи`, language), 60, 446, 780);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Не удалось создать изображение.');
  downloadFile(`elarion-${state.saveId}.png`, blob);
}

export function DeathSummary({ state, onNew, locked }: { state: GameState; onNew(): void; locked: boolean }) {
  const { language } = useLanguage();
  const [notice, setNotice] = useState('');
  const c = state.character;
  const end = state.ended;
  if (!end) return null;
  const keyEvents = state.chronicle.filter(row => row.milestone && !['birth', 'stage', 'death'].includes(row.category));
  const milestones = keyEvents.length > 5 ? [...keyEvents.slice(0, 2), ...keyEvents.slice(-3)] : keyEvents;
  async function share() {
    try {
      const text = summaryText(state, language);
      if (navigator.share) {
        await navigator.share({ title: c.name, text });
      } else {
        await navigator.clipboard.writeText(text);
        setNotice('Итог скопирован.');
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice('Поделиться не удалось. Можно скачать карточку.');
    }
  }
  return <Localize><section className="panel action-card life-summary" aria-labelledby="summary-heading">
    <p className="eyebrow"><Feather size={16} /> Закрытая летопись</p>
    <h2 id="summary-heading">Итог жизни</h2>
    <p className="summary-identity">{c.name} · {races[c.race].name} · {sexes[c.sex]} · {ageText(c.age)}</p>
    <p><strong>{end.cause}.</strong> {end.epitaph}</p>
    <dl className="summary-facts">
      {state.path && <div><dt>Жизненный путь</dt><dd>{paths[state.path].name}</dd></div>}
      <div><dt>Откуда</dt><dd>{c.birthplace}, {regions[c.origin].name}</dd></div>
      <div><dt>Последний дом</dt><dd>{c.settlement}, {regions[c.region].name}</dd></div>
      <div><dt>Положение</dt><dd>{backgrounds[c.background].status} → {backgrounds[c.status].status}</dd></div>
      <div><dt>Занятия</dt><dd>{c.career.length ? c.career.map(id => professions[id].name).join(', ') : 'Без постоянной профессии'}</dd></div>
      <div><dt>Близкие связи</dt><dd>{c.relationships.filter(person => person.bond >= 65).length}</dd></div>
      <div><dt>Счастье / репутация</dt><dd>{number.format(c.stats.happiness)} / {number.format(c.reputation)}</dd></div>
    </dl>
    {milestones.length > 0 && <div className="summary-milestones"><h3>Ключевые вехи</h3><ol>{milestones.map((row, i) => <li key={i}><span>{ageText(row.age)}</span> {row.title}</li>)}</ol></div>}
    <div className="summary-actions">
      <button className="button primary" disabled={locked} onClick={onNew}>Новая жизнь <ArrowRight size={16} /></button>
      <button className="button" onClick={() => void share()}><Share2 size={16} /> Поделиться</button>
      <button className="button" onClick={() => { void saveCard(state, language).catch(() => setNotice('Не удалось сохранить изображение.')); }}><Download size={16} /> Карточка</button>
    </div>
    {notice && <p role="status">{notice}</p>}
  </section></Localize>;
}

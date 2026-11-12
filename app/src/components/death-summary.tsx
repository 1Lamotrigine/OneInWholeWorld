'use client';

import { Localize, useLanguage } from '../i18n/localize';
import { ArrowRight, Download, Feather, Share2 } from 'lucide-react';
import { useState } from 'react';
import { paths } from '../game/content/atlas';
import { backgrounds, races, regions, sexes } from '../game/content/world';
import { professions } from '../game/content/professions';
import type { GameState } from '../game/types';
import { saveArcCard } from '../application/share-card';
import { birthRarity, fateEpitaph, fateHook, formatRarity, seedCode, turningPoints } from '../game/engine/fate-card';
import { translateText } from '../i18n/translate';
import { ageText, number } from './game-panels';

export function DeathSummary({ state, onNew, locked }: { state: GameState; onNew(): void; locked: boolean }) {
  const { language } = useLanguage();
  const [notice, setNotice] = useState('');
  const c = state.character;
  const end = state.ended;
  if (!end) return null;
  const hook = fateHook(state, language);
  const epitaph = translateText(fateEpitaph(state), language);
  const points = turningPoints(state);
  const rarity = birthRarity(state);

  async function share() {
    try {
      const text = `${hook}\n${epitaph}\nseed: ${seedCode(state.seed)}`;
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
    <p className="summary-hook">{hook}</p>

    <div className="summary-arc" aria-label="Арка жизни">
      <div className="arc-point arc-start">
        <span className="arc-dot" aria-hidden="true" />
        <div>
          <span className="arc-kind">Старт · {ageText(0)}</span>
          <strong>{races[c.race].name} · {backgrounds[c.background].name}</strong>
          <small>{c.birthplace}, {regions[c.origin].name}</small>
        </div>
      </div>
      {points.map((row, index) => <div className="arc-point arc-turn" key={`${row.eventId}-${row.age}-${index}`}>
        <span className="arc-dot" aria-hidden="true" />
        <div>
          <span className="arc-kind">Поворот {index + 1} · {ageText(row.age)}</span>
          <strong>{row.title}</strong>
          {row.text && <small>{row.text}</small>}
        </div>
      </div>)}
      <div className="arc-point arc-finish">
        <span className="arc-dot" aria-hidden="true" />
        <div>
          <span className="arc-kind">Финал · {ageText(c.age)}</span>
          <strong>{backgrounds[c.status].status} · {regions[c.region].name}</strong>
          <small>{end.cause} · {c.settlement}</small>
        </div>
      </div>
    </div>

    <blockquote className="summary-epitaph">«{epitaph}»</blockquote>
    <p className="summary-meta"><span>seed {seedCode(state.seed)}</span><span>{formatRarity(rarity, language)}</span><span>{c.name}</span></p>

    <div className="summary-actions">
      <button className="button primary" disabled={locked} onClick={onNew}>Новая жизнь <ArrowRight size={16} /></button>
      <button className="button" onClick={() => void share()}><Share2 size={16} /> Поделиться</button>
      <button className="button" onClick={() => { void saveArcCard(state, language).catch(() => setNotice('Не удалось сохранить изображение.')); }}><Download size={16} /> Карточка</button>
    </div>
    {notice && <p role="status">{notice}</p>}

    <details className="summary-details">
      <summary>Все факты</summary>
      <dl className="summary-facts">
        {state.path && <div><dt>Жизненный путь</dt><dd>{paths[state.path].name}</dd></div>}
        <div><dt>Откуда</dt><dd>{c.birthplace}, {regions[c.origin].name}</dd></div>
        <div><dt>Последний дом</dt><dd>{c.settlement}, {regions[c.region].name}</dd></div>
        <div><dt>Положение</dt><dd>{backgrounds[c.background].status} → {backgrounds[c.status].status}</dd></div>
        <div><dt>Занятия</dt><dd>{c.career.length ? c.career.map(id => professions[id].name).join(', ') : 'Без постоянной профессии'}</dd></div>
        <div><dt>Близкие связи</dt><dd>{c.relationships.filter(person => person.bond >= 65).length}</dd></div>
        <div><dt>Счастье / репутация</dt><dd>{number.format(c.stats.happiness)} / {number.format(c.reputation)}</dd></div>
        <div><dt>Пол</dt><dd>{sexes[c.sex]}</dd></div>
      </dl>
    </details>
  </section></Localize>;
}

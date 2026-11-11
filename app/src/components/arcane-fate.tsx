'use client';
import { Sparkles } from 'lucide-react';
import { Localize } from '../i18n/localize';
import { arcaneIds, arcaneMarks } from '../game/content/arcana';
import type { GameState } from '../game/types';
export function ArcaneFate({ state }: { state: GameState }) {
  const marks = arcaneIds.filter(mark => state.arcana[mark]);
  if (!marks.length) return null;
  return <Localize><section className="panel arcane-fate" aria-label="Магические печати судьбы">
    <p className="panel-label"><Sparkles size={16} /> Магические печати судьбы</p>
    {marks.map(mark => <article key={mark}><div><strong>{arcaneMarks[mark].name}</strong><span>До {state.arcana[mark]} года</span></div><p>{arcaneMarks[mark].text}</p></article>)}
    <small>Темп действия печатей зависит от расы. Договоры могут вернуться отложенным событием.</small>
  </section></Localize>;
}

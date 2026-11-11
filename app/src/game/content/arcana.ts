import type { Stats } from './world';
export const arcaneMarks = {
  curse: { name: 'Проклятие Бездны', text: 'Печать тянет жизненные силы: здоровье −1,8 в базовый год. Её можно снять в последующих событиях.', stats: { health: -1.8 }, education: 0, mastery: 0 },
  fae: { name: 'Долг фейскому двору', text: 'Чужие сны приносят знания, но отнимают покой: образование +0,5, счастье −0,7 в базовый год.', stats: { happiness: -.7 }, education: .5, mastery: 0 },
  dragon: { name: 'Драконья клятва', text: 'Древняя кровь укрепляет тело и магию: сила +0,65, мастерство +0,25 в базовый год.', stats: { strength: .65 }, education: 0, mastery: .25 },
  moon: { name: 'Лунное превращение', text: 'Звериная сила требует платы: сила +0,8, здоровье −0,3 в базовый год.', stats: { strength: .8, health: -.3 }, education: 0, mastery: 0 },
  rune: { name: 'Покровительство рунного титана', text: 'Живые руны защищают и учат: здоровье +0,6, образование +0,3 в базовый год.', stats: { health: .6 }, education: .3, mastery: 0 },
  echo: { name: 'Память мёртвых', text: 'Древние голоса делятся знаниями: образование +0,7, счастье −0,4 в базовый год.', stats: { happiness: -.4 }, education: .7, mastery: 0 },
} satisfies Record<string, { name: string; text: string; stats: Partial<Stats>; education: number; mastery: number }>;
export type ArcaneMark = keyof typeof arcaneMarks;
export const arcaneIds = Object.keys(arcaneMarks) as ArcaneMark[];

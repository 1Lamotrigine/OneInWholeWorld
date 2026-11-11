import type { RegionState } from '../types';
export type RegionMetric = keyof Omit<RegionState, 'crisis' | 'until'>;
export const projectKinds = {
  defense: { name: 'Общинная оборона', metrics: { safety: 12, conflict: -9 }, odds: { war: .45, rebellion: .7 } },
  militarism: { name: 'Военные сборы', metrics: { safety: 5, conflict: 16, economy: -7 }, odds: { war: 2.8, rebellion: 1.6 } },
  ward: { name: 'Защитная сеть рун', metrics: { safety: 11, magic: -10 }, odds: { awakening: .25, eclipse: .4 } },
  forbidden: { name: 'Опасные магические исследования', metrics: { magic: 17, education: 9, safety: -10 }, odds: { awakening: 3.5, eclipse: 2 } },
  charter: { name: 'Открытая общинная хартия', metrics: { openness: 13, education: 7, conflict: -10 }, odds: { rebellion: .25, academy: 1.7 } },
  coercion: { name: 'Тайная власть над кварталами', metrics: { openness: -16, conflict: 15, safety: -6 }, odds: { rebellion: 3, war: 1.6 } },
  commerce: { name: 'Сеть открытых рынков', metrics: { economy: 14, openness: 12, food: 5 }, odds: { trade: 2.8, war: .8 } },
  relief: { name: 'Общинный резерв и лечебницы', metrics: { food: 11, safety: 12 }, odds: { plague: .2, pilgrimage: 1.6 } },
  knowledge: { name: 'Общедоступные архивы', metrics: { education: 16, openness: 7 }, odds: { academy: 2.6, invention: 2 } },
  wilderness: { name: 'Защищённые тропы и источники', metrics: { safety: 10, food: 9 }, odds: { drought: .45, trade: 1.5 } },
  craft: { name: 'Общие мастерские и машины', metrics: { economy: 12, education: 10, food: 7 }, odds: { invention: 3, trade: 1.6 } },
  solidarity: { name: 'Союз взаимопомощи', metrics: { safety: 7, openness: 10, conflict: -12 }, odds: { rebellion: .4, pilgrimage: 2 } },
  embargo: { name: 'Торговая блокада', metrics: { economy: -14, food: -12, conflict: 14 }, odds: { war: 2.2, rebellion: 1.8, trade: .25 } },
  espionage: { name: 'Разведывательная сеть', metrics: { safety: 9, openness: -6 }, odds: { war: .6, rebellion: .7 } },
  discovery: { name: 'Открытый экспедиционный путь', metrics: { economy: 8, education: 8, openness: 14 }, odds: { trade: 2, awakening: 1.5 } },
  mediation: { name: 'Договор о посредничестве', metrics: { conflict: -18, openness: 10, safety: 7 }, odds: { war: .15, trade: 1.7 } },
} as const;
export type ProjectKind = keyof typeof projectKinds;
export const projectIds = Object.keys(projectKinds) as ProjectKind[];
export function projectMetrics(kind: ProjectKind): Partial<Record<RegionMetric, number>> {
  return projectKinds[kind].metrics;
}

export const projectOutlook: Record<ProjectKind, string> = {
  defense: 'Безопасность растёт, новые войны становятся менее вероятны.',
  militarism: 'Военные сборы усиливают напряжение. Новые войны и восстания становятся вероятнее.',
  ward: 'Защитные руны снижают риск опасных магических всплесков.',
  forbidden: 'Исследования ускоряют обучение, но опасные магические явления становятся вероятнее.',
  charter: 'Открытость и образование растут. Восстания становятся реже.',
  coercion: 'Закрытая власть усиливает недовольство. Восстания и войны становятся вероятнее.',
  commerce: 'Рынки поддерживают обмен и запасы. Торговые подъёмы становятся чаще.',
  relief: 'Запасы и лечебницы укрепляют безопасность. Мор становится менее вероятен.',
  knowledge: 'Образование растёт. Новые школы и изобретения появляются чаще.',
  wilderness: 'Защищённые источники смягчают засуху и помогают безопасной торговле.',
  craft: 'Мастерские поддерживают достаток. Изобретения и торговые подъёмы становятся чаще.',
  solidarity: 'Взаимопомощь снижает напряжение и вероятность восстаний.',
  embargo: 'Блокада ухудшает снабжение. Войны и восстания становятся вероятнее.',
  espionage: 'Ранние предупреждения укрепляют безопасность и снижают риск внезапной войны.',
  discovery: 'Новые пути улучшают обмен и обучение, но повышают вероятность встречи с магическими источниками.',
  mediation: 'Посредничество заметно снижает риск новых войн и помогает торговле.',
};

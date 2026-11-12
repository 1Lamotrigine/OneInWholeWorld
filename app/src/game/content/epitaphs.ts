import { hashSeed } from '../engine/random';
import type { GameState } from '../types';

type Epitaph = {
  id: string;
  text: string;
  when(state: GameState): boolean;
};

export function fateFacts(state: GameState) {
  const c = state.character;
  const harvests = state.chronicle.filter(row =>
    row.category === 'economy'
    && row.tone === 'good'
    && /урожай|жатв|сбор/i.test(row.title + ' ' + row.text)).length;
  return {
    leaders: (state.world.terms[c.region] ?? 0) + 1,
    wars: state.chronicle.filter(row => row.category === 'war').length,
    children: c.relationships.filter(person => person.role === 'Ребёнок').length,
    careers: c.career.length,
    wealth: c.wealth,
    reputation: c.reputation,
    education: c.education,
    mastery: c.mastery,
    age: c.age,
    projects: state.world.projects.filter(project => project.founder === c.name).length,
    magic: Object.keys(state.arcana).length,
    relations: c.relationships.length,
    moved: c.region !== c.origin,
    harvests,
  };
}

export const epitaphs: Epitaph[] = [
  { id: 'three-crowns', text: 'Пережил трёх королей и ни одного урожая.', when: s => { const f = fateFacts(s); return f.leaders === 3 && f.harvests === 0; } },
  { id: 'crowns', text: 'Пережил не одну корону.', when: s => fateFacts(s).leaders >= 3 },
  { id: 'wars-three', text: 'Войны запомнили его раньше, чем соседи.', when: s => fateFacts(s).wars >= 3 },
  { id: 'war-one', text: 'Оставил после себя дом, имя и одну войну.', when: s => fateFacts(s).wars >= 1 },
  { id: 'children', text: 'Оставил после себя не наследство, а имя.', when: s => fateFacts(s).children >= 2 },
  { id: 'careers', text: 'Сменил четыре ремесла и ни одного обещания.', when: s => fateFacts(s).careers >= 4 },
  { id: 'rich', text: 'Купил бы ещё одну жизнь, но не нашёл продавца.', when: s => fateFacts(s).wealth >= 100 },
  { id: 'poor', text: 'Ушёл с пустыми руками и полной летописью.', when: s => fateFacts(s).wealth <= 8 },
  { id: 'scholar', text: 'Унёс в землю больше знаний, чем оставил.', when: s => fateFacts(s).education >= 60 },
  { id: 'reputation', text: 'В общине долго спорили, кто теперь займёт его место.', when: s => fateFacts(s).reputation >= 80 },
  { id: 'magic', text: 'Заключил больше договоров с магией, чем с людьми.', when: s => fateFacts(s).magic >= 3 },
  { id: 'long', text: 'Прожил дольше, чем помнили соседи.', when: s => fateFacts(s).age >= 80 },
  { id: 'short', text: 'Жизнь оказалась короче, чем первый снег.', when: s => fateFacts(s).age <= 25 },
  { id: 'builder', text: 'Оставил после себя камень, который переживёт имя.', when: s => fateFacts(s).projects >= 1 },
  { id: 'moved', text: 'Ушёл из родных мест и не вернулся.', when: s => fateFacts(s).moved },
  { id: 'many-relations', text: 'У его стола всегда было на одного гостя больше.', when: s => fateFacts(s).relations >= 8 },
  { id: 'no-family', text: 'Никого не назвал родным, но весь город знал его имя.', when: s => fateFacts(s).relations === 0 },
  { id: 'default', text: 'Жил так, чтобы летописи было что записать.', when: () => true },
];

/** One-line epitaph built deterministically from fixed templates, never from AI. */
export function fateEpitaph(state: GameState): string {
  const matches = epitaphs.filter(epitaph => epitaph.when(state));
  return matches[hashSeed(state.seed + ':epitaph') % matches.length].text;
}

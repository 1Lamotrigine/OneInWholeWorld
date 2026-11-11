import type { PathId } from './content/atlas';
import type { ProfessionId } from './content/professions';
import type { Priority, RaceId, RegionId, Stats, StatusId, TraitId } from './content/world';

export const SCHEMA_VERSION = 4;
export const CONTENT_VERSION = '4.0.0';
export const BIRTH_YEAR = 1230;
export const stages = ['Младенчество', 'Детство', 'Юность', 'Зрелость', 'Старость'] as const;
export const categories = {
  birth: 'Рождение', stage: 'Возраст', childhood: 'Детство', education: 'Образование',
  work: 'Работа', family: 'Семья', relations: 'Отношения', health: 'Здоровье',
  magic: 'Магия', travel: 'Путешествие', war: 'Конфликт', society: 'Общество',
  economy: 'Экономика', politics: 'Политика', world: 'Мир', legacy: 'Наследие', death: 'Утрата',
};
export type Category = keyof typeof categories;
export type Tone = 'neutral' | 'good' | 'loss';
export type Relationship = {
  id: string; name: string; role: 'Опекун' | 'Родитель' | 'Сиблинг' | 'Друг' | 'Партнёр' | 'Ребёнок' | 'Наставник' | 'Сосед' | 'Соперник' | 'Союзник' | 'Покровитель' | 'Осведомитель' | 'Подопечный';
  race: RaceId; born: number; bond: number; died: number | null;
};
export type RegionState = {
  economy: number; safety: number; food: number; education: number;
  magic: number; conflict: number; openness: number;
  crisis: 'war' | 'drought' | 'plague' | 'trade' | 'awakening' | 'academy' | 'winter' | 'eruption' | 'rebellion' | 'pilgrimage' | 'invention' | 'eclipse' | null;
  until: number;
};
export type ChronicleEntry = {
  year: number; age: number; eventId: string; category: Category; title: string;
  text: string; tone: Tone; milestone: boolean;
};
export type Character = {
  name: string; sex: import('./content/world').Sex; race: RaceId; origin: RegionId; region: RegionId; birthplace: string; settlement: string;
  background: StatusId; status: StatusId; age: number; longevity: number; stats: Stats;
  traits: TraitId[]; wealth: number; education: number; reputation: number; mastery: number;
  profession: ProfessionId | null; career: ProfessionId[]; employedSince: number;
  relationships: Relationship[]; condition: 'fever' | 'injury' | 'chronic' | null;
  conditionYears: number; lifeRisk: number; retired: boolean;
};
export type WorldNews = { year: number; region: RegionId; title: string; text: string };
export type Front = { from: RegionId; to: RegionId; until: number };
export type WorldProject = {
  id: string; region: RegionId; kind: import('./content/projects').ProjectKind;
  founder: string; title: string; started: number; until: number;
};
export type GameState = {
  schemaVersion: typeof SCHEMA_VERSION; contentVersion: typeof CONTENT_VERSION;
  saveId: string; seed: string; rngState: number; revision: number;
  character: Character; world: { year: number; regions: Record<RegionId, RegionState>; news: WorldNews[]; terms: Record<RegionId, number>; fronts: Front[]; projects: WorldProject[] };
  path: PathId | null; pathExperience: number; lastMove: number; lastAct: number;
  birthOdds: { race: number; region: number; background: number };
  pending: { eventId: string; token: string; optionIds: string[] } | null;
  priority: Priority; automatic: boolean; revealed: boolean;
  ended: { cause: string; epitaph: string } | null;
  seen: Record<string, number>; scheduled: { year: number; eventId: string }[];
  chronicle: ChronicleEntry[];
};

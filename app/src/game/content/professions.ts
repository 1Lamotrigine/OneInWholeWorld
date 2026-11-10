import type { RegionId, StatusId } from './world';

export type Profession = {
  name: string; income: number; risk: number; prestige: number; education?: number;
  strength?: number; magic?: number; capital?: number; regions?: RegionId[]; rank?: StatusId;
};
export const professions = {
  farmer: { name: 'Фермер', income: 4, risk: .3, prestige: 0, regions: ['valoria', 'frontier', 'sylvanor'] },
  herder: { name: 'Пастух', income: 4, risk: .4, prestige: 0, regions: ['steppes', 'valoria', 'frontier'] },
  woodcutter: { name: 'Лесоруб', income: 5, risk: .7, prestige: 0, strength: 45, regions: ['sylvanor', 'frontier', 'valoria'] },
  fisher: { name: 'Рыбак', income: 4, risk: .5, prestige: 0, regions: ['grimm', 'valoria', 'frontier'] },
  smith: { name: 'Кузнец', income: 7, risk: .6, prestige: 1, education: 8, strength: 38, rank: 'artisan' },
  miner: { name: 'Шахтёр', income: 6, risk: 1.4, prestige: 0, strength: 39, regions: ['karak', 'frontier'] },
  carpenter: { name: 'Плотник', income: 6, risk: .5, prestige: 1, education: 5, rank: 'artisan' },
  weaver: { name: 'Ткач', income: 5, risk: .1, prestige: 1, education: 4, rank: 'artisan' },
  alchemist: { name: 'Помощник алхимика', income: 6, risk: .8, prestige: 1, education: 14, rank: 'artisan' },
  shopkeeper: { name: 'Лавочник', income: 7, risk: .1, prestige: 1, capital: 25, rank: 'merchant' },
  caravaner: { name: 'Караванщик', income: 7, risk: 1.1, prestige: 1, regions: ['grimm', 'steppes', 'frontier', 'karak'] },
  merchant: { name: 'Купец', income: 10, risk: .5, prestige: 2, education: 12, capital: 45, rank: 'merchant' },
  scribe: { name: 'Писец', income: 6, risk: .1, prestige: 1, education: 9 },
  teacher: { name: 'Учитель', income: 6, risk: .1, prestige: 2, education: 16, rank: 'scholar' },
  researcher: { name: 'Исследователь', income: 7, risk: .4, prestige: 2, education: 22, rank: 'scholar' },
  mage: { name: 'Ученик мага', income: 5, risk: .7, prestige: 1, education: 10, magic: 43 },
  mentor: { name: 'Маг-наставник', income: 9, risk: .8, prestige: 2, education: 20, magic: 50, rank: 'scholar' },
  guard: { name: 'Стражник', income: 6, risk: .9, prestige: 1, strength: 43 },
  soldier: { name: 'Солдат', income: 7, risk: 1.7, prestige: 1, strength: 45 },
  scout: { name: 'Разведчик', income: 7, risk: 1.3, prestige: 1, strength: 39, education: 6 },
  priest: { name: 'Жрец', income: 5, risk: .1, prestige: 2, education: 14, rank: 'scholar' },
  mercenary: { name: 'Наёмник', income: 9, risk: 2, prestige: 0, strength: 46 },
  smuggler: { name: 'Контрабандист', income: 9, risk: 1.2, prestige: -1, regions: ['grimm', 'frontier', 'steppes'] },
  courtier: { name: 'Придворный', income: 9, risk: .25, prestige: 2, education: 17, rank: 'noble' },
  steward: { name: 'Наместник', income: 12, risk: .35, prestige: 3, education: 21, rank: 'noble' },
} satisfies Record<string, Profession>;
export type ProfessionId = keyof typeof professions;
export const professionIds = Object.keys(professions) as ProfessionId[];
export const profession = (id: ProfessionId): Profession => professions[id];

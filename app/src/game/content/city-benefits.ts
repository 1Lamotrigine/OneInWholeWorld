import type { PathId } from './atlas';

export const cityBenefits = {
  warrior: { institution: 'Дозорная школа', education: .2, reputation: .4, mastery: 0, wealth: 0, strength: .7, charisma: 0 },
  mage: { institution: 'Магический круг', education: .5, reputation: 0, mastery: .5, wealth: 0, strength: 0, charisma: 0 },
  hero: { institution: 'Союз спасателей', education: .3, reputation: .7, mastery: 0, wealth: 0, strength: .2, charisma: 0 },
  politician: { institution: 'Городская палата', education: .2, reputation: .7, mastery: 0, wealth: 0, strength: 0, charisma: .3 },
  merchant: { institution: 'Торговое товарищество', education: .2, reputation: .3, mastery: 0, wealth: 1.8, strength: 0, charisma: 0 },
  villain: { institution: 'Подпольные посредники', education: .2, reputation: .5, mastery: 0, wealth: 1, strength: 0, charisma: 0 },
  keeper: { institution: 'Община хранителей', education: .6, reputation: .4, mastery: 0, wealth: 0, strength: 0, charisma: 0 },
  healer: { institution: 'Лечебная артель', education: .7, reputation: .3, mastery: 0, wealth: 0, strength: 0, charisma: 0 },
  scholar: { institution: 'Публичная библиотека', education: .8, reputation: .2, mastery: 0, wealth: 0, strength: 0, charisma: 0 },
  ranger: { institution: 'Дом проводников', education: .3, reputation: .2, mastery: 0, wealth: 0, strength: .5, charisma: 0 },
  bard: { institution: 'Сцена и союз сказителей', education: .2, reputation: .4, mastery: 0, wealth: 0, strength: 0, charisma: .6 },
  artificer: { institution: 'Открытая мастерская', education: .6, reputation: .2, mastery: 0, wealth: .8, strength: 0, charisma: 0 },
  adventurer: { institution: 'Экспедиционная контора', education: .4, reputation: .2, mastery: 0, wealth: .8, strength: .3, charisma: 0 },
  diplomat: { institution: 'Посольский дом', education: .3, reputation: .6, mastery: 0, wealth: 0, strength: 0, charisma: .5 },
  spy: { institution: 'Сеть доверенных связных', education: .5, reputation: .3, mastery: 0, wealth: 0, strength: 0, charisma: .3 },
} satisfies Record<PathId, { institution: string; education: number; reputation: number; mastery: number; wealth: number; strength: number; charisma: number }>;

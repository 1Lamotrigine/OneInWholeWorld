import type { Language } from '../../i18n/translate';
import { translateText } from '../../i18n/translate';
import type { Character } from '../types';
import { backgrounds, races, regions, type RaceId, type RegionId, type StatusId } from './world';

type FateCharacter = Pick<Character, 'background' | 'race' | 'sex' | 'origin' | 'status' | 'region'>;

const ruRace: Record<'male' | 'female', Record<RaceId, string>> = {
  male: {
    human: 'человеком', elf: 'эльфом', dwarf: 'гномом', orc: 'орком',
    goblin: 'гоблином', halfling: 'полуросликом', beastfolk: 'зверолюдом', dragonborn: 'драконорождённым',
  },
  female: {
    human: 'женщиной', elf: 'эльфийкой', dwarf: 'гномкой', orc: 'орчихой',
    goblin: 'гоблинкой', halfling: 'полурослицей', beastfolk: 'зверолюдкой', dragonborn: 'драконорождённой',
  },
};

const ruRegionIn: Record<RegionId, string> = {
  valoria: 'в Валории', sylvanor: 'в Сильваноре', karak: 'в Карак-Думе',
  steppes: 'в Красных степях', grimm: 'в Топях Гримм', frontier: 'в Пограничье',
  aurelian: 'в Аврелийской лиге', duskwood: 'в Сумеречных домах', ironreach: 'в Железном Пределе',
  moonfen: 'в Лунных Маршах', hearthshire: 'в Вересковых Холмах', emberfall: 'в Пепельных престолах',
};

function sexWord(c: FateCharacter): 'male' | 'female' {
  return c.sex === 'female' ? 'female' : 'male';
}

function ruBirth(c: FateCharacter): string {
  const sex = sexWord(c);
  const race = ruRace[sex][c.race];
  switch (c.background as StatusId) {
    case 'orphan': return 'сиротой';
    case 'poor': return `${sex === 'female' ? 'нищей' : 'нищим'} ${race}`;
    case 'worker': return `${race} в семье работников`;
    case 'artisan': return `${race} в семье мастеров`;
    case 'merchant': return `${race} в торговом доме`;
    case 'scholar': return `${race} в доме знаний`;
    case 'noble': return `${race} в знатном доме`;
    case 'ruler': return `${race} в правящей семье`;
    default: return race;
  }
}

function ruDeath(c: FateCharacter): string {
  const female = sexWord(c) === 'female';
  switch (c.status as StatusId) {
    case 'orphan': return 'без дома';
    case 'poor': return female ? 'беднячкой' : 'бедняком';
    case 'worker': return female ? 'работницей' : 'работником';
    case 'artisan': return female ? 'ремесленницей' : 'ремесленником';
    case 'merchant': return female ? 'купчихой' : 'купцом';
    case 'scholar': return female ? 'хранительницей знаний' : 'хранителем знаний';
    case 'noble': return female ? 'дворянкой' : 'дворянином';
    case 'ruler': return female ? 'королевой' : 'королём';
    default: return female ? 'беднячкой' : 'бедняком';
  }
}

const enRace: Record<RaceId, string> = {
  human: 'human', elf: 'elf', dwarf: 'dwarf', orc: 'orc',
  goblin: 'goblin', halfling: 'halfling', beastfolk: 'beastfolk', dragonborn: 'dragonborn',
};

const enRegionIn: Record<RegionId, string> = {
  valoria: 'in Valoria', sylvanor: 'in Sylvanor', karak: 'in Karak Dum',
  steppes: 'in the Red Steppes', grimm: 'in the Grimm Marshes', frontier: 'in the Borderland',
  aurelian: 'in the Aurelian League', duskwood: 'in the Twilight Houses', ironreach: 'in the Iron Reach',
  moonfen: 'in the Moon Marches', hearthshire: 'in the Heather Hills', emberfall: 'in the Ash Thrones',
};

function enBirth(c: FateCharacter): string {
  const race = enRace[c.race];
  switch (c.background as StatusId) {
    case 'orphan': return `an orphan ${race}`;
    case 'poor': return `a poor ${race}`;
    case 'worker': return `a ${race} of a worker family`;
    case 'artisan': return `a ${race} of an artisan family`;
    case 'merchant': return `a ${race} of a merchant house`;
    case 'scholar': return `a ${race} of a house of knowledge`;
    case 'noble': return `a ${race} of a noble house`;
    case 'ruler': return `a ${race} of a ruling family`;
    default: return `a ${race}`;
  }
}

function enDeath(c: FateCharacter): string {
  switch (c.status as StatusId) {
    case 'orphan': return 'homeless';
    case 'poor': return 'poor';
    case 'worker': return 'a worker';
    case 'artisan': return 'an artisan';
    case 'merchant': return 'a merchant';
    case 'scholar': return 'a keeper of knowledge';
    case 'noble': return 'a noble';
    case 'ruler': return c.sex === 'female' ? 'a queen' : 'a king';
    default: return 'a wanderer';
  }
}

export function ruFateHook(c: FateCharacter): string {
  const female = sexWord(c) === 'female';
  return `${female ? 'Родилась' : 'Родился'} ${ruBirth(c)} ${ruRegionIn[c.origin]}. ${female ? 'Умерла' : 'Умер'} ${ruDeath(c)} ${ruRegionIn[c.region]}.`;
}

export function enFateHook(c: FateCharacter): string {
  return `Born ${enBirth(c)} ${enRegionIn[c.origin]}. Died ${enDeath(c)} ${enRegionIn[c.region]}.`;
}

export function genericFateHook(c: FateCharacter, language: Exclude<Language, 'ru' | 'en'>): string {
  const race = translateText(races[c.race].name, language);
  const background = translateText(backgrounds[c.background].name, language);
  const status = translateText(backgrounds[c.status].status, language);
  const origin = translateText(regions[c.origin].name, language);
  const region = translateText(regions[c.region].name, language);
  switch (language) {
    case 'de': return `Geboren: ${race}, ${background}, ${origin}. Gestorben: ${status}, ${region}.`;
    case 'es': return `Nacido: ${race}, ${background}, ${origin}. Muerto: ${status}, ${region}.`;
    case 'it': return `Nato: ${race}, ${background}, ${origin}. Morto: ${status}, ${region}.`;
  }
}

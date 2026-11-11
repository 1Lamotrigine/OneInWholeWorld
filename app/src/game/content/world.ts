export const statLabels = {
  health: 'Здоровье', happiness: 'Счастье', intellect: 'Интеллект',
  strength: 'Сила', charisma: 'Харизма', magic: 'Магический потенциал',
};
export type Stats = Record<keyof typeof statLabels, number>;

export const sexes = { female: 'Женский', male: 'Мужской', unknown: 'Не указан' } as const;
export type Sex = keyof typeof sexes;

export const races = {
  human: { name: 'Человек', weight: 36, stages: [2, 12, 18, 58], lifespan: [55, 95], names: ['Мира', 'Арен', 'Лив', 'Эдвин', 'Терена', 'Роуэн'], houses: ['Вереск', 'Речной', 'Тихолесье'], stats: { charisma: 6 } },
  elf: { name: 'Эльф', weight: 12, stages: [4, 26, 44, 280], lifespan: [250, 500], names: ['Элира', 'Наэль', 'Лиора', 'Астель', 'Тэрион', 'Сэйла'], houses: ['Лунный Лист', 'Ивовая Тень', 'Светлая Роща'], stats: { magic: 28, intellect: 10, strength: -5 } },
  dwarf: { name: 'Гном', weight: 13, stages: [3, 18, 28, 145], lifespan: [120, 220], names: ['Торвин', 'Бренна', 'Дагна', 'Оррик', 'Хильда', 'Грум'], houses: ['Медная Жила', 'Крепкий Зубец', 'Железнобород'], stats: { health: 7, strength: 12, magic: -8 } },
  orc: { name: 'Орк', weight: 13, stages: [2, 10, 16, 62], lifespan: [55, 110], names: ['Гарта', 'Ургаш', 'Морг', 'Тарка', 'Грэш', 'Ашра'], houses: ['Красный Ветер', 'Степной Камень', 'Дальнее Копьё'], stats: { strength: 20, health: 5 } },
  goblin: { name: 'Гоблин', weight: 9, stages: [2, 9, 15, 48], lifespan: [40, 85], names: ['Рикс', 'Вика', 'Тик', 'Зисса', 'Клек', 'Ним'], houses: ['Тростник', 'Медная Скоба', 'Сухая Кочка'], stats: { intellect: 11, charisma: 9, strength: -10 } },
  halfling: { name: 'Полурослик', weight: 7, stages: [2, 13, 20, 73], lifespan: [75, 125], names: ['Нелли', 'Тобин', 'Роза', 'Мерри', 'Пиппа', 'Одо'], houses: ['Яблочный Холм', 'Тёплый Очаг', 'Медовый Луг'], stats: { charisma: 13, health: 5, strength: -9 } },
  beastfolk: { name: 'Зверолюд', weight: 6, stages: [2, 11, 17, 65], lifespan: [60, 110], names: ['Рэйна', 'Фенн', 'Кира', 'Торен', 'Нэйя', 'Шаэл'], houses: ['Лунный След', 'Тихая Лапа', 'Серый Тростник'], stats: { strength: 9, health: 6, intellect: 3 } },
  dragonborn: { name: 'Драконорождённый', weight: 4, stages: [3, 17, 27, 135], lifespan: [110, 210], names: ['Сария', 'Варекс', 'Кэсса', 'Драккен', 'Ишра', 'Тэрон'], houses: ['Пепельное Крыло', 'Медная Чешуя', 'Тлеющий Камень'], stats: { magic: 17, strength: 12, charisma: -3 } },
} as const;
export type RaceId = keyof typeof races;

export const regions = {
  valoria: { name: 'Валория', polity: 'Человеческое королевство', settlements: ['Ольховый Брод', 'Валор', 'Белые Мельницы'], population: [62, 7, 10, 8, 5, 7, 4, 2], economy: 65, safety: 74, food: 79, education: 61, magic: 33, conflict: 17, openness: 58 },
  sylvanor: { name: 'Сильванор', polity: 'Союз лесных домов', settlements: ['Мшистая Гавань', 'Лунная Роща', 'Лестница Ив'], population: [5, 65, 4, 3, 4, 7, 4, 2], economy: 62, safety: 79, food: 71, education: 82, magic: 85, conflict: 11, openness: 38 },
  karak: { name: 'Карак-Дум', polity: 'Подгорные кланы', settlements: ['Медный Порог', 'Глубокий Зал', 'Семь Кузниц'], population: [6, 4, 64, 5, 6, 7, 4, 2], economy: 75, safety: 65, food: 55, education: 67, magic: 42, conflict: 24, openness: 42 },
  steppes: { name: 'Красные степи', polity: 'Племенные союзы', settlements: ['Костры Тарга', 'Ставка Ветров', 'Сухой Брод'], population: [7, 4, 5, 63, 7, 7, 4, 2], economy: 46, safety: 48, food: 57, education: 39, magic: 43, conflict: 40, openness: 45 },
  grimm: { name: 'Топи Гримм', polity: 'Вольные поселения', settlements: ['Тихие Сваи', 'Ржавый Причал', 'Кочки Семи Огней'], population: [5, 3, 4, 7, 62, 7, 4, 2], economy: 53, safety: 50, food: 61, education: 47, magic: 58, conflict: 29, openness: 68 },
  frontier: { name: 'Пограничье', polity: 'Свободные города', settlements: ['Каменный Путь', 'Три Башни', 'Край Дорог'], population: [15, 17, 13, 14, 16, 7, 4, 2], economy: 69, safety: 56, food: 65, education: 59, magic: 49, conflict: 32, openness: 89 },
  aurelian: { name: 'Аврелийская лига', polity: 'Союз человеческих республик', settlements: ['Аврелия', 'Медная Гавань', 'Соляной Торг', 'Дозорный Мыс'], population: [65, 6, 7, 4, 5, 9, 2, 2], economy: 79, safety: 62, food: 64, education: 73, magic: 41, conflict: 38, openness: 78 },
  duskwood: { name: 'Сумеречные дома', polity: 'Эльфийское княжество', settlements: ['Сумеречный Венец', 'Дубовый Архив', 'Зеркальная Заводь', 'Осенний Двор'], population: [5, 72, 3, 2, 3, 5, 6, 4], economy: 58, safety: 63, food: 70, education: 85, magic: 89, conflict: 36, openness: 31 },
  ironreach: { name: 'Железный Предел', polity: 'Республика гномьих артелей', settlements: ['Рудный Круг', 'Молотоград', 'Стеклянный Шпиль', 'Город Лебёдок'], population: [7, 3, 70, 6, 5, 3, 3, 3], economy: 83, safety: 59, food: 51, education: 78, magic: 49, conflict: 43, openness: 56 },
  moonfen: { name: 'Лунные Марши', polity: 'Союз звериных общин', settlements: ['Лунный Порог', 'Тростниковый Совет', 'Лисьи Фонари', 'Серебряный Омут'], population: [8, 8, 3, 9, 10, 5, 67, 3], economy: 49, safety: 64, food: 77, education: 52, magic: 66, conflict: 27, openness: 71 },
  hearthshire: { name: 'Вересковые Холмы', polity: 'Вольные кантоны полуросликов', settlements: ['Тёплая Лощина', 'Медовый Рынок', 'Яблоневый Круг', 'Город Пекарей'], population: [14, 5, 5, 3, 5, 72, 4, 2], economy: 68, safety: 84, food: 91, education: 65, magic: 32, conflict: 9, openness: 79 },
  emberfall: { name: 'Пепельные престолы', polity: 'Драконьи города-государства', settlements: ['Пепельный Престол', 'Обсидиановый Порт', 'Красная Обсерватория', 'Террасы Рассвета'], population: [6, 5, 8, 8, 3, 3, 7, 68], economy: 71, safety: 55, food: 48, education: 76, magic: 88, conflict: 47, openness: 39 },
} as const;
export type RegionId = keyof typeof regions;

export const backgrounds = {
  orphan: { name: 'Сиротство', status: 'Без устойчивого дома', family: 'без постоянной опеки', weight: 4, wealth: 2, education: 0 },
  poor: { name: 'Бедный дом', status: 'Бедное сословие', family: 'в семье подёнщиков', weight: 21, wealth: 7, education: 1 },
  worker: { name: 'Рабочая семья', status: 'Крестьянство / рабочие', family: 'в семье работников', weight: 40, wealth: 16, education: 2 },
  artisan: { name: 'Семья мастеров', status: 'Ремесленное сословие', family: 'в семье мастеров', weight: 20, wealth: 29, education: 4 },
  merchant: { name: 'Торговый дом', status: 'Торговое сословие', family: 'в торговом доме', weight: 8, wealth: 53, education: 6 },
  scholar: { name: 'Дом знаний', status: 'Учёное / духовное сословие', family: 'в доме хранителей знаний', weight: 5, wealth: 38, education: 10 },
  noble: { name: 'Знатный дом', status: 'Дворянство', family: 'в знатном доме', weight: 1.9, wealth: 100, education: 12 },
  ruler: { name: 'Правящая семья', status: 'Правящая династия', family: 'в правящей семье', weight: .1, wealth: 185, education: 15 },
} as const;
export type StatusId = keyof typeof backgrounds;

export const traits = {
  curious: ['Любознательность', 'Возможности учиться и исследовать встречаются чаще.', 'knowledge'],
  careful: ['Осторожность', 'В авторежиме чаще склоняется к безопасным решениям.', 'survival'],
  stubborn: ['Упрямство', 'В авторежиме чаще выбирает путь влияния.', 'influence'],
  kind: ['Сострадание', 'Чаще замечает тех, кому нужна помощь.', 'wellbeing'],
  ambitious: ['Амбициозность', 'Чаще встречает возможности заработать и продвинуться.', 'wealth'],
  sociable: ['Общительность', 'Чаще находит друзей и союзников.', 'wellbeing'],
  reserved: ['Замкнутость', 'В авторежиме тяготеет к учёбе и наблюдению.', 'knowledge'],
  sturdy: ['Выносливость', 'Смягчает потерю здоровья в трудные годы.', 'survival'],
  restless: ['Непоседливость', 'Чаще встречает возможности отправиться в путь.', 'adventure'],
} as const;
export type TraitId = keyof typeof traits;

export const priorities = {
  survival: ['Выживание', 'Здоровье и безопасный уклад.'],
  wellbeing: ['Благополучие', 'Семья, дружба и удовлетворённость жизнью.'],
  wealth: ['Богатство', 'Доход, сбережения и торговые связи.'],
  knowledge: ['Знания', 'Образование, исследования и магия.'],
  influence: ['Влияние', 'Репутация и участие в делах общины.'],
  adventure: ['Приключения', 'Путешествия, открытия и готовность к риску.'],
} as const;
export type Priority = keyof typeof priorities;
export const raceIds = Object.keys(races) as RaceId[];
export const regionIds = Object.keys(regions) as RegionId[];
export const statusIds = Object.keys(backgrounds) as StatusId[];
export const traitIds = Object.keys(traits) as TraitId[];

export const femaleNames: Record<RaceId, readonly string[]> = {
  human: ['Мира', 'Лив', 'Терена'], elf: ['Элира', 'Лиора', 'Сэйла'],
  dwarf: ['Бренна', 'Дагна', 'Хильда'], orc: ['Гарта', 'Тарка', 'Ашра'],
  goblin: ['Вика', 'Зисса', 'Ним'], halfling: ['Нелли', 'Роза', 'Пиппа'],
  beastfolk: ['Рэйна', 'Кира', 'Нэйя'], dragonborn: ['Сария', 'Кэсса', 'Ишра'],
};

export const nativeRace: Record<RegionId, RaceId | null> = {
  valoria: 'human', aurelian: 'human', sylvanor: 'elf', duskwood: 'elf',
  karak: 'dwarf', ironreach: 'dwarf', steppes: 'orc', grimm: 'goblin',
  frontier: null, moonfen: 'beastfolk', hearthshire: 'halfling', emberfall: 'dragonborn',
};
export const regionScene: Record<RegionId, string> = {
  valoria: 'valoria', aurelian: 'frontier', sylvanor: 'sylvanor', duskwood: 'sylvanor',
  karak: 'karak', ironreach: 'karak', steppes: 'steppes', grimm: 'grimm',
  frontier: 'frontier', moonfen: 'grimm', hearthshire: 'valoria', emberfall: 'steppes',
};
export const workRegion: Record<RegionId, RegionId> = {
  valoria: 'valoria', aurelian: 'valoria', sylvanor: 'sylvanor', duskwood: 'sylvanor',
  karak: 'karak', ironreach: 'karak', steppes: 'steppes', grimm: 'grimm',
  frontier: 'frontier', moonfen: 'grimm', hearthshire: 'valoria', emberfall: 'steppes',
};

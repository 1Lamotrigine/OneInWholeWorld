import { territoryNames } from '../game/engine/geopolitics';
import { projectIds } from '../game/content/projects';
import { z } from 'zod';
import { neighbours, pathIds } from '../game/content/atlas';
import { professions } from '../game/content/professions';
import { backgrounds, sexes, femaleNames, priorities, races, regions, statLabels, traits, regionIds } from '../game/content/world';
import { eventById, availableChoices, ageAppropriate } from '../game/engine/events';
import { phase } from '../game/engine/rules';
import { BIRTH_YEAR, CONTENT_VERSION, SCHEMA_VERSION, categories, type GameState } from '../game/types';

const range = (max = 100, min = 0) => z.number().min(min).max(max);
const whole = (max = 100, min = 0) => range(max, min).int();
const line = (max = 240) => z.string().min(1).max(max);
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,79}$/);
const race = z.enum(Object.keys(races) as (keyof typeof races)[]);
const region = z.enum(Object.keys(regions) as (keyof typeof regions)[]);
const status = z.enum(Object.keys(backgrounds) as (keyof typeof backgrounds)[]);
const profession = z.enum(Object.keys(professions) as (keyof typeof professions)[]);
const stats = z.object(Object.fromEntries(Object.keys(statLabels).map(key => [key, range()])) as Record<keyof typeof statLabels, ReturnType<typeof range>>);
const regionState = z.object({
  economy: range(), safety: range(), food: range(), education: range(), magic: range(), conflict: range(), openness: range(),
  crisis: z.enum(['war', 'drought', 'plague', 'trade', 'awakening', 'academy', 'winter', 'eruption', 'rebellion', 'pilgrimage', 'invention', 'eclipse']).nullable(), until: whole(3000),
});
const entry = z.object({
  year: whole(3000, BIRTH_YEAR), age: whole(600), eventId: id,
  category: z.enum(Object.keys(categories) as (keyof typeof categories)[]),
  title: line(), text: line(2000), tone: z.enum(['neutral', 'good', 'loss']), milestone: z.boolean(),
});
function upgradeState(raw: unknown) {
  if (!raw || typeof raw !== 'object' || !('schemaVersion' in raw) || !('contentVersion' in raw)) return raw;
  const legacy = raw.schemaVersion === 1 && raw.contentVersion === '1.0.0';
  const versionTwo = raw.schemaVersion === 2 && raw.contentVersion === '2.0.0';
  const versionThree = raw.schemaVersion === 3 && raw.contentVersion === '3.0.0';
  const versionFour = raw.schemaVersion === 4 && raw.contentVersion === '4.0.0';
  if (!legacy && !versionTwo && !versionThree && !versionFour) return raw;
  if (!('world' in raw) || !raw.world || typeof raw.world !== 'object'
    || !('regions' in raw.world) || !raw.world.regions || typeof raw.world.regions !== 'object'
    || !('character' in raw) || !raw.character || typeof raw.character !== 'object') return raw;
  const previous = raw.world;
  const previousRegions = raw.world.regions;
  const character = raw.character;
  const initialRegions = Object.fromEntries(regionIds.map(id => {
    const { economy, safety, food, education, magic, conflict, openness } = regions[id];
    return [id, { economy, safety, food, education, magic, conflict, openness, crisis: null, until: 0 }];
  }));
  let sex: 'male' | 'female' | 'unknown' = 'unknown';
  let experience = 0;
  if ('race' in character && typeof character.race === 'string' && Object.hasOwn(races, character.race)
    && 'name' in character && typeof character.name === 'string') {
    const raceId = character.race as keyof typeof races;
    const name = character.name.split(' ')[0];
    if ((races[raceId].names as readonly string[]).includes(name)) sex = femaleNames[raceId].includes(name) ? 'female' : 'male';
    if ('path' in raw && raw.path && 'age' in character && typeof character.age === 'number') {
      experience = Math.max(0, character.age - races[raceId].stages[1]) / Math.sqrt(races[raceId].lifespan[1] / 95) * .9;
    }
  }
  const pending = 'pending' in raw && raw.pending && typeof raw.pending === 'object' && 'eventId' in raw.pending
    ? eventById.get(String(raw.pending.eventId)) : undefined;
  const invalidPending = pending && 'race' in character && typeof character.race === 'string' && Object.hasOwn(races, character.race) && 'age' in character && typeof character.age === 'number'
    && !ageAppropriate({ character } as GameState, pending);
  return {
    ...raw, ...(invalidPending ? { pending: null } : {}), schemaVersion: SCHEMA_VERSION, contentVersion: CONTENT_VERSION,
    ...(legacy ? { path: null, lastMove: 0, lastAct: 0 } : {}),
    pathExperience: versionFour && 'pathExperience' in raw ? raw.pathExperience : experience,
    character: { ...character, sex: (versionThree || versionFour) && 'sex' in character ? character.sex : sex },
    world: {
      ...previous, projects: versionFour && 'projects' in previous ? previous.projects : [], control: Object.fromEntries(regionIds.flatMap(id => regions[id].settlements.map(name => [name, id]))), alliances: [], ...(legacy ? { news: [], fronts: [] } : {}),
      terms: { ...Object.fromEntries(regionIds.map(id => [id, 0])), ...('terms' in previous && typeof previous.terms === 'object' ? previous.terms : {}) },
      regions: { ...initialRegions, ...previousRegions },
    },
  };
}

export const stateSchema: z.ZodType<GameState> = z.preprocess(upgradeState, z.object({
  schemaVersion: z.literal(SCHEMA_VERSION), contentVersion: z.literal(CONTENT_VERSION),
  path: z.enum(pathIds).nullable(), pathExperience: range(1000), lastMove: whole(3000), lastAct: whole(3000),
  saveId: id, seed: line(128), rngState: whole(0xffffffff), revision: whole(100000000),
  character: z.object({
    name: line(), sex: z.enum(Object.keys(sexes) as (keyof typeof sexes)[]), race, origin: region, region, birthplace: line(), settlement: line(), background: status, status,
    age: whole(600), longevity: whole(500, 40), stats,
    traits: z.array(z.enum(Object.keys(traits) as (keyof typeof traits)[])).length(2),
    wealth: range(99999), education: range(), reputation: range(), mastery: range(),
    profession: profession.nullable(), career: z.array(profession).max(25), employedSince: whole(600),
    relationships: z.array(z.object({
      id, name: line(), role: z.enum(['Опекун', 'Родитель', 'Сиблинг', 'Друг', 'Партнёр', 'Ребёнок', 'Наставник', 'Сосед', 'Соперник', 'Союзник', 'Покровитель', 'Осведомитель', 'Подопечный']),
      race, born: whole(3000), bond: range(), died: whole(3000, BIRTH_YEAR).nullable(),
    })).max(200),
    condition: z.enum(['fever', 'injury', 'chronic']).nullable(), conditionYears: whole(600),
    lifeRisk: range(.8), retired: z.boolean(),
  }),
  world: z.object({
    year: whole(3000, BIRTH_YEAR), regions: z.record(region, regionState), terms: z.record(region, whole(600)),
    news: z.array(z.object({ year: whole(3000, BIRTH_YEAR), region, title: line(), text: line(2000) })).max(36),
    projects: z.array(z.object({
      id, region, kind: z.enum(projectIds), founder: line(), title: line(),
      started: whole(3000, BIRTH_YEAR), until: whole(3000, BIRTH_YEAR),
    })).max(48),
    control: z.record(z.string(), region),
    alliances: z.array(z.object({ first: region, second: region, until: whole(3000, BIRTH_YEAR) })).max(5),
    fronts: z.array(z.object({ from: region, to: region, until: whole(3000, BIRTH_YEAR) })).max(6),
  }),
  birthOdds: z.object({ race: range(1, Number.MIN_VALUE), region: range(1, Number.MIN_VALUE), background: range(1, Number.MIN_VALUE) }),
  pending: z.object({ eventId: id, token: id, optionIds: z.array(id).min(2).max(4) }).nullable(),
  priority: z.enum(Object.keys(priorities) as (keyof typeof priorities)[]), automatic: z.boolean(), revealed: z.boolean(),
  ended: z.object({ cause: line(), epitaph: line(600) }).nullable(),
  seen: z.record(id, whole(3000, BIRTH_YEAR)),
  scheduled: z.array(z.object({ year: whole(3000, BIRTH_YEAR), eventId: id })).max(100),
  chronicle: z.array(entry).min(1).max(5000),
}).superRefine((s, ctx) => {
  const c = s.character;
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (s.world.year !== BIRTH_YEAR + c.age || c.employedSince > c.age
    || c.age > Math.floor(c.longevity * 1.12) + 1 || c.longevity < races[c.race].lifespan[0] || c.longevity > races[c.race].lifespan[1]
    || !s.revealed && (c.age !== 0 || !!s.pending || !!s.ended)
    || c.profession && (phase(c) < 3 || c.retired || !c.career.includes(c.profession))
    || !s.ended && c.stats.health <= 0 || new Set(c.traits).size !== c.traits.length) fail('Некорректное состояние персонажа.');
  if (!(regions[c.origin].settlements as readonly string[]).includes(c.birthplace)
    || !(regions[c.region].settlements as readonly string[]).includes(c.settlement)) fail('Некорректное поселение.');
  if (c.relationships.some(p => p.born > s.world.year || p.died !== null && (p.died < p.born || p.died > s.world.year))
    || c.relationships.some((p, index) => p.id !== 'person-' + index)) fail('Некорректные семейные записи.');
  if (regionIds.some(id => { const r = s.world.regions[id]; return r.crisis ? r.until <= s.world.year : r.until !== 0; })) fail('Некорректный срок кризиса.');
  if (s.world.projects.some(project => project.id !== project.region + '-' + project.kind || project.started > s.world.year || project.until <= s.world.year || project.until <= project.started)
    || new Set(s.world.projects.map(project => project.id)).size !== s.world.projects.length) fail('Некорректные долгосрочные последствия.');
  if (Object.keys(s.world.control).length !== territoryNames.length || territoryNames.some(name => !s.world.control[name])) fail('Некорректные территории.');
  const pactIds = s.world.alliances.map(pact => [pact.first, pact.second].sort().join('-'));
  if (new Set(pactIds).size !== pactIds.length || s.world.alliances.some(pact => pact.first === pact.second || pact.until <= s.world.year
    || !Object.values(s.world.control).includes(pact.first) || !Object.values(s.world.control).includes(pact.second))) fail('Некорректные союзы.');
  const fronts = s.world.fronts.flatMap(front => [front.from, front.to]);
  if (s.lastMove > s.world.year || s.lastAct > s.world.year || s.world.news.some(row => row.year > s.world.year)
    || new Set(fronts).size !== fronts.length || s.world.fronts.some(front =>
      !neighbours[front.from].includes(front.to) || [front.from, front.to].some(id => {
        const r = s.world.regions[id];
        return r.crisis !== 'war' || r.until !== front.until;
      }))) fail('Некорректное состояние мира.');
  if (s.chronicle[0]?.category !== 'birth' || s.chronicle[0]?.age !== 0
    || s.chronicle.some((row, i) => row.year !== BIRTH_YEAR + row.age || row.year > s.world.year || i > 0 && s.chronicle[i - 1].year > row.year)
    || s.chronicle.filter(row => row.category === 'death').length !== (s.ended ? 1 : 0)
    || s.ended && s.chronicle.at(-1)?.category !== 'death') fail('Нарушена последовательность летописи.');
  if (Object.entries(s.seen).some(([id, year]) => !eventById.has(id) || year > s.world.year)
    || s.scheduled.some(item => item.year <= s.world.year || eventById.get(item.eventId)?.weight !== 0)) fail('Некорректные данные о событиях.');
  if (s.pending) {
    const event = eventById.get(s.pending.eventId);
    const choiceIds = event ? availableChoices(s, event).map(choice => choice.id) : [];
    if (s.ended || (!event || !ageAppropriate(s, event)) || s.seen[s.pending.eventId] !== s.world.year
      || s.pending.token !== `${s.world.year}-${s.pending.eventId}`
      || new Set(s.pending.optionIds).size !== s.pending.optionIds.length
      || s.pending.optionIds.some(id => !choiceIds.includes(id))) fail('Ожидающее решение повреждено.');
  }
}));

const envelope = z.object({
  formatVersion: z.literal(1), schemaVersion: z.number(), contentVersion: z.string(),
  exportedAt: z.iso.datetime(), state: z.unknown(),
}).superRefine((file, ctx) => {
  const state = file.state;
  if (!state || typeof state !== 'object' || !('schemaVersion' in state) || !('contentVersion' in state)
    || state.schemaVersion !== file.schemaVersion || state.contentVersion !== file.contentVersion) {
    ctx.addIssue({ code: 'custom', message: 'Версии файла и состояния не совпадают.' });
  }
}).transform(file => ({ ...file, state: stateSchema.safeParse(file.state) }));
export const MAX_SAVE_BYTES = 2 * 1024 * 1024;

export function serializeSave(state: GameState, exportedAt = new Date().toISOString()) {
  return JSON.stringify({ formatVersion: 1, schemaVersion: state.schemaVersion, contentVersion: state.contentVersion, exportedAt, state }, null, 2);
}

export function deserializeSave(json: string): GameState {
  if (new TextEncoder().encode(json).length > MAX_SAVE_BYTES) throw new Error('Файл больше 2 МБ.');
  let decoded: unknown;
  try { decoded = JSON.parse(json); } catch { throw new Error('Файл не является корректным JSON.'); }
  const result = envelope.safeParse(decoded);
  if (!result.success || !result.data.state.success) throw new Error('Сохранение повреждено или создано в несовместимой версии игры.');
  return result.data.state.data;
}

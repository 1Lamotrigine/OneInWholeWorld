import { decision, grown, independent, moment, option, type EventDefinition } from './event-types';
import { addRelation } from '../engine/rules';

const encounters = [
  ['beggar-at-gate', 'Просьба у городских ворот', 'Незнакомец просит еды и ночлега. Его рассказ нельзя проверить: нуждающийся это или человек, использующий чужое доверие?', 'Поделиться едой и дать адрес', 'Сберечь припасы и пройти мимо'],
  ['unknown-courier', 'Посылка без поручителя', 'Путник просит передать запечатанный свёрток. Внутри могут быть семейные письма или краденые бумаги.', 'Взять свёрток и адрес', 'Отказаться от поручения'],
  ['refugee-workshop', 'Ключ от мастерской', 'Человек с дороги просит на ночь пустую мастерскую. Он обещает починить инструменты, но никто в квартале его не знает.', 'Доверить ключ на одну ночь', 'Оставить мастерскую запертой'],
  ['unverified-witness', 'Свидетель без имени', 'Незнакомый свидетель просит заступиться за него перед дозором. Он может говорить правду или искать удобного сообщника.', 'Поручиться до проверки', 'Не связывать имя с незнакомцем'],
] as const;

export const dilemmas: EventDefinition[] = encounters.flatMap(([id, title, text, help, refuse]) => {
  const after = (suffix: string) => ({ eventId: id + '-' + suffix, years: 3 });
  return [decision(id, 'relations', independent, title, text, [
    option('trust', help, 'Помощь стоит припасов и времени. Личность незнакомца неизвестна; последствия выяснятся через три года.', '', ['wellbeing', 'adventure'], { wealth: -3, stats: { health: -1 } }, {
      uncertain: {
        good: { text: 'Незнакомец принял помощь. Пока неизвестно, чем закончится эта встреча.', effect: {}, later: after('trust-good') },
        bad: { text: 'Незнакомец принял помощь. Пока неизвестно, чем закончится эта встреча.', effect: {}, later: after('trust-bad') },
      },
    }),
    option('decline', refuse, 'Припасы и безопасность остаются при тебе, но можно потерять будущего союзника. Последствия тоже не гарантированы.', '', ['survival', 'wealth'], {}, {
      uncertain: {
        good: { text: 'Ваши пути разошлись. Узнать, кто просил помощи, пока не удалось.', effect: {}, later: after('decline-good') },
        bad: { text: 'Ваши пути разошлись. Узнать, кто просил помощи, пока не удалось.', effect: {}, later: after('decline-bad') },
      },
    }),
  ], { weight: 10 }),
  moment(id + '-trust-good', 'relations', independent, title + ' · возвращение', 'Человек из давней встречи оказался честным. В трудный сезон он вернул припасы и предложил надёжную связь.', { wealth: 9, reputation: 4 }, {
    weight: 0, tone: 'good', milestone: true, apply: (s, rng) => { if (s.character.relationships.length < 200) addRelation(s.character, s.world.year, 'Союзник', Math.max(18, s.character.age), rng); },
  }),
  moment(id + '-trust-bad', 'society', independent, title + ' · расследование', 'Твоим доверием воспользовался преступник. Дозор установил обман, но пропавшие припасы и испорченную репутацию вернуть не удалось.', { wealth: -8, reputation: -7, stats: { happiness: -4 } }, { weight: 0, tone: 'loss', milestone: true }),
  moment(id + '-decline-good', 'relations', independent, title + ' · упущенная связь', 'Незнакомец оказался честным и нашёл помощь у другого дома. Теперь он поддерживает твоего соперника; отказ оказался упущенной возможностью.', { reputation: -3 }, {
    weight: 0, tone: 'loss', apply: (s, rng) => { if (s.character.relationships.length < 200) addRelation(s.character, s.world.year, 'Соперник', Math.max(18, s.character.age), rng); },
  }),
  moment(id + '-decline-bad', 'society', independent, title + ' · осторожность оправдалась', 'Человек из давней встречи обманул несколько домов. Отказ уберёг твои припасы, а показания помогли дозору остановить обман.', { reputation: 4 }, { weight: 0, tone: 'good' }),
  ];
});

// An adult public dilemma with two incompatible objectives, rather than two roads to the same reward.
dilemmas.push(decision('hospital-or-granary', 'world', grown, 'Одного склада на всех не хватит',
  'Совет может выделить последний склад под лечебницу или зерновой резерв. Болезни и неурожай угрожают одновременно; решить обе задачи сейчас невозможно.', [
    option('hospital', 'Передать склад лекарям', 'Безопасность +12, продовольствие −9. Лечение доступнее, но запасов на неурожай меньше.', 'Лекари открыли палаты. Общине пришлось отказаться от зернового резерва.', ['wellbeing', 'knowledge'], { wealth: -5, reputation: 3 }, {
      apply: s => { const r = s.world.regions[s.character.region]; r.safety = Math.min(100, r.safety + 12); r.food = Math.max(0, r.food - 9); },
    }),
    option('grain', 'Сохранить зерновой резерв', 'Продовольствие +12, безопасность −7. Люди защищены от голода, но лечебница не откроется.', 'Запасы опечатали до неурожая. Лекари продолжают принимать больных в тесных домах.', ['survival', 'wealth'], { wealth: -5, reputation: 3 }, {
      apply: s => { const r = s.world.regions[s.character.region]; r.food = Math.min(100, r.food + 12); r.safety = Math.max(0, r.safety - 7); },
    }),
  ], { weight: 9, when: s => s.character.reputation >= 25 }));

dilemmas.push(decision('campaign-council', 'war', grown, 'Совет перед наступлением',
  'На фронте готовят новую кампанию. Можно сберечь людей за укреплениями или потратить запасы на давление; ни один план не гарантирует победу.', [
    option('fortify', 'Укрепить оборону', 'Безопасность +14, запасы −10. Сильнее гарнизоны, но труднее пережить осаду.', 'Караваны отдали припасы на укрепления.', ['survival', 'wellbeing'], { wealth: -4 }, {
      apply: s => { const r = s.world.regions[s.character.region]; r.safety = Math.min(100, r.safety + 14); r.food = Math.max(0, r.food - 10); },
    }),
    option('supply', 'Отправить обозы в обход', 'Запасы +14, благосостояние −12. Улучшит снабжение фронта ценой гражданского рынка.', 'Обозы дошли обходной дорогой. Городским лавкам не хватило товаров.', ['adventure', 'influence'], { wealth: -4 }, {
      apply: s => { const r = s.world.regions[s.character.region]; r.food = Math.min(100, r.food + 14); r.economy = Math.max(0, r.economy - 12); },
    }),
  ], { weight: 22, cooldown: 4, when: s => ['warrior', 'politician', 'hero', 'diplomat', 'spy'].includes(s.path ?? '') && s.world.regions[s.character.region].crisis === 'war' }));

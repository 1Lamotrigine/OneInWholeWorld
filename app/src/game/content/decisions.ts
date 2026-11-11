import { addRelation, canWork, employ, hasRelation, regionState, relocate } from '../engine/rules';
import { pick } from '../engine/random';
import type { GameState } from '../types';
import { professionIds, professions } from './professions';
import { regionIds, regions, races } from './world';
import { adult, child, decision as d, grown, independent, old, option as o, young } from './event-types';

export const decisions = [
  d('school', 'education', child, 'Школа при храме', 'В храме открыли вечерний класс. Учитель готов принимать детей из всех домов, но нужны тетради и масло для лампы.', [
    o('enroll', 'Учиться у храмового писца', '−4 монеты · образование', 'В храме нашлось место за длинным столом. Первые буквы дались с трудом, но вскоре сложились в слова.', ['knowledge', 'influence'], { education: 7, stats: { intellect: 5 } }, { cost: 4 }),
    o('borrow', 'Попросить книгу домой', 'Немного знаний без платы', 'Писец одолжил книгу с полустёртыми буквами. Её удалось прочесть от корки до корки.', ['survival'], { education: 3 }),
    o('home', 'Остаться помогать дома', 'Связи с близкими и практические навыки', 'Зимние вечера прошли за домашней работой и разговорами с близкими.', ['wellbeing', 'wealth'], { bond: 4, stats: { strength: 3 } }),
  ], { weight: 9, when: s => s.character.age >= Math.ceil(5 * Math.sqrt(races[s.character.race].lifespan[1] / 95)) }),
  d('foster', 'family', child, 'Место за общим столом', 'Семья мельников предлагает кров и место в доме. Взамен придётся помогать с хозяйством.', [
    o('accept', 'Переехать к мельникам', 'Опека и более устойчивый быт', 'У мельников появилась своя койка и своя доля работы.', ['survival', 'wellbeing'], { status: 'worker', stats: { happiness: 9 } }, { apply: (s, rng) => { addRelation(s.character, s.world.year, 'Опекун', s.character.age + 27, rng); } }),
    o('independent', 'Остаться при общинном доме', 'Больше свободы и небольшая помощь общины', 'Община помогла продержаться до весны.', ['adventure', 'wealth'], { wealth: 6, reputation: 3 }),
  ], { when: s => s.character.status === 'orphan', weight: 14 }),
  d('friendship', 'relations', child, 'Дружба у реки', 'Ровесник приглашает соорудить переправу через ручей. Вдвоём можно управиться до темноты.', [
    o('build', 'Вместе построить мостик', 'Дружба и небольшая нагрузка', 'К утру мостик стал любимой дорогой соседских детей.', ['wellbeing', 'adventure'], { stats: { happiness: 6, health: -1 } }, { apply: (s, rng) => `Новый друг — ${addRelation(s.character, s.world.year, 'Друг', s.character.age, rng)}.` }),
    o('watch', 'Показать безопасный брод', 'Репутация и осторожность', 'Затея с мостиком отпала, а дорогу через брод вскоре знала вся улица.', ['survival', 'influence'], { reputation: 4 }),
  ]),
  d('apprentice', 'education', young, 'Год у мастера', 'Мастер предлагает провести сезон за верстаком. Начинать придётся с простых поручений.', [
    o('train', 'Пойти в ученики', 'Навыки сейчас, рекомендация через год', 'Первые изделия вышли грубыми. Мастер оставил их на виду, чтобы позже было с чем сравнить.', ['knowledge', 'influence'], { education: 8, stats: { strength: 3 } }, { later: { eventId: 'guild-letter', years: 1 } }),
    o('wages', 'Взять оплачиваемую работу', 'Доход сейчас и меньше времени на учёбу', 'Оплачиваемые поручения принесли больше монет, чем обещали в мастерской.', ['wealth', 'survival'], { wealth: 13, education: 2 }),
  ], { weight: 13 }),
  d('academy', 'education', young, 'Приём в академию', 'Наставница готова поручиться за тебя перед академией. Проезд и проживание придётся оплатить самостоятельно.', [
    o('study', 'Поехать учиться', '−16 монет · заметный прирост образования', 'Среди академических полок нашлось дело на несколько лет вперёд.', ['knowledge', 'adventure'], { education: 13, stats: { intellect: 8, happiness: -2 } }, { cost: 16 }),
    o('local', 'Учиться у местного наставника', 'Доступное обучение рядом с домом', 'Вместо переезда начались долгие вечера за тетрадью в доме наставника.', ['wellbeing', 'survival'], { education: 5, bond: 3 }),
  ], { when: s => s.character.stats.intellect >= 52 && regionState(s).education > 50 }),
  d('magical-call', 'magic', young, 'Свет под пальцами', 'Тёплое свечение появляется всякий раз, когда ты касаешься воды. Странствующий маг предлагает выяснить, что с ним делать.', [
    o('learn', 'Обучаться у странника', '−6 монет · магическое мастерство', 'Странник учит зажигать свет по желанию и гасить его без следа.', ['knowledge', 'influence'], { mastery: 9, education: 5 }, { cost: 6, apply: (s, rng) => { addRelation(s.character, s.world.year, 'Наставник', s.character.age + 18, rng); } }),
    o('alone', 'Изучать дар самостоятельно', 'Бесплатно · риск ожога', 'Несколько недель ушло на то, чтобы повторить первую искру.', ['adventure'], { mastery: 5 }, { gamble: { chance: s => .35 + s.character.stats.magic / 200, failure: 'Свечение оставило ожог. Эксперименты пришлось прервать.', effect: { stats: { health: -10 }, condition: 'injury' } } }),
    o('hide', 'Оставить дар в покое', 'Стабильность и время для близких', 'Кружка осталась на подоконнике. Вечер прошёл за общим столом.', ['survival', 'wellbeing', 'wealth'], { stats: { happiness: 4 } }),
  ], { when: s => s.character.stats.magic >= 38 && regionState(s).magic >= 42, weight: 12 }),
  d('first-work', 'work', grown, 'Поиск работы', 'Пора искать постоянный заработок. Можно выбрать одно из доступных мест или пока жить на случайные поручения.', [
    ...professionIds.map(id => o(id, 'Взяться за дело · ' + professions[id].name, 'Базовый доход: ' + professions[id].income, 'Начинается новая глава трудовой жизни.', id === 'mage' || id === 'scribe' ? ['knowledge'] : id === 'caravaner' ? ['adventure', 'wealth'] : ['survival', 'wealth'], { reputation: 2 }, { when: s => canWork(s.character, id) && s.character.profession !== id, apply: s => { employ(s.character, id); return `Новое занятие — ${professions[id].name.toLowerCase()}.`; } })),
    o('odd', 'Жить на случайные поручения', 'Небольшой заработок и свобода', 'Несколько поручений помогли пережить год без постоянного места.', ['wellbeing'], { wealth: 4 }),
  ], { when: s => !s.character.profession && !s.character.retired, weight: 24, cooldown: 5 }),
  d('guild', 'work', adult, 'Место в гильдии', 'Гильдия приглашает мастеров с опытом. Членство откроет доступ к общим заказам и потребует взноса.', [
    o('join', 'Вступить в гильдию', '−15 монет · ремесленный статус и репутация', 'Гильдейская печать открыла доступ к заказам, которые прежде обходили мастерскую стороной.', ['wealth', 'influence'], { status: 'artisan', reputation: 13 }, { cost: 15 }),
    o('refuse', 'Сохранить независимость', 'Свободное расписание', 'Заказов стало меньше, зато работу теперь можно выбирать.', ['wellbeing', 'adventure'], { stats: { happiness: 5 } }),
  ], { when: s => !!s.character.profession && ['smith', 'carpenter', 'weaver', 'alchemist'].includes(s.character.profession) && s.character.age - s.character.employedSince >= 4 && ['poor', 'worker', 'orphan'].includes(s.character.status) }),
  d('contract', 'economy', grown, 'Заказ на дальний рынок', 'Купец предлагает вложиться в партию товара. Если обоз дойдёт вовремя, доля прибыли будет твоей.', [
    o('invest', 'Вложить деньги в обоз', '−18 монет · возможна большая прибыль', 'Обоз пришёл до закрытия рынка, и доля прибыли оказалась больше обещанной.', ['wealth', 'adventure'], { wealth: 41, reputation: 5 }, { cost: 18, gamble: { chance: s => .32 + regionState(s).safety / 220 + s.character.stats.charisma / 500, failure: 'Обоз задержался у переправы и товар пришлось продать за бесценок.', effect: { reputation: -2 } } }),
    o('broker', 'Помочь с местными продажами', 'Небольшой гарантированный доход', 'Товар разошёлся по соседним лавкам, а посредническая плата пришлась кстати.', ['survival', 'influence'], { wealth: 8, reputation: 3 }),
  ], { when: s => s.character.wealth >= 12 && regionState(s).economy > 42, cooldown: 14 }),
  d('partner', 'relations', adult, 'Встречи у вечернего огня', 'Дружеские встречи становятся всё ближе. Можно предложить человеку разделить с тобой повседневную жизнь.', [
    o('commit', 'Предложить жить вместе', 'Партнёрство и общий дом', 'В доме появилась вторая чашка, а у повседневных дел — общие планы.', ['wellbeing', 'survival'], { stats: { happiness: 12 } }, { apply: (s, rng) => `Партнёр — ${addRelation(s.character, s.world.year, 'Партнёр', s.character.age + 1, rng)}.` }),
    o('friends', 'Сохранить дружбу', 'Близкая связь без общего хозяйства', 'Вечерние встречи продолжаются, и обоим удобно жить в своих домах.', ['adventure', 'knowledge'], { stats: { happiness: 4 } }, { apply: (s, rng) => { addRelation(s.character, s.world.year, 'Друг', s.character.age, rng); } }),
  ], { when: s => !hasRelation(s.character, 'Партнёр') && s.character.stats.charisma >= 32, cooldown: 12, weight: 13 }),
  d('child-home', 'family', adult, 'Место для ребёнка', 'В доме достаточно места для ребёнка. Близкие готовы разделить заботу, если ты решишься.', [
    o('raise', 'Принять ребёнка в семью', '−9 монет · новый член семьи', 'С этого года в доме слышны новые шаги.', ['wellbeing', 'influence'], { stats: { happiness: 9 } }, { cost: 9, apply: (s, rng) => `В семье появляется ${addRelation(s.character, s.world.year, 'Ребёнок', 0, rng)}.` }),
    o('wait', 'Отложить решение о семье', 'Сохранить привычный уклад', 'Дом остался таким, каким был, и времени на близких всё равно хватало.', ['survival', 'wealth'], { bond: 4 }),
  ], { when: s => hasRelation(s.character, 'Партнёр') && s.character.age < s.character.longevity * .72 && s.character.relationships.filter(person => person.role === 'Ребёнок').length < 2, cooldown: 10, weight: 12 }),
  d('medical', 'health', independent, 'Совет лекаря', 'Лекарь советует прервать привычные дела и дать телу восстановиться. За настой и перевязки нужно заплатить.', [
    o('cure', 'Оплатить лечение', '−8 монет · быстрее восстановить здоровье', 'Лечение облегчило симптомы, и силы начали возвращаться.', ['survival', 'wellbeing'], { condition: null, stats: { health: 13 } }, { cost: 8 }),
    o('rest', 'Взять время на отдых', 'Постепенное восстановление без платы', 'Несколько дней тишины принесли облегчение.', ['knowledge', 'influence'], { stats: { health: 7, happiness: 2 } }),
    o('push', 'Продолжать дела', 'Сохранить доход ценой здоровья', 'Дела завершились в срок, хотя недомогание ещё давало о себе знать.', ['wealth', 'adventure'], { wealth: 5, stats: { health: -3 } }),
  ], { when: s => s.character.condition !== null || s.character.stats.health < 50, weight: 15, cooldown: 5 }),
  d('journey', 'travel', independent, 'Дорога через перевал', 'Караван берёт попутчиков. За перевалом предстоит начать заново, зато там открывается другой рынок труда.', [
    o('move', 'Переселиться с караваном', '−10 монет · новый регион', 'Привычные улицы остались далеко позади.', ['adventure', 'wealth'], { reputation: -2, stats: { happiness: 3 } }, { cost: 10, apply: (s, rng) => {
      const c = s.character;
      const previous = c.profession;
      relocate(c, pick(destinations(s), rng), rng);
      const work = previous && !c.profession ? ' Прежнее занятие осталось в старом краю.' : '';
      return `Новый дом — ${c.settlement}, ${regions[c.region].name}.${work}`;
    } }),
    o('stay', 'Остаться дома', 'Связи в знакомой общине', 'Караван ушёл с рассветом. Дома остались привычные люди и дела.', ['survival', 'wellbeing'], { bond: 5, reputation: 2 }),
  ], { when: s => s.character.wealth >= 10 && destinations(s).length > 0, cooldown: 20 }),
  d('levy', 'war', adult, 'Призыв к рубежу', 'Во время конфликта собирают защитников. В ополчении пригодятся сильные руки, а в тылу — припасы и уход за ранеными.', [
    o('fight', 'Поступить на службу', 'Жалованье · риск ранения', 'Служба у рубежа принесла жалованье и известность.', ['adventure', 'influence', 'wealth'], { wealth: 11, reputation: 11, risk: .08 }, { when: s => canWork(s.character, 'soldier'), apply: s => { employ(s.character, 'soldier'); }, gamble: { chance: s => .48 + s.character.stats.strength / 240, failure: 'Ночной налёт закончился ранением, но ополчение удержало рубеж.', effect: { condition: 'injury', stats: { health: -17 }, risk: .12 } } }),
    o('help', 'Помогать в тылу', 'Репутация и меньший риск', 'Подводы с припасами добрались до заставы, а раненым нашлось место в тёплом зале.', ['survival', 'wellbeing'], { reputation: 7, stats: { happiness: 3 } }),
  ], { when: s => regionState(s).crisis === 'war', weight: 22, cooldown: 9 }),
  d('evacuation', 'war', grown, 'Ночная эвакуация', 'У ворот собираются семьи. Дозор обещает безопасный выход до рассвета, после чего дорога закроется.', [
    o('flee', 'Уйти в Пограничье', 'Потеря части имущества · новый дом', 'В свободном городе для прибывших нашли комнаты над складом.', ['survival', 'wellbeing'], { wealth: -12 }, { apply: (s, rng) => { relocate(s.character, 'frontier', rng); return `Убежище — ${s.character.settlement}.`; } }),
    o('shelter', 'Укрыться в подвалах', 'Дом останется рядом · умеренный риск', 'Ночь прошла под сводами, рядом с соседями и запасами воды.', ['wealth', 'influence'], { reputation: 4, risk: .06 }),
  ], { when: s => s.character.region !== 'frontier' && regionState(s).crisis === 'war' && s.world.regions.frontier.crisis !== 'war', weight: 12 }),
  d('artifact', 'magic', grown, 'Камень под обвалом', 'Рабочие нашли тёплый рунный камень. Один из них советует продать его прежде, чем о находке узнают хранители.', [
    o('sell', 'Продать торговцам', 'Доход и недовольство хранителей', 'Камень увезли с обозом. Хранители быстро узнали, кто его продал.', ['wealth'], { wealth: 23, reputation: -5 }),
    o('study', 'Изучить надпись', '−5 монет · магический опыт или травма', 'Руны открыли способ долго удерживать слабое свечение.', ['knowledge', 'adventure'], { mastery: 7, education: 5 }, { cost: 5, when: s => s.character.stats.magic >= 30, gamble: { chance: s => .28 + s.character.mastery / 115 + s.character.stats.magic / 320, failure: 'Камень треснул и обжёг руки.', effect: { stats: { health: -16 }, condition: 'injury' } } }),
    o('return', 'Передать хранителям', 'Репутация и безопасный исход', 'Хранители запечатали камень и поблагодарили за помощь.', ['survival', 'influence', 'wellbeing'], { reputation: 11 }),
  ], { when: s => s.character.region === 'karak' || s.character.profession === 'miner' || regionState(s).crisis === 'awakening' }),
  d('pact', 'politics', adult, 'Посланник совета', 'Два квартала спорят из-за права на колодец. Совет предлагает выступить посредником.', [
    o('speak', 'Взяться за переговоры', 'Шанс укрепить репутацию', 'Стороны согласились на общий график доступа к воде.', ['influence', 'adventure'], { reputation: 15, stats: { charisma: 5 } }, { gamble: { chance: s => .26 + s.character.stats.charisma / 140, failure: 'Переговоры сорвались. На площади ещё долго винили посредника.', effect: { reputation: -7, stats: { happiness: -3 } } } }),
    o('scribe', 'Записать требования сторон', 'Меньше риска и немного опыта', 'Записи помогли совету вернуться к разговору через неделю.', ['knowledge', 'survival'], { reputation: 5, education: 2 }),
  ], { when: s => s.character.reputation >= 29 }),
  d('tax', 'politics', grown, 'Повышенный сбор', 'Сборщик требует долю дохода на ремонт стен. У общины есть возможность подать прошение об отсрочке.', [
    o('pay', 'Внести сбор сразу', '−9 монет · хорошая репутация', 'В книгу сборов внесли платёж без отметки о просрочке.', ['survival', 'influence'], { reputation: 6 }, { cost: 9 }),
    o('appeal', 'Подать общее прошение', 'Сохранить сбережения · риск ссоры', 'Совет дал кварталу отсрочку до следующей ярмарки.', ['wealth', 'wellbeing'], { reputation: 4 }, { gamble: { chance: s => .48 + s.character.reputation / 240, failure: 'Совет отказал. Пришлось отдать часть запасов.', effect: { wealth: -6, reputation: -3 } } }),
  ], { when: s => s.character.wealth >= 6 && (s.character.region === 'valoria' || regionState(s).conflict >= 42), cooldown: 16 }),
  d('inheritance', 'family', grown, 'Последняя воля дома', 'Родственники разбирают старые семейные бумаги. Часть имущества может достаться тебе, если возьмёшь на себя заботу о доме.', [
    o('keep', 'Взять дом под свою опеку', 'Наследство и обязательства', 'Ключи от дома перешли к тебе вместе со списком того, что нужно починить.', ['wealth', 'influence'], { wealth: 26, reputation: 4, stats: { happiness: -3 } }),
    o('share', 'Разделить имущество с семьёй', 'Более крепкие семейные связи', 'Разговор о наследстве закончился без ссоры.', ['wellbeing', 'survival'], { wealth: 6, bond: 9, stats: { happiness: 5 } }),
  ], { when: s => s.character.relationships.some(p => p.role === 'Родитель' && p.died !== null) && s.character.relationships.some(p => p.died === null && ['Родитель', 'Сиблинг', 'Партнёр', 'Ребёнок'].includes(p.role)) && s.character.background !== 'poor' }),
  d('retire', 'legacy', old, 'Передать ключи', 'Привычные дела стали отнимать больше сил. Можно сократить нагрузку и передать работу другим.', [
    o('leave', 'Завершить работу', 'Больше отдыха и меньше дохода', 'Рабочие ключи остались у преемников. Утро впервые за много лет началось без спешки.', ['survival', 'wellbeing'], { stats: { health: 8, happiness: 6 } }, { apply: s => { s.character.retired = true; s.character.profession = null; } }),
    o('continue', 'Продолжать работать', 'Сохранить доход и привычный уклад', 'Работа продолжилась, хотя теперь приходилось чаще делать перерывы.', ['wealth', 'influence'], { reputation: 5 }),
  ], { when: s => !!s.character.profession, weight: 14 }),
  d('memoir', 'legacy', old, 'Письмо будущим', 'Соседский писец предлагает сохранить твои воспоминания. Придётся решить, кому они достанутся.', [
    o('archive', 'Передать рассказ в архив', 'Общественная память и репутация', 'Рукопись заняла полку рядом с летописями общины.', ['knowledge', 'influence'], { education: 3, reputation: 9 }),
    o('family', 'Оставить рассказ близким', 'Укрепить личные связи', 'Листы передали тем, кто был рядом в трудные годы.', ['wellbeing', 'survival'], { bond: 8, stats: { happiness: 8 } }),
  ], { when: s => s.character.relationships.some(p => p.died === null) }),
  d('clan-forge', 'work', young, 'Подгорный экзамен', 'Клановые мастера зовут отлить новую форму для чеканки. Испытание требует терпения и крепких рук.', [
    o('cast', 'Взяться за отливку', 'Ремесленные навыки · риск ожога', 'Форма выдержала первый удар. Мастера признали работу.', ['knowledge', 'influence'], { education: 9, reputation: 7 }, { gamble: { chance: s => .40 + s.character.stats.strength / 175, failure: 'Форма раскололась, а горячий металл обжёг ладонь.', effect: { stats: { health: -9 }, condition: 'injury' } } }),
    o('assist', 'Помогать у печи', 'Меньше риска, немного опыта', 'У печи удалось понять, как мастера угадывают момент заливки.', ['survival', 'wealth'], { education: 4, wealth: 5 }),
  ], { when: s => s.character.race === 'dwarf' && (s.character.region === 'karak' || s.character.background === 'artisan') }),
  d('grove', 'magic', young, 'Голоса старых деревьев', 'В Сильваноре хранители замечают, что тебе отзываются деревья. Они предлагают остаться в роще на сезон.', [
    o('listen', 'Учиться у хранителей', 'Магическое мастерство и знания', 'К концу сезона стало ясно, какие голоса принадлежат деревьям, а какие — ветру.', ['knowledge', 'adventure'], { mastery: 9, education: 5, stats: { happiness: 4 } }),
    o('guard', 'Помочь охранять рощу', 'Репутация и участие в делах дома', 'Тропы рощи оказались в надёжных руках до прихода холодов.', ['influence', 'survival'], { reputation: 9 }),
  ], { when: s => s.character.race === 'elf' && s.character.region === 'sylvanor' && s.character.stats.magic >= 35, weight: 13 }),
  d('steppe-oath', 'society', young, 'Клятва у костров', 'Степная община собирается решать, кто поведёт зимние дозоры. Старшие предлагают взять ответственность за один отряд.', [
    o('lead', 'Повести дозор', 'Репутация и физическая нагрузка', 'Отряд вернулся вместе, и на следующем сходе к его мнению прислушались.', ['influence', 'adventure'], { reputation: 11, stats: { strength: 4, health: -3 } }),
    o('guide', 'Разметить безопасные тропы', 'Вклад в безопасность общины', 'Метки уберегли несколько семей от дороги через тонкий лёд.', ['survival', 'wellbeing'], { reputation: 5, education: 3 }),
  ], { when: s => s.character.race === 'orc' && s.character.region === 'steppes' }),
  d('tinker', 'work', independent, 'Механизм приливных свай', 'Мастера Топей спорят, как удержать помост при паводке. Из обрезков цепи можно собрать рычаг.', [
    o('prototype', 'Собрать прототип', '−5 монет · знания и возможная награда', 'Рычаг удержал помост, и мастера выкупили чертёж.', ['knowledge', 'wealth'], { education: 7, wealth: 13, reputation: 5 }, { cost: 5, gamble: { chance: s => .35 + s.character.stats.intellect / 165, failure: 'Цепь не выдержала испытания, но сохранились полезные записи.', effect: { education: 3 } } }),
    o('repair', 'Укрепить старые сваи', 'Гарантированный заработок', 'Помост простоял до спада воды.', ['survival', 'wellbeing'], { wealth: 6, reputation: 3 }),
  ], { when: s => s.character.race === 'goblin' && (s.character.region === 'grimm' || s.character.region === 'frontier') }),
  d('manor', 'politics', adult, 'Ключи от поместья', 'Валорийский дом предлагает вести счета имения. Покровительство поможет в карьере, но придётся отвечать за новый сбор.', [
    o('manage', 'Принять место при дворе', 'Карьера и репутация · тяжёлая обязанность', 'Твоё имя появилось в дворцовых книгах рядом с хозяйственными расходами.', ['influence', 'wealth'], { reputation: 8, stats: { happiness: -5 } }, { when: s => canWork(s.character, 'courtier'), apply: s => { employ(s.character, 'courtier'); } }),
    o('local', 'Остаться в общине', 'Сохранить связи и самостоятельность', 'Дворцовые книги увезли обратно. В общине это решение приняли с теплом.', ['wellbeing', 'survival'], { bond: 7, stats: { happiness: 4 } }),
  ], { when: s => s.character.race === 'human' && s.character.region === 'valoria' && s.character.profession !== 'courtier' && canWork(s.character, 'courtier') }),
  d('food-store', 'economy', grown, 'Запасы на зиму', 'Хранилище пустеет, а зерно дорожает. Купцы готовы продать последние мешки по высокой цене.', [
    o('buy', 'Купить зерно заранее', '−12 монет · здоровье и спокойствие', 'Мешков хватило до первой весенней зелени.', ['survival', 'wellbeing'], { stats: { health: 8, happiness: 3 } }, { cost: 12 }),
    o('coop', 'Собрать общую кухню', 'Время и труд · репутация', 'Соседи сложили остатки запасов и пережили голодные недели сообща.', ['influence', 'knowledge'], { stats: { health: 3 }, reputation: 7 }),
  ], { when: s => regionState(s).food < 48, cooldown: 12, weight: 13 }),
  d('plague-watch', 'health', grown, 'Закрытые двери', 'После начала мора община просит добровольцев развозить еду к закрытым домам.', [
    o('deliver', 'Развозить припасы', 'Репутация · риск заразиться', 'Людям за закрытыми дверями хватило еды до спада болезни.', ['influence', 'adventure'], { reputation: 12 }, { gamble: { chance: s => .38 + s.character.stats.health / 180, failure: 'После последнего обхода появилась горячка.', effect: { condition: 'fever', stats: { health: -14 } } } }),
    o('isolate', 'Помогать без личных встреч', 'Безопаснее для дома', 'Передачи у ворот организовали по часам, чтобы люди меньше встречались.', ['survival', 'wellbeing'], { stats: { health: 3 }, reputation: 4 }),
  ], { when: s => regionState(s).crisis === 'plague' && !s.character.condition, cooldown: 12, weight: 15 }),
  d('market-loss', 'economy', grown, 'Долг перед торговым домом', 'Просроченный платёж грозит закрытием дела. Можно продать часть запасов или просить помощи у кредиторов.', [
    o('sell', 'Расплатиться запасами', '−10 монет · сохранить доверие', 'Часть запасов ушла кредиторам, и договор удалось закрыть.', ['survival', 'influence'], { reputation: 3 }, { cost: 10 }),
    o('pledge', 'Заложить дело', 'Сохранить монеты · риск утраты статуса', 'Кредиторы продлили срок договора.', ['wealth', 'adventure'], { reputation: -2 }, { gamble: { chance: s => .28 + s.character.reputation / 170, failure: 'Кредиторы забрали дело. Пришлось вернуться к обычному заработку.', effect: { status: 'worker', reputation: -9 } } }),
  ], { when: s => s.character.status === 'merchant' && s.character.wealth < 35, cooldown: 10, weight: 11 }),
  d('arcane-practice', 'magic', grown, 'Собственный ритуал', 'Наставник оставил схему ритуала. С ней можно впервые провести обряд самостоятельно.', [
    o('attempt', 'Провести ритуал', '−8 монет · мастерство или истощение', 'Схема сработала, и незнакомый обряд стал частью практики.', ['knowledge', 'adventure'], { mastery: 11, reputation: 4 }, { cost: 8, gamble: { chance: s => .35 + s.character.mastery / 140, failure: 'Схема оборвалась посередине и лишила сил на несколько дней.', effect: { stats: { health: -12 }, education: 2 } } }),
    o('notes', 'Переписать схему для архива', 'Знания без риска', 'Копия сохранила пометки наставника и собственные наблюдения.', ['survival', 'influence'], { education: 4, reputation: 3 }),
  ], { when: s => s.character.mastery >= 6 && regionState(s).magic > 38, cooldown: 13, weight: 11 }),
  d('promotion', 'work', adult, 'Следующая ступень', 'Опыт работы уже заметен. Открылось место, где придётся отвечать и за собственные решения, и за работу других.', [
    o('advance', 'Принять новую должность', 'Выше доход или престиж · больше нагрузки', 'С новой должностью пришли ключи, счета и ответственность за чужой труд.', ['wealth', 'influence', 'knowledge'], { reputation: 9, stats: { happiness: -3 } }, { apply: s => { const job = careerUpgrade(s.character.profession); if (job) { employ(s.character, job); return `Новая должность — ${professions[job].name.toLowerCase()}.`; } } }),
    o('decline', 'Остаться на прежнем месте', 'Устойчивый уклад', 'Прежняя работа сохранилась, а предложение укрепило уверенность в своём деле.', ['survival', 'wellbeing'], { stats: { happiness: 6 } }),
  ], { when: s => { const c = s.character; const next = careerUpgrade(c.profession); return !!next && canWork(c, next) && c.age - c.employedSince >= 5; }, cooldown: 12, weight: 12 }),
  d('crown', 'politics', adult, 'Зал под печатями', 'Старшие дома готовы признать новую власть, если ты примешь обязанности перед землями и общинами.', [
    o('accept', 'Принять власть', 'Правящий статус · новые обязанности', 'В зале принесли присягу, а к утру на столе уже лежали первые прошения.', ['influence', 'wealth'], { status: 'ruler', reputation: 12, stats: { happiness: -6 } }),
    o('refuse', 'Остаться в стороне от престола', 'Меньше обязанностей и больше времени для близких', 'Старшие дома продолжили переговоры, а твоё имя исчезло из списка претендентов.', ['wellbeing', 'survival'], { stats: { happiness: 8 }, bond: 6 }),
  ], { when: s => s.character.status === 'noble' && s.character.reputation >= 86 && s.character.region !== 'frontier', weight: 3 }),
  d('legacy-pupil', 'legacy', old, 'Ученик на пороге', 'Кто-то из молодёжи просит рассказать, как держаться своего дела, когда годы становятся трудными.', [
    o('teach', 'Взять ученика', 'Репутация и передача ремесла', 'Твоя работа продолжится в руках человека, который теперь знает её изнутри.', ['knowledge', 'influence'], { reputation: 12, stats: { happiness: 5 } }),
    o('gift', 'Передать инструменты общине', 'Общая польза и благодарность', 'Инструментам нашлось место в общей мастерской.', ['wellbeing', 'survival'], { reputation: 5, stats: { happiness: 7 } }),
  ], { when: s => s.character.career.length > 0 && s.character.education >= 8 }),
  d('quarrel', 'relations', independent, 'Ссора с близким', 'Долгое молчание после ссоры стало тяготить обоих. Теперь многое зависит от того, кто заговорит первым.', [
    o('reconcile', 'Первым пойти на разговор', 'Укрепить отношения', 'Разговор вышел неловким, но старую обиду наконец удалось назвать вслух.', ['wellbeing', 'survival'], { bond: 11, stats: { happiness: 5 } }),
    o('space', 'Взять время порознь', 'Спокойствие ценой близости', 'Расстояние принесло тишину. Встречаться стали реже.', ['knowledge', 'adventure'], { bond: -5, stats: { happiness: 2 } }),
  ], { when: s => s.character.relationships.some(p => p.died === null), cooldown: 16 }),
  d('stranded', 'travel', independent, 'Путник у брода', 'Под вечер на другом берегу замечен путник. Вода поднимается, и дойти до моста до темноты уже трудно.', [
    o('cross', 'Протянуть верёвку через брод', 'Репутация · риск травмы', 'Верёвку закрепили у ивы, и путник перебрался на берег.', ['adventure', 'influence'], { reputation: 9 }, { gamble: { chance: s => .36 + s.character.stats.strength / 180, failure: 'Течение сбило с ног. Выбраться помогли люди с соседнего берега.', effect: { stats: { health: -12 }, condition: 'injury' } } }),
    o('help', 'Привести людей с длинным шестом', 'Безопасная помощь', 'Соседи вынесли шест и помогли путнику перебраться без спешки.', ['survival', 'wellbeing'], { reputation: 5 }),
  ]),
  d('patron', 'society', young, 'Письмо от покровителя', 'Человек с влиянием предлагает оплатить обучение. Взамен он просит время от времени выполнять поручения.', [
    o('accept', 'Принять покровительство', 'Образование и деньги · обязательства', 'Покровитель оплатил наставника и вскоре прислал первое поручение.', ['knowledge', 'wealth', 'influence'], { education: 8, wealth: 12, stats: { happiness: -3 } }, { later: { eventId: 'patron-duty', years: 2 } }),
    o('decline', 'Учиться своими силами', 'Свобода и немного опыта', 'Несколько книг удалось раздобыть через знакомых.', ['survival', 'wellbeing'], { education: 3, stats: { happiness: 4 } }),
  ], { when: s => s.character.reputation >= 16 && ['orphan', 'poor', 'worker'].includes(s.character.background), weight: 11 }),
  d('frontier-vote', 'politics', grown, 'Открытый сход', 'В Пограничье решают, выделить ли деньги на лечебницу или на укрепление ворот. Твоё мнение готовы выслушать.', [
    o('clinic', 'Поддержать лечебницу', 'Репутация и безопасность больных', 'Сход выделил комнату под лечебницу и нанял лекаря.', ['survival', 'wellbeing'], { reputation: 7 }, { apply: s => { const region = regionState(s); region.safety = Math.min(100, region.safety + 4); } }),
    o('walls', 'Поддержать укрепление ворот', 'Меньше опасности при набегах', 'Ворота получили новые запоры до конца сезона.', ['influence', 'wealth'], { reputation: 6 }, { apply: s => { const region = regionState(s); region.conflict = Math.max(0, region.conflict - 6); } }),
  ], { when: s => s.character.region === 'frontier' && s.character.reputation >= 24 }),
];

function careerUpgrade(id: keyof typeof professions | null): keyof typeof professions | undefined {
  const paths: Partial<Record<keyof typeof professions, keyof typeof professions>> = {
    mage: 'mentor', scribe: 'teacher', teacher: 'researcher', shopkeeper: 'merchant',
    caravaner: 'merchant', guard: 'scout', courtier: 'steward', miner: 'smith',
  };
  return id ? paths[id] : undefined;
}

function destinations(s: GameState) {
  return regionIds.filter(id => id !== s.character.region && s.world.regions[id].openness >= 40 && s.world.regions[id].crisis !== 'war');
}

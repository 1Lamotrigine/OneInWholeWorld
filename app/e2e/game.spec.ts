import { expect, test, type Page } from '@playwright/test';
import { createGame } from '../src/game/engine/create-game';
import { takePath } from '../src/game/engine/influence';
import { serializeSave } from '../src/db/save-format';
import { races, regionIds, regions } from '../src/game/content/world';

const settled = (page: Page) => expect(page.getByText('Сохранено на устройстве')).toBeVisible({ timeout: 15000 });
const age = (page: Page) => page.getByTestId('age');

async function pickPath(page: Page) {
  await page.getByRole('button', { name: 'Воин', exact: true }).click();
  await page.getByRole('button', { name: 'Подтвердить путь · Воин' }).click();
}

async function startLife(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Fix just the first seed for repeatable UI timing; IDs and commits still use the browser RNG.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('elarion-e2e-seeded')) return;
    const randomUUID = crypto.randomUUID.bind(crypto);
    crypto.randomUUID = () => {
      crypto.randomUUID = randomUUID;
      sessionStorage.setItem('elarion-e2e-seeded', '1');
      return '12345678-1234-4000-8000-123456789abc';
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать жизнь' }).click({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Вероятности рождения' })).toBeVisible();
  await pickPath(page);
  await page.getByRole('button', { name: 'Прожить жизнь' }).click();
  await settled(page);
}

test('рождение, реальное время, пауза, выбор, перезагрузка, смерть, PNG и архив JSON', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await startLife(page);
  await expect(age(page)).toHaveText('0 лет');
  await page.getByRole('button', { name: '10×' }).click();
  await expect(page.getByRole('button', { name: '10×' })).toHaveAttribute('aria-pressed', 'true');
  await expect(age(page)).toHaveText('1 год', { timeout: 8000 });
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Продолжить', exact: true })).toBeEnabled();
  const pausedAge = await age(page).textContent();
  await page.waitForTimeout(2700);
  await expect(age(page)).toHaveText(pausedAge!);

  await page.getByRole('button', { name: 'До решения' }).click();
  const decision = page.locator('#decision');
  await expect(decision).toBeVisible();
  const title = await decision.getByRole('heading').innerText();
  const atChoice = await age(page).textContent();
  // Reload immediately after the time jump to exercise the write-ahead recovery.
  await page.reload();
  await settled(page);
  await expect(decision.getByRole('heading')).toHaveText(title);
  await expect(age(page)).toHaveText(atChoice!);
  const choice = decision.getByRole('button').first();
  const action = await choice.locator('strong').innerText();
  await choice.click();
  await settled(page);
  await expect(page.locator('#chronicle')).toContainText(action);
  await expect(page.getByRole('button', { name: 'Авторежим' })).toBeEnabled();
  await page.getByRole('button', { name: 'Авторежим' }).click();
  await settled(page);
  await page.reload();
  await settled(page);
  await expect(page.getByRole('button', { name: 'Авторежим' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'До решения' }).click();
  await expect(decision).toBeVisible();
  await settled(page);
  const automaticTitle = await decision.getByRole('heading').innerText();
  await page.getByRole('button', { name: 'Авторежим' }).click();
  await settled(page);
  await page.getByRole('button', { name: '5×' }).click();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await expect(decision).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('#chronicle')).toContainText(automaticTitle);

  const summary = page.getByRole('heading', { name: 'Итог жизни' });
  for (let i = 0; i < 160 && !await summary.isVisible(); i++) {
    if (await decision.isVisible()) await decision.getByRole('button').first().click();
    else await page.getByRole('button', { name: 'До решения' }).click();
    await settled(page);
  }
  await expect(summary).toBeVisible();
  await expect(page.getByRole('button', { name: 'Продолжить', exact: true })).toBeDisabled();
  const [card] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Карточка' }).click()]);
  expect(card.suggestedFilename()).toMatch(/\.png$/);
  await page.getByRole('link', { name: 'Сохранения' }).click();
  await expect(page.getByRole('heading', { name: 'Архив жизней' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Открыть итог' })).toHaveCount(1);
  const [save] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^Экспортировать / }).click()]);
  const path = await save.path();
  expect(path).not.toBeNull();
  await page.locator('input[type=file]').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.getByRole('alert').filter({ hasText: 'корректным JSON' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles(path!);
  await expect(page.getByRole('button', { name: 'Открыть итог' })).toHaveCount(2);
  await page.getByRole('button', { name: /^Удалить / }).first().click();
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Открыть итог' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Открыть итог' }).click();
  await expect(summary).toBeVisible();
  expect(errors).toEqual([]);
});

test('сетку, управление и решение можно использовать от 320 до 1920 пикселей', async ({ page }) => {
  await startLife(page);
  await page.getByRole('button', { name: 'До решения' }).click();
  await expect(page.locator('#decision')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect((await page.getByRole('button', { name: '5×' }).boundingBox())?.width).toBeGreaterThanOrEqual(44);
    if (width < 768) {
      const central = await page.locator('.central-column').boundingBox();
      const profile = await page.locator('.character-column').boundingBox();
      expect(central!.y).toBeLessThan(profile!.y);
    }
  }
  await page.setViewportSize({ width: 640, height: 850 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(640);
  const choice = page.locator('#decision button').first();
  await expect(choice).toBeEnabled();
  await choice.focus();
  await expect(choice).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#decision')).toHaveCount(0);
});

test('две вкладки читают одну жизнь, устаревшая запись не перезаписывает прогресс', async ({ page, context }) => {
  await startLife(page);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  const other = await context.newPage();
  await other.goto('/game/');
  await settled(other);
  await expect(age(other)).toHaveText('0 лет');
  await page.getByRole('button', { name: 'Знания', exact: true }).click();
  await settled(page);
  await other.getByRole('button', { name: 'Влияние', exact: true }).click();
  await expect(other.getByText(/изменилась в другой вкладке/)).toBeVisible();
  await expect(other.getByRole('button', { name: 'Экспортировать прогресс' })).toBeVisible();
  const third = await context.newPage();
  await third.goto('/game/');
  await settled(third);
  await expect(third.getByRole('button', { name: 'Знания', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('при отключённой IndexedDB можно прожить год и сохранить JSON вручную', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { value: undefined }); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать жизнь' }).click();
  await page.getByRole('button', { name: 'Играть с ручным экспортом' }).click();
  await page.getByRole('button', { name: 'Пропустить прокрутку' }).click();
  await pickPath(page);
  await page.getByRole('button', { name: 'Прожить жизнь' }).click();
  await page.getByRole('button', { name: '5×' }).click();
  await expect(age(page)).not.toHaveText('0 лет', { timeout: 8000 });
  const [save] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Экспортировать прогресс' }).click()]);
  expect(save.suggestedFilename()).toMatch(/\.json$/);
});

test('раскрытие рождения можно пропустить, путь фиксируется после подтверждения', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать жизнь' }).click();
  await expect(page.getByRole('heading', { name: 'Летопись открывается' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Прожить жизнь' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Пропустить прокрутку' }).click();
  await expect(page.getByRole('button', { name: 'Прожить жизнь' })).toBeDisabled();
  await pickPath(page);
  await page.getByRole('button', { name: 'Прожить жизнь' }).click();
  await settled(page);
  await page.reload();
  await settled(page);
  await expect(page.locator('.character-column')).toContainText('Воин');
  await expect(page.getByRole('heading', { name: 'Выберите жизненный путь' })).toHaveCount(0);
});

test('атлас показывает города, масштабируется, перемещается и позволяет сменить дом', async ({ page }) => {
  const life = takePath(createGame('atlas-test', 'atlas-test'), 'politician');
  const c = life.character;
  c.age = races[c.race].stages[2];
  c.region = 'valoria';
  c.settlement = 'Ольховый Брод';
  c.wealth = 95;
  c.reputation = 55;
  life.world.year += c.age;
  life.revealed = true;
  await page.goto('/archive/');
  await expect(page.getByRole('button', { name: 'Импорт JSON' })).toBeEnabled({ timeout: 15000 });
  await page.locator('input[type=file]').setInputFiles({ name: 'atlas.json', mimeType: 'application/json', buffer: Buffer.from(serializeSave(life)) });
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await settled(page);
  await page.getByRole('button', { name: 'Карта мира' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  expect((await modal.boundingBox())!.width).toBeCloseTo(1440 * .7, 0);
  await expect(modal.locator('.country-shape')).toHaveCount(regionIds.length);
  await expect(modal.locator('.map-city')).toHaveCount(regionIds.reduce((sum, id) => sum + regions[id].settlements.length, 0));
  await modal.getByRole('button', { name: 'Валор', exact: true }).hover();
  await expect(modal.locator('.map-tooltip')).toContainText('Политик');
  await modal.getByRole('button', { name: 'Увеличить карту' }).click();
  const map = modal.locator('.world-map');
  const before = await map.getAttribute('viewBox');
  const box = (await map.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 46, box.y + box.height / 2 + 16, { steps: 6 });
  await page.mouse.up();
  await expect(map).not.toHaveAttribute('viewBox', before!);
  await modal.getByLabel('Поселение').selectOption('frontier:1');
  await modal.getByRole('button', { name: /Переехать · 8/ }).click();
  await expect(modal.getByText('Новый дом — Три Башни.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
  await settled(page);
  await expect(page.locator('.scene-caption')).toContainText('Три Башни');
  await page.locator('summary').filter({ hasText: 'Влияние на мир' }).click();
  await page.getByRole('button', { name: 'Объявить войну · 20' }).click();
  await settled(page);
  await expect(page.locator('#chronicle')).toContainText('вступают в войну');
  await page.getByRole('button', { name: 'Карта мира' }).click();
  await expect(modal.locator('.country-shape[data-war="true"]')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await page.reload();
  await settled(page);
  await expect(page.locator('.scene-caption')).toContainText('Три Башни');
});

test('пол персонажа сохраняется, пять языков переключают интерфейс и текст текущего выбора', async ({ page }) => {
  const remote: string[] = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:')) remote.push(request.url()); });
  await startLife(page);
  const gender = await page.locator('.profile-facts div').filter({ has: page.getByText('Пол', { exact: true }) }).locator('dd').innerText();
  expect(['Мужской', 'Женский']).toContain(gender);
  await page.getByRole('button', { name: 'До решения' }).click();
  await settled(page);
  const choice = page.locator('#decision');
  const original = await choice.getByRole('heading').innerText();
  const originalAge = await age(page).innerText();
  const buttons = await choice.getByRole('button').count();
  for (const lang of ['en', 'de', 'es', 'it', 'ru']) {
    await expect(page.locator('header .language-select')).toBeVisible();
    await page.locator('header .language-select select').selectOption(lang);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('.settings')).not.toHaveAttribute('open');
    await expect(page.locator('header .language-flag')).toBeVisible();
    await expect(page.locator('header .language-flag')).toHaveAttribute('data-language', lang);
    if (lang !== 'ru') await expect(choice.getByRole('heading')).not.toContainText(/[А-Яа-яЁё]/);
    await expect(choice.getByRole('button')).toHaveCount(buttons);
    await page.setViewportSize({ width: 320, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    await page.setViewportSize({ width: 1440, height: 960 });
    if (lang === 'en') {
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(choice).toBeVisible();
    }
  }
  await expect(choice.getByRole('heading')).toHaveText(original);
  await expect(age(page)).toHaveText(originalAge);
  await expect(page.locator('.profile-facts div').filter({ has: page.getByText('Пол', { exact: true }) }).locator('dd')).toHaveText(gender);
  await page.locator('.brand').click();
  await page.setViewportSize({ width: 320, height: 850 });
  for (const lang of ['en', 'de', 'es', 'it', 'ru']) {
    await expect(page.locator('header .language-select')).toBeVisible();
    await page.locator('header .language-select select').selectOption(lang);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  }
  await page.locator('.site-header').screenshot({ path: '/tmp/elarion-language-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.locator('.site-header').screenshot({ path: '/tmp/elarion-language-desktop.png' });
  expect(remote).toEqual([]);
});

test('главная объясняет восемь рас, а рождение предлагает 15 жизненных путей', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.race-card')).toHaveCount(8);
  for (const race of Object.values(races)) {
    const card = page.locator('.race-card').filter({ has: page.getByRole('heading', { name: race.name, exact: true }) });
    await expect(card).toContainText(`${race.lifespan[0]}–${race.lifespan[1]}`);
    await expect(card).toContainText('Зрелость начинается');
  }
  await page.getByRole('button', { name: 'Начать жизнь' }).click();
  await expect(page.locator('.path-choice')).toHaveCount(15);
  for (const name of ['Авантюрист', 'Дипломат', 'Шпион']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
});

test('авантюрист принимает мировое решение, город даёт поддержку, последствия переживают перезагрузку', async ({ page }) => {
  const life = takePath(createGame('adventurer-story', 'adventurer-story'), 'adventurer');
  life.revealed = true;
  life.character.age = races[life.character.race].stages[2] + 20;
  life.world.year += life.character.age;
  life.character.region = 'frontier';
  life.character.settlement = 'Край Дорог';
  life.character.stats.health = 95;
  life.character.wealth = 90;
  life.pathExperience = 20;
  life.seen['path-adventurer-1'] = life.world.year - 20;
  await page.goto('/archive/');
  await expect(page.getByRole('button', { name: 'Импорт JSON' })).toBeEnabled({ timeout: 15000 });
  await page.locator('input[type=file]').setInputFiles({ name: 'adventurer.json', mimeType: 'application/json', buffer: Buffer.from(serializeSave(life)) });
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await settled(page);
  await page.getByRole('button', { name: 'До решения' }).click();
  await expect(page.locator('#decision')).toContainText('Право на древние руины');
  await page.getByRole('button', { name: /Разрешить испытания реликвий/ }).click();
  await settled(page);
  await expect(page.locator('.world-legacy')).toContainText('Опасные магические исследования');
  await expect(page.locator('.world-legacy')).toContainText('Безопасность -10');
  await expect(page.locator('.path-impact')).toContainText('Экспедиционная контора');
  await expect(page.locator('.path-impact .city-opportunity')).toContainText('Опыт пути');
  await page.getByRole('button', { name: 'Карта мира' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.locator('.city-opportunity').last()).toContainText('Экспедиционная контора');
  await modal.getByLabel('Преимущества для роли').selectOption('mage');
  await expect(modal.locator('.city-opportunity').last()).toContainText('Магический круг');
  await page.keyboard.press('Escape');
  await expect(page.locator('.path-impact')).toContainText('Авантюрист');
  await page.reload();
  await settled(page);
  await expect(page.locator('.world-legacy')).toContainText('Опасные магические исследования');
  await expect(page.locator('.world-legacy')).toContainText(life.character.name);
});

test('карта сохраняет завоевания и альянсы, а неподходящий город заранее объясняет штрафы', async ({ page }) => {
  const life = takePath(createGame('political-map', 'political-map'), 'merchant');
  life.revealed = true;
  life.character.age = races[life.character.race].stages[2] + 5;
  life.world.year += life.character.age;
  life.character.region = 'valoria'; life.character.settlement = 'Ольховый Брод';
  life.character.stats.health = 95; life.character.wealth = 90;
  life.world.control[regions.frontier.settlements[0]] = 'valoria';
  life.world.alliances.push({ first: 'valoria', second: 'frontier', until: life.world.year + 12 });
  await page.goto('/archive/');
  await expect(page.getByRole('button', { name: 'Импорт JSON' })).toBeEnabled({ timeout: 15000 });
  await page.locator('input[type=file]').setInputFiles({ name: 'political-map.json', mimeType: 'application/json', buffer: Buffer.from(serializeSave(life)) });
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await settled(page);
  await expect(page.locator('.path-impact')).toContainText('Неподходящая среда для карьеры');
  await expect(page.locator('.path-impact')).toContainText('Ежегодный риск карьерной неудачи');
  await page.getByRole('button', { name: 'Карта мира' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.locator('.city-mismatch').first()).toBeVisible();
  await modal.getByLabel('Поселение').selectOption('frontier:0');
  await expect(modal.locator('.atlas-info')).toContainText('Контроль над городом: Валория');
  await expect(modal.locator('.atlas-info')).toContainText('Союзники: Валория');
  await expect(modal.locator('polygon')).toHaveCount(42);
  await modal.evaluate(element => { element.scrollTop = 0; });
  await modal.screenshot({ path: '/tmp/elarion-v5-political-map.png' });
  await modal.getByLabel('Поселение').selectOption({ label: 'Белые Мельницы' });
  await expect(modal.locator('.city-opportunity').last()).toContainText('Торговое товарищество');
  await page.keyboard.press('Escape');
  await page.reload(); await settled(page);
  await page.getByRole('button', { name: 'Карта мира' }).click();
  await page.getByLabel('Поселение').selectOption('frontier:0');
  await expect(page.locator('.atlas-info')).toContainText('Контроль над городом: Валория');
});

test('разлом вызывает фэнтезийный выбор, оставляет проклятие и сохраняет отложенную цену', async ({ page }) => {
  const life = takePath(createGame('rift-conduit', 'rift-conduit'), 'mage');
  life.revealed = true;
  life.character.race = 'human'; life.character.longevity = 90; life.character.age = 35;
  life.world.year += 35;
  life.character.region = 'frontier'; life.character.settlement = 'Край Дорог';
  life.character.stats.health = 95; life.character.stats.magic = 70; life.character.mastery = 30; life.character.wealth = 80;
  life.world.regions.frontier.crisis = 'rift'; life.world.regions.frontier.until = life.world.year + 6;
  const eventId = 'fantasy-rift-last-anchor';
  life.seen[eventId] = life.world.year;
  life.pending = { eventId, token: `${life.world.year}-${eventId}`, optionIds: ['venture', 'ward'] };
  life.rngState = 1;
  await page.goto('/archive/');
  await expect(page.getByRole('button', { name: 'Импорт JSON' })).toBeEnabled({ timeout: 15000 });
  await page.locator('input[type=file]').setInputFiles({ name: 'rift.json', mimeType: 'application/json', buffer: Buffer.from(serializeSave(life)) });
  await page.getByRole('button', { name: 'Продолжить' }).click(); await settled(page);
  await expect(page.locator('.arcane-sky')).toBeVisible();
  await expect(page.locator('.scene-arcane-label')).toHaveText('Разлом над страной');
  await expect(page.locator('#decision')).toContainText('Якорь падающего неба');
  await expect(page.locator('.choice-risk')).toContainText('Вероятность успеха');
  await page.locator('.central-column').screenshot({ path: '/tmp/elarion-fantasy-rift.png' });
  await page.getByRole('button', { name: /Стать проводником для последнего якоря/ }).click(); await settled(page);
  await expect(page.locator('.arcane-fate')).toContainText('Проклятие Бездны');
  await expect(page.locator('.arcane-fate')).toContainText('здоровье −1,8');
  await expect(page.locator('.scene-arcane-label')).toHaveCount(0);
  await page.reload(); await settled(page);
  await expect(page.locator('.arcane-fate')).toContainText('Проклятие Бездны');
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.locator('.arcane-fate').screenshot({ path: '/tmp/elarion-fantasy-seal.png' });
});

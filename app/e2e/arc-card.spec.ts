import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { serializeSave } from '../src/db/save-format';
import { createGame } from '../src/game/engine/create-game';
import { takePath } from '../src/game/engine/influence';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      if (!localStorage.getItem('elarion-language')) localStorage.setItem('elarion-language', 'ru');
    } catch { /* Storage can be unavailable before the first navigation. */ }
  });
});

test('арка жизни, эпитафия, seed и редкость видны, а карточка скачивается 1080×1920', async ({ page }) => {
  const life = takePath(createGame('arc-card-test', 'arc-card-test'), 'politician');
  life.revealed = true;
  life.character.name = 'Рикс Сухая Кочка';
  life.character.sex = 'male';
  life.character.race = 'goblin';
  life.character.background = 'poor';
  life.character.status = 'ruler';
  life.character.origin = 'grimm';
  life.character.region = 'frontier';
  life.character.birthplace = 'Тихие Сваи';
  life.character.settlement = 'Три Башни';
  life.character.age = 63;
  life.character.longevity = 70;
  life.character.relationships = [];
  life.character.wealth = 120;
  life.character.reputation = 90;
  life.world.year = 1293;
  life.world.terms.frontier = 2;
  life.birthOdds = { race: .09, region: .3, background: .2 };
  life.chronicle = [
    life.chronicle[0],
    { year: 1248, age: 18, eventId: 'first-contract', category: 'work', title: 'Первый контракт', text: 'Гильдия впервые доверила самостоятельный заказ.', tone: 'good', milestone: true },
    { year: 1260, age: 30, eventId: 'council-voice', category: 'politics', title: 'Голос в совете', text: 'Город впервые прислушался к его словам.', tone: 'good', milestone: true },
    { year: 1280, age: 50, eventId: 'border-war', category: 'war', title: 'Война у границы', text: 'Соседняя страна перешла границу.', tone: 'loss', milestone: true },
    { year: 1293, age: 63, eventId: 'death', category: 'death', title: 'Конец жизни', text: 'Естественная смерть.', tone: 'loss', milestone: true },
  ];
  life.ended = { cause: 'Естественная смерть', epitaph: 'Дома ещё долго вспоминали его голос.' };
  life.pending = null;

  await page.goto('/archive/');
  await expect(page.getByRole('button', { name: 'Импорт JSON' })).toBeEnabled({ timeout: 15000 });
  await page.locator('input[type=file]').setInputFiles({ name: 'arc.json', mimeType: 'application/json', buffer: Buffer.from(serializeSave(life)) });
  await page.getByRole('button', { name: 'Открыть итог' }).click();

  await expect(page.getByRole('heading', { name: 'Итог жизни' })).toBeVisible();
  await expect(page.locator('.summary-hook')).toContainText('Родился нищим гоблином в Топях Гримм');
  await expect(page.locator('.summary-hook')).toContainText('Умер королём в Пограничье');
  await expect(page.locator('.summary-arc .arc-turn')).toHaveCount(3);
  await expect(page.locator('.summary-epitaph')).not.toBeEmpty();
  await expect(page.locator('.summary-meta')).toContainText('seed');
  await expect(page.locator('.summary-meta')).toContainText('1 из');
  await expect(page.locator('.summary-details')).not.toHaveAttribute('open');

  const [card] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Карточка' }).click(),
  ]);
  const path = await card.path();
  expect(path).not.toBeNull();
  const image = await readFile(path!);
  expect(image.readUInt32BE(16)).toBe(1080);
  expect(image.readUInt32BE(20)).toBe(1920);
});

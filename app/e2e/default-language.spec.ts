import { expect, test } from '@playwright/test';

test('первый заход открывается на английском, а выбранный язык сохраняется', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Life in Elarion');
  await expect(page.getByRole('button', { name: 'Start life' })).toBeVisible();
  await expect(page.getByText('Peoples of Elarion')).toBeVisible();
  await expect(page.locator('header .language-select select')).toHaveValue('en');
  await expect(page.locator('header .language-flag')).toHaveAttribute('data-language', 'en');

  await page.locator('header .language-select select').selectOption('ru');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('button', { name: 'Начать жизнь' })).toBeVisible();

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('button', { name: 'Начать жизнь' })).toBeVisible();
  await expect(page.locator('header .language-select select')).toHaveValue('ru');
});

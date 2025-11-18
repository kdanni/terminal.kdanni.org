import { test, expect, type Page } from '@playwright/test';

async function navigateToCatalog(page: Page) {
  await page.goto('/');
  await expect(page.getByText(/asset catalog/i)).toBeVisible();
}

test('login flow recovers access after logout', async ({ page }) => {
  await navigateToCatalog(page);
  await expect(page.getByText(/mock user/i)).toBeVisible();

  await page.getByRole('button', { name: /log out/i }).click();
  await expect(page.getByText(/redirecting to login/i)).toBeVisible();

  await page.goto('/login');
  await page.waitForURL('**/catalog');
  await expect(page.getByText(/mock user/i)).toBeVisible();
});

test('catalog search and watch toggling', async ({ page }) => {
  await navigateToCatalog(page);

  await page.getByLabel('Search assets').fill('NVDA');
  await page.getByRole('button', { name: /search/i }).click();
  await expect(page.getByRole('cell', { name: 'NVDA' })).toBeVisible();

  const toggle = page.getByLabel('Toggle watch status for NVDA');
  await toggle.check();
  await expect(toggle).toBeChecked();
});

test('ohlcv visualization renders chart data', async ({ page }) => {
  await navigateToCatalog(page);
  await page.getByRole('link', { name: /ohlcv visualization/i }).click();
  await expect(page.getByRole('heading', { name: /ohlcv visualization/i })).toBeVisible();

  await page.getByLabel('Symbols').fill('AAPL');
  await page.getByRole('button', { name: /apply filters/i }).click();

  await expect(page.getByLabel('OHLCV chart visualization')).toBeVisible();
});

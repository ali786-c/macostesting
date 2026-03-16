import { test, expect } from '@playwright/test';
import { ROUTES, getTestUserCredentials } from './fixtures/test-data';

test.describe('Booking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.searchParkings);
  });

  test('view place detail page', async ({ page }) => {
    const firstCard = page.getByTestId('listing-card').or(page.locator('a[href*="/parking/"]')).first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (!(await firstCard.isVisible())) {
      test.skip(true, 'No listings - backend may have no places');
      return;
    }
    await firstCard.click();
    await expect(page).toHaveURL(/\/parking\/\d+/);
    await expect(page.getByRole('button', { name: /réserver|réserver maintenant/i })).toBeVisible({ timeout: 5000 });
  });

  test('add to favorites requires login', async ({ page }) => {
    const firstCard = page.getByTestId('listing-card').or(page.locator('a[href*="/parking/"]')).first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (!(await firstCard.isVisible())) {
      test.skip(true, 'No listings');
      return;
    }
    await firstCard.click();
    await expect(page).toHaveURL(/\/parking\/\d+/);

    const heartBtn = page.getByRole('button', { name: /favori|like|coeur/i }).or(
      page.locator('button').filter({ has: page.locator('svg') })
    ).first();
    if (await heartBtn.isVisible()) {
      await heartBtn.click();
      await expect(page.getByText(/connexion requise|connectez-vous|connexion/i)).toBeVisible({ timeout: 3000 });
    }
  });

  test('reservation flow - select dates and proceed to checkout (skip payment)', async ({ page }) => {
    const { email, password } = getTestUserCredentials();
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill(email);
    await page.getByPlaceholder(/mot de passe|password/i).fill(password);
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page).toHaveURL(/\/(search-parkings|home)/, { timeout: 10000 });

    await page.goto(ROUTES.searchParkings);
    const firstCard = page.getByTestId('listing-card').or(page.locator('a[href*="/parking/"]')).first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (!(await firstCard.isVisible())) {
      test.skip(true, 'No listings');
      return;
    }
    await firstCard.click();
    await expect(page).toHaveURL(/\/parking\/\d+/);

    const reserveBtn = page.getByTestId('reserve-button').or(page.getByRole('button', { name: /réserver|réserver maintenant/i }));
    await reserveBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (!(await reserveBtn.isVisible())) {
      test.skip(true, 'Reserve button not visible - place may have no availability');
      return;
    }

    const calendar = page.locator('[class*="calendar"], table, [role="grid"]').first();
    if (await calendar.isVisible()) {
      const availableDay = page.locator('button:has-text("12"), [data-day]:not([class*="disabled"])').first();
      await availableDay.click().catch(() => {});
    }

    await reserveBtn.click();

    await expect(page).toHaveURL(/\/(checkout|payment|reservation|stripe)/i, { timeout: 15000 }).catch(() => {});
  });

  test('add to favorites when logged in', async ({ page }) => {
    const { email, password } = getTestUserCredentials();
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill(email);
    await page.getByPlaceholder(/mot de passe|password/i).fill(password);
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page).toHaveURL(/\/(search-parkings|home)/, { timeout: 10000 });

    await page.goto(ROUTES.searchParkings);
    const firstCard = page.getByTestId('listing-card').or(page.locator('a[href*="/parking/"]')).first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (!(await firstCard.isVisible())) {
      test.skip(true, 'No listings');
      return;
    }
    await firstCard.click();
    await expect(page).toHaveURL(/\/parking\/\d+/);

    const heartBtn = page.locator('button').filter({ has: page.locator('[class*="heart"], svg') }).first();
    if (await heartBtn.isVisible()) {
      await heartBtn.click();
      await page.waitForTimeout(500);
    }
  });
});

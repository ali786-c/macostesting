import { test, expect } from '@playwright/test';
import { ROUTES } from './fixtures/test-data';

test.describe('Public Pages', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto(ROUTES.home);
    await expect(page).toHaveURL(/\//);
    await expect(page.getByRole('link', { name: /rentoall/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /connexion|inscription/i }).first()).toBeVisible();
  });

  test('search-parkings page loads', async ({ page }) => {
    await page.goto(ROUTES.searchParkings);
    await expect(page).toHaveURL(/search-parkings/);
    await expect(page.getByPlaceholder(/ville|rechercher/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('faq page loads', async ({ page }) => {
    await page.goto(ROUTES.faq);
    await expect(page).toHaveURL(/faq/);
    await expect(page.getByRole('heading', { name: /questions fréquentes|faq/i })).toBeVisible();
    await expect(page.getByPlaceholder(/rechercher dans les faq/i)).toBeVisible();
  });

  test('help page loads', async ({ page }) => {
    await page.goto(ROUTES.help);
    await expect(page).toHaveURL(/help/);
    await expect(page.getByRole('heading', { name: /centre d'aide|centre d'assistance/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /faq/i })).toBeVisible();
  });

  test('cgu page loads', async ({ page }) => {
    await page.goto(ROUTES.cgu);
    await expect(page).toHaveURL(/cgu/);
    await expect(page.getByRole('heading', { name: /cgu|conditions générales/i })).toBeVisible();
  });

  test('cgv page loads', async ({ page }) => {
    await page.goto(ROUTES.cgv);
    await expect(page).toHaveURL(/cgv/);
    await expect(page.getByRole('heading', { name: /cgv|conditions générales de vente/i })).toBeVisible();
  });

  test('mentions-legales page loads', async ({ page }) => {
    await page.goto(ROUTES.mentionsLegales);
    await expect(page).toHaveURL(/mentions-legales/);
    await expect(page.getByRole('heading', { name: /mentions légales/i })).toBeVisible();
  });

  test('legal page loads', async ({ page }) => {
    await page.goto(ROUTES.legal);
    await expect(page).toHaveURL(/legal/);
    await expect(page.getByRole('heading', { name: /mentions légales|informations légales/i })).toBeVisible();
  });

  test('privacy page loads', async ({ page }) => {
    await page.goto(ROUTES.privacy);
    await expect(page).toHaveURL(/privacy/);
    await expect(page.getByRole('heading', { name: /politique de confidentialité|confidentialité|données personnelles/i })).toBeVisible();
  });

  test('footer links navigate to legal pages', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(ROUTES.home);
    await page.getByRole('link', { name: /cgu/i }).click();
    await expect(page).toHaveURL(/cgu/);

    await page.goto(ROUTES.home);
    await page.getByRole('link', { name: /cgv/i }).click();
    await expect(page).toHaveURL(/cgv/);

    await page.goto(ROUTES.home);
    await page.getByRole('link', { name: /mentions légales/i }).click();
    await expect(page).toHaveURL(/mentions-legales/);
  });
});

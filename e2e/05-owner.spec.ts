import { test, expect } from '@playwright/test';
import { ROUTES, getTestHostCredentials } from './fixtures/test-data';

test.describe('Owner', () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = getTestHostCredentials();
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill(email);
    await page.getByPlaceholder(/mot de passe|password/i).fill(password);
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page).toHaveURL(/\/(search-parkings|home)/, { timeout: 10000 });
    await page.evaluate(() => localStorage.setItem('userMode', 'host'));
  });

  test('host my-places page loads', async ({ page }) => {
    await page.goto(ROUTES.hostMyPlaces);
    await expect(page).toHaveURL(/host\/my-places/);
    await expect(page.getByRole('heading', { name: /mes annonces|mes espaces|my places/i })).toBeVisible({ timeout: 10000 });
  });

  test('host create place form loads', async ({ page }) => {
    await page.goto(ROUTES.hostCreate);
    await expect(page).toHaveURL(/host\/create/);
    await expect(page.getByPlaceholder(/titre|description|adresse/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('host create place form has required fields', async ({ page }) => {
    await page.goto(ROUTES.hostCreate);
    await expect(page.getByText(/titre|type|adresse|ville|prix/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('mon-calendrier page loads for host', async ({ page }) => {
    await page.goto(ROUTES.monCalendrier);
    await expect(page).toHaveURL(/mon-calendrier/);
    await expect(page.getByText(/calendrier|agenda|réservations/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('unauthorized access to my-places redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(ROUTES.home);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(ROUTES.hostMyPlaces);
    await expect(page).toHaveURL(/auth\/login/, { timeout: 5000 });
  });
});

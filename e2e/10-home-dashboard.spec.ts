import { test, expect } from '@playwright/test';
import { ROUTES, getTestUserCredentials, getTestHostCredentials } from './fixtures/test-data';

test.describe('Home / Dashboard (chemins critiques)', () => {
  test('home when not logged in shows login/signup', async ({ page }) => {
    await page.goto(ROUTES.home);
    await expect(page).toHaveURL(/\//);
    await expect(
      page.getByRole('link', { name: /connexion|inscription/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('home when logged in as client shows dashboard or search', async ({ page }) => {
    const { email, password } = getTestUserCredentials();
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill(email);
    await page.getByPlaceholder(/mot de passe|password/i).fill(password);
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page).toHaveURL(/\/(search-parkings|home)/, { timeout: 10000 });

    await page.goto(ROUTES.homeLoggedIn);
    await expect(page).toHaveURL(/\/(home|search-parkings)/);
    await expect(
      page.getByText(/rechercher|mes réservations|messages|accueil/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('home when logged in as host shows host dashboard', async ({ page }) => {
    const { email, password } = getTestHostCredentials();
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill(email);
    await page.getByPlaceholder(/mot de passe|password/i).fill(password);
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page).toHaveURL(/\/(search-parkings|home)/, { timeout: 10000 });
    await page.evaluate(() => localStorage.setItem('userMode', 'host'));

    await page.goto(ROUTES.homeLoggedIn);
    await expect(page).toHaveURL(/\/(home|search-parkings)/);
    await expect(
      page.getByRole('link', { name: /mes annonces|mes espaces|annonces/i }).or(
        page.getByText(/calendrier|réservations/i)
      ).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

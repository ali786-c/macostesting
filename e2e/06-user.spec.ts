import { test, expect } from '@playwright/test';
import { ROUTES, getTestUserCredentials } from './fixtures/test-data';

test.describe('User', () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = getTestUserCredentials();
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill(email);
    await page.getByPlaceholder(/mot de passe|password/i).fill(password);
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page).toHaveURL(/\/(search-parkings|home)/, { timeout: 10000 });
    await page.evaluate(() => localStorage.setItem('userMode', 'client'));
  });

  test('parametres page loads', async ({ page }) => {
    await page.goto(ROUTES.parametres);
    await expect(page).toHaveURL(/parametres/);
    await expect(page.getByRole('heading', { name: /paramètres|profil|compte/i })).toBeVisible({ timeout: 10000 });
  });

  test('messages page loads', async ({ page }) => {
    await page.goto(ROUTES.messages);
    await expect(page).toHaveURL(/messages/);
    await expect(page.getByRole('heading', { name: /messages|messagerie/i })).toBeVisible({ timeout: 10000 });
  });

  test('favoris page loads', async ({ page }) => {
    await page.goto(ROUTES.favoris);
    await expect(page).toHaveURL(/favoris/);
    await expect(page.getByRole('heading', { name: /favoris|favoris/i })).toBeVisible({ timeout: 10000 });
  });

  test('reservations page loads', async ({ page }) => {
    await page.goto(ROUTES.reservations);
    await expect(page).toHaveURL(/reservations/);
    await expect(page.getByText(/réservations|mes réservations/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('parametres shows user info', async ({ page }) => {
    await page.goto(ROUTES.parametres);
    await expect(page.getByPlaceholder(/prénom|nom|email/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('navigation between user pages', async ({ page }) => {
    await page.goto(ROUTES.parametres);
    await expect(page).toHaveURL(/parametres/);

    await page.goto(ROUTES.favoris);
    await expect(page).toHaveURL(/favoris/);

    await page.goto(ROUTES.reservations);
    await expect(page).toHaveURL(/reservations/);

    await page.goto(ROUTES.messages);
    await expect(page).toHaveURL(/messages/);
  });
});

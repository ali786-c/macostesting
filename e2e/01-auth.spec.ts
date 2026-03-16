import { test, expect } from '@playwright/test';
import { ROUTES, getTestUserCredentials } from './fixtures/test-data';

test.describe('Auth', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('login page loads and shows form', async ({ page }) => {
    await page.getByRole('link', { name: /connexion/i }).first().click();
    await expect(page).toHaveURL(/.*auth\/login/);
    await expect(page.getByPlaceholder(/email|adresse/i)).toBeVisible();
    await expect(page.getByPlaceholder(/mot de passe|password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /connexion|connecter/i })).toBeVisible();
  });

  test('signup page loads and shows form', async ({ page }) => {
    await page.getByRole('link', { name: /inscription/i }).first().click();
    await expect(page).toHaveURL(/.*auth\/signup/);
    await expect(page.getByPlaceholder(/prénom|firstname/i)).toBeVisible();
    await expect(page.getByPlaceholder(/nom|lastname/i)).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/mot de passe|password/i)).toBeVisible();
  });

  test('login with valid credentials redirects to search or home', async ({ page }) => {
    const { email, password } = getTestUserCredentials();
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill(email);
    await page.getByPlaceholder(/mot de passe|password/i).fill(password);
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page).toHaveURL(/\/(search-parkings|home)/, { timeout: 10000 });
    await expect(page.getByRole('link', { name: /connexion/i })).not.toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill('invalid@test.com');
    await page.getByPlaceholder(/mot de passe|password/i).fill('wrongpassword123');
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page.locator('text=/erreur|invalid|incorrect|incorrectes/i')).toBeVisible({ timeout: 5000 });
  });

  test('logout clears session and redirects', async ({ page }) => {
    const { email, password } = getTestUserCredentials();
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill(email);
    await page.getByPlaceholder(/mot de passe|password/i).fill(password);
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page).toHaveURL(/\/(search-parkings|home)/, { timeout: 10000 });

    await page.goto(`${ROUTES.parametres}?tab=menu`);
    await expect(page).toHaveURL(/parametres/);
    await page.getByTestId('logout-button').or(page.getByRole('button', { name: /déconnexion|logout/i })).click();

    await expect(page).toHaveURL(/\/(search-parkings|home|\/)$/, { timeout: 5000 });
    await expect(page.getByRole('link', { name: /connexion/i })).toBeVisible({ timeout: 5000 });
  });

  test('forgot password page loads and submits', async ({ page }) => {
    await page.goto(ROUTES.login);
    await page.getByRole('link', { name: /mot de passe oublié|forgot/i }).click();
    await expect(page).toHaveURL(/.*forgot-password/);
    await expect(page.getByRole('heading', { name: /mot de passe oublié/i })).toBeVisible();

    const { email } = getTestUserCredentials();
    await page.getByPlaceholder(/email|votre@email/i).fill(email);
    await page.getByRole('button', { name: /envoyer|réinitialisation/i }).click();

    await expect(page.getByText(/email envoyé|envoyé un lien/i)).toBeVisible({ timeout: 10000 });
  });

  test('protected route redirects to login when not authenticated', async ({ page }) => {
    await page.goto(ROUTES.hostMyPlaces);
    await expect(page).toHaveURL(/.*auth\/login/, { timeout: 5000 });
  });

  test('protected route parametres redirects to login', async ({ page }) => {
    await page.goto(ROUTES.parametres);
    await expect(page).toHaveURL(/.*auth\/login/, { timeout: 5000 });
  });

  test('protected route favoris redirects to login', async ({ page }) => {
    await page.goto(ROUTES.favoris);
    await expect(page).toHaveURL(/.*auth\/login/, { timeout: 5000 });
  });

  test('protected route messages redirects to login', async ({ page }) => {
    await page.goto(ROUTES.messages);
    await expect(page).toHaveURL(/.*auth\/login/, { timeout: 5000 });
  });

  test('protected route reservations redirects to login', async ({ page }) => {
    await page.goto(ROUTES.reservations);
    await expect(page).toHaveURL(/.*auth\/login/, { timeout: 5000 });
  });

  test('navigation between login and signup', async ({ page }) => {
    await page.goto(ROUTES.login);
    await page.getByRole('link', { name: /inscription|s'inscrire/i }).click();
    await expect(page).toHaveURL(/.*signup/);
    await page.getByRole('link', { name: /connexion|connecter/i }).first().click();
    await expect(page).toHaveURL(/.*login/);
  });
});

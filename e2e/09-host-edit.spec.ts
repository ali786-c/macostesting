import { test, expect } from '@playwright/test';
import { ROUTES, getTestHostCredentials, E2E_BACKEND_EXPECTED } from './fixtures/test-data';

test.describe('Hôte - Édition annonce (chemins critiques)', () => {
  test('edit place page requires login', async ({ page }) => {
    const placeId = E2E_BACKEND_EXPECTED.placeId ?? 1;
    await page.goto(ROUTES.hostEditPlace(placeId));
    await expect(page).toHaveURL(/auth\/login/, { timeout: 8000 });
  });

  test('edit place page loads for host owner', async ({ page }) => {
    const placeId = E2E_BACKEND_EXPECTED.placeId;
    if (placeId == null) {
      test.skip(true, 'E2E_PLACE_ID requis (bien appartenant au host)');
      return;
    }

    const { email, password } = getTestHostCredentials();
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill(email);
    await page.getByPlaceholder(/mot de passe|password/i).fill(password);
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page).toHaveURL(/\/(search-parkings|home)/, { timeout: 10000 });
    await page.evaluate(() => localStorage.setItem('userMode', 'host'));

    await page.goto(ROUTES.hostEditPlace(placeId));
    await expect(page).toHaveURL(new RegExp(`/host/my-places/${placeId}`));
    await expect(
      page.getByText(/informations générales|description|tarification|calendrier/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('edit place has save button', async ({ page }) => {
    const placeId = E2E_BACKEND_EXPECTED.placeId;
    if (placeId == null) {
      test.skip(true, 'E2E_PLACE_ID requis');
      return;
    }

    const { email, password } = getTestHostCredentials();
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill(email);
    await page.getByPlaceholder(/mot de passe|password/i).fill(password);
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page).toHaveURL(/\/(search-parkings|home)/, { timeout: 10000 });
    await page.evaluate(() => localStorage.setItem('userMode', 'host'));

    await page.goto(ROUTES.hostEditPlace(placeId));
    await expect(
      page.getByRole('button', { name: /enregistrer|sauvegarder|save/i })
    ).toBeVisible({ timeout: 15000 });
  });
});

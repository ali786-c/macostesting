import { test, expect } from '@playwright/test';
import { ROUTES, getTestUserCredentials, E2E_BACKEND_EXPECTED } from './fixtures/test-data';

test.describe('Réservation détail (chemins critiques)', () => {
  test('reservation detail requires login', async ({ page }) => {
    const reservationId = E2E_BACKEND_EXPECTED.reservationId ?? 1;
    await page.goto(ROUTES.reservationDetail(reservationId));
    await expect(page).toHaveURL(/auth\/login/, { timeout: 8000 });
  });

  test('reservation detail page loads when logged in', async ({ page }) => {
    const reservationId = E2E_BACKEND_EXPECTED.reservationId;
    if (reservationId == null) {
      test.skip(true, 'E2E_RESERVATION_ID requis pour ce test');
      return;
    }

    const { email, password } = getTestUserCredentials();
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill(email);
    await page.getByPlaceholder(/mot de passe|password/i).fill(password);
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page).toHaveURL(/\/(search-parkings|home)/, { timeout: 10000 });

    await page.goto(ROUTES.reservationDetail(reservationId));
    await expect(page).toHaveURL(new RegExp(`/reservations/${reservationId}`));
    await expect(
      page.getByText(/réservation|détail|dates|montant/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

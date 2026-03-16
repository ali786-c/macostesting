import { test, expect } from '@playwright/test';
import { ROUTES, getTestUserCredentials, E2E_BACKEND_EXPECTED } from './fixtures/test-data';

test.describe('Messages (chemins critiques)', () => {
  test('messages page requires login', async ({ page }) => {
    await page.goto(ROUTES.messages);
    await expect(page).toHaveURL(/auth\/login/, { timeout: 8000 });
  });

  test('messages page loads when logged in', async ({ page }) => {
    const { email, password } = getTestUserCredentials();
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill(email);
    await page.getByPlaceholder(/mot de passe|password/i).fill(password);
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page).toHaveURL(/\/(search-parkings|home)/, { timeout: 10000 });

    await page.goto(ROUTES.messages);
    await expect(page).toHaveURL(/messages/);
    await expect(
      page.getByRole('heading', { name: /messages|messagerie/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test('messages page shows search or conversation list', async ({ page }) => {
    const { email, password } = getTestUserCredentials();
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill(email);
    await page.getByPlaceholder(/mot de passe|password/i).fill(password);
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page).toHaveURL(/\/(search-parkings|home)/, { timeout: 10000 });

    await page.goto(ROUTES.messages);
    await expect(page).toHaveURL(/messages/);
    const searchOrList = page.getByPlaceholder(/rechercher/i).or(
      page.getByText(/aucune conversation|messages/i)
    );
    await expect(searchOrList.first()).toBeVisible({ timeout: 10000 });
  });

  test('messages with placeId and userId in URL open conversation panel', async ({
    page,
  }) => {
    const placeId = E2E_BACKEND_EXPECTED.placeId;
    const hostUserId = E2E_BACKEND_EXPECTED.hostUserId;
    if (placeId == null || hostUserId == null) {
      test.skip(true, 'E2E_PLACE_ID et E2E_HOST_USER_ID requis pour ce test');
      return;
    }

    const { email, password } = getTestUserCredentials();
    await page.goto(ROUTES.login);
    await page.getByPlaceholder(/email|adresse/i).fill(email);
    await page.getByPlaceholder(/mot de passe|password/i).fill(password);
    await page.getByRole('button', { name: /connexion|connecter/i }).click();
    await expect(page).toHaveURL(/\/(search-parkings|home)/, { timeout: 10000 });

    await page.goto(ROUTES.messagesWithConversation(placeId, hostUserId));
    await expect(page).toHaveURL(new RegExp(`placeId=${placeId}.*userId=${hostUserId}`));
    const chatPanel = page.getByPlaceholder(/tapez votre message|type your message/i).or(
      page.getByRole('heading', { name: /messages/i })
    );
    await expect(chatPanel.first()).toBeVisible({ timeout: 15000 });
  });
});

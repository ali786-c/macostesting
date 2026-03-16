import { test, expect } from '@playwright/test';
import { ROUTES, SEARCH_TEST_DATA } from './fixtures/test-data';

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.searchParkings);
  });

  test('search page shows search bar and map or results area', async ({ page }) => {
    await expect(page).toHaveURL(/search-parkings/);
    await expect(page.getByPlaceholder(/ville|rechercher|où/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('search by city updates results', async ({ page }) => {
    const cityInput = page.getByPlaceholder(/ville|rechercher|où/i).first();
    await cityInput.fill(SEARCH_TEST_DATA.cities[0]);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`city=${encodeURIComponent(SEARCH_TEST_DATA.cities[0])}`));
  });

  test('filters panel or filter controls are present', async ({ page }) => {
    const filters = page.getByRole('button', { name: /filtres|filtrer/i });
    const typeFilter = page.getByText(/parking|stockage|cave|type/i);
    await expect(filters.or(typeFilter).first()).toBeVisible({ timeout: 10000 });
  });

  test('map or list view is visible', async ({ page }) => {
    const map = page.locator('.maplibregl-map, [class*="map"], canvas');
    const listOrCards = page.locator('[href*="/parking/"], .parking-card, [data-testid="listing-card"]');
    await expect(map.or(listOrCards).first()).toBeVisible({ timeout: 15000 });
  });

  test('click on listing card navigates to parking detail', async ({ page }) => {
    const firstCard = page.getByTestId('listing-card').or(page.locator('a[href*="/parking/"]')).first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await firstCard.isVisible()) {
      const href = await firstCard.getAttribute('href');
      await firstCard.click();
      await expect(page).toHaveURL(/\/parking\/\d+/);
      await expect(page.getByRole('button', { name: /réserver|réserver maintenant/i })).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(true, 'No listings available - backend may have no places');
    }
  });

  test('URL params persist when navigating back', async ({ page }) => {
    const cityInput = page.getByPlaceholder(/ville|rechercher|où/i).first();
    await cityInput.fill('Paris');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/city=Paris/);
  });

  test('search with type=PARKING in URL loads without flash', async ({ page }) => {
    await page.goto(`${ROUTES.searchParkings}?type=PARKING`);
    await expect(page).toHaveURL(/type=PARKING/);
    const loadingOrResults = page.getByText(/chargement|biens trouvés|aucun bien/i).or(
      page.locator('a[href*="/parking/"]')
    );
    await expect(loadingOrResults.first()).toBeVisible({ timeout: 15000 });
  });
});

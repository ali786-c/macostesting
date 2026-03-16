/**
 * E2E test constants and configuration.
 * Credentials come from env vars: E2E_USER_EMAIL, E2E_USER_PASSWORD, E2E_HOST_EMAIL, E2E_HOST_PASSWORD
 */

export const E2E_CONFIG = {
  /** Frontend base URL (default localhost:3000) */
  baseURL: process.env.E2E_BASE_URL || process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
  /** Backend API base URL (default localhost:8080) - used to verify backend is reachable */
  apiURL: process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
} as const;

/** User credentials for regular client user - from env */
export function getTestUserCredentials() {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_USER_EMAIL and E2E_USER_PASSWORD must be set for auth tests');
  }
  return { email, password };
}

/** Host credentials for owner/host user - from env */
export function getTestHostCredentials() {
  const email = process.env.E2E_HOST_EMAIL;
  const password = process.env.E2E_HOST_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_HOST_EMAIL and E2E_HOST_PASSWORD must be set for owner tests');
  }
  return { email, password };
}

/** Optional: check if test user credentials are configured (for conditional tests) */
export function hasTestUserCredentials(): boolean {
  return !!(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
}

/** Optional: check if test host credentials are configured */
export function hasTestHostCredentials(): boolean {
  return !!(process.env.E2E_HOST_EMAIL && process.env.E2E_HOST_PASSWORD);
}

/** Test placeholders for signup (used only when backend allows new registration) */
export const SIGNUP_TEST_DATA = {
  firstName: 'E2E',
  lastName: 'TestUser',
  email: `e2e-${Date.now()}@test.easypark.local`,
  password: 'TestPassword123',
  phoneNumber: '+33612345678',
} as const;

/** Search test data - cities that should return results when backend has data */
export const SEARCH_TEST_DATA = {
  /** Cities to try for search (backend must have at least one place in one of these) */
  cities: ['Paris', 'Lyon', 'Marseille'],
  /** Type filters: parking, storage, cellar */
  types: ['parking', 'storage', 'cellar'] as const,
} as const;

/** Routes */
export const ROUTES = {
  home: '/',
  homeLoggedIn: '/home',
  searchParkings: '/search-parkings',
  login: '/auth/login',
  signup: '/auth/signup',
  forgotPassword: '/auth/forgot-password',
  faq: '/faq',
  help: '/help',
  cgu: '/cgu',
  cgv: '/cgv',
  mentionsLegales: '/mentions-legales',
  legal: '/legal',
  privacy: '/privacy',
  hostMyPlaces: '/host/my-places',
  hostCreate: '/host/create',
  monCalendrier: '/mon-calendrier',
  parametres: '/parametres',
  messages: '/messages',
  favoris: '/favoris',
  reservations: '/reservations',
  reservationDetail: (id: number) => `/reservations/${id}`,
  messages: '/messages',
  messagesWithConversation: (placeId: number, userId: number) => `/messages?placeId=${placeId}&userId=${userId}`,
  parking: (id: number) => `/parking/${id}/`,
  hostEditPlace: (id: number) => `/host/my-places/${id}`,
} as const;

/** IDs de données backend attendus pour les tests E2E (voir docs/e2e-backend-data-requirements.md) */
export const E2E_BACKEND_EXPECTED = {
  /** Au moins un bien (place) avec cet ID ou le premier retourné par GET /places/search */
  placeId: process.env.E2E_PLACE_ID ? parseInt(process.env.E2E_PLACE_ID, 10) : undefined,
  /** ID propriétaire du bien (ownerId) pour ouvrir une conversation messages?placeId=&userId= */
  hostUserId: process.env.E2E_HOST_USER_ID ? parseInt(process.env.E2E_HOST_USER_ID, 10) : undefined,
  /** Au moins une réservation avec cet ID pour /reservations/[id] */
  reservationId: process.env.E2E_RESERVATION_ID ? parseInt(process.env.E2E_RESERVATION_ID, 10) : undefined,
} as const;

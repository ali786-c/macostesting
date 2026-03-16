// src/storage/storage.interface.ts
var AUTH_TOKEN_KEY = "authToken";
var USER_ID_KEY = "userId";
var USER_EMAIL_KEY = "userEmail";
var USER_NAME_KEY = "userName";
var USER_TYPE_KEY = "finalUserType";
var IS_LOGGED_IN_KEY = "finalIsLoggedIn";

// src/storage/storage.web.ts
function createWebStorage() {
  return {
    async getItem(key) {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key);
    },
    async setItem(key, value) {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, value);
    },
    async removeItem(key) {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(key);
    }
  };
}

// src/validation/auth.ts
import { z } from "zod";
var loginPayloadSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis")
});

// src/constants.ts
var API_PATH = {
  AUTH_LOGIN: "/auth/login",
  USERS_REGISTER: "/users/register",
  USERS_FORGOT_PASSWORD: "/users/forgot-password",
  USERS_RESET_PASSWORD: "/users/reset-password",
  PLACES: "/places",
  PLACES_SEARCH: "/places/search",
  PLACES_OWNER_CALENDAR_OVERVIEW: (userId) => `/places/owner/${userId}/calendar-overview`,
  RESERVATIONS: "/reservations",
  RESERVATIONS_ESTIMATE: "/reservations/estimate",
  USERS_OWNED_RESERVATIONS: (userId) => `/users/${userId}/owned-reservations`,
  RESERVATIONS_CLIENT: (clientId) => `/reservations/client/${clientId}`,
  RESERVATIONS_BY_ID: (id) => `/reservations/${id}`,
  PLACES_BY_ID: (id) => `/places/${id}`
};

// src/utils/format.ts
function formatCurrency(value, locale = "fr-FR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR"
  }).format(value);
}
function formatDate(date, locale = "fr-FR") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium"
  }).format(d);
}
function formatDateTime(date, locale = "fr-FR") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short"
  }).format(d);
}
export {
  API_PATH,
  AUTH_TOKEN_KEY,
  IS_LOGGED_IN_KEY,
  USER_EMAIL_KEY,
  USER_ID_KEY,
  USER_NAME_KEY,
  USER_TYPE_KEY,
  createWebStorage,
  formatCurrency,
  formatDate,
  formatDateTime,
  loginPayloadSchema
};

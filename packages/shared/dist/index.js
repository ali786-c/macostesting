"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  API_PATH: () => API_PATH,
  AUTH_TOKEN_KEY: () => AUTH_TOKEN_KEY,
  IS_LOGGED_IN_KEY: () => IS_LOGGED_IN_KEY,
  USER_EMAIL_KEY: () => USER_EMAIL_KEY,
  USER_ID_KEY: () => USER_ID_KEY,
  USER_NAME_KEY: () => USER_NAME_KEY,
  USER_TYPE_KEY: () => USER_TYPE_KEY,
  createWebStorage: () => createWebStorage,
  formatCurrency: () => formatCurrency,
  formatDate: () => formatDate,
  formatDateTime: () => formatDateTime,
  loginPayloadSchema: () => loginPayloadSchema
});
module.exports = __toCommonJS(index_exports);

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
var import_zod = require("zod");
var loginPayloadSchema = import_zod.z.object({
  email: import_zod.z.string().email("Email invalide"),
  password: import_zod.z.string().min(1, "Mot de passe requis")
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});

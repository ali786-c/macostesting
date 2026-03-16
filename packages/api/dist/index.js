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
  ApiError: () => ApiError,
  createApiClient: () => createApiClient,
  createAuthApi: () => createAuthApi,
  createHttpClient: () => createHttpClient,
  createPlacesApi: () => createPlacesApi,
  createReservationsApi: () => createReservationsApi,
  normalizeError: () => normalizeError
});
module.exports = __toCommonJS(index_exports);

// src/httpClient.ts
var DEFAULT_TIMEOUT = 3e4;
function ensureTrailingSlash(url) {
  const u = url.trim();
  if (!u.endsWith("/api") && !u.endsWith("/api/")) {
    return u.endsWith("/") ? `${u}api` : `${u}/api`;
  }
  return u.endsWith("/") ? u.slice(0, -1) : u;
}
function createHttpClient(config) {
  const baseURL = ensureTrailingSlash(config.baseURL);
  const timeout = config.timeout ?? DEFAULT_TIMEOUT;
  const getToken = config.getToken;
  async function request(method, path, body, options) {
    const url = path.startsWith("http") ? path : `${baseURL}${path}`;
    const token = await getToken();
    const headers = {
      "Content-Type": "application/json",
      ...options?.headers
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : void 0,
      signal: AbortSignal.timeout(timeout)
    });
    if (!res.ok) {
      let message = res.statusText;
      try {
        const data = await res.json();
        message = data?.message ?? data?.error ?? message;
      } catch {
        const text = await res.text();
        if (text) message = text;
      }
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return res.json();
    }
    return res.text();
  }
  return {
    get: (path, options) => request("GET", path, void 0, options),
    post: (path, body, options) => request("POST", path, body, options),
    put: (path, body, options) => request("PUT", path, body, options),
    patch: (path, body, options) => request("PATCH", path, body, options),
    delete: (path, options) => request("DELETE", path, void 0, options),
    baseURL: () => baseURL
  };
}

// src/authApi.ts
var import_shared = require("@easypark/shared");

// src/errors.ts
var ApiError = class extends Error {
  constructor(message, status, code, response) {
    super(message);
    this.status = status;
    this.code = code;
    this.response = response;
    this.name = "ApiError";
  }
};
function normalizeError(error) {
  if (error instanceof ApiError) return error;
  const err = error;
  const message = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? "Erreur r\xE9seau";
  return new ApiError(
    message,
    err?.response?.status,
    err?.code,
    err?.response
  );
}

// src/authApi.ts
function createAuthApi(http) {
  return {
    async login(payload) {
      try {
        const data = await http.post(import_shared.API_PATH.AUTH_LOGIN, payload);
        return data;
      } catch (e) {
        const err = normalizeError(e);
        if (err.status === 401 || err.status === 403) {
          throw new Error("Email ou mot de passe incorrect");
        }
        throw new Error(err.message || "Erreur lors de la connexion");
      }
    },
    async signup(payload) {
      try {
        const data = await http.post(import_shared.API_PATH.USERS_REGISTER, payload);
        return data;
      } catch (e) {
        const err = normalizeError(e);
        throw new Error(err.message || "Erreur lors de l'inscription");
      }
    },
    async forgotPassword(email) {
      try {
        await http.post(
          `${import_shared.API_PATH.USERS_FORGOT_PASSWORD}?email=${encodeURIComponent(email)}`,
          null
        );
      } catch (e) {
        const err = normalizeError(e);
        throw new Error(err.message || "Erreur lors de la demande de r\xE9initialisation");
      }
    },
    async resetPassword(payload) {
      try {
        await http.post(
          `${import_shared.API_PATH.USERS_RESET_PASSWORD}?token=${encodeURIComponent(payload.token)}&newPassword=${encodeURIComponent(payload.newPassword)}`,
          null
        );
      } catch (e) {
        const err = normalizeError(e);
        throw new Error(err.message || "Erreur lors de la r\xE9initialisation du mot de passe");
      }
    }
  };
}

// src/placesApi.ts
var import_shared2 = require("@easypark/shared");
function buildSearchQuery(params) {
  const q = new URLSearchParams();
  if (!params) return "";
  if (params.city) q.append("city", params.city);
  if (params.type) q.append("type", params.type);
  if (params.title) q.append("title", params.title);
  if (params.availableFrom) q.append("availableFrom", params.availableFrom);
  if (params.availableTo) q.append("availableTo", params.availableTo);
  if (params.maxPrice != null) q.append("maxPrice", String(params.maxPrice));
  if (params.lat != null) q.append("lat", String(params.lat));
  if (params.lng != null) q.append("lng", String(params.lng));
  if (params.radius != null) q.append("radius", String(params.radius));
  if (params.page != null) q.append("page", String(params.page));
  if (params.size != null) q.append("size", String(params.size));
  if (params.instantBooking === true) q.append("instantBooking", "true");
  if (params.freeCancellation === true) q.append("freeCancellation", "true");
  if (params.characteristics) {
    Object.entries(params.characteristics).forEach(([k, v]) => q.append(k, String(v)));
  }
  const excluded = [
    "city",
    "type",
    "title",
    "availableFrom",
    "availableTo",
    "maxPrice",
    "instantBooking",
    "freeCancellation",
    "noDeposit",
    "characteristics",
    "lat",
    "lng",
    "radius",
    "page",
    "size"
  ];
  Object.entries(params).forEach(([key, value]) => {
    if (excluded.includes(key) || value === void 0 || value === null || value === "") return;
    q.append(key, String(value));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}
function createPlacesApi(http) {
  return {
    async getAll(params) {
      const q = new URLSearchParams();
      if (params?.page != null) q.append("page", String(params.page));
      if (params?.size != null) q.append("size", String(params.size));
      const query = q.toString() ? `?${q.toString()}` : "";
      const data = await http.get(`${import_shared2.API_PATH.PLACES}${query}`);
      return Array.isArray(data) ? data : data?.content ?? [];
    },
    async getById(placeId) {
      try {
        return await http.get(import_shared2.API_PATH.PLACES_BY_ID(placeId));
      } catch (e) {
        throw normalizeError(e);
      }
    },
    async search(params) {
      try {
        const query = buildSearchQuery(params);
        const data = await http.get(
          `${import_shared2.API_PATH.PLACES_SEARCH}${query}`
        );
        return Array.isArray(data) ? data : data?.content ?? [];
      } catch (e) {
        throw normalizeError(e);
      }
    },
    async getOwnerCalendarOverview(userId) {
      try {
        const data = await http.get(
          `${import_shared2.API_PATH.PLACES_OWNER_CALENDAR_OVERVIEW(userId)}?_t=${Date.now()}`
        );
        return Array.isArray(data) ? data : [];
      } catch (e) {
        throw normalizeError(e);
      }
    }
  };
}

// src/reservationsApi.ts
var import_shared3 = require("@easypark/shared");
function createReservationsApi(http) {
  return {
    async getClientReservations(clientId) {
      try {
        const data = await http.get(
          import_shared3.API_PATH.RESERVATIONS_CLIENT(clientId)
        );
        return Array.isArray(data) ? data : [];
      } catch (e) {
        throw normalizeError(e);
      }
    },
    async getOwnedReservations(userId) {
      try {
        const data = await http.get(
          import_shared3.API_PATH.USERS_OWNED_RESERVATIONS(userId)
        );
        return Array.isArray(data) ? data : [];
      } catch (e) {
        throw normalizeError(e);
      }
    },
    async getById(reservationId) {
      try {
        return await http.get(
          import_shared3.API_PATH.RESERVATIONS_BY_ID(reservationId)
        );
      } catch (e) {
        throw normalizeError(e);
      }
    }
  };
}

// src/createClient.ts
function createApiClient(config) {
  const http = createHttpClient({
    baseURL: config.baseURL,
    getToken: config.getToken,
    timeout: config.timeout,
    storage: config.storage
  });
  return {
    authAPI: createAuthApi(http),
    placesAPI: createPlacesApi(http),
    reservationsAPI: createReservationsApi(http)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ApiError,
  createApiClient,
  createAuthApi,
  createHttpClient,
  createPlacesApi,
  createReservationsApi,
  normalizeError
});

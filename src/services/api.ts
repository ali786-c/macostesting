import axios from "axios";
import * as storage from "@/lib/storage";
import { isCapacitor } from "@/lib/capacitor";

// URL de l'API en production (Render) — utilisée pour iOS/Android et builds production
const PRODUCTION_API_URL = "https://rentoall.onrender.com/api";

// Configuration API - Utilise localhost par défaut en développement
export const getBaseURL = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  // Build production (Capacitor iOS/Android ou Vercel) : ne jamais utiliser localhost
  if (process.env.NODE_ENV === "production") {
    if (!envUrl || envUrl.includes("localhost")) {
      return PRODUCTION_API_URL;
    }
    if (envUrl.endsWith("/api")) return envUrl;
    if (!envUrl.endsWith("/api/")) return `${envUrl}/api`;
    return envUrl;
  }

  // iOS/Android (Capacitor) au runtime : forcer l'API Render si env contient encore localhost
  if (typeof window !== "undefined" && isCapacitor()) {
    if (!envUrl || envUrl.includes("localhost")) {
      return PRODUCTION_API_URL;
    }
    if (envUrl.endsWith("/api")) return envUrl;
    if (!envUrl.endsWith("/api/")) return `${envUrl}/api`;
    return envUrl;
  }

  // Utiliser la variable d'environnement si disponible (disponible côté serveur et client en Next.js)
  if (envUrl) {
    console.log("🔧 [API CONFIG] Utilisation de NEXT_PUBLIC_API_URL:", envUrl);
    if (envUrl.endsWith("/api")) {
      return envUrl;
    } else if (!envUrl.endsWith("/api/")) {
      return `${envUrl}/api`;
    }
    return envUrl;
  }

  // URL de l'API par défaut (localhost en développement si aucune variable d'env n'est définie)
  const defaultUrl = "http://localhost:8080/api";
  console.log(
    "🔧 [API CONFIG] Utilisation de l'URL par défaut (localhost):",
    defaultUrl,
  );
  return defaultUrl;
};

// Toutes les requêtes doivent commencer par /api/ (sans /v1)
const baseURL = getBaseURL();

const api = axios.create({
  baseURL: baseURL,
  timeout: 30000, // Timeout pour les requêtes API
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper pour obtenir l'URL de base (identique à getBaseURL maintenant)
const getBaseURLWithoutV1 = (): string => {
  const url = getBaseURL();
  console.log("🔧 [API CONFIG] getBaseURLWithoutV1 retourne:", url);
  // S'assurer que l'URL se termine par /api
  if (!url.endsWith("/api") && !url.endsWith("/api/")) {
    console.warn(
      "⚠️ [API CONFIG] L'URL ne se termine pas par /api, ajout de /api",
    );
    return `${url}/api`;
  }
  return url;
};

// Helper pour obtenir l'URL de base sans /api (pour OAuth2 Spring Security)
// Le frontend redirige vers le backend Spring qui gère tout le flow OAuth2
export const getBaseURLForOAuth2 = (): string => {
  // iOS/Android (Capacitor) : toujours utiliser l'API Render, jamais localhost
  if (typeof window !== "undefined" && isCapacitor()) {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!envUrl || envUrl.includes("localhost")) {
      return PRODUCTION_API_URL.replace("/api", "");
    }
    return envUrl.replace("/api", "");
  }

  // Utiliser l'URL du backend par défaut pour OAuth2
  const backendURL = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace("/api", "")
    : "http://localhost:8080/api";

  console.log("🔧 [OAUTH2 CONFIG] ========================================");
  console.log(
    "🔧 [OAUTH2 CONFIG] Environnement:",
    process.env.NODE_ENV || "development",
  );
  console.log("🔧 [OAUTH2 CONFIG] URL backend:", backendURL);
  console.log("🔧 [OAUTH2 CONFIG] ========================================");

  return backendURL;
};

// Intercepteur pour ajouter le token aux requêtes si disponible (storage = localStorage ou Capacitor Preferences restauré)
// En iOS/Android, on force aussi l'URL de base vers l'API Render (jamais localhost)
api.interceptors.request.use(
  (config) => {
    const token = storage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // En Capacitor, s'assurer que l'API utilisée n'est jamais localhost
    if (
      typeof window !== "undefined" &&
      isCapacitor() &&
      config.baseURL?.includes("localhost")
    ) {
      config.baseURL = PRODUCTION_API_URL;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Intercepteur 401 : session expirée → redirection vers login (audit Capacitor)
// Erreurs 5xx : message discret global "Veuillez réessayer plus tard"
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      const requestUrl = error?.config?.url ?? "";
      const pathname = window.location.pathname ?? "";
      const isAuthPage =
        pathname.startsWith("/auth/login") ||
        pathname.startsWith("/auth/signup");
      const isAuthRequest =
        requestUrl.includes("auth/login") ||
        requestUrl.includes("auth/register");
      if (!isAuthPage && !isAuthRequest) {
        storage.removeItem("authToken");
        storage.removeItem("finalIsLoggedIn");
        storage.removeItem("userId");
        storage.removeItem("userName");
        storage.removeItem("userEmail");
        storage.removeItem("finalUserType");
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("logout"));
        window.location.href = "/auth/login?session_expired=1";
      }
    }
    // Erreurs serveur (500-599) : toast discret "Veuillez réessayer plus tard"
    if (typeof window !== "undefined" && error?.response?.status >= 500 && error?.response?.status < 600) {
      error.userMessage = "Veuillez réessayer plus tard.";
      window.dispatchEvent(new CustomEvent("api:serverError", { detail: { message: "Veuillez réessayer plus tard." } }));
    }
    return Promise.reject(error);
  },
);

console.log("🔧 [API CONFIG] Configuration de l'API:", {
  baseURL: api.defaults.baseURL,
  timeout: api.defaults.timeout,
  env: process.env.NODE_ENV || "development",
  apiUrl: getBaseURL(),
  mode: process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEVELOPMENT",
});

// API des parrainages et affiliations
export const referralsAPI = {
  // Récupérer les parrainages d'un utilisateur (retourne une liste de UserDTO des personnes parrainées)
  getMyReferrals: async (userId: number): Promise<UserDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/referrals`;
      console.log("🔵 [REFERRALS API] Récupération des filleuls:", {
        userId,
        fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [REFERRALS API] Filleuls récupérés:", response.data);
      return response.data || [];
    } catch (error) {
      console.error(
        "❌ [REFERRALS API] Erreur lors de la récupération des filleuls:",
        error,
      );
      // Retourner une liste vide en cas d'erreur
      return [];
    }
  },

  // Récupérer les affiliés d'un utilisateur (liste des personnes affiliées)
  // GET /api/users/{userId}/affiliates
  getMyAffiliates: async (userId: number): Promise<UserDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/affiliates`;
      console.log("🔵 [REFERRALS API] Récupération des affiliés:", {
        userId,
        fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [REFERRALS API] Affiliés récupérés:", response.data);
      return response.data || [];
    } catch (error) {
      console.error(
        "❌ [REFERRALS API] Erreur lors de la récupération des affiliés:",
        error,
      );
      // Retourner une liste vide en cas d'erreur
      return [];
    }
  },

  // Récupérer les codes d'affiliation d'un utilisateur
  // GET /api/users/{userId}/affiliation-codes
  getAffiliationCodes: async (
    userId: number,
  ): Promise<AffiliationCodeDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/affiliation-codes`;
      console.log("🔵 [REFERRALS API] Récupération des codes d'affiliation:", {
        userId,
        fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [REFERRALS API] Codes d'affiliation récupérés:",
        response.data,
      );
      return response.data || [];
    } catch (error) {
      console.error(
        "❌ [REFERRALS API] Erreur lors de la récupération des codes d'affiliation:",
        error,
      );
      return [];
    }
  },

  // Créer un nouveau code d'affiliation
  // POST /api/users/{userId}/affiliation-codes?code=XXX&description=YYY
  createAffiliationCode: async (
    userId: number,
    code: string,
    description: string,
  ): Promise<AffiliationCodeDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/affiliation-codes`;
      console.log("🔵 [REFERRALS API] Création d'un code d'affiliation:", {
        userId,
        code,
        description,
        fullURL,
      });

      const response = await axios.post(fullURL, null, {
        params: {
          code: code,
          description: description,
        },
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [REFERRALS API] Code d'affiliation créé:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [REFERRALS API] Erreur lors de la création du code d'affiliation:",
        error,
      );
      throw error;
    }
  },

  // Supprimer un code d'affiliation
  // DELETE /api/users/{userId}/affiliation-codes/{codeId}
  deleteAffiliationCode: async (
    userId: number,
    codeId: number,
  ): Promise<void> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/affiliation-codes/${codeId}`;
      console.log("🔵 [REFERRALS API] Suppression d'un code d'affiliation:", {
        userId,
        codeId,
        fullURL,
      });

      await axios.delete(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [REFERRALS API] Code d'affiliation supprimé");
    } catch (error) {
      console.error(
        "❌ [REFERRALS API] Erreur lors de la suppression du code d'affiliation:",
        error,
      );
      throw error;
    }
  },

  // Récupérer l'historique des transactions d'affiliation
  // GET /api/users/{userId}/affiliation-transactions
  getAffiliationTransactions: async (userId: number): Promise<any[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/affiliation-transactions`;
      console.log(
        "🔵 [REFERRALS API] Récupération des transactions d'affiliation:",
        { userId, fullURL },
      );

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [REFERRALS API] Transactions d'affiliation récupérées:",
        response.data,
      );
      return response.data || [];
    } catch (error) {
      console.error(
        "❌ [REFERRALS API] Erreur lors de la récupération des transactions d'affiliation:",
        error,
      );
      return [];
    }
  },

  // Générer un code de parrainage pour un utilisateur
  generateReferralCode: async (
    userId: number,
  ): Promise<{ referralCode: string }> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/generate-referral-code`;
      const response = await axios.post(
        fullURL,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            ...(storage.getItem("authToken")
              ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
              : {}),
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Erreur lors de la génération du code de parrainage:",
        error,
      );
      throw error;
    }
  },

  // Récupérer les informations de parrainage de l'utilisateur (détails + referralCode)
  // GET /api/users/{userId}/referral-info
  getReferralInfo: async (
    userId: number,
  ): Promise<{ referralCode: string; creditBalance?: number }> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/referral-info`;
      console.log(
        "🔵 [REFERRALS API] Récupération des infos de parrainage GET /users/{userId}/referral-info:",
        { userId, fullURL },
      );

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [REFERRALS API] Infos de parrainage récupérées:",
        response.data,
      );
      return {
        referralCode: response.data.referralCode || "",
        creditBalance: response.data.creditBalance ?? response.data.walletBalance ?? 0,
      };
    } catch (error) {
      console.error(
        "❌ [REFERRALS API] Erreur lors de la récupération des infos de parrainage:",
        error,
      );
      return {
        referralCode: "",
        creditBalance: 0,
      };
    }
  },

  // Récupérer les bons de réduction (gains de parrainage - bons de 5 €)
  // GET /api/users/{userId}/discount-bonuses
  getDiscountBonuses: async (userId: number): Promise<DiscountBonusDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/discount-bonuses`;
      console.log("🔵 [REFERRALS API] Récupération des bons de réduction:", {
        userId,
        fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [REFERRALS API] Bons de réduction récupérés:",
        response.data,
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(
        "❌ [REFERRALS API] Erreur lors de la récupération des bons de réduction:",
        error,
      );
      return [];
    }
  },

  // Récupérer le résumé complet d'affiliation et parrainage (nouvel endpoint)
  // GET /api/users/{userId}/affiliation-summary
  getAffiliationSummary: async (
    userId: number,
  ): Promise<AffiliationSummaryDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/affiliation-summary`;
      console.log("🔵 [REFERRALS API] Récupération du résumé d'affiliation:", {
        userId,
        fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [REFERRALS API] Résumé d'affiliation récupéré:",
        response.data,
      );
      return {
        referralCode: response.data.referralCode || "",
        affiliationCodes: response.data.affiliationCodes || [], // Tableau d'objets AffiliationCodeDTO
        walletBalance: response.data.walletBalance || 0,
      };
    } catch (error) {
      console.error(
        "❌ [REFERRALS API] Erreur lors de la récupération du résumé d'affiliation:",
        error,
      );
      // Retourner des valeurs par défaut en cas d'erreur
      return {
        referralCode: "",
        affiliationCodes: [],
        walletBalance: 0,
      };
    }
  },

  // Récupérer les statistiques complètes d'affiliation et parrainage
  // GET /api/users/{userId}/affiliation-stats
  getAffiliationStats: async (userId: number): Promise<AffiliationStatsDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/affiliation-stats`;
      console.log(
        "🔵 [REFERRALS API] Récupération des statistiques d'affiliation:",
        { userId, fullURL },
      );

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [REFERRALS API] Statistiques d'affiliation récupérées:",
        response.data,
      );
      return {
        referralCode: response.data.referralCode || "",
        totalReferrals: response.data.totalReferrals || 0,
        totalAffiliates: response.data.totalAffiliates || 0,
        totalEarnings: response.data.totalEarnings || 0,
        referralEarnings: response.data.referralEarnings || 0,
        commissionEarnings: response.data.commissionEarnings || 0,
        affiliationCodes: response.data.affiliationCodes || [], // Tableau d'objets AffiliationCodeDTO
      };
    } catch (error) {
      console.error(
        "❌ [REFERRALS API] Erreur lors de la récupération des statistiques d'affiliation:",
        error,
      );
      // Retourner des valeurs par défaut en cas d'erreur
      return {
        referralCode: "",
        totalReferrals: 0,
        totalAffiliates: 0,
        totalEarnings: 0,
        referralEarnings: 0,
        commissionEarnings: 0,
        affiliationCodes: [],
      };
    }
  },
};

// Signup API types
export type SignupType = "CLIENT" | "PROFESSIONAL" | "AGENCY" | "ENTERPRISE";

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface ClientSignupPayload {
  type: "CLIENT";
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  matchingPassword: string;
  phoneNumber?: string;
  birthCity?: string;
  birthdate?: string;
  address?: Address;
}

export interface ProfessionalSpeciality {
  specialityId: number;
  price: number;
}

export interface Pricing {
  label: string;
  price: number;
}

export interface ProfessionalCard {
  title?: string;
  description?: string;
  price?: number;
}

export interface BankInformation {
  iban: string;
  bic: string;
}

export interface ProfessionalSignupPayload {
  type: "PROFESSIONAL";
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  matchingPassword: string;
  phoneNumber?: string;
  birthCity?: string;
  birthdate?: string;
  professionalCard?: ProfessionalCard;
  bankInformations?: BankInformation[];
}

export interface AgencySignupPayload {
  type: "AGENCY";
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  matchingPassword: string;
  agencyName: string;
  website?: string;
  vatNumber?: string;
}

export interface EnterpriseSignupPayload {
  type: "ENTERPRISE";
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  matchingPassword: string;
  companyName: string;
  siretNumber?: string;
  vatNumber?: string;
  contactPerson?: string;
}

export type SignupPayload =
  | ClientSignupPayload
  | ProfessionalSignupPayload
  | AgencySignupPayload
  | EnterpriseSignupPayload;

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  type?: string;
  token?: string;
  [key: string]: unknown; // Pour les autres champs du UserDTO
}

// Nouveau payload pour l'inscription locale
export interface RegisterPayload {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  // Champs professionnels (optionnels)
  companyName?: string;
  companyAddress?: string;
  siret?: string;
  vatNumber?: string;
  // Champs parrainage et affiliation (optionnels)
  // appliedReferralCode : code de parrainage système (ex: JODO-1234)
  appliedReferralCode?: string;
  // appliedAffiliationCode : code d'affiliation personnalisé (ex: PROMO2026)
  appliedAffiliationCode?: string;
}

// Interfaces pour les parrainages et affiliations
export interface ReferralData {
  id: string;
  referredUserId: string;
  referrerUserId: string;
  referralCode: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  referralDate: string;
  firstBookingDate?: string;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
}

export interface AffiliationData {
  id: string;
  code: string;
  name: string;
  description: string;
  commissionRate: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  pendingCommission: number;
  paidCommission: number;
  isActive: boolean;
  createdAt: string;
  ownerId: string;
}

// Interface pour un code d'affiliation (selon le backend)
export interface AffiliationCodeDTO {
  id: number;
  code: string;
  description: string;
  userId: number;
}

// Bon de réduction (parrainage / palier 200 €) - GET /api/users/{userId}/discount-bonuses
export interface DiscountBonusDTO {
  id?: number;
  userId?: number;
  amount?: number;
  expiresAt?: string | null;
  used?: boolean;
  usedAt?: string | null;
  usedInReservationId?: number | null;
  /** Origine du bon : PARRAINAGE_PREMIERE_RESA, ACHAT_VOLUME_200, etc. */
  reason?: string;
  /** Code unique à afficher / copier pour utilisation en réservation */
  uniqueCode?: string;
  createdAt?: string;
  /** Ancien champ, conservé pour compatibilité */
  source?: string;
  [key: string]: unknown;
}

// DTO pour le résumé d'affiliation et parrainage
export interface AffiliationSummaryDTO {
  referralCode: string;
  affiliationCodes: AffiliationCodeDTO[];
  walletBalance: number;
}

// DTO pour les statistiques complètes d'affiliation et parrainage
export interface AffiliationStatsDTO {
  referralCode: string;
  totalReferrals: number;
  totalAffiliates: number;
  totalEarnings: number;
  referralEarnings: number;
  commissionEarnings: number;
  affiliationCodes: AffiliationCodeDTO[];
}

// Authentication API
export const authAPI = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    try {
      // Utiliser l'URL sans /v1 pour les nouveaux endpoints
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/auth/login`;

      // Logs détaillés du payload
      console.log("🔵 [AUTH API] ========================================");
      console.log("🔵 [AUTH API] Envoi de la requête de connexion");
      console.log("🔵 [AUTH API] ========================================");
      console.log("🔵 [AUTH API] Endpoint:", "/auth/login");
      console.log("🔵 [AUTH API] Base URL (sans /v1):", baseURLWithoutV1);
      console.log("🔵 [AUTH API] URL complète:", fullURL);
      console.log("🔵 [AUTH API] Méthode:", "POST");
      console.log("🔵 [AUTH API] Headers:", {
        "Content-Type": "application/json",
      });
      console.log("🔵 [AUTH API] Payload envoyé:", {
        email: payload.email,
        password: "***", // Masquer le mot de passe dans les logs
      });
      console.log(
        "🔵 [AUTH API] Payload complet (JSON):",
        JSON.stringify(
          {
            email: payload.email,
            password: "***",
          },
          null,
          2,
        ),
      );

      // Log du payload réel qui sera envoyé (pour débogage)
      const actualPayload = {
        email: payload.email,
        password: payload.password,
      };
      console.log(
        "🔵 [AUTH API] Payload réel qui sera envoyé au backend:",
        JSON.stringify(actualPayload, null, 2),
      );
      console.log("🔵 [AUTH API] ========================================");

      // Utiliser axios directement avec l'URL complète pour éviter le /v1
      // Timeout 60s pour le cold start Render (free tier)
      const response = await axios.post(fullURL, payload, {
        timeout: 60000,
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [AUTH API] ========================================");
      console.log("✅ [AUTH API] Réponse reçue du backend");
      console.log("✅ [AUTH API] ========================================");
      console.log("✅ [AUTH API] Status HTTP:", response.status);
      console.log("✅ [AUTH API] Status Text:", response.statusText);
      console.log("✅ [AUTH API] Headers de réponse:", response.headers);
      console.log(
        "✅ [AUTH API] Données reçues:",
        JSON.stringify(response.data, null, 2),
      );
      console.log("✅ [AUTH API] Token présent:", !!response.data?.token);
      if (response.data?.token) {
        console.log(
          "✅ [AUTH API] Token (premiers caractères):",
          response.data.token.substring(0, 20) + "...",
        );
      }
      console.log("✅ [AUTH API] ========================================");

      // Stocker le token dans l'instance axios pour les requêtes futures
      if (response.data.token) {
        api.defaults.headers.common["Authorization"] =
          `Bearer ${response.data.token}`;
      }

      return response.data;
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        stack?: string;
        response?: {
          status?: number;
          statusText?: string;
          headers?: unknown;
          data?: { message?: string; error?: string };
        };
        request?: unknown;
        code?: string;
        config?: {
          url?: string;
          method?: string;
          baseURL?: string;
        };
      };

      // Log détaillé de l'erreur
      console.error("❌ [AUTH API] Erreur lors de la connexion");
      console.error("❌ [AUTH API] Type d'erreur:", typeof error);
      console.error("❌ [AUTH API] Erreur complète:", error);
      console.error("❌ [AUTH API] Message:", errorObj?.message);
      console.error("❌ [AUTH API] Stack:", errorObj?.stack);

      if (errorObj.response) {
        console.error("❌ [AUTH API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          headers: errorObj.response.headers,
          data: errorObj.response.data,
        });
      } else if (errorObj.request) {
        console.error("❌ [AUTH API] Requête HTTP sans réponse:", {
          request: errorObj.request,
          code: errorObj.code,
          message: errorObj.message,
        });
      }

      const reqUrl = errorObj.config?.url;
      const reqBase = errorObj.config?.baseURL;
      const fullReqUrl =
        reqBase && reqUrl && !String(reqUrl).startsWith("http")
          ? `${String(reqBase).replace(/\/$/, "")}${String(reqUrl).startsWith("/") ? "" : "/"}${reqUrl}`
          : reqUrl || "N/A";
      console.error("❌ [AUTH API] Configuration de la requête:", {
        url: reqUrl,
        method: errorObj.config?.method,
        baseURL: reqBase,
        fullURL: fullReqUrl,
      });

      if (errorObj.response) {
        const status = errorObj.response.status;
        let errorMessage = "Erreur lors de la connexion";

        if (status === 401 || status === 403) {
          errorMessage = "Email ou mot de passe incorrect";
        } else if (status === 400 || status === 404) {
          errorMessage = errorObj.response.data?.message || "Données invalides";
        } else {
          errorMessage =
            errorObj.response.data?.message ||
            errorObj.response.data?.error ||
            "Erreur lors de la connexion";
        }

        throw new Error(errorMessage);
      }
      throw new Error("Erreur de connexion au serveur");
    }
  },

  logout: () => {
    console.log("🔴 [AUTH API] ========================================");
    console.log("🔴 [AUTH API] Déconnexion de l'utilisateur");
    console.log("🔴 [AUTH API] ========================================");

    try {
      // Supprimer le token (localStorage + Capacitor Preferences)
      storage.removeItem("authToken");
      console.log("🔴 [AUTH API] Token supprimé du storage");

      storage.removeItem("finalIsLoggedIn");
      storage.removeItem("finalUserType");
      storage.removeItem("userName");
      storage.removeItem("userEmail");
      storage.removeItem("userId");
      console.log(
        "🔴 [AUTH API] Données utilisateur supprimées du localStorage",
      );

      // Supprimer le header Authorization d'axios
      delete api.defaults.headers.common["Authorization"];
      console.log("🔴 [AUTH API] Header Authorization supprimé d'axios");

      // Vérifier que tout a bien été supprimé
      const remainingAuthToken = storage.getItem("authToken");
      const remainingIsLoggedIn = storage.getItem("finalIsLoggedIn");
      console.log("🔴 [AUTH API] Vérification après suppression:", {
        authToken: remainingAuthToken,
        finalIsLoggedIn: remainingIsLoggedIn,
      });

      // Déclencher plusieurs événements pour s'assurer que tout se met à jour
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("logout"));

      // Forcer une mise à jour en modifiant une valeur dans localStorage puis en la supprimant
      localStorage.setItem("logoutTrigger", Date.now().toString());
      localStorage.removeItem("logoutTrigger");
      window.dispatchEvent(new Event("storage"));

      console.log("🔴 [AUTH API] Événements storage et logout déclenchés");
      console.log("🔴 [AUTH API] Déconnexion terminée");
      console.log("🔴 [AUTH API] ========================================");
    } catch (error) {
      console.error("❌ [AUTH API] Erreur lors de la déconnexion:", error);
    }
  },

  signup: async (payload: SignupPayload | RegisterPayload) => {
    try {
      // Nouveau endpoint pour l'inscription locale
      const isNewRegisterPayload =
        "confirmPassword" in payload && !("type" in payload);

      if (isNewRegisterPayload) {
        // Utiliser le nouvel endpoint /api/users/register
        const registerPayload = payload as RegisterPayload;
        const baseURLWithoutV1 = getBaseURLWithoutV1();
        const fullURL = `${baseURLWithoutV1}/users/register`;

        console.log(
          "🔵 [AUTH API] Envoi de la requête d'inscription (nouveau format):",
          {
            endpoint: "/users/register",
            fullURL: fullURL,
            baseURL: baseURLWithoutV1,
            payload: {
              ...registerPayload,
              password: "***",
              confirmPassword: "***",
            },
          },
        );

        // Utiliser axios directement avec l'URL complète pour éviter le /v1
        const response = await axios.post(fullURL, registerPayload, {
          headers: {
            "Content-Type": "application/json",
            ...(storage.getItem("authToken")
              ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
              : {}),
          },
        });

        console.log("✅ [AUTH API] Inscription réussie:", {
          status: response.status,
          data: response.data,
        });

        return response.data;
      } else {
        // Ancien format pour compatibilité
        const fullURL = `${api.defaults.baseURL}/users/signup/unified`;
        console.log(
          "🔵 [AUTH API] Envoi de la requête d'inscription (ancien format):",
          {
            type: (payload as SignupPayload).type,
            endpoint: "/users/signup/unified",
            fullURL: fullURL,
            baseURL: api.defaults.baseURL,
            payload: { ...payload, password: "***", matchingPassword: "***" },
          },
        );

        const response = await api.post("/users/signup/unified", payload);

        console.log("✅ [AUTH API] Inscription réussie:", {
          status: response.status,
          data: response.data,
        });

        return response.data;
      }
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        stack?: string;
        response?: {
          status?: number;
          statusText?: string;
          headers?: unknown;
          data?: { message?: string; error?: string };
        };
        request?: unknown;
        code?: string;
        config?: {
          url?: string;
          method?: string;
          baseURL?: string;
        };
      };

      // Log détaillé de l'erreur
      console.error("❌ [AUTH API] Erreur lors de l'inscription");
      console.error("❌ [AUTH API] Type d'erreur:", typeof error);
      console.error("❌ [AUTH API] Erreur complète:", error);
      console.error("❌ [AUTH API] Message:", errorObj?.message);
      console.error("❌ [AUTH API] Stack:", errorObj?.stack);

      if (errorObj.response) {
        console.error("❌ [AUTH API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          headers: errorObj.response.headers,
          data: errorObj.response.data,
        });
      } else if (errorObj.request) {
        console.error("❌ [AUTH API] Requête HTTP sans réponse:", {
          request: errorObj.request,
          code: errorObj.code,
          message: errorObj.message,
        });
      }

      console.error("❌ [AUTH API] Configuration de la requête:", {
        url: errorObj.config?.url,
        method: errorObj.config?.method,
        baseURL: errorObj.config?.baseURL,
        fullURL: errorObj.config
          ? `${errorObj.config.baseURL}${errorObj.config.url}`
          : "N/A",
      });

      if (errorObj.response) {
        throw new Error(
          errorObj.response.data?.message ||
            errorObj.response.data?.error ||
            "Erreur lors de l'inscription",
        );
      }
      throw new Error("Erreur de connexion au serveur");
    }
  },

  // Connexion Google OAuth2
  googleOAuthSuccess: async (): Promise<LoginResponse> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/auth/oauth2/success`;
      console.log("🔵 [AUTH API] Récupération des infos utilisateur Google:", {
        endpoint: "/auth/oauth2/success",
        fullURL: fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [AUTH API] Connexion Google réussie:", {
        status: response.status,
        data: response.data,
      });

      // Stocker le token si présent
      if (response.data.token) {
        api.defaults.headers.common["Authorization"] =
          `Bearer ${response.data.token}`;
        if (typeof window !== "undefined") {
          storage.setItem("authToken", response.data.token);
        }
      }

      return response.data;
    } catch (error: unknown) {
      console.error("❌ [AUTH API] Erreur lors de la connexion Google:", error);
      throw error;
    }
  },
};

// Announcements API - Correspond au DTO Java AnnouncementDTO
export type PreferredGender = "FEMALE" | "MALE" | "NEUTRAL";
export type AgeRange =
  | "UNDER_12"
  | "FROM_12_TO_18"
  | "FROM_19_TO_25"
  | "FROM_26_TO_35"
  | "FROM_36_TO_45"
  | "FROM_46_TO_55"
  | "FROM_56_TO_65"
  | "FROM_66_TO_75"
  | "FROM_76_TO_85"
  | "FROM_86_TO_95"
  | "OVER_95";

export interface AnnouncementResponse {
  id?: string; // Optionnel pour la création, présent dans la réponse
  title: string;
  description: string;
  location: string;
  userType: string; // CLIENT, PROFESSIONAL, AGENCY, ENTERPRISE
  startDate: string; // ISO 8601 format (Instant en Java)
  endDate: string; // ISO 8601 format (Instant en Java)
  latitude?: number;
  longitude?: number;
  prestationType?: string;
  influencersNumber?: number;
  budget?: number; // BigDecimal en Java, number en TypeScript
  deposit?: number; // Caution (BigDecimal en Java, number en TypeScript)
  categoryId?: string;
  subCategoryId?: string;
  postedById: string;
  createdAt?: string; // ISO 8601 format (Instant en Java) - présent dans la réponse
  updatedAt?: string; // ISO 8601 format (Instant en Java) - présent dans la réponse
  status?: string; // OPEN, CLOSED, IN_PROGRESS, COMPLETED (AnnouncementStatus enum)
  preferredAgeRanges?: AgeRange[];
  preferredGender?: PreferredGender;
}

export interface AnnouncementsListResponse {
  announcements: AnnouncementResponse[];
  total?: number;
  limit?: number;
}

export const announcementsAPI = {
  getById: async (id: string): Promise<AnnouncementResponse | null> => {
    try {
      const endpoint = `/announcements/${encodeURIComponent(id)}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [ANNOUNCEMENTS API] Récupération d'une annonce par ID:", {
        id,
        endpoint,
        fullURL,
      });

      const response = await api.get(endpoint);

      console.log("✅ [ANNOUNCEMENTS API] Annonce récupérée:", {
        status: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [ANNOUNCEMENTS API] Erreur lors de la récupération de l'annonce",
      );
      console.error("❌ [ANNOUNCEMENTS API] Type d'erreur:", typeof error);
      console.error("❌ [ANNOUNCEMENTS API] Erreur complète:", error);
      console.error("❌ [ANNOUNCEMENTS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [ANNOUNCEMENTS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });

        // Si l'annonce n'est pas trouvée (404), retourner null
        if (errorObj.response.status === 404) {
          console.log(
            "⚠️ [ANNOUNCEMENTS API] Annonce non trouvée, retour de null",
          );
          return null;
        }
      }

      // En cas d'erreur, retourner null
      return null;
    }
  },

  getByUserId: async (userId: string): Promise<AnnouncementResponse[]> => {
    try {
      const endpoint = `/announcements/by-user?postedById=${encodeURIComponent(
        userId,
      )}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log(
        "🔵 [ANNOUNCEMENTS API] Récupération des annonces de l'utilisateur:",
        {
          userId,
          endpoint,
          fullURL,
        },
      );

      const response = await api.get(endpoint);

      console.log(
        "✅ [ANNOUNCEMENTS API] Annonces de l'utilisateur récupérées:",
        {
          status: response.status,
          count: Array.isArray(response.data) ? response.data.length : 0,
          data: response.data,
        },
      );

      // La réponse est directement un tableau d'annonces
      if (Array.isArray(response.data)) {
        return response.data;
      }

      // En cas de réponse non-tableau, retourner un tableau vide
      return [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: {
          status?: number;
          statusText?: string;
          data?: { message?: string };
        };
      };
      console.error(
        "❌ [ANNOUNCEMENTS API] Erreur lors de la récupération des annonces de l'utilisateur",
      );
      console.error("❌ [ANNOUNCEMENTS API] Type d'erreur:", typeof error);
      console.error("❌ [ANNOUNCEMENTS API] Erreur complète:", error);
      console.error("❌ [ANNOUNCEMENTS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [ANNOUNCEMENTS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      // En cas d'erreur, retourner un tableau vide plutôt que de throw
      // Cela permet d'afficher le message marketing si pas d'annonces
      return [];
    }
  },

  create: async (
    announcement: AnnouncementResponse,
  ): Promise<AnnouncementResponse> => {
    try {
      const endpoint = `/announcements`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [ANNOUNCEMENTS API] Création d'une annonce:", {
        endpoint,
        fullURL,
        announcement,
      });

      const response = await api.post(endpoint, announcement);

      console.log("✅ [ANNOUNCEMENTS API] Annonce créée:", {
        status: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error: unknown) {
      console.error(
        "❌ [ANNOUNCEMENTS API] Erreur lors de la création de l'annonce",
      );
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [ANNOUNCEMENTS API] Type d'erreur:", typeof error);
      console.error("❌ [ANNOUNCEMENTS API] Erreur complète:", error);
      console.error("❌ [ANNOUNCEMENTS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [ANNOUNCEMENTS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  update: async (
    id: string,
    announcement: Partial<AnnouncementResponse>,
  ): Promise<AnnouncementResponse> => {
    try {
      const endpoint = `/announcements/${encodeURIComponent(id)}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [ANNOUNCEMENTS API] Modification d'une annonce:", {
        id,
        endpoint,
        fullURL,
        announcement,
      });

      const response = await api.put(endpoint, announcement);

      console.log("✅ [ANNOUNCEMENTS API] Annonce modifiée:", {
        status: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error: unknown) {
      console.error(
        "❌ [ANNOUNCEMENTS API] Erreur lors de la modification de l'annonce",
      );
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [ANNOUNCEMENTS API] Type d'erreur:", typeof error);
      console.error("❌ [ANNOUNCEMENTS API] Erreur complète:", error);
      console.error("❌ [ANNOUNCEMENTS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [ANNOUNCEMENTS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      const endpoint = `/announcements/${encodeURIComponent(id)}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [ANNOUNCEMENTS API] Suppression d'une annonce:", {
        id,
        endpoint,
        fullURL,
      });

      const response = await api.delete(endpoint);

      console.log("✅ [ANNOUNCEMENTS API] Annonce supprimée:", {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      // Vérifier que la réponse est correcte (le backend retourne "Deleted")
      if (
        response.status === 200 &&
        (response.data === "Deleted" || response.data === "Deleted\n")
      ) {
        console.log(
          "✅ [ANNOUNCEMENTS API] Suppression confirmée par le backend",
        );
      }
    } catch (error: unknown) {
      console.error(
        "❌ [ANNOUNCEMENTS API] Erreur lors de la suppression de l'annonce",
      );
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [ANNOUNCEMENTS API] Type d'erreur:", typeof error);
      console.error("❌ [ANNOUNCEMENTS API] Erreur complète:", error);
      console.error("❌ [ANNOUNCEMENTS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [ANNOUNCEMENTS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  getLatest: async (limit: number = 10): Promise<AnnouncementResponse[]> => {
    try {
      const endpoint = `/announcements?limit=${limit}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log(
        "🔵 [ANNOUNCEMENTS API] Récupération des dernières annonces:",
        {
          limit,
          endpoint,
          fullURL,
          baseURL: api.defaults.baseURL,
        },
      );

      const response = await api.get(endpoint);

      console.log("✅ [ANNOUNCEMENTS API] Annonces récupérées:", {
        status: response.status,
        count: Array.isArray(response.data)
          ? response.data.length
          : response.data?.announcements?.length || 0,
        data: response.data,
      });

      // Si la réponse est directement un tableau
      if (Array.isArray(response.data)) {
        return response.data;
      }

      // Si la réponse est un objet avec une propriété announcements
      if (response.data?.announcements) {
        return response.data.announcements;
      }

      // Sinon retourner un tableau vide
      return [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [ANNOUNCEMENTS API] Erreur lors de la récupération des annonces",
      );
      console.error("❌ [ANNOUNCEMENTS API] Type d'erreur:", typeof error);
      console.error("❌ [ANNOUNCEMENTS API] Erreur complète:", error);
      console.error("❌ [ANNOUNCEMENTS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [ANNOUNCEMENTS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      // En cas d'erreur, retourner un tableau vide plutôt que de throw
      // Cela permet d'afficher le message marketing si pas d'annonces
      return [];
    }
  },

  getLatestExcludingUser: async (
    excludePostedById: string,
    limit: number = 5,
  ): Promise<AnnouncementResponse[]> => {
    try {
      const endpoint = `/announcements/latest?excludePostedById=${encodeURIComponent(
        excludePostedById,
      )}&limit=${limit}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log(
        "🔵 [ANNOUNCEMENTS API] Récupération des dernières annonces (excluant l'utilisateur):",
        {
          excludePostedById,
          limit,
          endpoint,
          fullURL,
          baseURL: api.defaults.baseURL,
        },
      );

      const response = await api.get(endpoint);

      console.log(
        "✅ [ANNOUNCEMENTS API] Annonces récupérées (excluant l'utilisateur):",
        {
          status: response.status,
          count: Array.isArray(response.data)
            ? response.data.length
            : response.data?.announcements?.length || 0,
          data: response.data,
        },
      );

      // Si la réponse est directement un tableau
      if (Array.isArray(response.data)) {
        return response.data;
      }

      // Si la réponse est un objet avec une propriété announcements
      if (response.data?.announcements) {
        return response.data.announcements;
      }

      // Sinon retourner un tableau vide
      return [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [ANNOUNCEMENTS API] Erreur lors de la récupération des annonces (excluant l'utilisateur)",
      );
      console.error("❌ [ANNOUNCEMENTS API] Type d'erreur:", typeof error);
      console.error("❌ [ANNOUNCEMENTS API] Erreur complète:", error);
      console.error("❌ [ANNOUNCEMENTS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [ANNOUNCEMENTS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      // En cas d'erreur, retourner un tableau vide plutôt que de throw
      return [];
    }
  },

  apply: async (
    announcementId: string,
    applicationData: {
      message: string;
      price?: number;
      photos?: File[];
      videos?: File[];
    },
  ): Promise<unknown> => {
    try {
      const endpoint = `/announcements/${encodeURIComponent(
        announcementId,
      )}/applications`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [ANNOUNCEMENTS API] Soumission d'une candidature:", {
        announcementId,
        endpoint,
        fullURL,
        applicationData,
      });

      // Créer FormData pour envoyer les fichiers
      const formData = new FormData();
      formData.append("message", applicationData.message);

      if (applicationData.price !== undefined) {
        formData.append("price", applicationData.price.toString());
      }

      // Ajouter les photos
      if (applicationData.photos && applicationData.photos.length > 0) {
        applicationData.photos.forEach((photo) => {
          formData.append(`photos`, photo);
        });
      }

      // Ajouter les vidéos
      if (applicationData.videos && applicationData.videos.length > 0) {
        applicationData.videos.forEach((video) => {
          formData.append(`videos`, video);
        });
      }

      const response = await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("✅ [ANNOUNCEMENTS API] Candidature soumise:", {
        status: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error: unknown) {
      console.error(
        "❌ [ANNOUNCEMENTS API] Erreur lors de la soumission de la candidature",
      );
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [ANNOUNCEMENTS API] Type d'erreur:", typeof error);
      console.error("❌ [ANNOUNCEMENTS API] Erreur complète:", error);
      console.error("❌ [ANNOUNCEMENTS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [ANNOUNCEMENTS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  getCurrent: async (): Promise<AnnouncementResponse[]> => {
    try {
      const endpoint = `/announcements/current`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log(
        "🔵 [ANNOUNCEMENTS API] Récupération des annonces courantes (non fermées):",
        {
          endpoint,
          fullURL,
          baseURL: api.defaults.baseURL,
        },
      );

      const response = await api.get(endpoint);

      console.log("✅ [ANNOUNCEMENTS API] Annonces courantes récupérées:", {
        status: response.status,
        count: Array.isArray(response.data) ? response.data.length : 0,
        data: response.data,
      });

      // Si la réponse est directement un tableau
      if (Array.isArray(response.data)) {
        return response.data;
      }

      // Sinon retourner un tableau vide
      return [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [ANNOUNCEMENTS API] Erreur lors de la récupération des annonces courantes",
      );
      console.error("❌ [ANNOUNCEMENTS API] Type d'erreur:", typeof error);
      console.error("❌ [ANNOUNCEMENTS API] Erreur complète:", error);
      console.error("❌ [ANNOUNCEMENTS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [ANNOUNCEMENTS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      return [];
    }
  },
};

// Dashboard API - Correspond aux DTOs Java
// Enums correspondant aux enums Java
export type GenderEnum = "MALE" | "FEMALE" | "OTHER" | "NEUTRAL";
export type ProviderEnum = "LOCAL" | "GOOGLE" | "FACEBOOK" | "GITHUB";
export type UserEnum = "CLIENT" | "PROFESSIONAL" | "AGENCY" | "ENTERPRISE";
export type SubscriptionEnum = "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE";
export type AccountStatusEnum = "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
export type OrganizationType = "AGENCY" | "ENTERPRISE" | "OTHER";

// DTOs de base
export interface PhotoDTO {
  id?: string;
  url?: string;
  [key: string]: unknown;
}

export interface AddressDTO {
  id?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  [key: string]: unknown;
}

export interface ReviewUserDTO {
  id?: string;
  averageRating?: number;
  totalReviews?: number;
  [key: string]: unknown;
}

export interface RoleDTO {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

export interface UserPreferenceDTO {
  [key: string]: unknown;
}

export interface DocumentDTO {
  id?: string;
  [key: string]: unknown;
}

export interface SubCategoryDTO {
  id: string;
  name: string;
  description?: string;
}

export interface CategoryDTO {
  id: string;
  name: string;
  description?: string;
  subCategories: SubCategoryDTO[];
}

export interface UserProfileCategoryDTO {
  id?: string; // OPTIONAL - si fourni, on met à jour l'enregistrement existant
  userId?: string;
  categoryId: string; // REQUIRED pour lier la catégorie
  subCategoryIds?: string[]; // Liste d'ids de sous-catégories (optionnel)
}

// Chat/Conversations DTOs
// MessageDTO pour le système de messagerie basé sur les biens (Place)
export interface MessageDTO {
  id: number | string;
  senderId: number | string;
  senderName?: string;
  senderRole?: 'HOST' | 'GUEST'; // Rôle de l'expéditeur (pour affichage badge)
  receiverId: number | string;
  receiverName?: string;
  placeId: number;
  placeName?: string;
  content: string;
  timestamp: string; // ISO 8601 format (ex: "2026-01-16T18:30:00")
  isRead: boolean;
  // Champs de compatibilité pour l'ancien système
  conversationId?: string;
  recipientId?: number | string; // Alias pour receiverId
  createdAt?: string; // Alias pour timestamp
  clientMessageId?: string;
  status?: "SENDING" | "SENT" | "READ" | "FAILED";
}

export interface ConversationDTO {
  id: string;
  subject?: string;
  participantIds: string[];
  messages?: MessageDTO[];
  createdAt: string; // ISO 8601 format
  senderId?: string;
  recipientId?: string;
  content?: string;
  timestamp?: string;
  documentIds?: string[];
  readByRecipient?: boolean;
  chatRoomId?: string;
  tokenRecipient?: string[];
  // Enriched display fields
  clientName?: string;
  clientPicture?: string;
  proName?: string;
  proPicture?: string;
  senderName?: string;
}

export interface OrganizationDTO {
  id?: string;
  type?: OrganizationType;
  name?: string;
  siretNumber?: string;
  vatNumber?: string;
  website?: string;
  members?: UserDTO[];
  [key: string]: unknown;
}

export interface StatsClientDTO {
  [key: string]: unknown;
}

export interface SettingsDTO {
  [key: string]: unknown;
}

// UserDTO complet basé sur le modèle Java User
export interface UserDTO {
  // Champs de base
  id?: string | number;
  uid?: string;
  socialType?: string;
  firstName?: string;
  lastName?: string;
  lastNameMarried?: string;
  email?: string;
  username?: string;
  password?: string; // Ne devrait pas être retourné par l'API, mais présent dans le modèle
  profile?: string;
  datePassword?: string;
  phoneNumber?: string;
  birthdate?: string; // ISO 8601 format (Instant en Java)
  birthCity?: string;
  creationDate?: string; // ISO 8601 format (Instant en Java)
  updateDate?: string; // ISO 8601 format (Instant en Java)
  gender?: GenderEnum;
  type?: UserEnum;
  providerEnum?: ProviderEnum;
  active?: boolean;
  createdAt?: string; // ISO 8601 format (Instant in Java)

  // Adresse postale
  address?: string; // Adresse (rue et numéro)
  city?: string; // Ville
  zipCode?: string; // Code postal

  // Relations DBRef (lazy loaded)
  addressDTO?: AddressDTO; // Ancien champ address renommé pour éviter conflit
  reviewUser?: ReviewUserDTO;
  photo?: PhotoDTO;
  userPreference?: UserPreferenceDTO;
  roles?: RoleDTO[];
  chatRooms?: unknown[]; // List<ChatRoom>
  messages?: unknown[]; // List<Message>

  // Champs de statut
  enabled?: boolean;
  emailVerified?: boolean;
  isVerified?: boolean;
  verificationCode?: string;
  verificationExpiry?: string; // ISO 8601 format
  passwordResetToken?: string;
  tokenExpiry?: string; // ISO 8601 format
  tokens?: string[];
  profileFilled?: boolean;

  // Organisation
  organization?: OrganizationDTO;
  organizationRole?: string;
  influenceurRole?: string;

  // Documents
  documentsAsPro?: DocumentDTO[];
  documentsAsClient?: DocumentDTO[];

  // Catégories de profil
  userProfileCategories?: UserProfileCategoryDTO[];

  // Récupération
  recoveryEmail?: string;
  recoveryPhoneNumber?: string;

  // Featured
  isFeatured?: boolean;

  // Favoris
  favoritesPro?: UserDTO[];

  // Parrainage et affiliation (retournés par GET /api/users/{userId})
  referralCode?: string;
  /** Montant total gagné en bons de parrainage depuis le début (cumul historique) */
  totalEarnedReferralAmount?: number;
  /** Montant des bons actuellement utilisables (non utilisés et non expirés) */
  pendingReferralAmount?: number;
  affiliationCodes?: Array<{ id: number; code: string; description: string; userId?: number }>;
  /** Montant total dépensé sur la plateforme (retourné par getReferrals / getAffiliates) */
  cumulativePurchaseVolume?: number;

  // Préférences de notification (activées par défaut à true)
  emailNotificationBooking?: boolean;
  emailNotificationMessage?: boolean;
  emailNotificationPromotion?: boolean;
  pushNotificationBooking?: boolean;
  pushNotificationMessage?: boolean;

  [key: string]: unknown; // Pour les autres champs
}

// ProfessionalDTO basé sur le modèle Java Professional extends User
export interface ProfessionalDTO extends UserDTO {
  subscriptionEnum?: SubscriptionEnum;
  bankInformations?: BankInformationDTO[];
  professionalCard?: ProfessionalCardDTO;
  settings?: SettingsDTO;
  invitationSent?: boolean;
  invitationSentDate?: number; // Long en Java
  accountStatus?: AccountStatusEnum;
  professionalCardId?: string;
}

// ClientDTO basé sur le modèle Java Client extends User
export interface ClientDTO extends UserDTO {
  invitationSent?: boolean;
  invitationSentDate?: number; // Long en Java
  accountStatus?: AccountStatusEnum;
  statsClient?: StatsClientDTO;
}

// AgencyDTO basé sur le modèle Java Agency extends User
export interface AgencyDTO extends UserDTO {
  agencyName?: string;
  contactPerson?: string;
  website?: string;
  vatNumber?: string;
}

// EnterpriseDTO basé sur le modèle Java Enterprise extends User
export interface EnterpriseDTO extends UserDTO {
  companyName?: string;
  siretNumber?: string;
  vatNumber?: string;
  contactPerson?: string;
  website?: string;
}

export interface UserSettingsDTO {
  recoveryEmail?: string;
  recoveryPhoneNumber?: string;
}

export interface ResetPasswordDTO {
  email: string;
  password: string; // Nouveau mot de passe
  matchingPassword: string; // Confirmation du nouveau mot de passe
  token?: string; // Token pour réinitialisation (optionnel pour modification depuis settings)
  currentPassword?: string; // Mot de passe actuel pour le changement de mot de passe depuis settings
}

// Application (Candidature) DTO - Correspond au ApplicationDTO Java
export interface ApplicationDTO {
  id?: string;
  announcementId?: string;
  applicantId?: string;
  message?: string;
  mediaUrls?: string[];
  photos?: string[];
  videos?: string[];
  price?: number;
  status?: "PENDING" | "ACCEPTED" | "REJECTED"; // ApplicationStatus enum
  createdAt?: string;
  updatedAt?: string;
}

export interface RecommendationDTO {
  user: UserDTO;
  score: number;
  reasonSummary: string;
}

export interface DashboardSummaryDTO {
  hasNewMessages: boolean;
  pendingQuotesCount: number;
  recommendations: RecommendationDTO[];
}

export const dashboardAPI = {
  getSummary: async (
    userId: string,
    recLimit: number = 6,
  ): Promise<DashboardSummaryDTO> => {
    try {
      const endpoint = `/dashboard/summary?userId=${encodeURIComponent(
        userId,
      )}&recLimit=${recLimit}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [DASHBOARD API] Récupération du résumé du dashboard:", {
        userId,
        recLimit,
        endpoint,
        fullURL,
      });

      const response = await api.get(endpoint);

      console.log("✅ [DASHBOARD API] Résumé récupéré:", {
        status: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error: unknown) {
      console.error(
        "❌ [DASHBOARD API] Erreur lors de la récupération du résumé",
      );
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [DASHBOARD API] Type d'erreur:", typeof error);
      console.error("❌ [DASHBOARD API] Erreur complète:", error);
      console.error("❌ [DASHBOARD API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [DASHBOARD API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      // Retourner des valeurs par défaut en cas d'erreur
      return {
        hasNewMessages: false,
        pendingQuotesCount: 0,
        recommendations: [],
      };
    }
  },
};

// Favorites API - Correspond au DTO Java ProfessionalDTO
export interface ProfessionalCardDTO {
  title?: string;
  description?: string;
  price?: number;
  [key: string]: unknown;
}

export interface BankInformationDTO {
  id?: string;
  iban?: string;
  bic?: string;
  [key: string]: unknown;
}

// ProfessionalDTO est déjà défini plus haut avec toutes les propriétés
// Cette interface est maintenant redondante, mais on garde BankInformationDTO et ProfessionalCardDTO ici

// Fonction helper pour mapper le type frontend vers le type backend
const mapFavoriteTypeToBackend = (
  type: "establishment" | "influencer" | "agent",
): string => {
  const mapping: { [key: string]: string } = {
    influencer: "PROFESSIONAL", // ou 'INFLUENCER' selon le backend
    establishment: "CLIENT", // ou 'ENTERPRISE' selon le contexte
    agent: "AGENCY",
  };
  return mapping[type] || "PROFESSIONAL";
};

export const favoritesAPI = {
  // Récupération des favoris - utilise /users/{userId}/favorites
  // Note: Cette API est pour l'ancien système (professionnels/influenceurs)
  // Pour les places Rentoall, utiliser rentoallFavoritesAPI
  getFavorites: async (userId: string): Promise<ProfessionalDTO[]> => {
    try {
      // Pour l'instant, retourner un tableau vide car cette API n'est plus utilisée
      // Le système Rentoall utilise rentoallFavoritesAPI pour les places
      console.log(
        "⚠️ [FAVORITES API] getFavorites appelé mais non implémenté pour Rentoall",
      );
      console.log(
        "💡 Utilisez rentoallFavoritesAPI.getFavorites pour les places",
      );

      // Retourner un tableau vide pour éviter les erreurs
      return [];
    } catch (error: unknown) {
      console.error(
        "❌ [FAVORITES API] Erreur lors de la récupération des favoris",
      );
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [FAVORITES API] Type d'erreur:", typeof error);
      console.error("❌ [FAVORITES API] Erreur complète:", error);
      console.error("❌ [FAVORITES API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [FAVORITES API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      // En cas d'erreur, retourner un tableau vide
      return [];
    }
  },

  // Ajout d'un favori - utilise /users/{userId}/favorites/{targetId}?type={type}
  addFavorite: async (
    userId: string,
    favoriteId: string,
    favoriteType?: "establishment" | "influencer" | "agent",
    isClient: boolean = false,
  ): Promise<void> => {
    try {
      // URL: /users/{userId}/favorites/{targetId} où userId est l'utilisateur connecté et targetId est l'utilisateur à ajouter
      let endpoint = `/users/${encodeURIComponent(
        userId,
      )}/favorites/${encodeURIComponent(favoriteId)}`;

      if (favoriteType) {
        const backendType = mapFavoriteTypeToBackend(favoriteType);
        endpoint += `?type=${encodeURIComponent(backendType)}`;
      }

      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [FAVORITES API] Ajout d'un favori:", {
        userId,
        favoriteId,
        favoriteType,
        backendType: favoriteType
          ? mapFavoriteTypeToBackend(favoriteType)
          : undefined,
        isClient,
        endpoint,
        fullURL,
      });

      // Utiliser POST pour ajouter un favori
      const response = await api.post(endpoint);

      console.log("✅ [FAVORITES API] Favori ajouté:", {
        status: response.status,
        data: response.data,
      });
    } catch (error: unknown) {
      console.error("❌ [FAVORITES API] Erreur lors de l'ajout du favori");
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [FAVORITES API] Type d'erreur:", typeof error);
      console.error("❌ [FAVORITES API] Erreur complète:", error);
      console.error("❌ [FAVORITES API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [FAVORITES API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  // Suppression d'un favori - utilise /users/{userId}/favorites/{targetId}
  removeFavorite: async (
    userId: string,
    favoriteId: string,
    favoriteType?: "establishment" | "influencer" | "agent",
    isClient: boolean = false,
  ): Promise<void> => {
    try {
      // URL: /users/{userId}/favorites/{targetId} où userId est l'utilisateur propriétaire et targetId est l'utilisateur à retirer
      let endpoint = `/users/${encodeURIComponent(
        userId,
      )}/favorites/${encodeURIComponent(favoriteId)}`;

      if (favoriteType) {
        const backendType = mapFavoriteTypeToBackend(favoriteType);
        endpoint += `?type=${encodeURIComponent(backendType)}`;
      }

      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [FAVORITES API] Suppression d'un favori:", {
        userId,
        favoriteId,
        favoriteType,
        backendType: favoriteType
          ? mapFavoriteTypeToBackend(favoriteType)
          : undefined,
        isClient,
        endpoint,
        fullURL,
      });

      // Utiliser DELETE pour supprimer un favori
      const response = await api.delete(endpoint);

      console.log("✅ [FAVORITES API] Favori supprimé:", {
        status: response.status,
        data: response.data,
      });
    } catch (error: unknown) {
      console.error(
        "❌ [FAVORITES API] Erreur lors de la suppression du favori",
      );
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [FAVORITES API] Type d'erreur:", typeof error);
      console.error("❌ [FAVORITES API] Erreur complète:", error);
      console.error("❌ [FAVORITES API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [FAVORITES API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },
};

// Stats API - Correspond aux DTOs Java
export interface TypeStatDTO {
  type: string;
  count: number;
  percent: number;
}

export interface CityStatDTO {
  city: string;
  count: number;
}

export interface PunchlineDTO {
  userId: string;
  totalPrestations: number;
  totalRevenue: number; // BigDecimal en Java, number en TypeScript
  uniqueClients: number;
  typeDistribution: TypeStatDTO[];
  cityDistribution: CityStatDTO[];
}

export const statsAPI = {
  getPunchline: async (userId: string): Promise<PunchlineDTO | null> => {
    try {
      // Le controller Java est à /api/stats (sans /v1), donc on utilise l'URL complète
      // En remplaçant /api/v1 par /api dans le baseURL
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const endpoint = `/stats/users/${encodeURIComponent(userId)}/punchline`;
      const fullURL = `${baseURLWithoutV1}${endpoint}`;

      console.log("🔵 [STATS API] Récupération des statistiques:", {
        userId,
        endpoint,
        baseURL: api.defaults.baseURL,
        baseURLWithoutV1,
        fullURL,
      });

      // Utiliser axios directement avec l'URL complète pour éviter le baseURL
      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? {
                Authorization: `Bearer ${storage.getItem("authToken")}`,
              }
            : {}),
        },
      });

      console.log("✅ [STATS API] Statistiques récupérées:", {
        status: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error: unknown) {
      console.error(
        "❌ [STATS API] Erreur lors de la récupération des statistiques",
      );
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [STATS API] Type d'erreur:", typeof error);
      console.error("❌ [STATS API] Erreur complète:", error);
      console.error("❌ [STATS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [STATS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });

        // Si l'utilisateur n'est pas trouvé (404), retourner null plutôt qu'une erreur
        if (errorObj.response.status === 404) {
          console.log("⚠️ [STATS API] Utilisateur non trouvé, retour de null");
          return null;
        }
      }

      // En cas d'erreur, retourner null
      return null;
    }
  },
};

// Quotes API - Correspond au DTO Java QuoteDTO
export interface QuoteDTO {
  id?: string; // Optionnel pour la création, présent dans la réponse
  title: string;
  description?: string;
  price: number; // BigDecimal en Java, number en TypeScript
  deliveryTime?: string; // Backend utilise deliveryTime
  duration?: string; // Alias pour compatibilité frontend
  createdById?: string; // Backend utilise createdById
  creatorId?: string; // Alias pour compatibilité frontend
  recipientId: string;
  status?: string; // PENDING, ACCEPTED, REJECTED, etc.
  createdAt?: string; // ISO 8601 format
  acceptedAt?: string; // ISO 8601 format
  updatedAt?: string; // ISO 8601 format
  [key: string]: unknown; // Pour les autres champs du QuoteDTO
}

export const quotesAPI = {
  create: async (
    quote: Omit<QuoteDTO, "id" | "createdAt" | "updatedAt" | "acceptedAt">,
  ): Promise<QuoteDTO> => {
    try {
      const endpoint = `/quotes`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      // Mapper les champs frontend vers backend
      const backendQuote: Record<string, unknown> = {
        title: quote.title,
        description: quote.description,
        price: quote.price,
        deliveryTime: quote.deliveryTime || quote.duration, // Utiliser deliveryTime pour le backend
        createdById: quote.createdById || quote.creatorId, // Utiliser createdById pour le backend
        recipientId: quote.recipientId,
        status: quote.status,
      };

      console.log("🔵 [QUOTES API] Création d'un devis:", {
        endpoint,
        fullURL,
        quoteFrontend: quote,
        quoteBackend: backendQuote,
      });

      const response = await api.post(endpoint, backendQuote);

      console.log("✅ [QUOTES API] Devis créé:", {
        status: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error: unknown) {
      console.error("❌ [QUOTES API] Erreur lors de la création du devis");
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [QUOTES API] Type d'erreur:", typeof error);
      console.error("❌ [QUOTES API] Erreur complète:", error);
      console.error("❌ [QUOTES API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [QUOTES API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  getByCreator: async (creatorId: string): Promise<QuoteDTO[]> => {
    try {
      const endpoint = `/quotes/by-creator?createdById=${encodeURIComponent(
        creatorId,
      )}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log(
        "🔵 [QUOTES API] ===== DÉBUT RÉCUPÉRATION DEVIS CRÉATEUR =====",
      );
      console.log("🔵 [QUOTES API] Paramètres:", {
        creatorId,
        creatorIdEncoded: encodeURIComponent(creatorId),
        endpoint,
        baseURL: api.defaults.baseURL,
        fullURL,
      });
      console.log("🔵 [QUOTES API] Headers:", {
        authorization: api.defaults.headers.common["Authorization"]
          ? "Présent"
          : "Absent",
        contentType: api.defaults.headers.common["Content-Type"],
      });

      const response = await api.get(endpoint);

      console.log("✅ [QUOTES API] Réponse reçue:", {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        count: Array.isArray(response.data) ? response.data.length : "N/A",
        data: response.data,
      });

      if (Array.isArray(response.data)) {
        console.log("✅ [QUOTES API] Retour de", response.data.length, "devis");
        console.log(
          "✅ [QUOTES API] ===== FIN RÉCUPÉRATION DEVIS CRÉATEUR (SUCCÈS) =====",
        );
        return response.data;
      }

      console.warn("⚠️ [QUOTES API] La réponse n'est pas un tableau:", {
        data: response.data,
        dataType: typeof response.data,
      });
      console.log(
        "✅ [QUOTES API] ===== FIN RÉCUPÉRATION DEVIS CRÉATEUR (TABLEAU VIDE) =====",
      );
      return [];
    } catch (error: unknown) {
      console.error(
        "❌ [QUOTES API] ===== ERREUR RÉCUPÉRATION DEVIS CRÉATEUR =====",
      );
      const errorObj = error as {
        message?: string;
        stack?: string;
        request?: unknown;
        config?: { url?: string; method?: string };
        response?: {
          status?: number;
          statusText?: string;
          headers?: unknown;
          data?: unknown;
          config?: { url?: string; method?: string };
        };
      };
      console.error("❌ [QUOTES API] Type d'erreur:", typeof error);
      console.error("❌ [QUOTES API] Erreur complète:", error);
      console.error("❌ [QUOTES API] Message:", errorObj?.message);
      console.error("❌ [QUOTES API] Stack:", errorObj?.stack);

      if (errorObj.response) {
        console.error("❌ [QUOTES API] Réponse HTTP d'erreur:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          headers: errorObj.response.headers,
          data: errorObj.response.data,
          url: errorObj.response?.config?.url,
          method: errorObj.response?.config?.method,
        });
      } else if (errorObj.request) {
        console.error("❌ [QUOTES API] Requête envoyée mais pas de réponse:", {
          request: errorObj.request,
          url: errorObj.config?.url,
          method: errorObj.config?.method,
        });
      }

      console.error(
        "❌ [QUOTES API] ===== FIN ERREUR RÉCUPÉRATION DEVIS CRÉATEUR =====",
      );
      return [];
    }
  },

  getByRecipient: async (recipientId: string): Promise<QuoteDTO[]> => {
    try {
      const endpoint = `/quotes/recipient?recipientId=${encodeURIComponent(
        recipientId,
      )}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [QUOTES API] Récupération des devis du destinataire:", {
        recipientId,
        endpoint,
        fullURL,
      });

      const response = await api.get(endpoint);

      console.log("✅ [QUOTES API] Devis récupérés:", {
        status: response.status,
        count: Array.isArray(response.data) ? response.data.length : 0,
        data: response.data,
      });

      if (Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error: unknown) {
      console.error("❌ [QUOTES API] Erreur lors de la récupération des devis");
      return [];
    }
  },

  getById: async (id: string): Promise<QuoteDTO | null> => {
    try {
      const endpoint = `/quotes/${encodeURIComponent(id)}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [QUOTES API] Récupération d'un devis par ID:", {
        id,
        endpoint,
        fullURL,
      });

      const response = await api.get(endpoint);

      console.log("✅ [QUOTES API] Devis récupéré:", {
        status: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error: unknown) {
      console.error("❌ [QUOTES API] Erreur lors de la récupération du devis");
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [QUOTES API] Type d'erreur:", typeof error);
      console.error("❌ [QUOTES API] Erreur complète:", error);
      console.error("❌ [QUOTES API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [QUOTES API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });

        // Si le devis n'est pas trouvé (404), retourner null
        if (errorObj.response.status === 404) {
          console.log("⚠️ [QUOTES API] Devis non trouvé, retour de null");
          return null;
        }
      }

      // En cas d'erreur, retourner null
      return null;
    }
  },

  updateStatus: async (
    quoteId: string,
    status:
      | "PENDING"
      | "ACCEPTED"
      | "REJECTED"
      | "IN_PROGRESS"
      | "PAST"
      | "VALIDATED",
    actorId?: string,
  ): Promise<QuoteDTO> => {
    try {
      let endpoint = `/quotes/${encodeURIComponent(
        quoteId,
      )}/status?status=${status}`;
      if (actorId) {
        endpoint += `&actorId=${encodeURIComponent(actorId)}`;
      }
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [QUOTES API] Mise à jour du statut du devis:", {
        quoteId,
        status,
        actorId,
        endpoint,
        fullURL,
      });

      const response = await api.patch(endpoint);

      console.log("✅ [QUOTES API] Statut du devis mis à jour:", {
        status: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error: unknown) {
      console.error(
        "❌ [QUOTES API] Erreur lors de la mise à jour du statut du devis",
      );
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [QUOTES API] Type d'erreur:", typeof error);
      console.error("❌ [QUOTES API] Erreur complète:", error);
      console.error("❌ [QUOTES API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [QUOTES API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },
};

// Fonction helper pour mapper les données brutes du backend vers les DTOs TypeScript
const mapUserFromBackend = (
  data: unknown,
): UserDTO | ProfessionalDTO | ClientDTO | AgencyDTO | EnterpriseDTO => {
  if (!data) {
    throw new Error("Data is required");
  }

  // Caster data en Record<string, unknown> pour accéder aux propriétés
  const dataObj = data as Record<string, unknown>;

  // Mapper les champs de base
  const baseUser: UserDTO = {
    id: dataObj.id as string,
    uid: dataObj.uid as string,
    socialType: dataObj.socialType as string,
    firstName: dataObj.firstName as string,
    lastName: dataObj.lastName as string,
    lastNameMarried: dataObj.lastNameMarried as string | undefined,
    email: dataObj.email as string,
    username: dataObj.username as string,
    profile: dataObj.profile as string | undefined,
    datePassword: dataObj.datePassword as string | undefined,
    phoneNumber: dataObj.phoneNumber as string | undefined,
    birthdate: dataObj.birthdate as string | undefined,
    birthCity: dataObj.birthCity as string | undefined,
    creationDate: dataObj.creationDate as string | undefined,
    updateDate: dataObj.updateDate as string | undefined,
    gender: dataObj.gender as GenderEnum | undefined,
    type: dataObj.type as UserEnum,
    providerEnum: dataObj.providerEnum as ProviderEnum | undefined,
    active: dataObj.active as boolean | undefined,
    createdAt: dataObj.createdAt as string | undefined,

    // Relations DBRef
    // `address` est une chaîne simple, `addressDTO` contient l'objet complet
    address: dataObj.address
      ? ((dataObj.address as Record<string, unknown>).street as string)
      : undefined,
    addressDTO: dataObj.address
      ? {
          id: (dataObj.address as Record<string, unknown>).id as string,
          street: (dataObj.address as Record<string, unknown>).street as string,
          city: (dataObj.address as Record<string, unknown>).city as string,
          postalCode: (dataObj.address as Record<string, unknown>)
            .postalCode as string,
          country: (dataObj.address as Record<string, unknown>)
            .country as string,
          ...(dataObj.address as Record<string, unknown>),
        }
      : undefined,

    reviewUser: dataObj.reviewUser
      ? {
          id: (dataObj.reviewUser as Record<string, unknown>).id as string,
          averageRating: (dataObj.reviewUser as Record<string, unknown>)
            .averageRating as number | undefined,
          totalReviews: (dataObj.reviewUser as Record<string, unknown>)
            .totalReviews as number | undefined,
          ...(dataObj.reviewUser as Record<string, unknown>),
        }
      : undefined,

    photo: dataObj.photo
      ? {
          id: (dataObj.photo as Record<string, unknown>).id as string,
          url: (dataObj.photo as Record<string, unknown>).url as string,
          ...(dataObj.photo as Record<string, unknown>),
        }
      : undefined,

    userPreference: dataObj.userPreference as UserPreferenceDTO | undefined,
    roles: dataObj.roles as RoleDTO[] | undefined,
    chatRooms: dataObj.chatRooms as unknown[] | undefined,
    messages: dataObj.messages as unknown[] | undefined,

    // Champs de statut
    enabled: dataObj.enabled as boolean | undefined,
    emailVerified: dataObj.emailVerified as boolean | undefined,
    isVerified: dataObj.isVerified as boolean | undefined,
    verificationCode: dataObj.verificationCode as string | undefined,
    verificationExpiry: dataObj.verificationExpiry as string | undefined,
    passwordResetToken: dataObj.passwordResetToken as string | undefined,
    tokenExpiry: dataObj.tokenExpiry as string | undefined,
    tokens: dataObj.tokens as string[] | undefined,
    profileFilled: dataObj.profileFilled as boolean | undefined,

    // Organisation
    organization: dataObj.organization
      ? ({
          id: (dataObj.organization as Record<string, unknown>).id as string,
          type: (dataObj.organization as Record<string, unknown>)
            .type as string,
          name: (dataObj.organization as Record<string, unknown>)
            .name as string,
          siretNumber: (dataObj.organization as Record<string, unknown>)
            .siretNumber as string | undefined,
          vatNumber: (dataObj.organization as Record<string, unknown>)
            .vatNumber as string | undefined,
          website: (dataObj.organization as Record<string, unknown>).website as
            | string
            | undefined,
          members: (dataObj.organization as Record<string, unknown>)
            .members as unknown,
          ...(dataObj.organization as Record<string, unknown>),
        } as OrganizationDTO)
      : undefined,

    organizationRole: dataObj.organizationRole as string | undefined,
    influenceurRole: dataObj.influenceurRole as string | undefined,

    // Documents
    documentsAsPro: dataObj.documentsAsPro as DocumentDTO[] | undefined,
    documentsAsClient: dataObj.documentsAsClient as DocumentDTO[] | undefined,

    // Catégories de profil
    userProfileCategories: dataObj.userProfileCategories as
      | UserProfileCategoryDTO[]
      | undefined,

    // Récupération
    recoveryEmail: dataObj.recoveryEmail as string | undefined,
    recoveryPhoneNumber: dataObj.recoveryPhoneNumber as string | undefined,

    // Featured
    isFeatured: dataObj.isFeatured as boolean | undefined,

    // Favoris
    favoritesPro: dataObj.favoritesPro as UserDTO[] | undefined,

    // Conserver tous les autres champs non mappés
    ...dataObj,
  };

  // Mapper selon le type d'utilisateur
  const userType = (dataObj.type || dataObj.userType) as string | undefined;

  if (userType === "PROFESSIONAL") {
    const professional: ProfessionalDTO = {
      ...baseUser,
      type: "PROFESSIONAL" as UserEnum, // S'assurer que le type est défini
      subscriptionEnum: dataObj.subscriptionEnum as
        | SubscriptionEnum
        | undefined,
      bankInformations: dataObj.bankInformations
        ? (dataObj.bankInformations as Array<Record<string, unknown>>).map(
            (bi) => ({
              id: bi.id as string | undefined,
              iban: bi.iban as string | undefined,
              bic: bi.bic as string | undefined,
              ...bi,
            }),
          )
        : undefined,
      professionalCard: dataObj.professionalCard
        ? {
            title: (dataObj.professionalCard as Record<string, unknown>)
              .title as string | undefined,
            description: (dataObj.professionalCard as Record<string, unknown>)
              .description as string | undefined,
            price: (dataObj.professionalCard as Record<string, unknown>)
              .price as number | undefined,
            ...(dataObj.professionalCard as Record<string, unknown>),
          }
        : undefined,
      settings: dataObj.settings as SettingsDTO | undefined,
      invitationSent: dataObj.invitationSent as boolean | undefined,
      invitationSentDate: dataObj.invitationSentDate as number | undefined,
      accountStatus: dataObj.accountStatus as AccountStatusEnum | undefined,
      professionalCardId: dataObj.professionalCardId as string | undefined,
    };
    return professional;
  }

  if (userType === "CLIENT") {
    const client: ClientDTO = {
      ...baseUser,
      type: "CLIENT" as UserEnum, // S'assurer que le type est défini
      invitationSent: dataObj.invitationSent as boolean | undefined,
      invitationSentDate: dataObj.invitationSentDate as number | undefined,
      accountStatus: dataObj.accountStatus as AccountStatusEnum | undefined,
      statsClient: dataObj.statsClient as StatsClientDTO | undefined,
    };
    return client;
  }

  if (userType === "AGENCY") {
    const agency: AgencyDTO = {
      ...baseUser,
      type: "AGENCY" as UserEnum, // S'assurer que le type est défini
      agencyName: dataObj.agencyName as string | undefined,
      contactPerson: dataObj.contactPerson as string | undefined,
      website: dataObj.website as string | undefined,
      vatNumber: dataObj.vatNumber as string | undefined,
    };
    return agency;
  }

  if (userType === "ENTERPRISE") {
    const enterprise: EnterpriseDTO = {
      ...baseUser,
      type: "ENTERPRISE" as UserEnum, // S'assurer que le type est défini
      companyName: dataObj.companyName as string | undefined,
      siretNumber: dataObj.siretNumber as string | undefined,
      vatNumber: dataObj.vatNumber as string | undefined,
      contactPerson: dataObj.contactPerson as string | undefined,
      website: dataObj.website as string | undefined,
    };
    return enterprise;
  }

  // Par défaut, retourner UserDTO avec le type si disponible
  return {
    ...baseUser,
    type: (userType as UserEnum) || baseUser.type,
  };
};

// Users API
export const usersAPI = {
  getAllUsers: async (): Promise<UserDTO[]> => {
    try {
      const endpoint = `/users`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [USERS API] Récupération de tous les utilisateurs:", {
        endpoint,
        fullURL,
      });

      const response = await api.get(endpoint);

      console.log("✅ [USERS API] Utilisateurs récupérés:", {
        status: response.status,
        count: Array.isArray(response.data) ? response.data.length : 0,
        data: response.data,
      });

      // Mapper les données
      if (Array.isArray(response.data)) {
        return response.data.map(mapUserFromBackend) as UserDTO[];
      }

      return [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [USERS API] Erreur lors de la récupération des utilisateurs",
      );
      console.error("❌ [USERS API] Type d'erreur:", typeof error);
      console.error("❌ [USERS API] Erreur complète:", error);
      console.error("❌ [USERS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [USERS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  getUserById: async (
    id: string,
  ): Promise<
    UserDTO | ProfessionalDTO | ClientDTO | AgencyDTO | EnterpriseDTO | null
  > => {
    try {
      const endpoint = `/users/${encodeURIComponent(id)}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [USERS API] Récupération d'un utilisateur par ID:", {
        id,
        endpoint,
        fullURL,
      });

      const response = await api.get(endpoint);

      console.log("✅ [USERS API] Utilisateur récupéré (brut):", {
        status: response.status,
        data: response.data,
      });

      // Mapper les données selon le type d'utilisateur
      const mappedUser = mapUserFromBackend(response.data);

      console.log("✅ [USERS API] Utilisateur mappé:", {
        type: mappedUser?.type,
        id: mappedUser?.id,
        email: mappedUser?.email,
        firstName: mappedUser?.firstName,
        lastName: mappedUser?.lastName,
      });

      return mappedUser;
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [USERS API] Erreur lors de la récupération de l'utilisateur",
      );
      console.error("❌ [USERS API] Type d'erreur:", typeof error);
      console.error("❌ [USERS API] Erreur complète:", error);
      console.error("❌ [USERS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [USERS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });

        // Si l'utilisateur n'est pas trouvé (404), retourner null
        if (errorObj.response.status === 404) {
          console.log("⚠️ [USERS API] Utilisateur non trouvé, retour de null");
          return null;
        }
      }

      // En cas d'erreur, retourner null
      return null;
    }
  },

  updateUserSettings: async (
    userId: string,
    settings: UserSettingsDTO,
  ): Promise<UserDTO | null> => {
    try {
      const endpoint = `/users/${encodeURIComponent(userId)}/settings`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [USERS API] ========================================");
      console.log("🔵 [USERS API] MISE À JOUR DES PARAMÈTRES UTILISATEUR");
      console.log("🔵 [USERS API] ========================================");
      console.log("🔵 [USERS API] User ID:", userId);
      console.log("🔵 [USERS API] Endpoint:", endpoint);
      console.log("🔵 [USERS API] Base URL:", api.defaults.baseURL);
      console.log("🔵 [USERS API] URL complète:", fullURL);
      console.log("🔵 [USERS API] Méthode: PUT");
      console.log("🔵 [USERS API] Headers:", {
        "Content-Type": "application/json",
        Authorization: api.defaults.headers.common["Authorization"]
          ? "Bearer ***"
          : "Non défini",
      });
      console.log("🔵 [USERS API] UserSettingsDTO envoyé:", {
        recoveryEmail: settings.recoveryEmail || "Non défini",
        recoveryPhoneNumber: settings.recoveryPhoneNumber || "Non défini",
      });
      console.log(
        "🔵 [USERS API] Payload complet (JSON):",
        JSON.stringify(settings, null, 2),
      );
      console.log("🔵 [USERS API] ========================================");

      const response = await api.put(endpoint, settings);

      console.log("✅ [USERS API] ========================================");
      console.log("✅ [USERS API] PARAMÈTRES UTILISATEUR MIS À JOUR");
      console.log("✅ [USERS API] ========================================");
      console.log("✅ [USERS API] Status HTTP:", response.status);
      console.log("✅ [USERS API] Status Text:", response.statusText);
      console.log("✅ [USERS API] Headers de réponse:", response.headers);
      console.log(
        "✅ [USERS API] Données reçues:",
        JSON.stringify(response.data, null, 2),
      );
      console.log("✅ [USERS API] ========================================");

      return response.data;
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [USERS API] Erreur lors de la mise à jour des paramètres utilisateur",
      );
      console.error("❌ [USERS API] Type d'erreur:", typeof error);
      console.error("❌ [USERS API] Erreur complète:", error);
      console.error("❌ [USERS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [USERS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });

        // Si l'utilisateur n'est pas trouvé (404), retourner null
        if (errorObj.response.status === 404) {
          console.log("⚠️ [USERS API] Utilisateur non trouvé, retour de null");
          return null;
        }
      }

      throw error;
    }
  },

  // Mise à jour d'un client
  updateClient: async (
    userId: string,
    data: Partial<ClientDTO>,
  ): Promise<ClientDTO | null> => {
    try {
      const endpoint = `/clients/${encodeURIComponent(userId)}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [USERS API] Mise à jour d'un client:", {
        userId,
        endpoint,
        fullURL,
        data,
      });

      const response = await api.put(endpoint, data);

      console.log("✅ [USERS API] Client mis à jour:", {
        status: response.status,
        data: response.data,
      });

      // Mapper la réponse
      return mapUserFromBackend(response.data) as ClientDTO;
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [USERS API] Erreur lors de la mise à jour du client");
      console.error("❌ [USERS API] Type d'erreur:", typeof error);
      console.error("❌ [USERS API] Erreur complète:", error);
      console.error("❌ [USERS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [USERS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  // Mise à jour d'un professionnel
  updateProfessional: async (
    userId: string,
    data: Partial<ProfessionalDTO>,
  ): Promise<ProfessionalDTO | null> => {
    try {
      const endpoint = `/users/pro/${encodeURIComponent(userId)}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [USERS API] Mise à jour d'un professionnel:", {
        userId,
        endpoint,
        fullURL,
        data,
      });

      const response = await api.put(endpoint, data);

      console.log("✅ [USERS API] Professionnel mis à jour:", {
        status: response.status,
        data: response.data,
      });

      // Mapper la réponse
      return mapUserFromBackend(response.data) as ProfessionalDTO;
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [USERS API] Erreur lors de la mise à jour du professionnel",
      );
      console.error("❌ [USERS API] Type d'erreur:", typeof error);
      console.error("❌ [USERS API] Erreur complète:", error);
      console.error("❌ [USERS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [USERS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  // Mise à jour d'une agence
  updateAgency: async (
    userId: string,
    data: Partial<AgencyDTO>,
  ): Promise<AgencyDTO | null> => {
    try {
      const endpoint = `/users/agency/${encodeURIComponent(userId)}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [USERS API] Mise à jour d'une agence:", {
        userId,
        endpoint,
        fullURL,
        data,
      });

      const response = await api.put(endpoint, data);

      console.log("✅ [USERS API] Agence mise à jour:", {
        status: response.status,
        data: response.data,
      });

      // Mapper la réponse
      return mapUserFromBackend(response.data) as AgencyDTO;
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [USERS API] Erreur lors de la mise à jour de l'agence");
      console.error("❌ [USERS API] Type d'erreur:", typeof error);
      console.error("❌ [USERS API] Erreur complète:", error);
      console.error("❌ [USERS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [USERS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  // Mise à jour d'une entreprise
  updateEnterprise: async (
    userId: string,
    data: Partial<EnterpriseDTO>,
  ): Promise<EnterpriseDTO | null> => {
    try {
      const endpoint = `/users/enterprise/${encodeURIComponent(userId)}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [USERS API] Mise à jour d'une entreprise:", {
        userId,
        endpoint,
        fullURL,
        data,
      });

      const response = await api.put(endpoint, data);

      console.log("✅ [USERS API] Entreprise mise à jour:", {
        status: response.status,
        data: response.data,
      });

      // Mapper la réponse
      return mapUserFromBackend(response.data) as EnterpriseDTO;
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [USERS API] Erreur lors de la mise à jour de l'entreprise",
      );
      console.error("❌ [USERS API] Type d'erreur:", typeof error);
      console.error("❌ [USERS API] Erreur complète:", error);
      console.error("❌ [USERS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [USERS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  resetPassword: async (
    resetPasswordData: ResetPasswordDTO,
  ): Promise<string> => {
    try {
      const endpoint = `/auth/reset`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [USERS API] ========================================");
      console.log("🔵 [USERS API] RÉINITIALISATION DU MOT DE PASSE");
      console.log("🔵 [USERS API] ========================================");
      console.log("🔵 [USERS API] Endpoint:", endpoint);
      console.log("🔵 [USERS API] Base URL:", api.defaults.baseURL);
      console.log("🔵 [USERS API] URL complète:", fullURL);
      console.log("🔵 [USERS API] Méthode: POST");
      console.log("🔵 [USERS API] Headers:", {
        "Content-Type": "application/json",
        Authorization: api.defaults.headers.common["Authorization"]
          ? "Bearer ***"
          : "Non défini",
      });
      console.log("🔵 [USERS API] Payload envoyé:", {
        email: resetPasswordData.email,
        password: "***", // Masquer le mot de passe dans les logs
        matchingPassword: "***", // Masquer la confirmation dans les logs
        token: resetPasswordData.token ? "***" : undefined,
        currentPassword: resetPasswordData.currentPassword ? "***" : undefined,
      });
      console.log(
        "🔵 [USERS API] Payload complet (JSON):",
        JSON.stringify(
          {
            email: resetPasswordData.email,
            password: "***",
            matchingPassword: "***",
            token: resetPasswordData.token ? "***" : undefined,
            currentPassword: resetPasswordData.currentPassword
              ? "***"
              : undefined,
          },
          null,
          2,
        ),
      );
      console.log("🔵 [USERS API] ========================================");

      const response = await api.post(endpoint, resetPasswordData);

      console.log("✅ [USERS API] ========================================");
      console.log("✅ [USERS API] RÉPONSE REÇUE DU BACKEND");
      console.log("✅ [USERS API] ========================================");
      console.log("✅ [USERS API] Status HTTP:", response.status);
      console.log("✅ [USERS API] Status Text:", response.statusText);
      console.log("✅ [USERS API] Headers de réponse:", response.headers);
      console.log(
        "✅ [USERS API] Données reçues:",
        JSON.stringify(response.data, null, 2),
      );
      console.log("✅ [USERS API] ========================================");

      return response.data || "Mot de passe modifié avec succès";
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [USERS API] Erreur lors de la réinitialisation du mot de passe",
      );
      console.error("❌ [USERS API] Type d'erreur:", typeof error);
      console.error("❌ [USERS API] Erreur complète:", error);
      console.error("❌ [USERS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [USERS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  // GET /api/v1/users/search -> recherche d'utilisateurs avec filtres
  searchUsers: async (params: {
    q?: string;
    city?: string;
    minAge?: number;
    maxAge?: number;
    platform?: string;
    gender?: string;
    categoryId?: string;
    subCategoryId?: string;
    page?: number;
    size?: number;
  }): Promise<UserDTO[]> => {
    try {
      // Construire les paramètres de requête
      const queryParams = new URLSearchParams();

      if (params.q) queryParams.append("q", params.q);
      if (params.city) queryParams.append("city", params.city);
      if (params.minAge !== undefined)
        queryParams.append("minAge", params.minAge.toString());
      if (params.maxAge !== undefined)
        queryParams.append("maxAge", params.maxAge.toString());
      if (params.platform) queryParams.append("platform", params.platform);
      if (params.gender) queryParams.append("gender", params.gender);
      if (params.categoryId)
        queryParams.append("categoryId", params.categoryId);
      if (params.subCategoryId)
        queryParams.append("subCategoryId", params.subCategoryId);
      if (params.page !== undefined)
        queryParams.append("page", params.page.toString());
      if (params.size !== undefined)
        queryParams.append("size", params.size.toString());

      const endpoint = `/users/search${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [USERS API] Recherche d'utilisateurs:", {
        params,
        endpoint,
        fullURL,
      });

      const response = await api.get(endpoint);

      console.log("✅ [USERS API] Utilisateurs trouvés:", {
        status: response.status,
        count: Array.isArray(response.data) ? response.data.length : 0,
        data: response.data,
      });

      // Mapper les données
      if (Array.isArray(response.data)) {
        return response.data.map(mapUserFromBackend) as UserDTO[];
      }

      return [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [USERS API] Erreur lors de la recherche d'utilisateurs",
      );
      console.error("❌ [USERS API] Type d'erreur:", typeof error);
      console.error("❌ [USERS API] Erreur complète:", error);
      console.error("❌ [USERS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [USERS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      // En cas d'erreur, retourner un tableau vide
      return [];
    }
  },
};

// Featured API - Récupération des utilisateurs mis en avant
export const featuredAPI = {
  // GET /api/v1/featured -> récupère les utilisateurs featured
  getFeatured: async (
    type: "PROFESSIONAL" | "AGENCY" | "ENTERPRISE",
    page: number = 0,
    size: number = 20,
  ): Promise<UserDTO[]> => {
    try {
      const endpoint = `/featured?type=${encodeURIComponent(
        type,
      )}&page=${page}&size=${size}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [FEATURED API] Récupération des utilisateurs featured:", {
        type,
        page,
        size,
        endpoint,
        fullURL,
      });

      const response = await api.get(endpoint);

      console.log("✅ [FEATURED API] Utilisateurs featured récupérés:", {
        status: response.status,
        count: Array.isArray(response.data) ? response.data.length : 0,
        data: response.data,
      });

      // Mapper les données
      if (Array.isArray(response.data)) {
        return response.data.map(mapUserFromBackend) as UserDTO[];
      }

      return [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [FEATURED API] Erreur lors de la récupération des utilisateurs featured",
      );
      console.error("❌ [FEATURED API] Type d'erreur:", typeof error);
      console.error("❌ [FEATURED API] Erreur complète:", error);
      console.error("❌ [FEATURED API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [FEATURED API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      // En cas d'erreur, retourner un tableau vide
      return [];
    }
  },
};

// Applications (Candidatures) API
// Categories API
export const categoriesAPI = {
  getAllCategories: async (): Promise<CategoryDTO[]> => {
    try {
      const endpoint = `/categories`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log(
        "🔵 [CATEGORIES API] Récupération de toutes les catégories:",
        {
          endpoint,
          fullURL,
        },
      );

      const response = await api.get(endpoint);

      console.log("✅ [CATEGORIES API] Catégories récupérées:", {
        status: response.status,
        count: Array.isArray(response.data) ? response.data.length : 0,
        data: response.data,
      });

      if (Array.isArray(response.data)) {
        return (response.data as Array<Record<string, unknown>>).map((cat) => ({
          id: cat.id as string,
          name: cat.name as string,
          description: cat.description as string | undefined,
          subCategories: (
            (cat.subCategories as Array<Record<string, unknown>>) || []
          ).map((sub) => ({
            id: sub.id as string,
            name: sub.name as string,
            description: sub.description as string | undefined,
          })),
        })) as CategoryDTO[];
      }

      return [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [CATEGORIES API] Erreur lors de la récupération des catégories",
      );
      console.error("❌ [CATEGORIES API] Type d'erreur:", typeof error);
      console.error("❌ [CATEGORIES API] Erreur complète:", error);
      console.error("❌ [CATEGORIES API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [CATEGORIES API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },
};

// Chat/Conversations API
export const chatAPI = {
  // POST /api/v1/chat/conversations/messages - Créer une conversation en envoyant un message
  sendMessage: async (data: {
    senderId: string;
    recipientId: string;
    content: string;
    clientMessageId?: string;
  }): Promise<MessageDTO> => {
    try {
      const endpoint = `/chat/conversations/messages`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [CHAT API] Envoi d'un message:", {
        endpoint,
        fullURL,
        data,
      });

      const response = await api.post(endpoint, data);

      console.log("✅ [CHAT API] Message envoyé:", {
        status: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [CHAT API] Erreur lors de l'envoi du message");
      console.error("❌ [CHAT API] Type d'erreur:", typeof error);
      console.error("❌ [CHAT API] Erreur complète:", error);
      console.error("❌ [CHAT API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [CHAT API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  // GET /api/v1/chat/all-conversation?recipientId={id} - Lister les conversations
  getAllConversations: async (
    recipientId: string,
  ): Promise<ConversationDTO[]> => {
    try {
      const endpoint = `/chat/all-conversation?recipientId=${encodeURIComponent(
        recipientId,
      )}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [CHAT API] Récupération des conversations:", {
        recipientId,
        endpoint,
        fullURL,
      });

      const response = await api.get(endpoint);

      console.log("✅ [CHAT API] Conversations récupérées:", {
        status: response.status,
        count: Array.isArray(response.data) ? response.data.length : 0,
        data: response.data,
      });

      if (Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [CHAT API] Erreur lors de la récupération des conversations",
      );
      console.error("❌ [CHAT API] Type d'erreur:", typeof error);
      console.error("❌ [CHAT API] Erreur complète:", error);
      console.error("❌ [CHAT API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [CHAT API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  // GET /api/v1/chat/conversations/messages?userA={id}&userB={id}&since={ISO}&limit={n}
  getMessages: async (params: {
    userA: string;
    userB: string;
    since?: string;
    limit?: number;
  }): Promise<MessageDTO[]> => {
    try {
      const queryParams = new URLSearchParams({
        userA: params.userA,
        userB: params.userB,
      });
      if (params.since) {
        queryParams.append("since", params.since);
      }
      if (params.limit) {
        queryParams.append("limit", params.limit.toString());
      }

      const endpoint = `/chat/conversations/messages?${queryParams.toString()}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [CHAT API] Récupération des messages:", {
        params,
        endpoint,
        fullURL,
      });

      const response = await api.get(endpoint);

      console.log("✅ [CHAT API] Messages récupérés:", {
        status: response.status,
        count: Array.isArray(response.data) ? response.data.length : 0,
        data: response.data,
      });

      if (Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [CHAT API] Erreur lors de la récupération des messages",
      );
      console.error("❌ [CHAT API] Type d'erreur:", typeof error);
      console.error("❌ [CHAT API] Erreur complète:", error);
      console.error("❌ [CHAT API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [CHAT API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  // PUT /api/v1/chat/conversations/mark-read?userA={id}&userB={id}
  markAsRead: async (userA: string, userB: string): Promise<void> => {
    try {
      const endpoint = `/chat/conversations/mark-read?userA=${encodeURIComponent(
        userA,
      )}&userB=${encodeURIComponent(userB)}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [CHAT API] Marquage des messages comme lus:", {
        userA,
        userB,
        endpoint,
        fullURL,
      });

      const response = await api.put(endpoint);

      console.log("✅ [CHAT API] Messages marqués comme lus:", {
        status: response.status,
      });
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [CHAT API] Erreur lors du marquage comme lu");
      console.error("❌ [CHAT API] Type d'erreur:", typeof error);
      console.error("❌ [CHAT API] Erreur complète:", error);
      console.error("❌ [CHAT API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [CHAT API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  // GET /api/v1/chat/waiting-message?recipientId={id}
  hasUnreadMessages: async (recipientId: string): Promise<boolean> => {
    try {
      const endpoint = `/chat/waiting-message?recipientId=${encodeURIComponent(
        recipientId,
      )}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [CHAT API] Vérification des messages non lus:", {
        recipientId,
        endpoint,
        fullURL,
      });

      const response = await api.get(endpoint);

      console.log("✅ [CHAT API] Vérification effectuée:", {
        status: response.status,
        hasUnread: response.data,
      });

      return response.data === true || response.data === "true";
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [CHAT API] Erreur lors de la vérification des messages non lus",
      );
      console.error("❌ [CHAT API] Type d'erreur:", typeof error);
      console.error("❌ [CHAT API] Erreur complète:", error);
      console.error("❌ [CHAT API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [CHAT API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      return false;
    }
  },
};

export const applicationsAPI = {
  // POST /api/v1/announcements/{announcementId}/applications -> crée une candidature (multipart/form-data)
  create: async (
    announcementId: string,
    applicationData: {
      message: string;
      price?: number;
      photos?: File[];
      videos?: File[];
      applicantId?: string;
    },
  ): Promise<ApplicationDTO> => {
    try {
      const endpoint = `/announcements/${encodeURIComponent(
        announcementId,
      )}/applications`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [APPLICATIONS API] Création d'une candidature:", {
        announcementId,
        endpoint,
        fullURL,
        applicationData,
      });

      // Créer FormData pour envoyer les fichiers et paramètres
      const formData = new FormData();

      // Paramètres de requête (@RequestParam)
      if (applicationData.message) {
        formData.append("message", applicationData.message);
      }

      if (applicationData.price !== undefined) {
        formData.append("price", applicationData.price.toString());
      }

      // Récupérer applicantId depuis localStorage si non fourni
      let applicantId = applicationData.applicantId;
      if (!applicantId && typeof window !== "undefined") {
        applicantId = storage.getItem("userId") || undefined;
      }

      if (applicantId) {
        formData.append("applicantId", applicantId);
      }

      // Ajouter les photos comme parts nommés "photos" (@RequestPart)
      if (applicationData.photos && applicationData.photos.length > 0) {
        applicationData.photos.forEach((photo) => {
          formData.append("photos", photo);
        });
      }

      // Ajouter les vidéos comme parts nommés "videos" (@RequestPart)
      if (applicationData.videos && applicationData.videos.length > 0) {
        applicationData.videos.forEach((video) => {
          formData.append("videos", video);
        });
      }

      // Optionnel : créer un part "application" avec un JSON si nécessaire
      // Pour l'instant, on n'en a pas besoin car tous les champs sont dans les RequestParam

      const response = await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("✅ [APPLICATIONS API] Candidature créée:", {
        status: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [APPLICATIONS API] Erreur lors de la création de la candidature",
      );
      console.error("❌ [APPLICATIONS API] Type d'erreur:", typeof error);
      console.error("❌ [APPLICATIONS API] Erreur complète:", error);
      console.error("❌ [APPLICATIONS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [APPLICATIONS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  // GET /api/v1/announcements/{announcementId}/applications -> liste des candidatures pour une annonce
  getByAnnouncement: async (
    announcementId: string,
  ): Promise<ApplicationDTO[]> => {
    try {
      const endpoint = `/announcements/${encodeURIComponent(
        announcementId,
      )}/applications`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log(
        "🔵 [APPLICATIONS API] Récupération des candidatures pour l'annonce:",
        {
          announcementId,
          endpoint,
          fullURL,
        },
      );

      const response = await api.get(endpoint);

      console.log("✅ [APPLICATIONS API] Candidatures récupérées:", {
        status: response.status,
        count: Array.isArray(response.data) ? response.data.length : 0,
        data: response.data,
      });

      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [APPLICATIONS API] Erreur lors de la récupération des candidatures",
      );
      console.error("❌ [APPLICATIONS API] Type d'erreur:", typeof error);
      console.error("❌ [APPLICATIONS API] Erreur complète:", error);
      console.error("❌ [APPLICATIONS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [APPLICATIONS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      return [];
    }
  },

  // GET /api/v1/announcements/applications/applicant/{applicantId} -> liste par candidat
  getByApplicant: async (applicantId: string): Promise<ApplicationDTO[]> => {
    try {
      const endpoint = `/announcements/applications/applicant/${encodeURIComponent(
        applicantId,
      )}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log(
        "🔵 [APPLICATIONS API] Récupération des candidatures du candidat:",
        {
          applicantId,
          endpoint,
          fullURL,
        },
      );

      const response = await api.get(endpoint);

      console.log(
        "✅ [APPLICATIONS API] Candidatures du candidat récupérées:",
        {
          status: response.status,
          count: Array.isArray(response.data) ? response.data.length : 0,
          data: response.data,
        },
      );

      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [APPLICATIONS API] Erreur lors de la récupération des candidatures du candidat",
      );
      console.error("❌ [APPLICATIONS API] Type d'erreur:", typeof error);
      console.error("❌ [APPLICATIONS API] Erreur complète:", error);
      console.error("❌ [APPLICATIONS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [APPLICATIONS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      return [];
    }
  },

  // GET /api/v1/announcements/applications/owner/{ownerId} -> liste des candidatures pour les annonces d'un propriétaire
  getByOwner: async (ownerId: string): Promise<ApplicationDTO[]> => {
    try {
      const endpoint = `/announcements/applications/owner/${encodeURIComponent(
        ownerId,
      )}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log(
        "🔵 [APPLICATIONS API] Récupération des candidatures du propriétaire:",
        {
          ownerId,
          endpoint,
          fullURL,
        },
      );

      const response = await api.get(endpoint);

      console.log(
        "✅ [APPLICATIONS API] Candidatures du propriétaire récupérées:",
        {
          status: response.status,
          count: Array.isArray(response.data) ? response.data.length : 0,
          data: response.data,
        },
      );

      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [APPLICATIONS API] Erreur lors de la récupération des candidatures du propriétaire",
      );
      console.error("❌ [APPLICATIONS API] Type d'erreur:", typeof error);
      console.error("❌ [APPLICATIONS API] Erreur complète:", error);
      console.error("❌ [APPLICATIONS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [APPLICATIONS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      return [];
    }
  },

  // GET /api/v1/announcements/applications/{id} -> récupération par id
  getById: async (id: string): Promise<ApplicationDTO | null> => {
    try {
      const endpoint = `/announcements/applications/${encodeURIComponent(id)}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log(
        "🔵 [APPLICATIONS API] Récupération de la candidature par ID:",
        {
          id,
          endpoint,
          fullURL,
        },
      );

      const response = await api.get(endpoint);

      console.log("✅ [APPLICATIONS API] Candidature récupérée:", {
        status: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [APPLICATIONS API] Erreur lors de la récupération de la candidature",
      );
      console.error("❌ [APPLICATIONS API] Type d'erreur:", typeof error);
      console.error("❌ [APPLICATIONS API] Erreur complète:", error);
      console.error("❌ [APPLICATIONS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [APPLICATIONS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      return null;
    }
  },

  // PUT /api/v1/announcements/applications/{id}/status?status=...&requesterId=... -> mise à jour du statut
  updateStatus: async (
    id: string,
    status: "ACCEPTED" | "REJECTED",
    requesterId: string,
  ): Promise<ApplicationDTO> => {
    try {
      const endpoint = `/announcements/applications/${encodeURIComponent(
        id,
      )}/status?status=${status}&requesterId=${encodeURIComponent(
        requesterId,
      )}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log(
        "🔵 [APPLICATIONS API] Mise à jour du statut de la candidature:",
        {
          id,
          status,
          requesterId,
          endpoint,
          fullURL,
        },
      );

      const response = await api.put(endpoint);

      console.log(
        "✅ [APPLICATIONS API] Statut de la candidature mis à jour:",
        {
          status: response.status,
          data: response.data,
        },
      );

      return response.data;
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [APPLICATIONS API] Erreur lors de la mise à jour du statut",
      );
      console.error("❌ [APPLICATIONS API] Type d'erreur:", typeof error);
      console.error("❌ [APPLICATIONS API] Erreur complète:", error);
      console.error("❌ [APPLICATIONS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [APPLICATIONS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },
};

// Reviews API - Correspond au modèle Review Java
export interface ReviewUserRefDTO {
  id: string;
}

export interface ReviewDTO {
  id?: string;
  reservationId?: number; // ID de la réservation pour laquelle l'avis a été laissé
  authorId?: number; // ID de l'auteur de l'avis
  placeId?: number; // ID du bien évalué
  author?: ReviewUserRefDTO | { id: string };
  receiver?: ReviewUserRefDTO | { id: string };
  overallRating?: number; // 1-5 (ancien format)
  rating?: number; // Moyenne calculée automatiquement (nouveau format)
  accessibilityRating?: number; // 1-10 (nouveau format)
  cleanlinessRating?: number; // 1-10 (nouveau format)
  communicationRating?: number; // 1-10 (nouveau format)
  valueForMoneyRating?: number; // 1-10 (nouveau format)
  generalFeedback?: string;
  comment?: string; // Commentaire de l'avis (nouveau format)
  reply?: string; // Réponse du propriétaire (nouveau format)
  replyAt?: string; // Date de la réponse (nouveau format)
  specificRatings?: {
    punctuality?: number;
    cleanliness?: number;
    service?: number;
    communication?: number;
    professionalism?: number;
    [key: string]: number | undefined;
  };
  characteristics?: string[]; // e.g., ["professional", "friendly"]
  additionalComments?: string;
  createdAt?: string; // ISO 8601 format
  updatedAt?: string; // ISO 8601 format
}

export interface CreateReviewDTO {
  author: { id: string }; // ReviewUser ID (pas directement userId)
  receiver: { id: string }; // ReviewUser ID (pas directement userId)
  overallRating: number;
  generalFeedback?: string;
  specificRatings?: {
    punctuality?: number;
    cleanliness?: number;
    service?: number;
    communication?: number;
    professionalism?: number;
    [key: string]: number | undefined;
  };
  characteristics?: string[];
  additionalComments?: string;
}

// Helper function pour obtenir le ReviewUser ID depuis un User ID
export async function getReviewUserIdFromUserId(
  userId: string,
): Promise<string | null> {
  try {
    const user = await usersAPI.getUserById(userId);
    if (user?.reviewUser?.id) {
      return user.reviewUser.id;
    }
    console.warn(
      `⚠️ [REVIEWS API] Aucun ReviewUser trouvé pour l'utilisateur ${userId}`,
    );
    return null;
  } catch (error) {
    console.error(
      `❌ [REVIEWS API] Erreur lors de la récupération du ReviewUser ID pour ${userId}:`,
      error,
    );
    return null;
  }
}

export const reviewsAPI = {
  // Créer un avis (utilise userId et récupère automatiquement les ReviewUser IDs)
  createReviewFromUserIds: async (
    authorUserId: string,
    receiverUserId: string,
    overallRating: number,
    generalFeedback?: string,
    additionalComments?: string,
  ): Promise<ReviewDTO> => {
    try {
      // Récupérer les ReviewUser IDs
      const authorReviewUserId = await getReviewUserIdFromUserId(authorUserId);
      const receiverReviewUserId =
        await getReviewUserIdFromUserId(receiverUserId);

      if (!authorReviewUserId || !receiverReviewUserId) {
        throw new Error(
          "Impossible de récupérer les ReviewUser IDs pour créer l'avis",
        );
      }

      const reviewData: CreateReviewDTO = {
        author: { id: authorReviewUserId },
        receiver: { id: receiverReviewUserId },
        overallRating,
        generalFeedback,
        additionalComments,
      };

      return await reviewsAPI.createReview(reviewData);
    } catch (error) {
      console.error(
        "❌ [REVIEWS API] Erreur lors de la création de l'avis depuis userId:",
        error,
      );
      throw error;
    }
  },

  // Créer un avis (avec ReviewUser IDs directement)
  createReview: async (data: CreateReviewDTO): Promise<ReviewDTO> => {
    try {
      const endpoint = `/reviews`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [REVIEWS API] Création d'un avis:", {
        endpoint,
        fullURL,
        data,
      });

      const response = await api.post(endpoint, data);

      console.log("✅ [REVIEWS API] Avis créé:", {
        status: response.status,
        data: response.data,
      });

      return response.data;
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [REVIEWS API] Erreur lors de la création de l'avis");
      console.error("❌ [REVIEWS API] Type d'erreur:", typeof error);
      console.error("❌ [REVIEWS API] Erreur complète:", error);
      console.error("❌ [REVIEWS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [REVIEWS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },

  // Récupérer tous les avis pour un utilisateur (écrits + reçus)
  getAllReviewsByUserId: async (userId: string): Promise<ReviewDTO[]> => {
    try {
      const endpoint = `/reviews/users/${encodeURIComponent(userId)}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log(
        "🔵 [REVIEWS API] Récupération de tous les avis pour l'utilisateur:",
        {
          userId,
          endpoint,
          fullURL,
        },
      );

      const response = await api.get(endpoint);

      console.log("✅ [REVIEWS API] Avis récupérés:", {
        status: response.status,
        count: Array.isArray(response.data) ? response.data.length : 0,
      });

      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [REVIEWS API] Erreur lors de la récupération des avis");
      console.error("❌ [REVIEWS API] Type d'erreur:", typeof error);
      console.error("❌ [REVIEWS API] Erreur complète:", error);
      console.error("❌ [REVIEWS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [REVIEWS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      return [];
    }
  },

  // Récupérer les avis reçus par un utilisateur
  getReceivedReviews: async (userId: string): Promise<ReviewDTO[]> => {
    try {
      const endpoint = `/reviews/users/${encodeURIComponent(userId)}/received`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [REVIEWS API] Récupération des avis reçus:", {
        userId,
        endpoint,
        fullURL,
      });

      const response = await api.get(endpoint);

      console.log("✅ [REVIEWS API] Avis reçus récupérés:", {
        status: response.status,
        count: Array.isArray(response.data) ? response.data.length : 0,
      });

      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [REVIEWS API] Erreur lors de la récupération des avis reçus",
      );
      console.error("❌ [REVIEWS API] Type d'erreur:", typeof error);
      console.error("❌ [REVIEWS API] Erreur complète:", error);
      console.error("❌ [REVIEWS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [REVIEWS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      return [];
    }
  },

  // Récupérer les avis écrits par un utilisateur
  getWrittenReviews: async (userId: string): Promise<ReviewDTO[]> => {
    try {
      const endpoint = `/reviews/users/${encodeURIComponent(userId)}/written`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [REVIEWS API] Récupération des avis écrits:", {
        userId,
        endpoint,
        fullURL,
      });

      const response = await api.get(endpoint);

      console.log("✅ [REVIEWS API] Avis écrits récupérés:", {
        status: response.status,
        count: Array.isArray(response.data) ? response.data.length : 0,
      });

      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error(
        "❌ [REVIEWS API] Erreur lors de la récupération des avis écrits",
      );
      console.error("❌ [REVIEWS API] Type d'erreur:", typeof error);
      console.error("❌ [REVIEWS API] Erreur complète:", error);
      console.error("❌ [REVIEWS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [REVIEWS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      return [];
    }
  },

  // Supprimer un avis
  deleteReview: async (reviewId: string): Promise<void> => {
    try {
      const endpoint = `/reviews/${encodeURIComponent(reviewId)}`;
      const fullURL = `${api.defaults.baseURL}${endpoint}`;

      console.log("🔵 [REVIEWS API] Suppression d'un avis:", {
        reviewId,
        endpoint,
        fullURL,
      });

      const response = await api.delete(endpoint);

      console.log("✅ [REVIEWS API] Avis supprimé:", {
        status: response.status,
        data: response.data,
      });
    } catch (error: unknown) {
      const errorObj = error as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
      };
      console.error("❌ [REVIEWS API] Erreur lors de la suppression de l'avis");
      console.error("❌ [REVIEWS API] Type d'erreur:", typeof error);
      console.error("❌ [REVIEWS API] Erreur complète:", error);
      console.error("❌ [REVIEWS API] Message:", errorObj?.message);

      if (errorObj.response) {
        console.error("❌ [REVIEWS API] Réponse HTTP:", {
          status: errorObj.response.status,
          statusText: errorObj.response.statusText,
          data: errorObj.response.data,
        });
      }

      throw error;
    }
  },
};

// ============================================
// Campaigns API
// ============================================

export interface CampaignDTO {
  id: string;
  name: string;
  creatorId: string;
  date?: string; // ISO 8601
  photoIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CampaignCreateDTO {
  name: string;
  creatorId: string;
  date?: string; // ISO 8601, optionnel
  photoIds?: string[]; // optionnel, généralement vide au create
}

export interface CampaignPhotoDTO {
  id: string;
  filePath?: string; // ID GridFS pour construire l'URL
  url?: string; // URL complète (optionnel, peut être construit depuis filePath)
  campaignId?: string;
  ownerId?: string;
  orderIndex?: number;
  order?: number; // Alias pour orderIndex
  postId?: string | null;
  // autres champs selon la réponse du backend
}

export type PhotoResponse = CampaignPhotoDTO;

export const campaignsAPI = {
  // Créer une nouvelle campagne
  create: async (payload: CampaignCreateDTO): Promise<CampaignDTO> => {
    try {
      console.log("🔵 [CAMPAIGNS API] Création d'une campagne:", payload);

      const response = await api.post<CampaignDTO>("/campaigns", payload);

      console.log("✅ [CAMPAIGNS API] Campagne créée:", response.data);
      return response.data;
    } catch (error: unknown) {
      console.error(
        "❌ [CAMPAIGNS API] Erreur lors de la création de la campagne:",
        error,
      );
      throw error;
    }
  },

  // Récupérer une campagne par ID
  getById: async (campaignId: string): Promise<CampaignDTO> => {
    try {
      console.log(
        "🔵 [CAMPAIGNS API] Récupération de la campagne:",
        campaignId,
      );

      const response = await api.get<CampaignDTO>(`/campaigns/${campaignId}`);

      console.log("✅ [CAMPAIGNS API] Campagne récupérée:", response.data);
      return response.data;
    } catch (error: unknown) {
      console.error(
        "❌ [CAMPAIGNS API] Erreur lors de la récupération de la campagne:",
        error,
      );
      throw error;
    }
  },

  // Récupérer toutes les campagnes d'un utilisateur
  listByCreator: async (creatorId: string): Promise<CampaignDTO[]> => {
    try {
      console.log(
        "🔵 [CAMPAIGNS API] Récupération des campagnes pour:",
        creatorId,
      );

      const response = await api.get<CampaignDTO[]>(
        `/campaigns/user/${encodeURIComponent(creatorId)}`,
      );

      console.log("✅ [CAMPAIGNS API] Campagnes récupérées:", response.data);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      console.error(
        "❌ [CAMPAIGNS API] Erreur lors de la récupération des campagnes:",
        error,
      );
      // Si l'endpoint n'existe pas ou erreur, retourner un tableau vide
      return [];
    }
  },

  // Ajouter une photo à une campagne
  addPhoto: async (
    campaignId: string,
    file: File,
    ownerId: string,
  ): Promise<PhotoResponse> => {
    try {
      console.log("🔵 [CAMPAIGNS API] Ajout d'une photo à la campagne:", {
        campaignId,
        fileName: file.name,
        ownerId,
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("ownerId", ownerId);

      const response = await api.post<PhotoResponse>(
        `/campaigns/${campaignId}/photos`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      console.log("✅ [CAMPAIGNS API] Photo ajoutée:", response.data);
      return response.data;
    } catch (error: unknown) {
      console.error(
        "❌ [CAMPAIGNS API] Erreur lors de l'ajout de la photo:",
        error,
      );
      throw error;
    }
  },

  // Modifier l'ordre des photos d'une campagne
  updatePhotoOrder: async (
    campaignId: string,
    photoIds: string[],
  ): Promise<CampaignDTO> => {
    try {
      console.log("🔵 [CAMPAIGNS API] Mise à jour de l'ordre des photos:", {
        campaignId,
        photoIds,
      });

      const response = await api.put<CampaignDTO>(
        `/campaigns/${campaignId}/photos/order`,
        photoIds,
      );

      console.log("✅ [CAMPAIGNS API] Ordre des photos mis à jour");
      return response.data;
    } catch (error: unknown) {
      console.error(
        "❌ [CAMPAIGNS API] Erreur lors de la mise à jour de l'ordre:",
        error,
      );
      throw error;
    }
  },

  // Supprimer une photo d'une campagne
  removePhoto: async (campaignId: string, photoId: string): Promise<void> => {
    try {
      console.log("🔵 [CAMPAIGNS API] Suppression d'une photo:", {
        campaignId,
        photoId,
      });

      await api.delete(`/campaigns/${campaignId}/photos/${photoId}`);

      console.log("✅ [CAMPAIGNS API] Photo supprimée");
    } catch (error: unknown) {
      console.error(
        "❌ [CAMPAIGNS API] Erreur lors de la suppression de la photo:",
        error,
      );
      throw error;
    }
  },

  // Récupérer les photos d'une campagne
  getPhotos: async (campaignId: string): Promise<PhotoResponse[]> => {
    try {
      console.log(
        "🔵 [CAMPAIGNS API] Récupération des photos pour la campagne:",
        campaignId,
      );

      const response = await api.get<PhotoResponse[]>(
        `/campaigns/${campaignId}/photos`,
      );

      console.log("✅ [CAMPAIGNS API] Photos récupérées:", response.data);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      console.error(
        "❌ [CAMPAIGNS API] Erreur lors de la récupération des photos:",
        error,
      );
      return [];
    }
  },

  // Supprimer une campagne
  delete: async (campaignId: string): Promise<void> => {
    try {
      console.log("🔵 [CAMPAIGNS API] Suppression de la campagne:", campaignId);

      await api.delete(`/campaigns/${campaignId}`);

      console.log("✅ [CAMPAIGNS API] Campagne supprimée");
    } catch (error: unknown) {
      console.error(
        "❌ [CAMPAIGNS API] Erreur lors de la suppression de la campagne:",
        error,
      );
      throw error;
    }
  },
};

// ============================================
// Facebook API
// ============================================

export const facebookAPI = {
  // Publier une photo sur Facebook par ID GridFS avec message et programmation optionnelle
  publishPhotoById: async (
    message: string,
    fileId: string, // ID GridFS du fichier
    scheduledPublishTime?: number, // Timestamp Unix en millisecondes
  ): Promise<string> => {
    try {
      console.log("🔵 [FACEBOOK API] Publication d'une photo par ID:", {
        message,
        fileId,
        scheduledPublishTime,
      });

      // Construire les paramètres de requête (query params pour @RequestParam)
      const params = new URLSearchParams();
      params.append("message", message);
      params.append("fileId", fileId);
      if (scheduledPublishTime) {
        params.append("scheduledPublishTime", scheduledPublishTime.toString());
      }

      // Utiliser GET ou POST avec query params - Spring accepte les @RequestParam en POST aussi
      const response = await api.post<string>(
        `/facebook/publish/photoById?${params.toString()}`,
        {}, // Body vide, tous les paramètres sont dans l'URL
      );

      console.log(
        "✅ [FACEBOOK API] Photo publiée avec succès:",
        response.data,
      );
      return response.data;
    } catch (error: unknown) {
      console.error("❌ [FACEBOOK API] Erreur lors de la publication:", error);
      throw error;
    }
  },
};

// ============================================
// NOUVEAUX ENDPOINTS BACKEND - RENTOALL
// ============================================

// ========== DTOs ==========
// UserDTO is already defined above at line 1452

export interface PlaceCharacteristicDTO {
  name: string;
  value: string;
}

export interface PlaceDTO {
  id: number;
  type: "PARKING" | "CAVE" | "STORAGE_SPACE";
  address: string;
  city: string;
  /** Titre du bien (affiché en tête des cartes) */
  title?: string;
  description?: string;
  deposit: number; // BigDecimal
  pricePerHour?: number; // BigDecimal
  pricePerDay: number; // BigDecimal
  pricePerWeek?: number; // BigDecimal
  pricePerMonth: number; // BigDecimal
  ownerId: number;
  active: boolean;
  characteristics?: PlaceCharacteristicDTO[];
  // Types de véhicules acceptés (énum: MOTO, VOITURE, CAMION, CARAVANE, CAMPING_CAR)
  acceptedVehicleTypes?: string[];
  // Coordonnées GPS (calculées automatiquement par le backend via GeocodingService)
  latitude?: number; // Latitude du bien (géocodage automatique)
  longitude?: number; // Longitude du bien (géocodage automatique)
  // Booléens pour activer/désactiver les prix
  hourPriceActive?: boolean;
  dayPriceActive?: boolean;
  weekPriceActive?: boolean;
  monthPriceActive?: boolean;
  // Nouvelles données pour le calendrier
  availabilities?: PlaceAvailabilityDTO[]; // Paramétrages spécifiques du propriétaire
  occupiedSlots?: OccupiedSlotDTO[]; // Créneaux déjà réservés (confirmés ou payés)
  availableFrom?: string; // Format: "2026-01-10" - Date de début de disponibilité globale
  availableTo?: string; // Format: "2027-01-10" - Date de fin de disponibilité globale
  minDays?: number; // Nombre de jours minimum requis pour une réservation
  minHours?: number; // Nombre d'heures minimum requis pour une réservation
  truckAccessDistance?: number; // Distance d'accès camion en mètres
  accessibilityRemarks?: string; // Remarques d'accessibilité
  cancellationPolicy?: "FLEXIBLE" | "MODERATE" | "STRICT"; // Politique d'annulation
  cancellationDeadlineDays?: number; // Nombre de jours avant pour annulation gratuite (-1 = non annulable, 0 = pas de restriction)
  photos?: string[]; // URLs des photos du bien
  videoUrl?: string; // URL de la vidéo du bien (max 10 secondes)
  [key: string]: unknown;
}

export interface PlaceAvailabilityDTO {
  date: string; // Format: "YYYY-MM-DD" (ex: "2026-01-10")
  available: boolean; // true si le créneau est réservable, false sinon
  startTime?: string; // Format: "HH:mm:ss" (ex: "08:00:00") - optionnel, pour définir des disponibilités par heures
  endTime?: string; // Format: "HH:mm:ss" (ex: "18:00:00") - optionnel, pour définir des disponibilités par heures
  customPricePerDay?: number; // Prix spécifique pour ce jour (remplace le prix par défaut)
  customPricePerHour?: number; // Prix spécifique par heure pour ce jour (remplace le prix par défaut)
}

export interface AutomatedMessageDTO {
  type: "ON_RESERVATION" | "BEFORE_START" | "AFTER_END"; // Type de message automatisé
  content: string; // Contenu du message (max 2000 caractères)
  active: boolean; // Si false, le système utilisera le message par défaut de la plateforme
  sendingTime?: string; // Heure d'envoi au format HH:mm:ss (ex: "09:00:00")
  daysOffset?: number; // Nombre de jours avant ou après l'événement (ex: -1 pour la veille, 0 pour le jour même, 1 pour le lendemain)
}

export interface InvestorInquiryDTO {
  firstName: string; // Prénom
  lastName: string; // Nom
  email: string; // Adresse email
  amount: number; // Somme souhaitée
  reason: string; // Raison pour laquelle la personne veut rejoindre
  linkedInUrl?: string; // URL LinkedIn ou autre réseau professionnel
}

export interface OccupiedSlotDTO {
  start: string; // ISO format (LocalDateTime) - Date et heure de début
  end: string; // ISO format (LocalDateTime) - Date et heure de fin
  clientName?: string; // Nom du client
  totalPrice?: number; // Prix total payé par le client
  serviceFee?: number; // Frais de service (8%)
  hostAmount?: number; // Montant net pour l'hôte
}

/** Calendrier d'un bien : disponibilités générales + créneaux déjà réservés + dates d'ouverture globale */
export interface PlaceCalendarDTO {
  placeId?: number;
  availabilities?: PlaceAvailabilityDTO[];
  occupiedSlots?: OccupiedSlotDTO[];
  /** Date d'ouverture du lieu (ISO LocalDate). À utiliser pour borner le sélecteur de dates. */
  availableFrom?: string;
  /** Date de fermeture du lieu (ISO LocalDate). À utiliser pour borner le sélecteur de dates. */
  availableTo?: string;
}

export interface ReservationDTO {
  id: number;
  placeId: number;
  clientId: number;
  startDateTime: string; // ISO format (LocalDateTime)
  endDateTime: string; // ISO format (LocalDateTime)
  totalPrice: number; // BigDecimal - Montant total payé par le client
  serviceFee?: number; // BigDecimal - Frais de service (8% par défaut)
  hostAmount?: number; // BigDecimal - Montant net reversé à l'hôte
  status: string; // PENDING, CONFIRMED, CANCELLED, COMPLETED, UPDATE_REQUESTED, UPDATE_ACCEPTED, UPDATE_REJECTED
  paymentStatus: string; // PAID, PENDING, etc.
  userRole?: "GUEST" | "HOST"; // Injecté automatiquement par le backend : "GUEST" (locataire) ou "HOST" (propriétaire)
  createdAt?: string; // ISO format (LocalDateTime)
  requestedStartDateTime?: string; // ISO format - Nouvelles dates demandées pour modification
  requestedEndDateTime?: string; // ISO format - Nouvelles dates demandées pour modification
  priceDifference?: number; // BigDecimal - Différence de prix (positif si augmentation, négatif si diminution)
  [key: string]: unknown;
}

// ReviewDTO is already defined above at line 4108

export interface FavoriteFolderDTO {
  id: number;
  name: string;
  userId: number;
  favorites?: number[];
  [key: string]: unknown;
}

export interface UpdateUserPayload {
  firstName: string; // Obligatoire
  lastName: string; // Obligatoire
  email: string; // Obligatoire
  phoneNumber?: string;
  profilePicture?: string;
  birthDate?: string; // Format: "YYYY-MM-DD"
  language?: string; // Ex: "fr", "en", etc.
  address?: string; // Adresse (rue et numéro)
  city?: string; // Ville
  zipCode?: string; // Code postal
  companyName?: string;
  companyAddress?: string;
  siret?: string;
  vatNumber?: string;
  [key: string]: unknown;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface CreatePlacePayload {
  type: "PARKING" | "CAVE" | "STORAGE_SPACE";
  address: string;
  city: string;
  zipCode?: string;
  /** Titre de l'annonce (obligatoire côté front, envoyé au backend) */
  title?: string;
  description?: string;
  deposit: number;
  pricePerHour?: number;
  pricePerDay?: number;
  pricePerWeek?: number;
  pricePerMonth?: number;
  ownerId: number;
  active?: boolean;
  photos?: string[]; // Max 5 URLs
  videoUrl?: string; // URL de la vidéo du bien (max 10 secondes)
  availableFrom?: string; // Format: "2026-01-10"
  availableTo?: string; // Format: "2027-01-10"
  availabilities?: PlaceAvailabilityDTO[]; // Disponibilités spécifiques par date
  characteristics?: Array<{ name: string; value: string }>;
  minDays?: number; // Nombre de jours minimum requis pour une réservation
  minHours?: number; // Nombre d'heures minimum requis pour une réservation
  truckAccessDistance?: number; // Distance d'accès camion en mètres
  accessibilityRemarks?: string; // Remarques d'accessibilité
  // Booléens pour activer/désactiver les prix
  hourPriceActive?: boolean;
  dayPriceActive?: boolean;
  weekPriceActive?: boolean;
  monthPriceActive?: boolean;
  // Délai d'annulation
  cancellationDeadlineDays?: number; // null|0: pas de restriction, 1-90: jours requis, -1: non annulable
  // Politique d'annulation
  cancellationPolicy?: "FLEXIBLE" | "MODERATE" | "STRICT"; // Politique d'annulation
  // Réservation instantanée
  instantBooking?: boolean; // Si true, les réservations sont automatiquement confirmées (CONFIRMED), sinon elles sont en attente (PENDING)
  // Types de véhicules acceptés (liste d'énum: MOTO, VOITURE, CAMION, CARAVANE, CAMPING_CAR)
  acceptedVehicleTypes?: string[];
}

export interface SearchPlacesParams {
  city?: string;
  type?: "PARKING" | "CAVE" | "STORAGE_SPACE" | "BOX" | "WAREHOUSE";
  title?: string; // Filtre par titre du bien
  availableFrom?: string; // Format: YYYY-MM-DD
  availableTo?: string; // Format: YYYY-MM-DD
  minPrice?: number; // Prix minimum (backend: BigDecimal)
  maxPrice?: number; // Prix maximum (backend: BigDecimal)
  /** HOUR = compare pricePerHour, DAY = compare pricePerDay. Évite la comparaison mixte (estimation 8h × prix/h). */
  priceType?: 'HOUR' | 'DAY';
  // Géolocalisation (rayon)
  lat?: number; // Latitude du centre de recherche
  lng?: number; // Longitude du centre de recherche
  radius?: number; // Rayon de recherche en kilomètres
  // Caractéristiques (seront formatées en characteristics[key]=value)
  characteristics?: Record<string, string>;
  instantBooking?: boolean; // Mappé en true/false ou Oui/Non selon le backend
  freeCancellation?: boolean;
  noDeposit?: boolean; // Front: "sans caution" → backend: deposit=0
  deposit?: number; // Montant max caution (0 = sans caution), envoyé explicitement au backend
  // Pagination backend (Page Spring)
  page?: number;
  size?: number;
  // Types de véhicules acceptés (filtre recherche: au moins un des types, envoyé comme chaîne comma-separée)
  vehicleTypes?: string[]; // Ex: ['MOTO', 'VOITURE']
  [key: string]: unknown; // Pour permettre tous les filtres dynamiques
}

/** Corps de la requête POST /api/places/search (recherche optimisée) */
export interface SearchPlacesPayload {
  city?: string;
  type?: "PARKING" | "STORAGE_SPACE" | "CAVE" | "BOX" | "WAREHOUSE";
  minPrice?: number;
  maxPrice?: number;
  priceType?: "HOUR" | "DAY" | "WEEK" | "MONTH";
  instantBooking?: boolean;
  freeCancellation?: boolean;
  deposit?: number;
  availableFrom?: string; // ISO YYYY-MM-DD
  availableTo?: string;   // ISO YYYY-MM-DD
  title?: string;
  lat?: number;
  lng?: number;
  radius?: number;       // En km (nécessite lat/lng ou city)
  page?: number;         // Défaut: 0
  size?: number;         // Défaut: 20
  characteristics?: Record<string, string>; // Map dynamique (ex: LONGUEUR, LARGEUR, ACCES_24H)
  vehicleTypes?: string; // Chaîne comma-separée (ex: "MOTO,VOITURE") pour compatibilité
}

export interface AvailableFilters {
  placeTypes: string[];
  characteristics: Record<string, string[]>; // { type: [caractéristiques disponibles] }
  booleanFilters: string[];
  cities: string[];
  vehicleTypes?: string[]; // MOTO, VOITURE, CAMION, CARAVANE, CAMPING_CAR
}

export interface GetAllPlacesParams {
  page?: number; // Défaut: 0
  size?: number; // Défaut: 20
}

export interface EstimateReservationPayload {
  placeId: number;
  startDateTime: string; // ISO format
  endDateTime: string; // ISO format
  reservationType?: "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";
}

export interface CreateReservationPayload {
  placeId: number;
  clientId: number;
  startDateTime: string; // ISO format
  endDateTime: string; // ISO format
  reservationType?: "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";
  totalPrice?: number; // Montant total payé par le client
  serviceFee?: number; // Frais de service (8% par défaut)
  hostAmount?: number; // Montant net reversé à l'hôte
  /** Code promo saisi par le client (optionnel) — le back l'applique et peut recalculer le montant */
  promoCode?: string;
}

export interface UpdateReservationPayload {
  startDateTime?: string; // ISO format
  endDateTime?: string; // ISO format
  status?: string; // PENDING, CONFIRMED, CANCELLED, COMPLETED
}

export interface CreateReviewPayload {
  rating: number;
  comment: string;
  authorId: number;
  reservationId: number;
}

export interface CreateCheckoutSessionPayload {
  placeId: number;
  amount: number;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
}

// ========== RENTOALL Users API ==========
export const rentoallUsersAPI = {
  // Récupérer un profil
  getProfile: async (userId: number): Promise<UserDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}`;

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });
      return response.data;
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        console.warn(
          `⚠️ [USERS API] Profil non trouvé (404) pour userId ${userId}.`,
        );
      } else {
        console.error(
          `❌ [USERS API] Erreur lors de la récupération du profil ${userId}:`,
          error,
        );
      }
      throw error;
    }
  },

  // Récupérer les informations bancaires (IBAN / BIC) — GET /api/users/{id}/bank-info
  getBankInfo: async (userId: number): Promise<{ iban: string; bic: string }> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/bank-info`;

      const response = await axios.get<{ iban: string; bic: string }>(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });
      const data = response.data;
      return {
        iban: typeof data?.iban === "string" ? data.iban : "",
        bic: typeof data?.bic === "string" ? data.bic : "",
      };
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        return { iban: "", bic: "" };
      }
      console.error(`❌ [USERS API] Erreur getBankInfo ${userId}:`, error);
      throw error;
    }
  },

  // Mettre à jour les informations bancaires — PUT /api/users/{id}/bank-info
  updateBankInfo: async (
    userId: number,
    payload: { iban: string; bic: string }
  ): Promise<UserDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/bank-info`;

      const response = await axios.put<UserDTO>(fullURL, payload, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });
      return response.data;
    } catch (error) {
      console.error(`❌ [USERS API] Erreur updateBankInfo ${userId}:`, error);
      throw error;
    }
  },

  // Mettre à jour un profil
  updateProfile: async (
    userId: number,
    payload: UpdateUserPayload,
  ): Promise<UserDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}`;

      console.log("🔵 [USERS API] ========================================");
      console.log("🔵 [USERS API] MISE À JOUR DU PROFIL UTILISATEUR");
      console.log("🔵 [USERS API] ========================================");
      console.log("🔵 [USERS API] User ID:", userId);
      console.log("🔵 [USERS API] Endpoint:", `/users/${userId}`);
      console.log("🔵 [USERS API] Méthode: PUT");
      console.log("🔵 [USERS API] URL complète:", fullURL);
      console.log("🔵 [USERS API] Payload envoyé:", {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phoneNumber: payload.phoneNumber || "(non défini)",
        birthDate: payload.birthDate || "(non défini)",
        language: payload.language || "(non défini)",
        address: payload.address || "(non défini)",
        city: payload.city || "(non défini)",
        zipCode: payload.zipCode || "(non défini)",
        companyName: payload.companyName || "(non défini)",
        companyAddress: payload.companyAddress || "(non défini)",
        siret: payload.siret || "(non défini)",
        vatNumber: payload.vatNumber || "(non défini)",
      });
      console.log(
        "🔵 [USERS API] Payload complet (JSON):",
        JSON.stringify(payload, null, 2),
      );
      console.log("🔵 [USERS API] ========================================");

      const response = await axios.put(fullURL, payload, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [USERS API] ========================================");
      console.log("✅ [USERS API] PROFIL UTILISATEUR MIS À JOUR AVEC SUCCÈS");
      console.log("✅ [USERS API] ========================================");
      console.log("✅ [USERS API] Status HTTP:", response.status);
      console.log("✅ [USERS API] Données reçues:", response.data);
      console.log("✅ [USERS API] ========================================");

      return response.data;
    } catch (error) {
      console.error(
        `❌ [USERS API] Erreur lors de la mise à jour du profil ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Mettre à jour la photo de profil (upload de fichier)
  updateProfilePicture: async (
    userId: number,
    imageFile: File,
  ): Promise<UserDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/profile-picture`;

      console.log("🔵 [USERS API] Upload de la photo de profil:", {
        userId,
        fileName: imageFile.name,
        fileSize: imageFile.size,
        fileType: imageFile.type,
        endpoint: `/users/${userId}/profile-picture`,
        fullURL,
      });

      const formData = new FormData();
      formData.append("file", imageFile);

      const response = await axios.post(fullURL, formData, {
        headers: {
          // Ne pas définir Content-Type manuellement, axios le fera automatiquement avec le bon boundary
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [USERS API] Photo de profil mise à jour avec succès:", {
        status: response.status,
        profilePicture: response.data?.profilePicture,
      });

      return response.data;
    } catch (error) {
      console.error(
        `❌ [USERS API] Erreur lors de l'upload de la photo de profil ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Supprimer un compte
  deleteAccount: async (userId: number): Promise<void> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}`;

      await axios.delete(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });
    } catch (error) {
      console.error(
        `❌ [USERS API] Erreur lors de la suppression du compte ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Mot de passe oublié
  forgotPassword: async (email: string): Promise<void> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/forgot-password?email=${encodeURIComponent(email)}`;

      await axios.post(fullURL, null, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error(
        "❌ [USERS API] Erreur lors de la demande de mot de passe oublié:",
        error,
      );
      throw error;
    }
  },

  // Réinitialisation du mot de passe
  resetPassword: async (payload: ResetPasswordPayload): Promise<void> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/reset-password?token=${encodeURIComponent(payload.token)}&newPassword=${encodeURIComponent(payload.newPassword)}`;

      await axios.post(fullURL, null, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error(
        "❌ [USERS API] Erreur lors de la réinitialisation du mot de passe:",
        error,
      );
      throw error;
    }
  },

  // Confirmation de l'adresse email (lien envoyé par email après inscription)
  confirmEmail: async (token: string): Promise<void> => {
    const baseURLWithoutV1 = getBaseURLWithoutV1();
    const fullURL = `${baseURLWithoutV1}/users/confirm-email?token=${encodeURIComponent(token)}`;

    await axios.get(fullURL, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  },

  // Changer le mot de passe (utilisateur connecté)
  changePassword: async (
    userId: number,
    payload: ChangePasswordPayload,
  ): Promise<UserDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/password`;

      console.log("🔵 [USERS API] ========================================");
      console.log("🔵 [USERS API] CHANGEMENT DE MOT DE PASSE");
      console.log("🔵 [USERS API] ========================================");
      console.log("🔵 [USERS API] User ID:", userId);
      console.log("🔵 [USERS API] Endpoint:", `/users/${userId}/password`);
      console.log("🔵 [USERS API] Méthode: PUT");
      console.log("🔵 [USERS API] URL complète:", fullURL);
      console.log("🔵 [USERS API] Payload envoyé:", {
        oldPassword: "***",
        newPassword: "***",
        confirmPassword: "***",
      });
      console.log("🔵 [USERS API] ========================================");

      const response = await axios.put(fullURL, payload, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [USERS API] ========================================");
      console.log("✅ [USERS API] MOT DE PASSE CHANGÉ AVEC SUCCÈS");
      console.log("✅ [USERS API] ========================================");
      console.log("✅ [USERS API] Status HTTP:", response.status);
      console.log("✅ [USERS API] ========================================");

      return response.data;
    } catch (error) {
      console.error(
        `❌ [USERS API] Erreur lors du changement de mot de passe pour ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Mettre à jour les préférences de notification
  // PATCH /api/users/{id}/notification-preferences
  updateNotificationPreferences: async (
    userId: number,
    preferences: {
      emailNotificationBooking?: boolean;
      emailNotificationMessage?: boolean;
      emailNotificationPromotion?: boolean;
      pushNotificationBooking?: boolean;
      pushNotificationMessage?: boolean;
    },
  ): Promise<UserDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/notification-preferences`;

      console.log(
        "🔵 [USERS API] Mise à jour des préférences de notification:",
        {
          userId,
          preferences,
          endpoint: `/users/${userId}/notification-preferences`,
          fullURL,
        },
      );

      const response = await axios.patch(fullURL, preferences, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [USERS API] Préférences de notification mises à jour:",
        response.data,
      );
      return response.data;
    } catch (error) {
      console.error(
        "❌ [USERS API] Erreur lors de la mise à jour des préférences de notification:",
        error,
      );
      throw error;
    }
  },

  // Enregistrer le token push pour les notifications (iOS/Android)
  // POST /api/users/{userId}/device-tokens — le backend envoie les push via FCM/APNs
  // Si le backend n'a pas encore l'endpoint (404), on ignore sans crasher.
  registerDeviceToken: async (
    userId: number,
    pushToken: string,
    platform: "ios" | "android",
  ): Promise<void> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/device-tokens`;
      await axios.post(
        fullURL,
        { pushToken, platform },
        {
          headers: {
            "Content-Type": "application/json",
            ...(storage.getItem("authToken")
              ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
              : {}),
          },
        },
      );
      console.log("✅ [USERS API] Token push enregistré:", {
        userId,
        platform,
      });
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) {
        console.warn(
          "[USERS API] Endpoint device-tokens non disponible (404) — backend à implémenter",
        );
        return;
      }
      console.error("❌ [USERS API] Erreur enregistrement token push:", error);
      throw error;
    }
  },

  // Mes réservations (en tant que locataire)
  getUserReservations: async (userId: number): Promise<ReservationDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/reservations`;

      console.log("📡 [USERS API] Récupération des réservations utilisateur:", {
        userId: userId,
        endpoint: `/users/${userId}/reservations`,
        fullURL: fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [USERS API] Réservations utilisateur récupérées:",
        response.data,
      );
      return response.data;
    } catch (error) {
      console.error(
        `❌ [USERS API] Erreur lors de la récupération des réservations utilisateur ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Mes biens (propriétaire)
  getMyPlaces: async (userId: number): Promise<PlaceDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/places`;

      console.log("📡 [USERS API] ===== DÉBUT getMyPlaces =====");
      console.log("📡 [USERS API] userId:", userId);
      console.log("📡 [USERS API] baseURLWithoutV1:", baseURLWithoutV1);
      console.log("📡 [USERS API] fullURL:", fullURL);
      console.log(
        "📡 [USERS API] Vérification: URL contient /v1?",
        fullURL.includes("/v1"),
      );

      const authToken = storage.getItem("authToken");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      console.log("📡 [USERS API] Headers:", headers);
      console.log("📡 [USERS API] Envoi de la requête GET...");

      const response = await axios.get(fullURL, { headers });

      console.log("✅ [USERS API] Réponse reçue!");
      console.log("✅ [USERS API] Status:", response.status);
      console.log("✅ [USERS API] Données:", response.data);
      console.log("✅ [USERS API] ===== FIN getMyPlaces (SUCCÈS) =====");

      return response.data;
    } catch (error) {
      console.error("❌ [USERS API] ===== ERREUR getMyPlaces =====");
      console.error(`❌ [USERS API] userId: ${userId}`);
      const errorObj = error as {
        message?: string;
        response?: {
          status?: number;
          statusText?: string;
          data?: unknown;
        };
        config?: {
          url?: string;
          method?: string;
        };
      };
      console.error("❌ [USERS API] Message:", errorObj?.message);
      console.error("❌ [USERS API] Status:", errorObj?.response?.status);
      console.error("❌ [USERS API] URL utilisée:", errorObj?.config?.url);
      console.error("❌ [USERS API] ===== FIN getMyPlaces (ERREUR) =====");
      throw error;
    }
  },

  // ========== Authentification à deux facteurs (2FA) ==========

  // Démarrer la configuration du 2FA
  start2FASetup: async (
    userId: number,
  ): Promise<{ otpAuthUrl: string; secret: string }> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/me/2fa/setup/start?userId=${userId}`;

      const response = await axios.post(fullURL, null, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });
      return response.data;
    } catch (error) {
      console.error(
        `❌ [USERS API] Erreur lors du démarrage de la configuration 2FA pour ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Vérifier et activer le 2FA
  verify2FASetup: async (
    userId: number,
    code: string,
  ): Promise<{ backupCodes: string[] }> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/me/2fa/setup/verify?userId=${userId}`;

      const response = await axios.post(
        fullURL,
        { code },
        {
          headers: {
            "Content-Type": "application/json",
            ...(storage.getItem("authToken")
              ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
              : {}),
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error(
        `❌ [USERS API] Erreur lors de la vérification du code 2FA pour ${userId}:`,
        error,
      );
      throw error;
    }
  },

  // Désactiver le 2FA
  disable2FA: async (
    userId: number,
    password: string,
    code: string,
  ): Promise<void> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/me/2fa/disable?userId=${userId}`;

      await axios.post(
        fullURL,
        { password, code },
        {
          headers: {
            "Content-Type": "application/json",
            ...(storage.getItem("authToken")
              ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
              : {}),
          },
        },
      );
    } catch (error) {
      console.error(
        `❌ [USERS API] Erreur lors de la désactivation du 2FA pour ${userId}:`,
        error,
      );
      throw error;
    }
  },
};

// ========== RENTOALL Favorites API (Places) ==========
export const rentoallFavoritesAPI = {
  // Ajouter aux favoris (simple)
  addFavorite: async (userId: number, placeId: number): Promise<void> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/favorites/${placeId}`;

      console.log("🔵 [FAVORITES API] Ajout aux favoris:", {
        userId: userId,
        placeId: placeId,
        endpoint: `/users/${userId}/favorites/${placeId}`,
        fullURL: fullURL,
      });

      await axios.post(
        fullURL,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            ...(storage.getItem("authToken")
              ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
              : {}),
          },
        },
      );

      console.log("✅ [FAVORITES API] Favori ajouté avec succès");
    } catch (error) {
      console.error(
        `❌ [FAVORITES API] Erreur lors de l'ajout aux favoris:`,
        error,
      );
      throw error;
    }
  },

  // Supprimer des favoris
  removeFavorite: async (userId: number, placeId: number): Promise<void> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/favorites/${placeId}`;

      console.log("🔵 [FAVORITES API] Suppression des favoris:", {
        userId: userId,
        placeId: placeId,
        endpoint: `/users/${userId}/favorites/${placeId}`,
        fullURL: fullURL,
      });

      await axios.delete(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [FAVORITES API] Favori supprimé avec succès");
    } catch (error) {
      console.error(
        `❌ [FAVORITES API] Erreur lors de la suppression des favoris:`,
        error,
      );
      throw error;
    }
  },

  // Lister mes favoris
  getFavorites: async (userId: number): Promise<PlaceDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/favorites`;

      console.log("🔵 [FAVORITES API] Récupération des favoris:", {
        userId: userId,
        endpoint: `/users/${userId}/favorites`,
        fullURL: fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [FAVORITES API] Favoris récupérés:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        `❌ [FAVORITES API] Erreur lors de la récupération des favoris:`,
        error,
      );
      throw error;
    }
  },

  // Créer un dossier de favoris
  createFolder: async (
    userId: number,
    name: string,
  ): Promise<FavoriteFolderDTO> => {
    try {
      const response = await api.post(`/users/${userId}/folders`, null, {
        params: { name },
      });
      return response.data;
    } catch (error) {
      console.error(
        `❌ [FAVORITES API] Erreur lors de la création du dossier:`,
        error,
      );
      throw error;
    }
  },

  // Ajouter un bien à un dossier
  addToFolder: async (
    userId: number,
    folderId: number,
    placeId: number,
  ): Promise<void> => {
    try {
      await api.post(
        `/users/${userId}/folders/${folderId}/favorites/${placeId}`,
      );
    } catch (error) {
      console.error(
        `❌ [FAVORITES API] Erreur lors de l'ajout au dossier:`,
        error,
      );
      throw error;
    }
  },

  // Retirer un bien d'un dossier
  removeFromFolder: async (
    userId: number,
    folderId: number,
    placeId: number,
  ): Promise<void> => {
    try {
      await api.delete(
        `/users/${userId}/folders/${folderId}/favorites/${placeId}`,
      );
    } catch (error) {
      console.error(
        `❌ [FAVORITES API] Erreur lors de la suppression du dossier:`,
        error,
      );
      throw error;
    }
  },

  // Lister les dossiers de l'utilisateur
  getFolders: async (userId: number): Promise<FavoriteFolderDTO[]> => {
    try {
      const response = await api.get(`/users/${userId}/folders`);
      return response.data;
    } catch (error) {
      console.error(
        `❌ [FAVORITES API] Erreur lors de la récupération des dossiers:`,
        error,
      );
      throw error;
    }
  },
};

// ========== Investor Inquiry API ==========
export const investorInquiryAPI = {
  // Soumettre une demande d'investissement
  submit: async (inquiry: InvestorInquiryDTO): Promise<void> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/investor-inquiries`;

      console.log(
        "🔵 [INVESTOR INQUIRY API] Soumission d'une demande d'investissement:",
        {
          inquiry: inquiry,
          endpoint: "/investor-inquiries",
          fullURL: fullURL,
        },
      );

      await axios.post(fullURL, inquiry, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(
        "✅ [INVESTOR INQUIRY API] Demande d'investissement soumise avec succès",
      );
    } catch (error) {
      console.error(
        "❌ [INVESTOR INQUIRY API] Erreur lors de la soumission de la demande:",
        error,
      );
      throw error;
    }
  },
};

// ========== Places API ==========
export const placesAPI = {
  // Récupérer tous les biens (liste paginée)
  getAll: async (params?: GetAllPlacesParams): Promise<PlaceDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const queryParams = new URLSearchParams();
      if (params?.page !== undefined)
        queryParams.append("page", params.page.toString());
      if (params?.size !== undefined)
        queryParams.append("size", params.size.toString());

      const endpoint = `/places${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const fullURL = `${baseURLWithoutV1}${endpoint}`;

      console.log("🔵 [PLACES API] Récupération de tous les biens:", {
        params: params,
        endpoint: endpoint,
        fullURL: fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
        timeout: 60000, // 60s pour Render cold start (évite Broken Pipe quand le client coupe avant la réponse)
      });

      // Logs détaillés pour debug iOS/simulateur - payload de retour
      console.log(
        "📦 [PLACES API] ========== PAYLOAD RETOUR (iOS debug) ==========",
      );
      console.log(
        "📦 [PLACES API] Status HTTP:",
        response.status,
        response.statusText,
      );
      console.log(
        "📦 [PLACES API] typeof response.data:",
        typeof response.data,
      );
      console.log(
        "📦 [PLACES API] Array.isArray(response.data):",
        Array.isArray(response.data),
      );
      console.log(
        "📦 [PLACES API] response.data brut:",
        JSON.stringify(response.data)?.substring?.(0, 500),
      );
      if (response.data && typeof response.data === "object") {
        console.log(
          "📦 [PLACES API] Clés de response.data:",
          Object.keys(response.data),
        );
        if ("content" in response.data) {
          console.log(
            "📦 [PLACES API] response.data.content length:",
            (response.data as { content?: unknown[] }).content?.length ?? "N/A",
          );
        }
      }
      const result = Array.isArray(response.data)
        ? response.data
        : response.data?.content || [];
      console.log(
        "📦 [PLACES API] Nombre de biens retournés:",
        Array.isArray(result) ? result.length : 0,
      );
      console.log(
        "📦 [PLACES API] ================================================",
      );

      return result;
    } catch (error: unknown) {
      console.error(
        "❌ [PLACES API] Erreur lors de la récupération des biens:",
        error,
      );
      if (error && typeof error === "object" && "response" in error) {
        const err = error as { response?: { status?: number; data?: unknown } };
        console.error(
          "❌ [PLACES API] Erreur response.status:",
          err.response?.status,
        );
        console.error(
          "❌ [PLACES API] Erreur response.data:",
          err.response?.data,
        );
      }
      throw error;
    }
  },

  // Créer une annonce
  create: async (
    payload: CreatePlacePayload,
    videoFile?: File,
  ): Promise<PlaceDTO> => {
    try {
      console.log("📡 [PLACES API] ===== DÉBUT DE L'APPEL API =====");
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/places`;

      const authToken = storage.getItem("authToken");

      // Créer FormData pour multipart/form-data
      const formData = new FormData();

      // Retirer videoUrl du payload JSON pour ne pas envoyer de doublon
      const { videoUrl, ...rest } = payload;

      // Ajouter le JSON de la place dans une partie appelée "place"
      formData.append("place", JSON.stringify(rest));

      // Ajouter le fichier vidéo dans une partie appelée "video" si présent
      if (videoFile) {
        console.log("📡 [PLACES API] Ajout du fichier vidéo:", {
          name: videoFile.name,
          size: videoFile.size,
          type: videoFile.type,
        });
        formData.append("video", videoFile);
      }

      const headers: Record<string, string> = {};

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      // Ne pas définir Content-Type manuellement pour FormData
      // Axios le définira automatiquement avec le bon boundary

      console.log("📡 [PLACES API] Configuration de l'appel:", {
        endpoint: "/places",
        baseURLWithoutV1: baseURLWithoutV1,
        fullURL: fullURL,
        hasAuthToken: !!authToken,
        contentType: "multipart/form-data",
        hasVideoFile: !!videoFile,
      });

      console.log(
        "📡 [PLACES API] Payload JSON (sans videoUrl):",
        JSON.stringify(rest, null, 2),
      );
      console.log("📡 [PLACES API] Détails du payload:", {
        type: rest.type,
        address: rest.address,
        city: rest.city,
        ownerId: rest.ownerId,
        pricePerDay: rest.pricePerDay,
        pricePerMonth: rest.pricePerMonth,
        hourPriceActive: rest.hourPriceActive,
        dayPriceActive: rest.dayPriceActive,
        weekPriceActive: rest.weekPriceActive,
        monthPriceActive: rest.monthPriceActive,
        photosCount: rest.photos?.length || 0,
        characteristicsCount: rest.characteristics?.length || 0,
        hasVideo: !!videoFile,
      });

      console.log("📡 [PLACES API] Envoi de la requête POST avec FormData...");
      const response = await axios.post(fullURL, formData, {
        headers: headers,
      });

      console.log("✅ [PLACES API] Réponse reçue du backend!");
      console.log("✅ [PLACES API] Status HTTP:", response.status);
      console.log("✅ [PLACES API] Status Text:", response.statusText);
      console.log(
        "✅ [PLACES API] Données reçues:",
        JSON.stringify(response.data, null, 2),
      );
      console.log("✅ [PLACES API] ===== FIN DE L'APPEL API (SUCCÈS) =====");

      return response.data;
    } catch (error) {
      console.error("❌ [PLACES API] ===== ERREUR DANS L'APPEL API =====");
      console.error("❌ [PLACES API] Type d'erreur:", typeof error);
      console.error("❌ [PLACES API] Erreur complète:", error);

      const errorObj = error as {
        message?: string;
        response?: {
          status?: number;
          statusText?: string;
          data?: {
            message?: string;
            error?: string;
          };
        };
        request?: unknown;
        config?: {
          url?: string;
          method?: string;
          headers?: unknown;
          data?: unknown;
        };
      };

      console.error("❌ [PLACES API] Message:", errorObj?.message);
      console.error("❌ [PLACES API] Status HTTP:", errorObj?.response?.status);
      console.error(
        "❌ [PLACES API] Status Text:",
        errorObj?.response?.statusText,
      );
      console.error(
        "❌ [PLACES API] Données d'erreur:",
        errorObj?.response?.data,
      );

      // Log spécifique pour les erreurs 400 (Bad Request)
      if (errorObj?.response?.status === 400) {
        console.error("❌ [PLACES API] Erreur 400 Bad Request détectée");
        console.error(
          "❌ [PLACES API] Message du backend:",
          errorObj?.response?.data?.message || errorObj?.response?.data?.error,
        );
      }

      console.error("❌ [PLACES API] Request:", errorObj?.request);
      console.error("❌ [PLACES API] Config:", {
        url: errorObj?.config?.url,
        method: errorObj?.config?.method,
        headers: errorObj?.config?.headers,
        data: errorObj?.config?.data,
      });
      console.error("❌ [PLACES API] ===== FIN DE L'APPEL API (ERREUR) =====");

      // S'assurer que l'erreur contient bien les données de réponse pour que le composant puisse les extraire
      throw error;
    }
  },

  // Récupérer un bien par son ID (avec disponibilités et créneaux occupés)
  getById: async (placeId: number): Promise<PlaceDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const endpoint = `/places/${placeId}`;
      const fullURL = `${baseURLWithoutV1}${endpoint}`;

      console.log("🔵 [PLACES API] Récupération d'un bien:", {
        placeId: placeId,
        endpoint: endpoint,
        baseURLWithoutV1: baseURLWithoutV1,
        fullURL: fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [PLACES API] Bien récupéré:", response.data);
      console.log(
        "✅ [PLACES API] Disponibilités:",
        response.data.availabilities,
      );
      console.log(
        "✅ [PLACES API] Créneaux occupés:",
        response.data.occupiedSlots,
      );
      return response.data;
    } catch (error) {
      console.error(
        `❌ [PLACES API] Erreur lors de la récupération du bien ${placeId}:`,
        error,
      );
      throw error;
    }
  },

  // Récupérer les caractéristiques disponibles pour un type de bien
  // Le backend peut retourner soit un tableau de strings (noms), soit un tableau d'objets avec métadonnées complètes
  getCharacteristics: async (
    placeType: "PARKING" | "STORAGE_SPACE" | "CAVE",
  ): Promise<
    Array<
      | string
      | {
          key: string;
          label: string;
          type: "text" | "number" | "select";
          placeholder?: string;
          options?: string[];
          required?: boolean;
        }
    >
  > => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const endpoint = `/places/characteristics/${placeType}`;
      const fullURL = `${baseURLWithoutV1}${endpoint}`;

      console.log("🔵 [PLACES API] Récupération des caractéristiques:", {
        placeType: placeType,
        endpoint: endpoint,
        fullURL: fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [PLACES API] Caractéristiques récupérées:",
        response.data,
      );
      return response.data;
    } catch (error) {
      console.error(
        `❌ [PLACES API] Erreur lors de la récupération des caractéristiques pour ${placeType}:`,
        error,
      );
      throw error;
    }
  },

  // Récupérer les filtres disponibles
  getAvailableFilters: async (): Promise<AvailableFilters> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/places/filters`;

      console.log("🔵 [PLACES API] Récupération des filtres disponibles:", {
        endpoint: "/places/filters",
        fullURL: fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("✅ [PLACES API] Filtres disponibles:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [PLACES API] Erreur lors de la récupération des filtres:",
        error,
      );
      throw error;
    }
  },

  // Rechercher des biens (POST /api/places/search — recherche optimisée, évite les URLs trop longues)
  search: async (params?: SearchPlacesParams): Promise<PlaceDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const endpoint = "/places/search";
      const fullURL = `${baseURLWithoutV1}${endpoint}`;

      // Construire le corps POST (uniquement les champs fournis)
      const body: SearchPlacesPayload = {};

      if (params?.city) body.city = params.city;
      if (params?.type) body.type = params.type;
      if (params?.title) body.title = params.title;
      if (params?.availableFrom) body.availableFrom = params.availableFrom;
      if (params?.availableTo) body.availableTo = params.availableTo;
      if (params?.minPrice !== undefined && params.minPrice !== null) body.minPrice = params.minPrice;
      if (params?.maxPrice !== undefined && params.maxPrice !== null) body.maxPrice = params.maxPrice;
      if (params?.priceType === "HOUR" || params?.priceType === "DAY") body.priceType = params.priceType;

      if (params?.lat !== undefined) body.lat = params.lat;
      if (params?.lng !== undefined) body.lng = params.lng;
      if (params?.radius !== undefined) body.radius = params.radius;

      if (params?.page !== undefined) body.page = params.page;
      if (params?.size !== undefined) body.size = params.size;

      if (params?.instantBooking === true) body.instantBooking = true;
      else if (params?.instantBooking === false) body.instantBooking = false;
      if (params?.freeCancellation === true) body.freeCancellation = true;
      else if (params?.freeCancellation === false) body.freeCancellation = false;

      if (params?.deposit !== undefined && params.deposit !== null) body.deposit = params.deposit;
      else if (params?.noDeposit === true) body.deposit = 0;

      if (params?.vehicleTypes && params.vehicleTypes.length > 0)
        body.vehicleTypes = params.vehicleTypes.join(",");

      if (params?.characteristics && Object.keys(params.characteristics).length > 0) {
        const charMap: Record<string, string> = {};
        Object.entries(params.characteristics).forEach(([key, value]) => {
          const str = String(value);
          charMap[key] = str === "true" ? "true" : str === "false" ? "false" : str;
        });
        body.characteristics = charMap;
      }

      // Paramètres dynamiques (hors liste standard) → characteristics
      const standardKeys = [
        "city", "type", "title", "availableFrom", "availableTo",
        "minPrice", "maxPrice", "priceType", "instantBooking", "freeCancellation",
        "noDeposit", "deposit", "characteristics", "vehicleTypes",
        "lat", "lng", "radius", "page", "size",
      ];
      if (params && typeof params === "object") {
        Object.entries(params).forEach(([key, value]) => {
          if (standardKeys.includes(key) || value === undefined || value === null || value === "") return;
          if (!body.characteristics) body.characteristics = {};
          body.characteristics[key] = String(value);
        });
      }

      console.log("🔵 [PLACES API] Recherche de biens (POST)", { endpoint: endpoint, fullURL: fullURL, body });
      const response = await axios.post(fullURL, body, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
        timeout: 60000,
      });

      console.log("✅ [PLACES API] Biens trouvés:", response.data);
      return Array.isArray(response.data)
        ? response.data
        : response.data?.content || [];
    } catch (error) {
      console.error("❌ [PLACES API] Erreur lors de la recherche:", error);
      throw error;
    }
  },

  // Mettre à jour le calendrier (disponibilités/prix spécifiques)
  // Utilise POST /places/{id}/calendar (synchrone, 200 OK) pour que les données soient à jour
  // avant tout rechargement. Ne pas utiliser /availabilities (asynchrone, 202 Accepted).
  updateCalendar: async (
    placeId: number,
    availabilities: PlaceAvailabilityDTO[],
  ): Promise<PlaceAvailabilityDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const endpoint = `/places/${placeId}/calendar`;
      const fullURL = `${baseURLWithoutV1}${endpoint}`;

      // Logs détaillés pour le backend
      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      console.log("🔵 [PLACES API] Mise à jour du calendrier (POST /calendar, synchrone) - DÉBUT");
      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      console.log("📍 [BACKEND CALL] Endpoint appelé:", endpoint);
      console.log("📍 [BACKEND CALL] Méthode HTTP: POST");
      console.log("📍 [BACKEND CALL] URL complète:", fullURL);
      console.log("📍 [BACKEND CALL] Place ID:", placeId);
      console.log(
        "📍 [BACKEND CALL] Nombre de disponibilités:",
        availabilities.length,
      );

      // Analyser les prix personnalisés
      const availabilitiesWithPrice = availabilities.filter(
        (a) => a.customPricePerDay !== undefined,
      );
      const availabilitiesWithHourlyPrice = availabilities.filter(
        (a) => a.customPricePerHour !== undefined,
      );

      console.log(
        "💰 [BACKEND CALL] Disponibilités avec prix journalier personnalisé:",
        availabilitiesWithPrice.length,
      );
      if (availabilitiesWithPrice.length > 0) {
        console.log(
          "💰 [BACKEND CALL] Détails des prix journaliers:",
          availabilitiesWithPrice.map((a) => ({
            date: a.date,
            customPricePerDay: a.customPricePerDay,
            available: a.available,
          })),
        );
      }

      console.log(
        "💰 [BACKEND CALL] Disponibilités avec prix horaire personnalisé:",
        availabilitiesWithHourlyPrice.length,
      );
      if (availabilitiesWithHourlyPrice.length > 0) {
        console.log(
          "💰 [BACKEND CALL] Détails des prix horaires:",
          availabilitiesWithHourlyPrice.map((a) => ({
            date: a.date,
            customPricePerHour: a.customPricePerHour,
            available: a.available,
          })),
        );
      }

      // Afficher un échantillon des données envoyées
      console.log(
        "📦 [BACKEND CALL] Payload complet (échantillon des 5 premières):",
        availabilities.slice(0, 5).map((a) => ({
          date: a.date,
          available: a.available,
          customPricePerDay: a.customPricePerDay,
          customPricePerHour: a.customPricePerHour,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
      );

      const authToken = storage.getItem("authToken");
      console.log("🔐 [BACKEND CALL] Token présent:", !!authToken);
      console.log(
        "═══════════════════════════════════════════════════════════",
      );

      const response = await axios.post(fullURL, availabilities, {
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });

      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      console.log("✅ [PLACES API] Calendrier mis à jour - SUCCÈS (200 OK, synchrone)");
      console.log("✅ [BACKEND RESPONSE] Status:", response.status);
      console.log("✅ [BACKEND RESPONSE] Données reçues:", response.data);
      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      return response.data;
    } catch (error) {
      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      console.error(
        "❌ [PLACES API] Erreur lors de la mise à jour du calendrier",
      );
      console.error("❌ [BACKEND ERROR] Erreur complète:", error);
      const errorObj = error as {
        response?: {
          status?: number;
          data?: unknown;
          headers?: unknown;
        };
        message?: string;
        request?: unknown;
      };
      console.error(
        "❌ [BACKEND ERROR] Status HTTP:",
        errorObj?.response?.status,
      );
      console.error(
        "❌ [BACKEND ERROR] Données d'erreur:",
        errorObj?.response?.data,
      );
      console.error(
        "❌ [BACKEND ERROR] Headers de réponse:",
        errorObj?.response?.headers,
      );
      console.error("❌ [BACKEND ERROR] Message:", errorObj?.message);
      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      throw error;
    }
  },

  // Récupérer le calendrier (disponibilités/prix spécifiques)
  getCalendar: async (
    placeId: number,
    start?: string,
    end?: string,
  ): Promise<PlaceAvailabilityDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const queryParams = new URLSearchParams();
      if (start) queryParams.append("start", start);
      if (end) queryParams.append("end", end);

      const fullURL = `${baseURLWithoutV1}/places/${placeId}/calendar${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

      console.log("🔵 [PLACES API] Récupération du calendrier:", {
        placeId: placeId,
        start: start,
        end: end,
        endpoint: `/places/${placeId}/calendar${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
        fullURL: fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [PLACES API] Calendrier récupéré:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        `❌ [PLACES API] Erreur lors de la récupération du calendrier:`,
        error,
      );
      throw error;
    }
  },

  /** Récupère le calendrier complet d'un bien (availabilities + occupiedSlots) pour une plage de dates */
  getPlaceCalendar: async (
    placeId: number,
    start: string,
    end: string,
  ): Promise<PlaceCalendarDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const queryParams = new URLSearchParams();
      queryParams.append("start", start);
      queryParams.append("end", end);

      const fullURL = `${baseURLWithoutV1}/places/${placeId}/calendar?${queryParams.toString()}`;

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      const data = response.data;
      return {
        placeId: data?.placeId,
        availabilities: data?.availabilities ?? [],
        occupiedSlots: data?.occupiedSlots ?? [],
        availableFrom: data?.availableFrom,
        availableTo: data?.availableTo,
      };
    } catch (error) {
      console.error(
        `❌ [PLACES API] Erreur getPlaceCalendar:`,
        error,
      );
      throw error;
    }
  },

  // Calendrier complet du propriétaire (vue d'ensemble)
  getOwnerCalendarOverview: async (userId: number): Promise<PlaceDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      // Ajouter un timestamp pour éviter le cache du navigateur
      const timestamp = Date.now();
      const fullURL = `${baseURLWithoutV1}/places/owner/${userId}/calendar-overview?_t=${timestamp}`;

      console.log(
        "🔵 [PLACES API] Récupération du calendrier du propriétaire:",
        {
          userId: userId,
          endpoint: `/places/owner/${userId}/calendar-overview`,
          fullURL: fullURL,
        },
      );

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [PLACES API] Calendrier du propriétaire récupéré:",
        response.data,
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(
        `❌ [PLACES API] Erreur lors de la récupération du calendrier du propriétaire:`,
        error,
      );
      throw error;
    }
  },

  // Mettre à jour un bien
  update: async (
    placeId: number,
    payload: Partial<CreatePlacePayload>,
  ): Promise<PlaceDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/places/${placeId}`;

      console.log("🔵 [PLACES API] ===== DÉBUT MISE À JOUR ANNONCE =====");
      console.log("🔵 [PLACES API] placeId:", placeId);
      console.log("🔵 [PLACES API] endpoint:", `/places/${placeId}`);
      console.log("🔵 [PLACES API] fullURL:", fullURL);
      console.log("🔵 [PLACES API] Payload complet:", payload);
      console.log("💰 [PLACES API] Détails tarification dans le payload:", {
        pricePerHour: payload.pricePerHour,
        pricePerDay: payload.pricePerDay,
        pricePerWeek: payload.pricePerWeek,
        pricePerMonth: payload.pricePerMonth,
        hourPriceActive: payload.hourPriceActive,
        dayPriceActive: payload.dayPriceActive,
        weekPriceActive: payload.weekPriceActive,
        monthPriceActive: payload.monthPriceActive,
      });
      console.log(
        "🔵 [PLACES API] Payload JSON stringifié:",
        JSON.stringify(payload, null, 2),
      );

      const response = await axios.put(fullURL, payload, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [PLACES API] Réponse HTTP status:", response.status);
      console.log(
        "✅ [PLACES API] Réponse complète du backend:",
        response.data,
      );
      console.log("💰 [PLACES API] Tarification dans la réponse:", {
        pricePerHour: response.data.pricePerHour,
        pricePerDay: response.data.pricePerDay,
        pricePerWeek: response.data.pricePerWeek,
        pricePerMonth: response.data.pricePerMonth,
        hourPriceActive: response.data.hourPriceActive,
        dayPriceActive: response.data.dayPriceActive,
        weekPriceActive: response.data.weekPriceActive,
        monthPriceActive: response.data.monthPriceActive,
      });
      console.log("✅ [PLACES API] ===== FIN MISE À JOUR ANNONCE =====");
      return response.data;
    } catch (error) {
      console.error(
        "❌ [PLACES API] Erreur lors de la mise à jour de l'annonce:",
        error,
      );
      throw error;
    }
  },

  // Modifier le statut d'un bien
  updateStatus: async (placeId: number, status: string): Promise<PlaceDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/places/${placeId}/status?status=${encodeURIComponent(status)}`;

      console.log("🔵 [PLACES API] Modification du statut:", {
        placeId: placeId,
        status: status,
        fullURL: fullURL,
      });

      const response = await axios.patch(fullURL, null, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [PLACES API] Statut modifié:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [PLACES API] Erreur lors de la modification du statut:",
        error,
      );
      throw error;
    }
  },

  // Activer/Désactiver un bien
  updateActive: async (placeId: number, active: boolean): Promise<PlaceDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/places/${placeId}/active?active=${active}`;

      console.log("🔵 [PLACES API] Modification de l'activation:", {
        placeId: placeId,
        active: active,
        fullURL: fullURL,
      });

      const response = await axios.patch(fullURL, null, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [PLACES API] Activation modifiée:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [PLACES API] Erreur lors de la modification de l'activation:",
        error,
      );
      throw error;
    }
  },

  // Mettre à jour les prix d'un bien
  updatePrices: async (
    placeId: number,
    prices: {
      pricePerHour?: number;
      pricePerDay?: number;
      pricePerWeek?: number;
      pricePerMonth?: number;
    },
  ): Promise<PlaceDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/places/${placeId}/prices`;

      console.log("🔵 [PLACES API] Mise à jour des prix:", {
        placeId: placeId,
        prices: prices,
        fullURL: fullURL,
      });

      const response = await axios.patch(fullURL, prices, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [PLACES API] Prix mis à jour:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [PLACES API] Erreur lors de la mise à jour des prix:",
        error,
      );
      throw error;
    }
  },

  // Récupérer les messages automatisés d'un bien
  getAutomatedMessages: async (
    placeId: number,
  ): Promise<AutomatedMessageDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/places/${placeId}/automated-messages`;

      console.log("🔵 [PLACES API] Récupération des messages automatisés:", {
        placeId: placeId,
        endpoint: `/places/${placeId}/automated-messages`,
        fullURL: fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [PLACES API] Messages automatisés récupérés:",
        response.data,
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(
        "❌ [PLACES API] Erreur lors de la récupération des messages automatisés:",
        error,
      );
      // Si l'endpoint n'existe pas encore, retourner un tableau vide
      return [];
    }
  },

  // Configurer les messages automatisés d'un bien
  updateAutomatedMessages: async (
    placeId: number,
    messages: AutomatedMessageDTO[],
  ): Promise<AutomatedMessageDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/places/${placeId}/automated-messages`;

      console.log("🔵 [PLACES API] Mise à jour des messages automatisés:", {
        placeId: placeId,
        messagesCount: messages.length,
        messages: messages,
        endpoint: `/places/${placeId}/automated-messages`,
        fullURL: fullURL,
      });

      const response = await axios.post(fullURL, messages, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [PLACES API] Messages automatisés mis à jour:",
        response.data,
      );
      return Array.isArray(response.data) ? response.data : messages;
    } catch (error) {
      console.error(
        "❌ [PLACES API] Erreur lors de la mise à jour des messages automatisés:",
        error,
      );
      throw error;
    }
  },

  // Supprimer une annonce
  delete: async (placeId: number): Promise<void> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/places/${placeId}`;

      console.log("🔵 [PLACES API] Suppression d'une annonce:", {
        placeId: placeId,
        endpoint: `/places/${placeId}`,
        fullURL: fullURL,
      });

      const response = await axios.delete(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [PLACES API] Annonce supprimée avec succès");
    } catch (error) {
      console.error(
        "❌ [PLACES API] Erreur lors de la suppression de l'annonce:",
        error,
      );
      const errorObj = error as {
        response?: {
          status?: number;
          data?: {
            message?: string;
          };
        };
        message?: string;
      };

      // Si le bien a des réservations actives, l'API renverra une erreur
      if (
        errorObj?.response?.status === 400 ||
        errorObj?.response?.status === 409
      ) {
        const errorMessage =
          errorObj?.response?.data?.message ||
          errorObj?.message ||
          "Impossible de supprimer cette annonce car elle a des réservations actives. Veuillez annuler les réservations avant de supprimer.";
        throw new Error(errorMessage);
      }

      throw error;
    }
  },
};

// ========== Reservations API ==========
export const reservationsAPI = {
  // Estimer le prix d'une réservation
  estimate: async (payload: EstimateReservationPayload): Promise<number> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reservations/estimate`;

      console.log("🔵 [RESERVATIONS API] Estimation du prix:", {
        endpoint: "/reservations/estimate",
        fullURL: fullURL,
        payload: payload,
      });

      const response = await axios.post(fullURL, payload, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [RESERVATIONS API] Prix estimé:", response.data);
      return typeof response.data === "number"
        ? response.data
        : parseFloat(response.data);
    } catch (error) {
      console.error(
        "❌ [RESERVATIONS API] Erreur lors de l'estimation du prix:",
        error,
      );
      throw error;
    }
  },

  // Créer une réservation
  create: async (
    payload: CreateReservationPayload,
  ): Promise<ReservationDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reservations`;

      console.log("🔵 [RESERVATIONS API] Création d'une réservation:", {
        endpoint: "/reservations",
        fullURL: fullURL,
        payload: payload,
      });

      const response = await axios.post(fullURL, payload, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [RESERVATIONS API] Réservation créée:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [RESERVATIONS API] Erreur lors de la création de la réservation:",
        error,
      );
      throw error;
    }
  },

  // Détails d'une réservation
  getById: async (reservationId: number): Promise<ReservationDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reservations/${reservationId}`;

      console.log("🔵 [RESERVATIONS API] Récupération de la réservation:", {
        reservationId: reservationId,
        endpoint: `/reservations/${reservationId}`,
        fullURL: fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [RESERVATIONS API] Réservation récupérée:",
        response.data,
      );
      return response.data;
    } catch (error) {
      console.error(
        `❌ [RESERVATIONS API] Erreur lors de la récupération de la réservation ${reservationId}:`,
        error,
      );
      throw error;
    }
  },

  // Mes réservations (client)
  getClientReservations: async (
    clientId: number,
  ): Promise<ReservationDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reservations/client/${clientId}`;

      console.log(
        "🔵 [RESERVATIONS API] Récupération des réservations du client:",
        {
          clientId: clientId,
          endpoint: `/reservations/client/${clientId}`,
          fullURL: fullURL,
        },
      );

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [RESERVATIONS API] Réservations récupérées:",
        response.data,
      );
      return response.data;
    } catch (error) {
      console.error(
        `❌ [RESERVATIONS API] Erreur lors de la récupération des réservations:`,
        error,
      );
      throw error;
    }
  },

  // Réservations d'un bien
  getPlaceReservations: async (placeId: number): Promise<ReservationDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reservations/place/${placeId}`;

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });
      return response.data;
    } catch (error) {
      console.error(
        `❌ [RESERVATIONS API] Erreur lors de la récupération des réservations du bien ${placeId}:`,
        error,
      );
      throw error;
    }
  },

  // Modifier une réservation
  update: async (
    reservationId: number,
    payload: UpdateReservationPayload,
  ): Promise<ReservationDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reservations/${reservationId}`;

      console.log("🔵 [RESERVATIONS API] Modification de la réservation:", {
        reservationId: reservationId,
        payload: payload,
        fullURL: fullURL,
      });

      const response = await axios.put(fullURL, payload, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [RESERVATIONS API] Réservation modifiée:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        `❌ [RESERVATIONS API] Erreur lors de la modification de la réservation ${reservationId}:`,
        error,
      );
      throw error;
    }
  },

  // Annuler une réservation
  cancel: async (reservationId: number): Promise<ReservationDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reservations/${reservationId}/cancel`;

      console.log("🔵 [RESERVATIONS API] Annulation de la réservation:", {
        reservationId: reservationId,
        fullURL: fullURL,
      });

      const response = await axios.post(fullURL, null, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [RESERVATIONS API] Réservation annulée:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        `❌ [RESERVATIONS API] Erreur lors de l'annulation:`,
        error,
      );
      throw error;
    }
  },

  // Changer le statut d'une réservation
  updateStatus: async (
    reservationId: number,
    status: string,
  ): Promise<ReservationDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reservations/${reservationId}/status?status=${encodeURIComponent(status)}`;

      const response = await axios.patch(fullURL, null, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });
      return response.data;
    } catch (error) {
      console.error(
        `❌ [RESERVATIONS API] Erreur lors du changement de statut:`,
        error,
      );
      throw error;
    }
  },

  // Calendrier propriétaire (toutes les réservations de ses biens)
  getOwnedReservations: async (userId: number): Promise<ReservationDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/${userId}/owned-reservations`;

      console.log(
        "🔵 [RESERVATIONS API] Récupération des réservations propriétaire:",
        {
          userId: userId,
          endpoint: `/users/${userId}/owned-reservations`,
          fullURL: fullURL,
        },
      );

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [RESERVATIONS API] Réservations propriétaire récupérées:",
        response.data,
      );
      return response.data;
    } catch (error) {
      console.error(
        `❌ [RESERVATIONS API] Erreur lors de la récupération des réservations propriétaire:`,
        error,
      );
      throw error;
    }
  },

  // Estimer la différence de prix pour une modification de réservation (côté client)
  // POST /api/reservations/{id}/estimate-update — body: newStartDateTime, newEndDateTime, reservationType (HOURLY | DAILY | WEEKLY | MONTHLY)
  estimateUpdate: async (
    reservationId: number,
    startDateTime: string,
    endDateTime: string,
    reservationType: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY',
  ): Promise<number> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reservations/${reservationId}/estimate-update`;

      const payload = {
        newStartDateTime: startDateTime,
        newEndDateTime: endDateTime,
        reservationType,
      };

      console.log(
        "🔵 [RESERVATIONS API] Estimation de la modification de réservation:",
        {
          reservationId,
          endpoint: `/reservations/${reservationId}/estimate-update`,
          fullURL,
          payload,
        },
      );

      const response = await axios.post(fullURL, payload, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      const priceDifference =
        response.data?.priceDifference ?? response.data ?? 0;
      console.log(
        "✅ [RESERVATIONS API] Différence de prix calculée:",
        priceDifference,
      );
      return typeof priceDifference === 'number' ? priceDifference : 0;
    } catch (error) {
      console.error(
        `❌ [RESERVATIONS API] Erreur lors de l'estimation de la modification:`,
        error,
      );
      throw error;
    }
  },

  // Demander une modification de réservation (côté client)
  requestUpdate: async (
    reservationId: number,
    placeId: number,
    startDateTime: string,
    endDateTime: string,
  ): Promise<ReservationDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reservations/${reservationId}/request-update`;

      // Format attendu par le backend: newStartDateTime et newEndDateTime
      const payload = {
        newStartDateTime: startDateTime,
        newEndDateTime: endDateTime,
      };

      console.log(
        "🔵 [RESERVATIONS API] Demande de modification de réservation:",
        {
          reservationId: reservationId,
          endpoint: `/reservations/${reservationId}/request-update`,
          fullURL: fullURL,
          payload: payload,
        },
      );

      const response = await axios.post(fullURL, payload, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [RESERVATIONS API] Demande de modification envoyée:",
        response.data,
      );
      return response.data;
    } catch (error) {
      console.error(
        `❌ [RESERVATIONS API] Erreur lors de la demande de modification:`,
        error,
      );
      throw error;
    }
  },

  // Répondre à une demande de modification (côté hôte)
  respondUpdate: async (
    reservationId: number,
    accepted: boolean,
  ): Promise<ReservationDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reservations/${reservationId}/respond-update?accepted=${accepted}`;

      console.log(
        "🔵 [RESERVATIONS API] Réponse à la demande de modification:",
        {
          reservationId: reservationId,
          accepted: accepted,
          endpoint: `/reservations/${reservationId}/respond-update`,
          fullURL: fullURL,
        },
      );

      const response = await axios.post(fullURL, null, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [RESERVATIONS API] Réponse envoyée:", response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ [RESERVATIONS API] Erreur lors de la réponse:`, error);
      throw error;
    }
  },

  // Approuver une réservation (côté hôte)
  approveReservation: async (
    reservationId: number,
  ): Promise<ReservationDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reservations/${reservationId}/approve`;

      console.log("🔵 [RESERVATIONS API] Approbation de réservation:", {
        reservationId: reservationId,
        endpoint: `/reservations/${reservationId}/approve`,
        fullURL: fullURL,
      });

      const response = await axios.post(fullURL, null, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [RESERVATIONS API] Réservation approuvée:",
        response.data,
      );
      return response.data;
    } catch (error) {
      console.error(
        `❌ [RESERVATIONS API] Erreur lors de l'approbation:`,
        error,
      );
      throw error;
    }
  },

  // Refuser une réservation (côté hôte)
  rejectReservation: async (reservationId: number): Promise<ReservationDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reservations/${reservationId}/reject`;

      console.log("🔵 [RESERVATIONS API] Refus de réservation:", {
        reservationId: reservationId,
        endpoint: `/reservations/${reservationId}/reject`,
        fullURL: fullURL,
      });

      const response = await axios.post(fullURL, null, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [RESERVATIONS API] Réservation refusée:", response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ [RESERVATIONS API] Erreur lors du refus:`, error);
      throw error;
    }
  },

  // Récupérer les réservations en attente pour un propriétaire
  getPendingReservationsForOwner: async (
    ownerId: number,
  ): Promise<ReservationDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reservations/pending/owner/${ownerId}`;

      console.log(
        "🔵 [RESERVATIONS API] Récupération des réservations en attente:",
        {
          ownerId: ownerId,
          endpoint: `/reservations/pending/owner/${ownerId}`,
          fullURL: fullURL,
        },
      );

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [RESERVATIONS API] Réservations en attente récupérées:",
        response.data,
      );
      return response.data;
    } catch (error) {
      console.error(
        `❌ [RESERVATIONS API] Erreur lors de la récupération des réservations en attente:`,
        error,
      );
      throw error;
    }
  },

  // Créer une session de paiement pour le complément (si prix augmente)
  // amountInEuros: montant total à charger (différence de prix + frais de service), pour que Stripe affiche le bon prix
  createUpdateCheckout: async (
    reservationId: number,
    successUrl: string,
    cancelUrl: string,
    options?: { uiMode?: "embedded" | "hosted"; amountInEuros?: number },
  ): Promise<{ url?: string; sessionId: string; clientSecret?: string }> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      let fullURL = `${baseURLWithoutV1}/reservations/${reservationId}/create-update-checkout?successUrl=${encodeURIComponent(successUrl)}&cancelUrl=${encodeURIComponent(cancelUrl)}`;
      if (options?.uiMode) {
        fullURL += `&uiMode=${encodeURIComponent(options.uiMode)}`;
      }
      if (options?.amountInEuros != null && options.amountInEuros > 0) {
        fullURL += `&amountInEuros=${encodeURIComponent(options.amountInEuros.toFixed(2))}`;
      }

      // Body JSON : montant TTC (avec frais) pour que le backend l'utilise pour Stripe
      // amountInCents = ce que Stripe attend (obligatoire pour afficher le bon montant)
      const body =
        options?.amountInEuros != null && options.amountInEuros > 0
          ? {
              amountInEuros: options.amountInEuros,
              amountInCents: Math.round(options.amountInEuros * 100),
            }
          : null;

      console.log(
        "🔵 [RESERVATIONS API] Création de la session de paiement pour modification:",
        {
          reservationId: reservationId,
          amountInEuros: options?.amountInEuros,
          endpoint: `/reservations/${reservationId}/create-update-checkout`,
          fullURL: fullURL,
        },
      );

      const response = await axios.post(fullURL, body, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [RESERVATIONS API] Session de paiement créée:",
        response.data,
      );
      // Le backend retourne { url: "...", sessionId: "..." }
      return response.data;
    } catch (error) {
      console.error(
        `❌ [RESERVATIONS API] Erreur lors de la création de la session de paiement:`,
        error,
      );
      throw error;
    }
  },
};

// ========== Deposits API (caution longue durée – SetupIntent / card-on-file) ==========
export const depositsAPI = {
  /**
   * Créer un SetupIntent pour enregistrer la carte du client (caution).
   * Payload attendu par le back : { userId, reservationId } → retourne client_secret.
   */
  createSetupIntent: async (userId: number, reservationId: number): Promise<{ client_secret: string }> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/deposits/setup-intent`;
      const response = await axios.post(
        fullURL,
        { userId, reservationId },
        {
          headers: {
            "Content-Type": "application/json",
            ...(storage.getItem("authToken")
              ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
              : {}),
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("❌ [DEPOSITS API] Erreur createSetupIntent:", error);
      throw error;
    }
  },

  /**
   * Enregistrer le moyen de paiement Stripe sur la réservation après confirmation du SetupIntent.
   */
  savePaymentMethod: async (
    reservationId: number,
    paymentMethodId: string
  ): Promise<void> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/deposits/${reservationId}/save-payment-method?paymentMethodId=${encodeURIComponent(paymentMethodId)}`;
      await axios.post(fullURL, null, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });
    } catch (error) {
      console.error("❌ [DEPOSITS API] Erreur savePaymentMethod:", error);
      throw error;
    }
  },
};

// ========== RENTOALL Reviews API (Places) ==========
export const rentoallReviewsAPI = {
  // Laisser un avis
  create: async (payload: CreateReviewPayload): Promise<ReviewDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reviews`;

      console.log("🔵 [REVIEWS API] Création d'un avis:", {
        endpoint: "/reviews",
        fullURL: fullURL,
        payload: payload,
      });

      const response = await axios.post(fullURL, payload, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [REVIEWS API] Avis créé:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [REVIEWS API] Erreur lors de la création de l'avis:",
        error,
      );
      throw error;
    }
  },

  // Voir les avis d'un bien
  getPlaceReviews: async (placeId: number): Promise<ReviewDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reviews/place/${placeId}`;

      console.log("🔵 [REVIEWS API] Récupération des avis du bien:", {
        placeId: placeId,
        endpoint: `/reviews/place/${placeId}`,
        fullURL: fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [REVIEWS API] Avis récupérés:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        `❌ [REVIEWS API] Erreur lors de la récupération des avis:`,
        error,
      );
      throw error;
    }
  },

  // Créer un avis pour une réservation terminée (format multi-critères 1-10)
  // Le backend calcule `rating` à partir des 6 critères ; ne pas envoyer `rating` ni `placeId`.
  createReservationReview: async (data: {
    reservationId: number;
    authorId: number;
    cleanlinessRating: number;
    accuracyRating: number;
    arrivalRating: number;
    communicationRating: number;
    locationRating: number;
    valueForMoneyRating: number;
    comment?: string;
  }): Promise<ReviewDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/reviews`;

      console.log("🔵 [REVIEWS API] Création d'un avis pour réservation:", {
        endpoint: `/reviews`,
        fullURL: fullURL,
        data,
      });

      const response = await axios.post(fullURL, data, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [REVIEWS API] Avis créé:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        `❌ [REVIEWS API] Erreur lors de la création de l'avis:`,
        error,
      );
      throw error;
    }
  },
};

// ========== Payments API (Stripe) ==========
export interface PaymentStatusResponse {
  status: "SUCCEEDED" | "PENDING" | "FAILED" | "CANCELED";
  sessionId?: string;
}

export interface CheckoutRequestDTO {
  placeId: number; // Obligatoire : L'ID du bien que l'on réserve
  /** Titre du bien pour Stripe (ex: "Parking couvert centre-ville") — si fourni, utilisé pour le libellé au lieu de "Lieu #id" */
  placeTitle?: string;
  clientId?: number; // Optionnel mais recommandé : L'ID de l'utilisateur qui réserve
  amount: number; // Obligatoire : Montant en centimes (ex: 50.00€ → 5000)
  currency?: string; // Obligatoire : La devise en minuscules (ex: "eur")
  orderId?: string; // Optionnel : L'ID de la réservation créée juste avant en base de données
  customerEmail?: string; // Optionnel : L'email du client pour pré-remplir Stripe
  successUrl: string; // Obligatoire : URL de succès avec {CHECKOUT_SESSION_ID}
  cancelUrl: string; // Obligatoire : URL d'annulation
  startDateTime: string; // Obligatoire : Date de début au format ISO (ex: "2026-05-11T22:00:00")
  endDateTime: string; // Obligatoire : Date de fin au format ISO (ex: "2026-05-19T21:59:59")
  reservationType: "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY"; // Obligatoire : Type de séjour
  /** Pour mobile iOS/Android : mode embarqué (pas de redirection). Le backend doit créer la session avec ui_mode: 'embedded' et retourner clientSecret */
  uiMode?: "embedded" | "hosted";
  /** Code promo — envoyé avec l'ID de la réservation pour que le back applique la réduction au paiement Stripe */
  promoCode?: string;
}

export interface CheckoutResponseDTO {
  url?: string; // URL de redirection Stripe (mode hosted)
  sessionId: string; // ID de la session Stripe
  /** Retourné quand uiMode: 'embedded' - utilisé pour afficher le checkout dans l'app */
  clientSecret?: string;
}

export interface OwnerPayoutDTO {
  id: number;
  reservationId: number;
  placeTitle: string;
  grossAmountCents: number;
  platformFeeCents: number;
  netAmountCents: number;
  status: "PENDING" | "SENT" | "FAILED" | "BLOCKED_OWNER_NOT_READY";
  transferId?: string;
  releaseAt: string; // Format ISO
  sentAt?: string; // Format ISO
  createdAt: string; // Format ISO
}

/** Réponse de validation d'un code promo ou bon d'achat — GET /api/promo-codes/validate */
export interface PromoCodeValidateResponseDTO {
  /** PROMO_CODE = code promo global, DISCOUNT_BONUS = bon d'achat (parrainage/affiliation) */
  type: 'PROMO_CODE' | 'DISCOUNT_BONUS';
  /** Montant de la réduction (en € pour FIXED, ou valeur du pourcentage pour PERCENTAGE) */
  amount?: number;
  /** FIXED = montant fixe en €, PERCENTAGE = pourcentage */
  discountType?: 'FIXED' | 'PERCENTAGE';
  code: string;
  [key: string]: unknown;
}

export const promoCodesAPI = {
  /**
   * Valide un code promo ou bon d'achat.
   * GET /api/promo-codes/validate?code={CODE}&userId={USER_ID}
   * @throws en cas de code invalide, expiré ou déjà utilisé
   */
  validate: async (
    code: string,
    userId: number,
  ): Promise<PromoCodeValidateResponseDTO> => {
    const response = await api.get<PromoCodeValidateResponseDTO>(
      '/promo-codes/validate',
      { params: { code: code.trim(), userId } },
    );
    return response.data;
  },
};

export const paymentsAPI = {
  // Créer une session de paiement Stripe (nouvelle API selon spécifications)
  createCheckoutSession: async (
    payload: CheckoutRequestDTO,
  ): Promise<CheckoutResponseDTO> => {
    try {
      // Vérifier que placeId est présent (obligatoire)
      if (!payload.placeId) {
        throw new Error(
          "placeId est obligatoire pour créer une session de checkout",
        );
      }

      const requestPayload = {
        placeId: payload.placeId, // Obligatoire
        ...(payload.placeTitle && { placeTitle: payload.placeTitle }),
        clientId: payload.clientId, // Optionnel mais recommandé
        amount: payload.amount, // En centimes
        currency: payload.currency || "eur",
        orderId: payload.orderId, // Optionnel : ID de la réservation
        customerEmail: payload.customerEmail, // Optionnel : Email du client
        successUrl: payload.successUrl,
        cancelUrl: payload.cancelUrl,
        startDateTime: payload.startDateTime, // Format ISO
        endDateTime: payload.endDateTime, // Format ISO
        reservationType: payload.reservationType, // HOURLY, DAILY, WEEKLY, MONTHLY
        ...(payload.uiMode && { uiMode: payload.uiMode }), // embedded pour mobile in-app
        ...(payload.promoCode && payload.promoCode.trim() && { promoCode: payload.promoCode.trim() }),
      };

      console.log(
        "🔵 [PAYMENTS API] Création de la session de checkout:",
        requestPayload,
      );

      const response = await api.post("/checkout-session", requestPayload);

      console.log(
        "✅ [PAYMENTS API] Session de checkout créée:",
        response.data,
      );

      return response.data;
    } catch (error) {
      console.error(
        "❌ [PAYMENTS API] Erreur lors de la création de la session de paiement:",
        error,
      );
      throw error;
    }
  },

  // Créer un lien d'onboarding Stripe Connect Express pour un propriétaire
  createStripeOnboardingLink: async (
    ownerId: number,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<{ url: string }> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/owners/${ownerId}/stripe/onboarding-link?refreshUrl=${encodeURIComponent(refreshUrl)}&returnUrl=${encodeURIComponent(returnUrl)}`;

      console.log("🔵 [PAYMENTS API] Création du lien d'onboarding Stripe:", {
        ownerId,
        refreshUrl,
        returnUrl,
        fullURL,
      });

      const response = await axios.post(
        fullURL,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            ...(storage.getItem("authToken")
              ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
              : {}),
          },
        },
      );

      console.log("✅ [PAYMENTS API] Lien d'onboarding créé:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [PAYMENTS API] Erreur lors de la création du lien d'onboarding:",
        error,
      );
      throw error;
    }
  },

  // Vérifier le statut d'un paiement
  getPaymentStatus: async (orderId: string): Promise<PaymentStatusResponse> => {
    try {
      const response = await api.get("/checkout-session/status", {
        params: { orderId: orderId },
      });
      return response.data;
    } catch (error) {
      console.error(
        "❌ [PAYMENTS API] Erreur lors de la vérification du statut du paiement:",
        error,
      );
      throw error;
    }
  },

  // Créer une session de paiement (ancienne API - gardée pour compatibilité)
  createCheckoutSessionLegacy: async (
    payload: CreateCheckoutSessionPayload,
  ): Promise<{ url: string }> => {
    try {
      const response = await api.post(
        "/payments/create-checkout-session",
        null,
        {
          params: {
            placeId: payload.placeId,
            amount: payload.amount,
            currency: payload.currency || "EUR",
            successUrl: payload.successUrl,
            cancelUrl: payload.cancelUrl,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error(
        "❌ [PAYMENTS API] Erreur lors de la création de la session de paiement:",
        error,
      );
      throw error;
    }
  },

  // Récupérer l'historique des versements pour un propriétaire
  getOwnerPayouts: async (ownerId: number): Promise<OwnerPayoutDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/payouts/owner/${ownerId}`;

      console.log(
        "🔵 [PAYMENTS API] Récupération des versements du propriétaire:",
        {
          ownerId,
          endpoint: `/payouts/owner/${ownerId}`,
          fullURL,
        },
      );

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [PAYMENTS API] Versements récupérés:", response.data);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(
        "❌ [PAYMENTS API] Erreur lors de la récupération des versements:",
        error,
      );
      throw error;
    }
  },

  // Créer un lien de mise à jour Stripe Connect Express pour un propriétaire existant
  updateStripeLink: async (
    ownerId: number,
    returnUrl: string,
  ): Promise<{ url: string }> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/owners/${ownerId}/stripe/update-link`;

      console.log("🔵 [PAYMENTS API] Création du lien de mise à jour Stripe:", {
        ownerId,
        returnUrl,
        fullURL,
      });

      const response = await axios.post(
        fullURL,
        { returnUrl },
        {
          headers: {
            "Content-Type": "application/json",
            ...(storage.getItem("authToken")
              ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
              : {}),
          },
        },
      );

      console.log("✅ [PAYMENTS API] Lien de mise à jour créé:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [PAYMENTS API] Erreur lors de la création du lien de mise à jour:",
        error,
      );
      throw error;
    }
  },
};

// ============================================
// MESSAGING API
// ============================================

// MessageDTO is already defined above at line 1398

export interface ConversationSummaryDTO {
  placeId: number;
  placeTitle?: string;
  placeImage?: string;
  otherUserId: number;
  otherUserName?: string;
  otherUserAvatar?: string;
  lastMessage?: string;
  lastMessageDate?: string;
  unreadCount: number;
}

export const messagesAPI = {
  // Envoyer un message (optionnel : reservationId pour le backend de modération, senderRole requis pour le type de conversation)
  sendMessage: async (payload: {
    senderId: number;
    receiverId: number;
    placeId: number;
    content: string;
    reservationId?: number;
    /** Rôle de l'expéditeur : HOST ou GUEST (selon mode utilisateur) */
    senderRole: 'HOST' | 'GUEST';
  }): Promise<MessageDTO | { status: string; message?: MessageDTO; reason?: string }> => {
    try {
      // Validation des paramètres
      if (!payload.senderId || payload.senderId <= 0) {
        throw new Error(`senderId invalide: ${payload.senderId}`);
      }
      if (!payload.receiverId || payload.receiverId <= 0) {
        throw new Error(`receiverId invalide: ${payload.receiverId}`);
      }
      if (payload.senderId === payload.receiverId) {
        throw new Error(
          `senderId et receiverId sont identiques: ${payload.senderId}`,
        );
      }
      if (!payload.placeId || payload.placeId <= 0) {
        throw new Error(`placeId invalide: ${payload.placeId}`);
      }
      if (!payload.content || payload.content.trim().length === 0) {
        throw new Error("Le contenu du message est vide");
      }
      if (!payload.senderRole || !['HOST', 'GUEST'].includes(payload.senderRole)) {
        throw new Error("senderRole invalide: doit être HOST ou GUEST");
      }

      const body: Record<string, unknown> = {
        senderId: payload.senderId,
        receiverId: payload.receiverId,
        placeId: payload.placeId,
        content: payload.content,
        senderRole: payload.senderRole,
      };
      if (payload.reservationId != null) {
        body.reservationId = payload.reservationId;
      }

      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/messages`;

      console.log("🔵 [MESSAGES API] Envoi d'un message:", {
        senderId: payload.senderId,
        receiverId: payload.receiverId,
        placeId: payload.placeId,
        reservationId: payload.reservationId,
        contentLength: payload.content.length,
        endpoint: "/messages",
        fullURL: fullURL,
      });

      const response = await axios.post(fullURL, body, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [MESSAGES API] Message envoyé:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [MESSAGES API] Erreur lors de l'envoi du message:",
        error,
      );
      throw error;
    }
  },

  // Récupérer une conversation (historique)
  getConversation: async (
    placeId: number,
    user1Id: number,
    user2Id: number,
  ): Promise<MessageDTO[]> => {
    try {
      // Validation des paramètres
      if (!placeId || placeId <= 0) {
        throw new Error(`placeId invalide: ${placeId}`);
      }
      if (!user1Id || user1Id <= 0) {
        throw new Error(`user1Id invalide: ${user1Id}`);
      }
      if (!user2Id || user2Id <= 0) {
        throw new Error(`user2Id invalide: ${user2Id}`);
      }
      if (user1Id === user2Id) {
        throw new Error(`user1Id et user2Id sont identiques: ${user1Id}`);
      }

      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/messages/conversation?placeId=${placeId}&user1Id=${user1Id}&user2Id=${user2Id}`;

      console.log("🔵 [MESSAGES API] Récupération de la conversation:", {
        placeId: placeId,
        user1Id: user1Id,
        user2Id: user2Id,
        endpoint: "/messages/conversation",
        fullURL: fullURL,
        Vérification:
          "Les deux IDs utilisateurs sont différents et le placeId est valide",
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [MESSAGES API] Conversation récupérée:", {
        status: response.status,
        messageCount: Array.isArray(response.data) ? response.data.length : 0,
        data: response.data,
      });
      return response.data;
    } catch (error) {
      console.error(
        "❌ [MESSAGES API] Erreur lors de la récupération de la conversation:",
        error,
      );
      const errorObj = error as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      if (errorObj?.response) {
        console.error("❌ [MESSAGES API] Détails de l'erreur HTTP:", {
          status: errorObj.response.status,
          data: errorObj.response.data,
        });
      }
      throw error;
    }
  },

  // Récupérer tous les messages d'un utilisateur (liste des discussions), filtrés par rôle si fourni
  getUserMessages: async (userId: number, role?: 'HOST' | 'GUEST'): Promise<MessageDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const url = new URL(`${baseURLWithoutV1}/messages/user/${userId}`);
      if (role) {
        url.searchParams.set('role', role);
      }
      const fullURL = url.toString();

      console.log(
        "🔵 [MESSAGES API] Récupération des messages de l'utilisateur:",
        {
          userId: userId,
          role: role ?? 'tous',
          endpoint: `/messages/user/${userId}`,
          fullURL: fullURL,
        },
      );

      const response = await axios.get(fullURL, {
        headers: {
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [MESSAGES API] Messages récupérés:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [MESSAGES API] Erreur lors de la récupération des messages:",
        error,
      );
      throw error;
    }
  },

  // Marquer une conversation comme lue
  markAsRead: async (
    receiverId: number,
    senderId: number,
    placeId: number,
  ): Promise<void> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/messages/read?receiverId=${receiverId}&senderId=${senderId}&placeId=${placeId}`;

      console.log("🔵 [MESSAGES API] Marquage de la conversation comme lue:", {
        receiverId: receiverId,
        senderId: senderId,
        placeId: placeId,
        endpoint: "/messages/read",
        fullURL: fullURL,
      });

      await axios.patch(
        fullURL,
        {},
        {
          headers: {
            ...(storage.getItem("authToken")
              ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
              : {}),
          },
        },
      );

      console.log("✅ [MESSAGES API] Conversation marquée comme lue");
    } catch (error) {
      console.error(
        "❌ [MESSAGES API] Erreur lors du marquage comme lu:",
        error,
      );
      throw error;
    }
  },

  // Compteur de messages non lus
  getUnreadCount: async (userId: number): Promise<number> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/messages/unread-count/${userId}`;

      console.log(
        "🔵 [MESSAGES API] Récupération du compteur de messages non lus:",
        {
          userId: userId,
          endpoint: `/messages/unread-count/${userId}`,
          fullURL: fullURL,
        },
      );

      const response = await axios.get(fullURL, {
        headers: {
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      const count =
        typeof response.data === "number"
          ? response.data
          : response.data.count || 0;
      console.log("✅ [MESSAGES API] Messages non lus:", count);
      return count;
    } catch (error) {
      console.error(
        "❌ [MESSAGES API] Erreur lors de la récupération du compteur:",
        error,
      );
      return 0;
    }
  },
};

// ========== Contact API ==========
export interface ContactRequestDTO {
  id?: number;
  userId?: number;
  title: string;
  description: string;
  createdAt?: string;
}

export const contactAPI = {
  // Envoyer une demande de contact — POST /api/contact/request
  sendContactRequest: async (payload: {
    title: string;
    description: string;
    userId?: number;
  }): Promise<ContactRequestDTO> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/contact/request`;

      console.log("🔵 [CONTACT API] Envoi d'une demande de contact:", {
        payload: payload,
        endpoint: "/contact/request",
        fullURL: fullURL,
      });

      const response = await axios.post(
        fullURL,
        {
          title: payload.title,
          description: payload.description,
          ...(payload.userId != null && { userId: payload.userId }),
        },
        {
          headers: {
            "Content-Type": "application/json",
            ...(storage.getItem("authToken")
              ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
              : {}),
          },
        },
      );

      console.log(
        "✅ [CONTACT API] Demande de contact envoyée:",
        response.data,
      );
      return response.data;
    } catch (error) {
      console.error(
        "❌ [CONTACT API] Erreur lors de l'envoi de la demande:",
        error,
      );
      throw error;
    }
  },

  // Récupérer l'historique des demandes d'un utilisateur
  getUserContactRequests: async (
    userId: number,
  ): Promise<ContactRequestDTO[]> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/contact/user/${userId}`;

      console.log(
        "🔵 [CONTACT API] Récupération de l'historique des demandes:",
        {
          userId: userId,
          endpoint: `/contact/user/${userId}`,
          fullURL: fullURL,
        },
      );

      const response = await axios.get(fullURL, {
        headers: {
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [CONTACT API] Historique récupéré:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ [CONTACT API] Erreur lors de la récupération de l'historique:",
        error,
      );
      throw error;
    }
  },
};

// ========== Reporting API ==========
/** Valeurs acceptées par POST /api/places/report et POST /api/users/report */
export type ReportReason =
  | "INACCURATE_OR_INCORRECT"
  | "NOT_A_REAL_ACCOMMODATION"
  | "SCAM"
  | "SHOCKING_CONTENT"
  | "ILLEGAL_CONTENT"
  | "SPAM"
  | "OTHER";

export interface PlaceReportDTO {
  placeId: number;
  reason: ReportReason;
  description?: string;
  reporterId?: number;
}

export interface UserReportDTO {
  userId: number;
  reason: ReportReason;
  description?: string;
  reporterId?: number;
}

export const reportingAPI = {
  // Signaler un bien
  reportPlace: async (report: PlaceReportDTO): Promise<void> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/places/report`;

      console.log("🔵 [REPORTING API] Signalement d'un bien:", {
        report: report,
        endpoint: "/places/report",
        fullURL: fullURL,
      });

      await axios.post(fullURL, report, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [REPORTING API] Signalement de bien envoyé avec succès");
    } catch (error) {
      console.error(
        "❌ [REPORTING API] Erreur lors du signalement du bien:",
        error,
      );
      throw error;
    }
  },

  // Signaler un utilisateur
  reportUser: async (report: UserReportDTO): Promise<void> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/users/report`;

      console.log("🔵 [REPORTING API] Signalement d'un utilisateur:", {
        report: report,
        endpoint: "/users/report",
        fullURL: fullURL,
      });

      await axios.post(fullURL, report, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log(
        "✅ [REPORTING API] Signalement d'utilisateur envoyé avec succès",
      );
    } catch (error) {
      console.error(
        "❌ [REPORTING API] Erreur lors du signalement de l'utilisateur:",
        error,
      );
      throw error;
    }
  },
};

// ========== SIRENE API ==========
export interface SireneValidationResponse {
  name: string;
  address: string;
  siret: string;
  apeCode: string;
}

export const sireneAPI = {
  // Valider un numéro SIREN ou SIRET
  validate: async (sirene: string): Promise<SireneValidationResponse> => {
    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/sirene/validate?sirene=${encodeURIComponent(sirene)}`;

      console.log("🔵 [SIRENE API] Validation SIREN/SIRET:", {
        sirene: sirene,
        endpoint: "/sirene/validate",
        fullURL: fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });

      console.log("✅ [SIRENE API] Validation réussie:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ [SIRENE API] Erreur lors de la validation:", error);
      console.error("❌ [SIRENE API] Détails de l'erreur:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });

      if (error.response?.status === 400) {
        // Essayer différents formats de message d'erreur
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.response?.data?.detail ||
          (typeof error.response?.data === "string"
            ? error.response.data
            : null) ||
          "Numéro SIREN/SIRET invalide ou entreprise non trouvée";
        throw new Error(errorMessage);
      }

      // Pour les autres erreurs (500, réseau, etc.)
      if (error.response) {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Erreur lors de la validation du SIRET. Veuillez réessayer.";
        throw new Error(errorMessage);
      }

      // Erreur réseau ou autre
      throw new Error(
        "Impossible de contacter le serveur. Vérifiez votre connexion internet.",
      );
    }
  },
};

// ========== Locations API ==========
export interface LocationSearchResult {
  id: string;
  postalCode: string;
  inseeCode: string;
  cityName: string;
  cityNameNormalized: string;
  // Nouvelles coordonnées géographiques renvoyées par le backend
  latitude?: number;
  longitude?: number;
  // Fallbacks si le backend utilise d'autres noms de champs
  lat?: number;
  lng?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const locationsAPI = {
  // Rechercher des villes par préfixe (auto-complétion)
  searchCities: async (prefix: string): Promise<LocationSearchResult[]> => {
    console.log("🌐 [LOCATIONS API] ========================================");
    console.log("🌐 [LOCATIONS API] ⚡⚡⚡ searchCities APPELÉ ⚡⚡⚡");
    console.log("🌐 [LOCATIONS API] Préfixe ville reçu:", prefix);
    console.log("🌐 [LOCATIONS API] Type:", typeof prefix);
    console.log("🌐 [LOCATIONS API] Timestamp:", new Date().toISOString());

    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/locations/search?city=${encodeURIComponent(prefix)}`;

      console.log(
        "🌐 [LOCATIONS API] ========================================",
      );
      console.log("🌐 [LOCATIONS API] Configuration de la requête:");
      console.log("🌐 [LOCATIONS API] - Base URL:", baseURLWithoutV1);
      console.log("🌐 [LOCATIONS API] - Endpoint: /locations/search");
      console.log(
        "🌐 [LOCATIONS API] - Préfixe encodé:",
        encodeURIComponent(prefix),
      );
      console.log("🌐 [LOCATIONS API] - URL complète:", fullURL);
      console.log(
        "🌐 [LOCATIONS API] ========================================",
      );
      console.log("🌐 [LOCATIONS API] Envoi de la requête HTTP GET...");

      const startTime = Date.now();
      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });
      const endTime = Date.now();

      console.log(
        "🌐 [LOCATIONS API] ========================================",
      );
      console.log("🌐 [LOCATIONS API] ✅✅✅ RÉPONSE HTTP REÇUE ✅✅✅");
      console.log(
        "🌐 [LOCATIONS API] Temps de réponse:",
        endTime - startTime,
        "ms",
      );
      console.log("🌐 [LOCATIONS API] Status HTTP:", response.status);
      console.log(
        "🌐 [LOCATIONS API] Type de données:",
        Array.isArray(response.data) ? "array" : typeof response.data,
      );
      console.log(
        "🌐 [LOCATIONS API] Nombre de résultats:",
        Array.isArray(response.data) ? response.data.length : "N/A",
      );
      console.log("🌐 [LOCATIONS API] Données complètes:", response.data);

      // Log détaillé des coordonnées pour chaque résultat (uniquement pour searchCities)
      if (Array.isArray(response.data) && response.data.length > 0) {
        console.log(
          "🌐 [LOCATIONS API] ===== DÉTAILS DES COORDONNÉES (searchCities) =====",
        );
        response.data.forEach((result: any, index: number) => {
          console.log(`🌐 [LOCATIONS API] Résultat ${index + 1}:`, {
            cityName: result.cityName,
            postalCode: result.postalCode,
            latitude: result.latitude,
            longitude: result.longitude,
            lat: result.lat,
            lng: result.lng,
            hasCoordinates:
              !!(result.latitude || result.lat) &&
              !!(result.longitude || result.lng),
            allKeys: Object.keys(result),
          });
        });
        console.log(
          "🌐 [LOCATIONS API] ========================================",
        );
      }

      console.log(
        "🌐 [LOCATIONS API] ========================================",
      );

      // S'assurer que c'est un tableau
      if (Array.isArray(response.data)) {
        console.log(
          "🌐 [LOCATIONS API] ✅ Retour de",
          response.data.length,
          "résultat(s)",
        );
        return response.data;
      } else {
        console.warn(
          "⚠️ [LOCATIONS API] ⚠️ La réponse n'est pas un tableau:",
          response.data,
        );
        return [];
      }
    } catch (error: any) {
      console.error(
        "🌐 [LOCATIONS API] ========================================",
      );
      console.error("🌐 [LOCATIONS API] ❌❌❌ ERREUR HTTP ❌❌❌");
      console.error(
        "🌐 [LOCATIONS API] Type d'erreur:",
        error instanceof Error ? "Error" : typeof error,
      );
      console.error("🌐 [LOCATIONS API] Message:", error.message);
      console.error("🌐 [LOCATIONS API] Status HTTP:", error.response?.status);
      console.error(
        "🌐 [LOCATIONS API] Données de l'erreur:",
        error.response?.data,
      );
      console.error("🌐 [LOCATIONS API] Stack:", error.stack);
      console.error("🌐 [LOCATIONS API] Erreur complète:", error);
      console.error(
        "🌐 [LOCATIONS API] ========================================",
      );
      return [];
    }
  },

  // Rechercher par code postal
  searchByPostalCode: async (
    postalCode: string,
  ): Promise<LocationSearchResult[]> => {
    console.log("🌐 [LOCATIONS API] ========================================");
    console.log("🌐 [LOCATIONS API] ⚡⚡⚡ searchByPostalCode APPELÉ ⚡⚡⚡");
    console.log("🌐 [LOCATIONS API] Code postal reçu:", postalCode);
    console.log("🌐 [LOCATIONS API] Type:", typeof postalCode);
    console.log("🌐 [LOCATIONS API] Timestamp:", new Date().toISOString());

    try {
      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/locations/by-postal-code/${encodeURIComponent(postalCode)}`;

      console.log(
        "🌐 [LOCATIONS API] ========================================",
      );
      console.log("🌐 [LOCATIONS API] Configuration de la requête:");
      console.log("🌐 [LOCATIONS API] - Base URL:", baseURLWithoutV1);
      console.log("🌐 [LOCATIONS API] - Endpoint: /locations/by-postal-code");
      console.log(
        "🌐 [LOCATIONS API] - Code postal encodé:",
        encodeURIComponent(postalCode),
      );
      console.log("🌐 [LOCATIONS API] - URL complète:", fullURL);
      console.log(
        "🌐 [LOCATIONS API] ========================================",
      );
      console.log("🌐 [LOCATIONS API] Envoi de la requête HTTP GET...");

      const startTime = Date.now();
      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          ...(storage.getItem("authToken")
            ? { Authorization: `Bearer ${storage.getItem("authToken")}` }
            : {}),
        },
      });
      const endTime = Date.now();

      console.log(
        "🌐 [LOCATIONS API] ========================================",
      );
      console.log("🌐 [LOCATIONS API] ✅✅✅ RÉPONSE HTTP REÇUE ✅✅✅");
      console.log(
        "🌐 [LOCATIONS API] Temps de réponse:",
        endTime - startTime,
        "ms",
      );
      console.log("🌐 [LOCATIONS API] Status HTTP:", response.status);
      console.log(
        "🌐 [LOCATIONS API] Type de données:",
        Array.isArray(response.data) ? "array" : typeof response.data,
      );
      console.log(
        "🌐 [LOCATIONS API] Nombre de résultats:",
        Array.isArray(response.data) ? response.data.length : "N/A",
      );
      console.log("🌐 [LOCATIONS API] Données complètes:", response.data);
      console.log(
        "🌐 [LOCATIONS API] ========================================",
      );

      // S'assurer que c'est un tableau
      if (Array.isArray(response.data)) {
        console.log(
          "🌐 [LOCATIONS API] ✅ Retour de",
          response.data.length,
          "résultat(s)",
        );
        return response.data;
      } else {
        console.warn(
          "⚠️ [LOCATIONS API] ⚠️ La réponse n'est pas un tableau:",
          response.data,
        );
        return [];
      }
    } catch (error: any) {
      console.error(
        "🌐 [LOCATIONS API] ========================================",
      );
      console.error("🌐 [LOCATIONS API] ❌❌❌ ERREUR HTTP ❌❌❌");
      console.error(
        "🌐 [LOCATIONS API] Type d'erreur:",
        error instanceof Error ? "Error" : typeof error,
      );
      console.error("🌐 [LOCATIONS API] Message:", error.message);
      console.error("🌐 [LOCATIONS API] Status HTTP:", error.response?.status);
      console.error(
        "🌐 [LOCATIONS API] Données de l'erreur:",
        error.response?.data,
      );
      console.error("🌐 [LOCATIONS API] Stack:", error.stack);
      console.error("🌐 [LOCATIONS API] Erreur complète:", error);
      console.error(
        "🌐 [LOCATIONS API] ========================================",
      );
      return [];
    }
  },
};

// ========== Geocode API (Autocomplétion d'adresse) ==========
export interface AddressSuggestionDTO {
  label: string;
  houseNumber?: string;
  road?: string;
  city?: string;
  postcode?: string;
  country?: string;
  lat?: number;
  lng?: number;
  boundingBox?: [number, number, number, number]; // [sud, nord, ouest, est]
}

export const geocodeAPI = {
  // Autocomplétion d'adresse
  autocomplete: async (query: string): Promise<AddressSuggestionDTO[]> => {
    try {
      // Ne pas faire d'appel si moins de 3 caractères
      if (!query || query.trim().length < 3) {
        return [];
      }

      const baseURLWithoutV1 = getBaseURLWithoutV1();
      const fullURL = `${baseURLWithoutV1}/geocode/autocomplete?q=${encodeURIComponent(query.trim())}`;

      console.log("📍 [GEOCODE API] Autocomplétion d'adresse:", {
        query: query.trim(),
        fullURL,
      });

      const response = await axios.get(fullURL, {
        headers: {
          "Content-Type": "application/json",
          // Pas besoin de token d'authentification (permitAll)
        },
      });

      console.log(
        "✅ [GEOCODE API] Suggestions reçues:",
        response.data?.length || 0,
      );

      // S'assurer que c'est un tableau
      if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.warn(
          "⚠️ [GEOCODE API] La réponse n'est pas un tableau:",
          response.data,
        );
        return [];
      }
    } catch (error: any) {
      console.error("❌ [GEOCODE API] Erreur lors de l'autocomplétion:", error);
      console.error("❌ [GEOCODE API] Status HTTP:", error.response?.status);
      console.error(
        "❌ [GEOCODE API] Données de l'erreur:",
        error.response?.data,
      );
      return [];
    }
  },

  // Géocodage inverse : coordonnées (lat, lng) → adresse (via Nominatim OSM)
  reverse: async (lat: number, lng: number): Promise<{ address: string; city: string; postcode: string } | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'fr' },
      });
      if (!response.ok) return null;
      const data = await response.json();
      const addr = data?.address;
      if (!addr) return null;
      const houseNumber = addr.house_number || '';
      const road = addr.road || addr.street || addr.footway || '';
      const address = [houseNumber, road].filter(Boolean).join(' ') || addr.suburb || addr.neighbourhood || data.display_name?.split(',')[0] || '';
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
      const postcode = addr.postcode || '';
      return { address: address.trim(), city, postcode };
    } catch (error) {
      console.error('❌ [GEOCODE API] Erreur reverse geocoding:', error);
      return null;
    }
  },
};

export default api;

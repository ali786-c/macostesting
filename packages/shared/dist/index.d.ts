import { z } from 'zod';

interface LoginPayload {
    email: string;
    password: string;
}
interface LoginResponse {
    id?: string | number;
    email?: string;
    firstName?: string;
    lastName?: string;
    type?: string;
    token?: string;
    [key: string]: unknown;
}
type UserType = 'CLIENT' | 'PROFESSIONAL' | 'AGENCY' | 'ENTERPRISE';
interface RegisterPayload {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    companyName?: string;
    companyAddress?: string;
    siret?: string;
    vatNumber?: string;
    appliedReferralCode?: string;
    appliedAffiliationCode?: string;
}

interface PlaceCharacteristicDTO {
    name: string;
    value: string;
}
interface PlaceAvailabilityDTO {
    date: string;
    available: boolean;
    startTime?: string;
    endTime?: string;
    customPricePerDay?: number;
    customPricePerHour?: number;
}
interface OccupiedSlotDTO {
    start: string;
    end: string;
    clientName?: string;
    totalPrice?: number;
    serviceFee?: number;
    hostAmount?: number;
}
interface PlaceDTO {
    id: number;
    type: 'PARKING' | 'CAVE' | 'STORAGE_SPACE';
    address: string;
    city: string;
    description?: string;
    deposit: number;
    pricePerHour?: number;
    pricePerDay: number;
    pricePerWeek?: number;
    pricePerMonth: number;
    ownerId: number;
    active: boolean;
    characteristics?: PlaceCharacteristicDTO[];
    latitude?: number;
    longitude?: number;
    hourPriceActive?: boolean;
    dayPriceActive?: boolean;
    weekPriceActive?: boolean;
    monthPriceActive?: boolean;
    availabilities?: PlaceAvailabilityDTO[];
    occupiedSlots?: OccupiedSlotDTO[];
    availableFrom?: string;
    availableTo?: string;
    minDays?: number;
    minHours?: number;
    truckAccessDistance?: number;
    accessibilityRemarks?: string;
    cancellationPolicy?: 'FLEXIBLE' | 'MODERATE' | 'STRICT';
    cancellationDeadlineDays?: number;
    videoUrl?: string;
    [key: string]: unknown;
}
interface SearchPlacesParams {
    city?: string;
    type?: 'PARKING' | 'CAVE' | 'STORAGE_SPACE' | 'BOX' | 'WAREHOUSE';
    title?: string;
    availableFrom?: string;
    availableTo?: string;
    maxPrice?: number;
    lat?: number;
    lng?: number;
    radius?: number;
    characteristics?: Record<string, string>;
    instantBooking?: boolean;
    freeCancellation?: boolean;
    noDeposit?: boolean;
    page?: number;
    size?: number;
    [key: string]: unknown;
}
interface GetAllPlacesParams {
    page?: number;
    size?: number;
}

interface ReservationDTO {
    id: number;
    placeId: number;
    clientId: number;
    startDateTime: string;
    endDateTime: string;
    totalPrice: number;
    serviceFee?: number;
    hostAmount?: number;
    status: string;
    paymentStatus: string;
    userRole?: 'GUEST' | 'HOST';
    createdAt?: string;
    requestedStartDateTime?: string;
    requestedEndDateTime?: string;
    priceDifference?: number;
    [key: string]: unknown;
}
interface EstimateReservationPayload {
    placeId: number;
    startDateTime: string;
    endDateTime: string;
    reservationType?: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
}
interface CreateReservationPayload {
    placeId: number;
    clientId: number;
    startDateTime: string;
    endDateTime: string;
}

/**
 * Storage interface shared between web (localStorage/cookies) and mobile (SecureStore/AsyncStorage).
 * Allows the API client to be platform-agnostic.
 */
interface IStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}
declare const AUTH_TOKEN_KEY = "authToken";
declare const USER_ID_KEY = "userId";
declare const USER_EMAIL_KEY = "userEmail";
declare const USER_NAME_KEY = "userName";
declare const USER_TYPE_KEY = "finalUserType";
declare const IS_LOGGED_IN_KEY = "finalIsLoggedIn";

/**
 * Web implementation using localStorage. Use only in browser (Next.js client, etc.).
 */
declare function createWebStorage(): IStorage;

declare const loginPayloadSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
type LoginPayloadInput = z.infer<typeof loginPayloadSchema>;

declare const API_PATH: {
    readonly AUTH_LOGIN: "/auth/login";
    readonly USERS_REGISTER: "/users/register";
    readonly USERS_FORGOT_PASSWORD: "/users/forgot-password";
    readonly USERS_RESET_PASSWORD: "/users/reset-password";
    readonly PLACES: "/places";
    readonly PLACES_SEARCH: "/places/search";
    readonly PLACES_OWNER_CALENDAR_OVERVIEW: (userId: number) => string;
    readonly RESERVATIONS: "/reservations";
    readonly RESERVATIONS_ESTIMATE: "/reservations/estimate";
    readonly USERS_OWNED_RESERVATIONS: (userId: number) => string;
    readonly RESERVATIONS_CLIENT: (clientId: number) => string;
    readonly RESERVATIONS_BY_ID: (id: number) => string;
    readonly PLACES_BY_ID: (id: number) => string;
};

declare function formatCurrency(value: number, locale?: string): string;
declare function formatDate(date: string | Date, locale?: string): string;
declare function formatDateTime(date: string | Date, locale?: string): string;

export { API_PATH, AUTH_TOKEN_KEY, type CreateReservationPayload, type EstimateReservationPayload, type GetAllPlacesParams, IS_LOGGED_IN_KEY, type IStorage, type LoginPayload, type LoginPayloadInput, type LoginResponse, type OccupiedSlotDTO, type PlaceAvailabilityDTO, type PlaceCharacteristicDTO, type PlaceDTO, type RegisterPayload, type ReservationDTO, type SearchPlacesParams, USER_EMAIL_KEY, USER_ID_KEY, USER_NAME_KEY, USER_TYPE_KEY, type UserType, createWebStorage, formatCurrency, formatDate, formatDateTime, loginPayloadSchema };

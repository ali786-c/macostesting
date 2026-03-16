import * as _easypark_shared from '@easypark/shared';
import { IStorage, LoginPayload, LoginResponse, RegisterPayload, GetAllPlacesParams, PlaceDTO, SearchPlacesParams, ReservationDTO } from '@easypark/shared';

interface HttpClientConfig {
    baseURL: string;
    getToken: () => Promise<string | null>;
    storage?: IStorage;
    timeout?: number;
}
declare function createHttpClient(config: HttpClientConfig): {
    get: <T>(path: string, options?: {
        headers?: Record<string, string>;
    }) => Promise<T>;
    post: <T_1>(path: string, body?: unknown, options?: {
        headers?: Record<string, string>;
    }) => Promise<T_1>;
    put: <T_2>(path: string, body?: unknown, options?: {
        headers?: Record<string, string>;
    }) => Promise<T_2>;
    patch: <T_3>(path: string, body?: unknown, options?: {
        headers?: Record<string, string>;
    }) => Promise<T_3>;
    delete: <T_4>(path: string, options?: {
        headers?: Record<string, string>;
    }) => Promise<T_4>;
    baseURL: () => string;
};
type HttpClient = ReturnType<typeof createHttpClient>;

interface ApiClientConfig {
    baseURL: string;
    getToken: () => Promise<string | null>;
    storage?: IStorage;
    timeout?: number;
}
declare function createApiClient(config: ApiClientConfig): {
    authAPI: {
        login(payload: _easypark_shared.LoginPayload): Promise<_easypark_shared.LoginResponse>;
        signup(payload: _easypark_shared.RegisterPayload): Promise<_easypark_shared.LoginResponse & {
            id?: number | undefined;
        }>;
        forgotPassword(email: string): Promise<void>;
        resetPassword(payload: {
            token: string;
            newPassword: string;
        }): Promise<void>;
    };
    placesAPI: {
        getAll(params?: _easypark_shared.GetAllPlacesParams | undefined): Promise<_easypark_shared.PlaceDTO[]>;
        getById(placeId: number): Promise<_easypark_shared.PlaceDTO>;
        search(params?: _easypark_shared.SearchPlacesParams | undefined): Promise<_easypark_shared.PlaceDTO[]>;
        getOwnerCalendarOverview(userId: number): Promise<_easypark_shared.PlaceDTO[]>;
    };
    reservationsAPI: {
        getClientReservations(clientId: number): Promise<_easypark_shared.ReservationDTO[]>;
        getOwnedReservations(userId: number): Promise<_easypark_shared.ReservationDTO[]>;
        getById(reservationId: number): Promise<_easypark_shared.ReservationDTO>;
    };
};
type ApiClient = ReturnType<typeof createApiClient>;

declare class ApiError extends Error {
    status?: number | undefined;
    code?: string | undefined;
    response?: unknown;
    constructor(message: string, status?: number | undefined, code?: string | undefined, response?: unknown);
}
declare function normalizeError(error: unknown): ApiError;

declare function createAuthApi(http: HttpClient): {
    login(payload: LoginPayload): Promise<LoginResponse>;
    signup(payload: RegisterPayload): Promise<LoginResponse & {
        id?: number;
    }>;
    forgotPassword(email: string): Promise<void>;
    resetPassword(payload: {
        token: string;
        newPassword: string;
    }): Promise<void>;
};

declare function createPlacesApi(http: HttpClient): {
    getAll(params?: GetAllPlacesParams): Promise<PlaceDTO[]>;
    getById(placeId: number): Promise<PlaceDTO>;
    search(params?: SearchPlacesParams): Promise<PlaceDTO[]>;
    getOwnerCalendarOverview(userId: number): Promise<PlaceDTO[]>;
};

declare function createReservationsApi(http: HttpClient): {
    getClientReservations(clientId: number): Promise<ReservationDTO[]>;
    getOwnedReservations(userId: number): Promise<ReservationDTO[]>;
    getById(reservationId: number): Promise<ReservationDTO>;
};

export { type ApiClient, type ApiClientConfig, ApiError, type HttpClient, type HttpClientConfig, createApiClient, createAuthApi, createHttpClient, createPlacesApi, createReservationsApi, normalizeError };

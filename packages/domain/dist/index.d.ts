import { LoginResponse, LoginPayload, PlaceDTO, ReservationDTO } from '@easypark/shared';

interface LoginResult {
    success: true;
    user: {
        id: string | number;
        email: string;
        name: string;
        type: string;
    };
    token: string;
}
interface LoginFailure {
    success: false;
    message: string;
}
/**
 * Use-case: normalise la réponse login pour l’affichage (sans UI).
 */
declare function mapLoginResponseToUser(res: LoginResponse): LoginResult['user'] | null;
/**
 * Valide le payload login (côté domaine, en plus de Zod).
 */
declare function validateLoginPayload(payload: LoginPayload): string | null;

interface PlaceCardViewModel {
    id: number;
    title: string;
    subtitle: string;
    pricePerDay: number;
    priceFormatted: string;
    type: string;
    city: string;
}
/**
 * Map DTO → view model pour une carte/liste (sans dépendance UI).
 */
declare function mapPlaceDtoToCardViewModel(dto: PlaceDTO): PlaceCardViewModel;

interface ReservationCardViewModel {
    id: number;
    startDate: string;
    endDate: string;
    totalPrice: number;
    priceFormatted: string;
    status: string;
    statusLabel: string;
}
/**
 * Map DTO → view model pour une carte liste (sans dépendance UI).
 */
declare function mapReservationDtoToCardViewModel(dto: ReservationDTO): ReservationCardViewModel;

export { type LoginFailure, type LoginResult, type PlaceCardViewModel, type ReservationCardViewModel, mapLoginResponseToUser, mapPlaceDtoToCardViewModel, mapReservationDtoToCardViewModel, validateLoginPayload };

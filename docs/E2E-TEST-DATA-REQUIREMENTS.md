# E2E Test Data Requirements

This document describes **all** test data and API requirements the backend must provide for the Playwright E2E test suite to pass. Tests hit the **real** backend (localhost:8080) and frontend (localhost:3000) with **no mocking**.

## Prerequisites

- **Backend** running on `http://localhost:8080`
- **Frontend** running on `http://localhost:3000`
- **Environment variables** set for test credentials (see below)

---

## 1. Environment Variables

The following environment variables **must** be set before running E2E tests:

| Variable | Description | Required For |
|----------|-------------|--------------|
| `E2E_USER_EMAIL` | Email of a valid **client** user | Auth, Booking, User tests |
| `E2E_USER_PASSWORD` | Password for the client user | Auth, Booking, User tests |
| `E2E_HOST_EMAIL` | Email of a valid **host/owner** user | Owner tests |
| `E2E_HOST_PASSWORD` | Password for the host user | Owner tests |

Example `.env.test` or shell:
```bash
export E2E_USER_EMAIL=client@test.example.com
export E2E_USER_PASSWORD=TestPassword123
export E2E_HOST_EMAIL=host@test.example.com
export E2E_HOST_PASSWORD=HostPassword123
```

---

## 2. Users

### 2.1 Client User (E2E_USER_EMAIL / E2E_USER_PASSWORD)

- **Type**: `CLIENT` (or equivalent)
- **Must exist** in the database
- **Must be able to**:
  - Login via `POST /api/auth/login`
  - Access parametres, favoris, messages, reservations
  - Add places to favorites
  - Create reservations
  - Use forgot password flow

### 2.2 Host User (E2E_HOST_EMAIL / E2E_HOST_PASSWORD)

- **Type**: Owner/Host (capable of owning places)
- **Must exist** in the database
- **Must be able to**:
  - Login via `POST /api/auth/login`
  - Access `/host/my-places`, `/host/create`, `/mon-calendrier`
  - Own at least one place (recommended for full coverage)
- **Optional**: Stripe Connect onboarding for payout tests

---

## 3. API Endpoints Used by E2E Tests

### 3.1 Auth

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/users/register` | Signup (optional - signup tests) |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/users/forgot-password` or equivalent | Forgot password - send reset email |

### 3.2 Places

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/places/search` | Search places by city, filters, etc. |
| GET | `/api/places/{id}` | Get place detail |
| GET | `/api/places/filters` | Available filters (placeTypes, cities, etc.) |
| GET | `/api/places/{id}/calendar` | Place availability calendar |
| GET | `/api/locations/search` or equivalent | City autocomplete |

**Places search must return** at least one place when searching for cities like Paris, Lyon, or Marseille (or any city with seeded data).

### 3.3 Reservations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/reservations` or equivalent | Create reservation |
| GET | `/api/users/{userId}/reservations` | Client reservations |
| GET | `/api/users/{userId}/places` + reservations | Host reservations / owned places |

### 3.4 Favorites

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/users/{userId}/favorites` | List user favorites |
| POST | `/api/users/{userId}/favorites/{placeId}` | Add favorite |
| DELETE | `/api/users/{userId}/favorites/{placeId}` | Remove favorite |

### 3.5 Messages

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/chat/*` or equivalent | User messages, conversations |
| POST | `/api/chat/*` | Send message |

### 3.6 Users

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/users/{id}` | User profile |
| PATCH | `/api/users/{id}` | Update profile |

---

## 4. Places Data

### 4.1 Minimum Requirements

- **At least 1 place** in the database
- Place must have:
  - `id`, `title`, `description`, `address`, `city`
  - `ownerId` (valid user ID)
  - `type`: `PARKING` | `STORAGE_SPACE` | `CAVE`
  - At least one price: `pricePerHour` and/or `pricePerDay`, `pricePerWeek`, `pricePerMonth`
  - `photos` array (at least one image URL)
  - Coordinates (`latitude`, `longitude`) for map display

### 4.2 For Booking Tests

- Place must have **availability** (calendar slots or `availableFrom`/`availableTo`)
- Place should be bookable (not blocked, owner accepts reservations)
- `instantBooking: true` optional for direct reservation flow

### 4.3 For Host Tests

- At least one place owned by `E2E_HOST_EMAIL` user
- Place should appear in `/host/my-places`

---

## 5. Reservation Data

### 5.1 For User Tests (Reservations Page)

- **Client user** (`E2E_USER_EMAIL`): optional - 0+ reservations
- **Host user** (`E2E_HOST_EMAIL`): optional - 0+ reservations on owned places

---

## 6. Forgot Password

- Backend must accept `POST` with `{ email: string }` and send reset email
- No need for the email to actually be delivered in E2E (tests only verify success message)
- The `E2E_USER_EMAIL` should be a valid user for this to succeed

---

## 7. Stripe (Optional)

- E2E tests **skip payment** when Stripe is involved
- For full reservation flow: Stripe test mode with test keys
- Checkout redirects to Stripe - tests do not complete payment

---

## 8. Jeu de données complet à demander au backend

### 8.1 Script de seed recommandé

Voici le jeu de données **exact** à créer pour que tous les tests E2E passent :

| # | Type | Données | Détails |
|---|------|---------|---------|
| 1 | **User CLIENT** | `client@test.easypark.local` / `TestPassword123` | Type CLIENT, peut réserver, ajouter aux favoris |
| 2 | **User HOST** | `host@test.easypark.local` / `HostPassword123` | Type propriétaire, peut créer des annonces |
| 3 | **Place 1** | Parking à Paris | `ownerId` = id du user host, type PARKING, ville Paris, prix (heure/jour), coordonnées lat/lng |
| 4 | **Place 2** | Cave à Lyon | Optionnel, pour tester les filtres par type |
| 5 | **Disponibilités** | Place 1 disponible 30 prochains jours | Slots libres pour réserver |
| 6 | **Réservation (optionnel)** | Client a 1 résa sur Place 1 | Pour tester la page réservations avec contenu |

### 8.2 Structure Place minimale

```json
{
  "id": 1,
  "title": "Parking Paris Centre",
  "description": "Parking sécurisé proche métro",
  "address": "10 rue de Rivoli",
  "city": "Paris",
  "postalCode": "75001",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "ownerId": <id_host_user>,
  "type": "PARKING",
  "pricePerHour": 5,
  "pricePerDay": 25,
  "pricePerWeek": 150,
  "pricePerMonth": 400,
  "photos": [{"url": "https://...", "id": 1}],
  "instantBooking": true,
  "availableFrom": "2025-01-01",
  "availableTo": "2025-12-31"
}
```

### 8.3 Réponse à donner au frontend

> "Pour les tests E2E Playwright, nous avons besoin d'un jeu de données de test avec :
> 1. Deux utilisateurs : client@test.easypark.local (CLIENT) et host@test.easypark.local (HOST), mot de passe TestPassword123
> 2. Au moins 1 place (parking) à Paris, avec coordonnées, prix et disponibilités pour les 30 prochains jours
> 3. L'endpoint forgot-password doit accepter l'email et retourner un succès (l'email n'a pas besoin d'être envoyé)
> 4. La recherche GET /api/places/search avec city=Paris (ou lat/lng/radius) doit retourner au moins 1 résultat
> 
> Voir docs/E2E-TEST-DATA-REQUIREMENTS.md pour le détail complet."

---

## 9. Running E2E Tests

```bash
# Ensure backend is running on localhost:8080
# Ensure frontend is running on localhost:3000 (or let Playwright start it via npm run dev)

# Set credentials
export E2E_USER_EMAIL=client@test.example.com
export E2E_USER_PASSWORD=TestPassword123
export E2E_HOST_EMAIL=host@test.example.com
export E2E_HOST_PASSWORD=HostPassword123

# Run tests
npm run test:e2e
```

---

## 10. Test File Overview

| File | Tests | Data Required |
|------|-------|---------------|
| `01-auth.spec.ts` | Login, signup, logout, forgot password, protected routes | Users |
| `02-pages-public.spec.ts` | Homepage, search, faq, help, cgu, cgv, mentions-legales, legal, privacy | None |
| `03-search.spec.ts` | Search by city, filters, map, listing click | At least 1 place |
| `04-booking.spec.ts` | View place, add to favorites, reservation flow | Users + at least 1 place |
| `05-owner.spec.ts` | my-places, create form, calendar | Host user (+ optional place) |
| `06-user.spec.ts` | parametres, messages, favoris, reservations | Client user |

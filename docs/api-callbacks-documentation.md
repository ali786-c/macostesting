# Documentation exhaustive des appels API (callbacks)

Ce document décrit **tous les appels API** exposés dans `src/services/api.ts` : endpoints, **payloads entrants et sortants**, **objets (DTOs) nécessaires** et **logique** associée.

---

## 1. Configuration de base

| Élément | Détail |
|--------|--------|
| **Base URL** | `getBaseURL()` → `NEXT_PUBLIC_API_URL` (suffixe `/api` si absent) ou `http://localhost:8080/api` |
| **Client HTTP** | Instance Axios : `baseURL`, `timeout: 30000`, `Content-Type: application/json` |
| **Authentification** | Intercepteur requête : `Authorization: Bearer ${localStorage.getItem("authToken")}` si présent |
| **OAuth2** | `getBaseURLForOAuth2()` retourne l’URL backend sans `/api` (redirections OAuth2) |

---

## 2. Référence des API et des appels

Pour chaque module API : **méthode**, **HTTP**, **chemin**, **payload entrant**, **payload sortant**, **logique** (FormData, fallback, erreur, etc.).

---

### 2.1 referralsAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `getMyReferrals` | GET | `/users/{userId}/referrals` | `userId: number` (path) | `UserDTO[]` | En erreur → `[]` |
| `getMyAffiliates` | GET | `/users/{userId}/affiliates` | `userId: number` (path) | `UserDTO[]` | En erreur → `[]` |
| `getAffiliationCodes` | GET | `/users/{userId}/affiliation-codes` | `userId: number` (path) | `AffiliationCodeDTO[]` | En erreur → `[]` |
| `createAffiliationCode` | POST | `/users/{userId}/affiliation-codes` | Path: `userId`. Query: `code`, `description`. Body: `null` | `AffiliationCodeDTO` | — |
| `deleteAffiliationCode` | DELETE | `/users/{userId}/affiliation-codes/{codeId}` | `userId`, `codeId` (path) | `void` | — |
| `getAffiliationTransactions` | GET | `/users/{userId}/affiliation-transactions` | `userId: number` (path) | `any[]` | En erreur → `[]` |
| `generateReferralCode` | POST | `/users/{userId}/generate-referral-code` | `userId` (path), body: `{}` | `{ referralCode: string }` | En erreur → code mock |
| `getReferralInfo` | GET | `/users/{userId}` | `userId` (path) | `{ referralCode: string; creditBalance: number }` | En erreur → `{ referralCode: '', creditBalance: 0 }` |
| `getAffiliationSummary` | GET | `/users/{userId}/affiliation-summary` | `userId` (path) | `AffiliationSummaryDTO` | En erreur → objet par défaut |
| `getAffiliationStats` | GET | `/users/{userId}/affiliation-stats` | `userId` (path) | `AffiliationStatsDTO` | En erreur → objet par défaut |

---

### 2.2 influencerAPI

Données **mock** (aucun appel HTTP).

| Méthode | Payload entrant | Payload sortant |
|---------|-----------------|-----------------|
| `search` | `filters: SearchFilters`, `page`, `limit` | `SearchResponse` |
| `getById` | `id: string` | `Influencer \| null` |
| `getFeatured` | — | `Influencer[]` |

---

### 2.3 authAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `login` | POST | `/auth/login` | Body: `LoginPayload` (`email`, `password`) | `LoginResponse` | Stocke le token dans `api.defaults.headers` ; 401/403 → message "Email ou mot de passe incorrect" |
| `logout` | — | (côté client) | — | `void` | Supprime authToken et autres clés localStorage ; vide Authorization ; dispatch storage + logout |
| `signup` | POST | `/users/register` ou `/users/signup/unified` | `SignupPayload` ou `RegisterPayload` | données de réponse | Si payload a `confirmPassword` et pas `type` → `/users/register` ; sinon `/users/signup/unified` |
| `googleOAuthSuccess` | GET | `/auth/oauth2/success` | — | `LoginResponse` | Stocke token (axios + localStorage) si présent |

---

### 2.4 announcementsAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `getById` | GET | `/announcements/{id}` | `id: string` (path) | `AnnouncementResponse \| null` | 404 → `null` |
| `getByUserId` | GET | `/announcements/by-user?postedById={userId}` | `userId: string` (query) | `AnnouncementResponse[]` | — |
| `create` | POST | `/announcements` | Body: `AnnouncementResponse` | `AnnouncementResponse` | — |
| `update` | PUT | `/announcements/{id}` | `id` (path), body: `Partial<AnnouncementResponse>` | `AnnouncementResponse` | — |
| `delete` | DELETE | `/announcements/{id}` | `id: string` (path) | `void` | — |
| `getLatest` | GET | `/announcements?limit={limit}` | `limit?: number` (défaut 10) (query) | `AnnouncementResponse[]` | — |
| `getLatestExcludingUser` | GET | `/announcements/latest?excludePostedById={userId}&limit={limit}` | `userId`, `limit` (query) | `AnnouncementResponse[]` | — |
| `apply` | POST | `/announcements/{id}/apply` | `id` (path). **FormData** : `message`, `price`, `photos[]`, `videos[]` | réponse | **FormData** (multipart) |
| `getCurrent` | GET | `/announcements/current` | — | `AnnouncementResponse[]` | — |

---

### 2.5 dashboardAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `getSummary` | GET | `/dashboard/summary?userId={userId}&recLimit={recLimit}` | `userId: string`, `recLimit?: number` (défaut 6) (query) | `DashboardSummaryDTO` | En erreur → `{ hasNewMessages: false, pendingQuotesCount: 0, recommendations: [] }` |

---

### 2.6 favoritesAPI (legacy – professionnels)

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `getFavorites` | — | (aucun appel) | `userId: string` | `ProfessionalDTO[]` | Retourne toujours `[]` (Rentoall utilise `rentoallFavoritesAPI`) |
| `addFavorite` | POST | `/users/{userId}/favorites/{targetId}` (+ query `type`, `isClient` selon cas) | `userId`, `favoriteId`, `favoriteType?`, `isClient?` | `void` | — |
| `removeFavorite` | DELETE | `/users/{userId}/favorites/{targetId}` (+ query `type` selon cas) | `userId`, `favoriteId`, `favoriteType?` | `void` | — |

---

### 2.7 prestationsAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `listAll` | GET | `/prestations` | — | `PrestationDTO[]` | — |
| `listOngoing` | GET | `/prestations/ongoing` | — | `PrestationDTO[]` | — |
| `listByCreator` | GET | `/prestations/by-creator?userId={userId}` | `userId: string` (query) | `PrestationDTO[]` | — |
| `listOngoingByCreator` | GET | `/prestations/ongoing/by-creator?userId={userId}` | `userId: string` (query) | `PrestationDTO[]` | — |
| `listByRecipient` | GET | `/prestations/by-recipient?recipientId={recipientId}` | `recipientId: string` (query) | `PrestationDTO[]` | — |
| `listOngoingByRecipient` | GET | `/prestations/ongoing/by-recipient?recipientId={id}&limit={limit}` | `recipientId`, `limit?` (query) | `PrestationDTO[]` | — |
| `getById` | GET | `/prestations/{id}` | `id: string` (path) | `PrestationDTO \| null` | — |

---

### 2.8 statsAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `getPunchline` | GET | `/stats/users/{userId}/punchline` | `userId: string` (path) | `PunchlineDTO \| null` | — |

---

### 2.9 quotesAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `create` | POST | `/quotes` | Body: champs type `QuoteDTO` (title, description, price, deliveryTime, createdById, recipientId, status) | `QuoteDTO` | — |
| `getByCreator` | GET | `/quotes/by-creator?createdById={creatorId}` | `creatorId: string` (query) | `QuoteDTO[]` | — |
| `getByRecipient` | GET | `/quotes/recipient?recipientId={recipientId}` | `recipientId: string` (query) | `QuoteDTO[]` | — |
| `getById` | GET | `/quotes/{id}` | `id: string` (path) | `QuoteDTO \| null` | — |
| `updateStatus` | PATCH | `/quotes/{id}/status` (status en query ou body selon implémentation) | `id: string`, `status` | `QuoteDTO` | — |

---

### 2.10 usersAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `getAllUsers` | GET | `/users` | — | `UserDTO[]` | — |
| `getUserById` | GET | `/users/{userId}` | `userId: string` (path) | `UserDTO` | — |
| `updateUserSettings` | PUT | `/users/{userId}/settings` | `userId` (path), body: `UserSettingsDTO` | réponse | — |
| `updateClient` | PUT | `/clients/{userId}` | `userId` (path), body: données client | réponse | — |
| `updateProfessional` | PUT | `/users/pro/{userId}` | `userId` (path), body: données pro | réponse | — |
| `updateAgency` | PUT | `/users/agency/{userId}` | `userId` (path), body: données agence | réponse | — |
| `updateEnterprise` | PUT | `/users/enterprise/{userId}` | `userId` (path), body: données entreprise | réponse | — |
| `resetPassword` | POST | `/auth/reset` | Body: données reset | réponse | — |
| `searchUsers` | GET | `/users/search?q=...&city=...&minAge=...&maxAge=...&platform=...&gender=...&categoryId=...&subCategoryId=...&page=...&size=...` | Query: q, city, minAge, maxAge, platform, gender, categoryId, subCategoryId, page, size | `UserDTO[]` | En erreur → `[]`. Pagination : `page`, `size`. |

---

### 2.11 featuredAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `getFeatured` | GET | `/featured?type={type}&page={page}&size={size}` | `type: "PROFESSIONAL" \| "AGENCY" \| "ENTERPRISE"`, `page?` (défaut 0), `size?` (défaut 20) (query) | `UserDTO[]` | Pagination : page, size. |

---

### 2.12 categoriesAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `getAllCategories` | GET | `/categories` | — | `CategoryDTO[]` | — |

---

### 2.13 chatAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `sendMessage` | POST | `/chat/conversations/messages` | Body: `{ senderId, recipientId, content, clientMessageId? }` | `MessageDTO` | — |
| `getAllConversations` | GET | `/chat/all-conversation?recipientId={id}` | `recipientId: string` (query) | `ConversationDTO[]` | En erreur → `[]` |
| `getMessages` | GET | `/chat/conversations/messages?userA=...&userB=...&since=...&limit=...` | Query: userA, userB, since?, limit? | `MessageDTO[]` | — |
| `markAsRead` | PUT | `/chat/conversations/mark-read?userA=...&userB=...` | `userA`, `userB` (query) | `void` | — |
| `hasUnreadMessages` | GET | `/chat/waiting-message?recipientId=...` | `recipientId: string` (query) | `boolean` | — |

---

### 2.14 applicationsAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `create` | POST | `/announcements/{announcementId}/applications` | `announcementId` (path). **FormData** : message, price?, applicantId?, photos[], videos[] | `ApplicationDTO` | **FormData** multipart |
| `getByAnnouncement` | GET | `/announcements/{announcementId}/applications` | `announcementId` (path) | `ApplicationDTO[]` | — |
| `getByApplicant` | GET | `/announcements/applications/applicant/{applicantId}` | `applicantId: string` (path) | `ApplicationDTO[]` | — |
| `getByOwner` | GET | `/announcements/applications/owner/{ownerId}` | `ownerId: string` (path) | `ApplicationDTO[]` | — |
| `getById` | GET | `/announcements/applications/{id}` | `id: string` (path) | `ApplicationDTO \| null` | — |
| `updateStatus` | PUT | `/announcements/applications/{id}/status` (body: status) | `id` (path), body: status | réponse | — |

---

### 2.15 reviewsAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `createReviewFromUserIds` | — | (interne) | `authorUserId`, `receiverUserId`, `overallRating`, `generalFeedback?`, `additionalComments?` | `ReviewDTO` | Résout les IDs via `getReviewUserIdFromUserId` puis appelle `createReview` |
| `createReview` | POST | `/reviews` | Body: `CreateReviewDTO` | `ReviewDTO` | — |
| `getAllReviewsByUserId` | GET | `/reviews/users/{userId}` | `userId: string` (path) | `ReviewDTO[]` | En erreur → `[]` |
| `getReceivedReviews` | GET | `/reviews/users/{userId}/received` | `userId` (path) | `ReviewDTO[]` | En erreur → `[]` |
| `getWrittenReviews` | GET | `/reviews/users/{userId}/written` | `userId` (path) | `ReviewDTO[]` | En erreur → `[]` |
| `deleteReview` | DELETE | `/reviews/{reviewId}` | `reviewId: string` (path) | `void` | — |

---

### 2.16 campaignsAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `create` | POST | `/campaigns` | Body: `CampaignCreateDTO` | `CampaignDTO` | — |
| `getById` | GET | `/campaigns/{campaignId}` | `campaignId: string` (path) | `CampaignDTO` | — |
| `listByCreator` | GET | `/campaigns/by-creator?creatorId=...` | `creatorId: string` (query) | `CampaignDTO[]` | — |
| `addPhoto` | POST | `/campaigns/{campaignId}/photos` | `campaignId` (path). **FormData** : file, ownerId | `CampaignPhotoDTO` | **FormData** |
| `updatePhotoOrder` | PUT | `/campaigns/{campaignId}/photos/order` | `campaignId` (path), body: ordre des photos | `CampaignDTO` | — |
| `removePhoto` | DELETE | `/campaigns/{campaignId}/photos/{photoId}` | `campaignId`, `photoId` (path) | `void` | — |
| `getPhotos` | GET | `/campaigns/{campaignId}/photos` | `campaignId` (path) | `CampaignPhotoDTO[]` | — |
| `delete` | DELETE | `/campaigns/{campaignId}` | `campaignId` (path) | `void` | — |

---

### 2.17 facebookAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `publishPhotoById` | POST | Endpoint campaigns/facebook avec photo id | `campaignId`, `photoId` (et évent. ownerId) | `string` | — |

---

### 2.18 rentoallUsersAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `getProfile` | GET | `/users/{userId}` | `userId: number` (path) | `UserDTO` | — |
| `updateProfile` | PUT | `/users/{userId}` | `userId` (path), body: `UpdateUserPayload` | `UserDTO` | — |
| `updateProfilePicture` | POST | `/users/{userId}/profile-picture` | `userId` (path). **FormData** : fichier image | `UserDTO` | **FormData** (clé `file`) |
| `deleteAccount` | DELETE | `/users/{userId}` | `userId` (path) | `void` | — |
| `forgotPassword` | POST | `/users/forgot-password?email={email}` | `email: string` (query), body: non utilisé | `void` | — |
| `resetPassword` | POST | `/users/reset-password?token=...&newPassword=...` | Query: `token`, `newPassword` (depuis `ResetPasswordPayload`) | `void` | — |
| `changePassword` | PUT | `/users/{userId}/password` | `userId` (path), body: `ChangePasswordPayload` | `UserDTO` | — |
| `updateNotificationPreferences` | PATCH | `/users/{userId}/notification-preferences` | `userId` (path), body: préférences | réponse | — |
| `getUserReservations` | GET | `/users/{userId}/reservations` | `userId` (path) | `ReservationDTO[]` | — |
| `getMyPlaces` | GET | `/users/{userId}/places` | `userId` (path) | `PlaceDTO[]` | — |
| `start2FASetup` | POST | Endpoint 2FA setup (ex. `/users/{userId}/2fa/setup`) | `userId` (path), body: vide | `{ otpAuthUrl: string; secret: string }` | — |
| `verify2FASetup` | POST | Endpoint 2FA verify | `userId` (path), body: `{ code }` | `{ backupCodes: string[] }` | — |
| `disable2FA` | POST | Endpoint 2FA disable | `userId` (path), body: `{ password, code }` | `void` | — |

---

### 2.19 rentoallFavoritesAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `addFavorite` | POST | `/users/{userId}/favorites/{placeId}` | `userId`, `placeId` (path), body: `{}` | `void` | — |
| `removeFavorite` | DELETE | `/users/{userId}/favorites/{placeId}` | `userId`, `placeId` (path) | `void` | — |
| `getFavorites` | GET | `/users/{userId}/favorites` | `userId` (path) | `PlaceDTO[]` | — |
| `createFolder` | POST | `/users/{userId}/folders` | `userId` (path), query: `name` | `FavoriteFolderDTO` | — |
| `addToFolder` | POST | `/users/{userId}/folders/{folderId}/favorites/{placeId}` | `userId`, `folderId`, `placeId` (path) | `void` | — |
| `removeFromFolder` | DELETE | `/users/{userId}/folders/{folderId}/favorites/{placeId}` | `userId`, `folderId`, `placeId` (path) | `void` | — |
| `getFolders` | GET | `/users/{userId}/folders` | `userId` (path) | `FavoriteFolderDTO[]` | — |

---

### 2.20 investorInquiryAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `submit` | POST | Endpoint investor inquiry (ex. `/investor-inquiry` ou similaire) | Body: `InvestorInquiryDTO` | `void` | — |

---

### 2.21 placesAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `getAll` | GET | `/places?page=...&size=...` | Query: `GetAllPlacesParams` (page?, size?) | `PlaceDTO[]` | Réponse : tableau ou `response.data.content` ; pagination page, size. |
| `create` | POST | `/places` | **FormData** : part `"place"` = JSON de `CreatePlacePayload` (sans videoUrl), part `"video"` = File (optionnel) | `PlaceDTO` | **FormData** ; pas de Content-Type manuel (boundary auto). |
| `getById` | GET | `/places/{placeId}` | `placeId: number` (path) | `PlaceDTO` | — |
| `getCharacteristics` | GET | `/places/characteristics/{placeType}` | `placeType: 'PARKING' \| 'STORAGE_SPACE' \| 'CAVE'` (path) | `Array<string \| { key, label, type, placeholder?, options?, required? }>` | — |
| `getAvailableFilters` | GET | `/places/filters` | — | `AvailableFilters` | Sans header auth. |
| `search` | GET | `/places/search?city=...&type=...&title=...&availableFrom=...&availableTo=...&maxPrice=...&lat=...&lng=...&radius=...&page=...&size=...&instantBooking=...&freeCancellation=...&[caractéristiques]` | Query construit depuis `SearchPlacesParams` : champs standards + `characteristics` et autres clés en key=value (exclus : city, type, title, availableFrom, availableTo, maxPrice, instantBooking, freeCancellation, noDeposit, characteristics, lat, lng, radius, page, size) | `PlaceDTO[]` | Réponse : tableau ou `content`. |
| `updateCalendar` | POST | `/places/{placeId}/calendar` | `placeId` (path), body: `PlaceAvailabilityDTO[]` | `PlaceAvailabilityDTO[]` | Endpoint **synchrone** (200 OK) : à utiliser pour que les données soient à jour avant rechargement. Ne pas utiliser `/availabilities` (asynchrone, 202 Accepted). |
| `getCalendar` | GET | `/places/{placeId}/calendar?start=...&end=...` | `placeId` (path), query: start?, end? | `PlaceAvailabilityDTO[]` | — |
| `getOwnerCalendarOverview` | GET | `/places/owner/{userId}/calendar-overview?_t=timestamp` | `userId` (path), `_t` (cache-busting) | `PlaceDTO[]` | Headers Cache-Control no-cache. |
| `update` | PUT | `/places/{placeId}` | `placeId` (path), body: `Partial<CreatePlacePayload>` | `PlaceDTO` | — |
| `updateStatus` | PATCH | `/places/{placeId}/status?status=...` | `placeId` (path), query: status | `PlaceDTO` | — |
| `updateActive` | PATCH | `/places/{placeId}/active?active=...` | `placeId` (path), query: active (boolean) | `PlaceDTO` | — |
| `updatePrices` | PATCH | `/places/{placeId}/prices` | `placeId` (path), body: `{ pricePerHour?, pricePerDay?, pricePerWeek?, pricePerMonth? }` | `PlaceDTO` | — |
| `getAutomatedMessages` | GET | `/places/{placeId}/automated-messages` | `placeId` (path) | `AutomatedMessageDTO[]` | En erreur → `[]`. |
| `updateAutomatedMessages` | POST | `/places/{placeId}/automated-messages` | `placeId` (path), body: `AutomatedMessageDTO[]` | `AutomatedMessageDTO[]` | — |
| `delete` | DELETE | `/places/{placeId}` | `placeId` (path) | `void` | 400/409 → throw avec message (ex. réservations actives). |

---

### 2.22 reservationsAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `estimate` | POST | `/reservations/estimate` | Body: `EstimateReservationPayload` | `number` | Réponse normalisée en number. |
| `create` | POST | `/reservations` | Body: `CreateReservationPayload` | `ReservationDTO` | — |
| `getById` | GET | `/reservations/{reservationId}` | `reservationId` (path) | `ReservationDTO` | — |
| `getClientReservations` | GET | `/reservations/client/{clientId}` | `clientId` (path) | `ReservationDTO[]` | — |
| `getPlaceReservations` | GET | `/reservations/place/{placeId}` | `placeId` (path) | `ReservationDTO[]` | — |
| `update` | PUT | `/reservations/{reservationId}` | `reservationId` (path), body: `UpdateReservationPayload` | `ReservationDTO` | — |
| `cancel` | POST | `/reservations/{reservationId}/cancel` | `reservationId` (path), body: null | `ReservationDTO` | — |
| `updateStatus` | PATCH | `/reservations/{reservationId}/status?status=...` | `reservationId` (path), query: status | `ReservationDTO` | — |
| `getOwnedReservations` | GET | `/users/{userId}/owned-reservations` | `userId` (path) | `ReservationDTO[]` | — |
| `estimateUpdate` | POST | `/reservations/{reservationId}/estimate-update` | `reservationId` (path), body: `{ newStartDateTime, newEndDateTime }` | `number` (priceDifference) | — |
| `requestUpdate` | POST | `/reservations/{reservationId}/request-update` | `reservationId` (path), body: `{ newStartDateTime, newEndDateTime }` | `ReservationDTO` | — |
| `respondUpdate` | POST | `/reservations/{reservationId}/respond-update?accepted=...` | `reservationId` (path), query: accepted | `ReservationDTO` | — |
| `approveReservation` | POST | `/reservations/{reservationId}/approve` | `reservationId` (path), body: null | `ReservationDTO` | — |
| `rejectReservation` | POST | `/reservations/{reservationId}/reject` | `reservationId` (path), body: null | `ReservationDTO` | — |
| `getPendingReservationsForOwner` | GET | `/reservations/pending/owner/{ownerId}` | `ownerId` (path) | `ReservationDTO[]` | — |
| `createUpdateCheckout` | POST | `/reservations/{reservationId}/create-update-checkout?successUrl=...&cancelUrl=...` | `reservationId` (path), query: successUrl, cancelUrl, optionnel: uiMode, amountInEuros. Body optionnel: `{ amountInEuros, amountInCents }` (montant TTC avec frais — à utiliser pour Stripe, pas la seule priceDifference) | `{ url?: string; sessionId: string; clientSecret?: string }` | — |

---

### 2.23 rentoallReviewsAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `create` | POST | `/reviews` | Body: `CreateReviewPayload` | `ReviewDTO` | — |
| `getPlaceReviews` | GET | `/reviews/place/{placeId}` | `placeId` (path) | `ReviewDTO[]` | — |
| `createReservationReview` | POST | `/reviews` | Body: reservationId, authorId, placeId, accessibilityRating, cleanlinessRating, communicationRating, valueForMoneyRating, comment? | `ReviewDTO` | — |

---

### 2.24 paymentsAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `createCheckoutSession` | POST | `/checkout-session` | Body: `CheckoutRequestDTO` (placeId obligatoire, clientId?, amount, currency?, orderId?, customerEmail?, successUrl, cancelUrl, startDateTime, endDateTime, reservationType) | `CheckoutResponseDTO` | Utilise l’instance `api` (baseURL). |
| `createStripeOnboardingLink` | POST | `/owners/{ownerId}/stripe/onboarding-link?refreshUrl=...&returnUrl=...` | `ownerId` (path), query: refreshUrl, returnUrl, body: `{}` | `{ url: string }` | — |
| `getPaymentStatus` | GET | `/checkout-session/status?orderId=...` | Query: orderId | `PaymentStatusResponse` | — |
| `createCheckoutSessionLegacy` | POST | `/payments/create-checkout-session` | Query: placeId, amount, currency, successUrl, cancelUrl ; body: null | `{ url: string }` | — |
| `getOwnerPayouts` | GET | `/payouts/owner/{ownerId}` | `ownerId` (path) | `OwnerPayoutDTO[]` | En erreur throw. Réponse normalisée en tableau si besoin. |
| `updateStripeLink` | POST | `/owners/{ownerId}/stripe/update-link` | `ownerId` (path), body: `{ returnUrl }` | `{ url: string }` | — |

---

### 2.25 messagesAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `sendMessage` | POST | `/messages` | Body: `{ senderId, receiverId, placeId, content }` | `MessageDTO` | Validation : senderId/receiverId/placeId > 0, senderId ≠ receiverId, content non vide. |
| `getConversation` | GET | `/messages/conversation?placeId=...&user1Id=...&user2Id=...` | Query: placeId, user1Id, user2Id | `MessageDTO[]` | — |
| `getUserMessages` | GET | `/messages/user/{userId}` | `userId` (path) | `MessageDTO[]` | — |
| `markAsRead` | PATCH | `/messages/read?receiverId=...&senderId=...&placeId=...` | Query: receiverId, senderId, placeId, body: `{}` | `void` | — |
| `getUnreadCount` | GET | `/messages/unread-count/{userId}` | `userId` (path) | `number` | En erreur → 0. |

---

### 2.26 contactAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `sendContactRequest` | POST | `/contact` | Body: `{ userId?, title, description }` | `ContactRequestDTO` | — |
| `getUserContactRequests` | GET | `/contact/user/{userId}` | `userId` (path) | `ContactRequestDTO[]` | — |

---

### 2.27 reportingAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `reportPlace` | POST | `/places/report` | Body: `PlaceReportDTO` | `void` | — |
| `reportUser` | POST | `/users/report` | Body: `UserReportDTO` | `void` | — |

---

### 2.28 sireneAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `validate` | GET | `/sirene/validate?sirene=...` | Query: sirene (string) | `SireneValidationResponse` | 400 → Error avec message backend ; autres erreurs → message générique ou "Impossible de contacter le serveur". |

---

### 2.29 locationsAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `searchCities` | GET | `/locations/search?city=...` | Query: city (préfixe) | `LocationSearchResult[]` | En erreur → `[]`. |
| `searchByPostalCode` | GET | `/locations/by-postal-code/{postalCode}` | `postalCode` (path) | `LocationSearchResult[]` | En erreur → `[]`. |

---

### 2.30 geocodeAPI

| Méthode | HTTP | Chemin | Payload entrant | Payload sortant | Logique |
|---------|------|--------|-----------------|-----------------|--------|
| `autocomplete` | GET | `/geocode/autocomplete?q=...` | Query: q (string) | `AddressSuggestionDTO[]` | Si `q` < 3 caractères → `[]` sans appel. Pas d’auth. En erreur → `[]`. |

---

## 3. Objets (DTOs et payloads) – Référence complète

### 3.1 Payloads d’authentification et inscription

- **LoginPayload**  
  `email: string` ; `password: string`

- **LoginResponse**  
  `id?`, `email?`, `firstName?`, `lastName?`, `type?`, `token?`, `[key: string]: unknown`

- **RegisterPayload**  
  `email`, `password`, `confirmPassword`, `firstName`, `lastName`, `phoneNumber?`, `companyName?`, `companyAddress?`, `siret?`, `vatNumber?`, `appliedReferralCode?`, `appliedAffiliationCode?`

- **SignupPayload** = `ClientSignupPayload` | `ProfessionalSignupPayload` | `AgencySignupPayload` | `EnterpriseSignupPayload`

- **ClientSignupPayload**  
  `type: "CLIENT"` ; `firstName`, `lastName`, `email`, `username`, `password`, `matchingPassword` ; `phoneNumber?`, `birthCity?`, `birthdate?`, `address?: Address`

- **Address**  
  `street`, `city`, `postalCode`, `country` (string)

- **ProfessionalSignupPayload**  
  `type: "PROFESSIONAL"` ; mêmes champs utilisateur + `professionalCard?: ProfessionalCard`, `bankInformations?: BankInformation[]`

- **ProfessionalCard**  
  `title?`, `description?`, `price?` (number)

- **BankInformation**  
  `iban`, `bic` (string)

- **AgencySignupPayload**  
  `type: "AGENCY"` ; champs utilisateur + `agencyName`, `website?`, `vatNumber?`

- **EnterpriseSignupPayload**  
  `type: "ENTERPRISE"` ; champs utilisateur + `companyName`, `siretNumber?`, `vatNumber?`, `contactPerson?`

---

### 3.2 Parrainage / affiliation

- **AffiliationCodeDTO**  
  `id: number` ; `code: string` ; `description: string` ; `userId: number`

- **AffiliationSummaryDTO**  
  `referralCode: string` ; `affiliationCodes: AffiliationCodeDTO[]` ; `walletBalance: number`

- **AffiliationStatsDTO**  
  `referralCode: string` ; `totalReferrals`, `totalAffiliates`, `totalEarnings`, `referralEarnings`, `commissionEarnings: number` ; `affiliationCodes: AffiliationCodeDTO[]`

---

### 3.3 Utilisateur (profil, mot de passe, 2FA)

- **UpdateUserPayload**  
  `firstName`, `lastName`, `email` (obligatoires) ; `phoneNumber?`, `profilePicture?`, `birthDate?`, `language?`, `address?`, `city?`, `zipCode?`, `companyName?`, `companyAddress?`, `siret?`, `vatNumber?` ; `[key: string]: unknown`

- **ChangePasswordPayload**  
  `oldPassword`, `newPassword`, `confirmPassword: string`

- **ForgotPasswordPayload**  
  `email: string`

- **ResetPasswordPayload**  
  `token: string` ; `newPassword: string`

- **UserDTO** (résumé des champs principaux)  
  `id?`, `uid?`, `firstName?`, `lastName?`, `email?`, `username?`, `phoneNumber?`, `birthdate?`, `gender?`, `type?`, `providerEnum?`, `active?`, `address?`, `city?`, `zipCode?`, `addressDTO?`, `photo?`, `reviewUser?`, `roles?`, `organization?`, `referralCode?`, `creditBalance?`, préférences notifications, etc. ; `[key: string]: unknown`

- **UserSettingsDTO**  
  `recoveryEmail?`, `recoveryPhoneNumber?`

- **ProfessionalDTO**  
  Étend `UserDTO` + `subscriptionEnum?`, `bankInformations?`, `professionalCard?`, `settings?`, `accountStatus?`, etc.

- **ClientDTO**, **AgencyDTO**, **EnterpriseDTO**  
  Étendent `UserDTO` avec champs métier spécifiques.

---

### 3.4 Biens (places)

- **CreatePlacePayload**  
  `type: 'PARKING' | 'CAVE' | 'STORAGE_SPACE'` ; `address`, `city`, `ownerId`, `deposit` (number) ; `description?`, `pricePerHour?`, `pricePerDay?`, `pricePerWeek?`, `pricePerMonth?`, `active?`, `photos?` (string[]), `videoUrl?`, `availableFrom?`, `availableTo?`, `availabilities?` (PlaceAvailabilityDTO[]), `characteristics?` (`{ name, value }[]`), `minDays?`, `minHours?`, `truckAccessDistance?`, `accessibilityRemarks?`, `hourPriceActive?`, `dayPriceActive?`, `weekPriceActive?`, `monthPriceActive?`, `cancellationDeadlineDays?`, `cancellationPolicy?`, `instantBooking?`

- **PlaceDTO**  
  `id`, `type`, `address`, `city`, `deposit`, `pricePerDay`, `pricePerMonth`, `ownerId`, `active` ; `description?`, `pricePerHour?`, `pricePerWeek?`, `characteristics?` (PlaceCharacteristicDTO[]), `latitude?`, `longitude?`, `hourPriceActive?`, `dayPriceActive?`, `weekPriceActive?`, `monthPriceActive?`, `availabilities?`, `occupiedSlots?`, `availableFrom?`, `availableTo?`, `minDays?`, `minHours?`, `truckAccessDistance?`, `accessibilityRemarks?`, `cancellationPolicy?`, `cancellationDeadlineDays?`, `videoUrl?` ; `[key: string]: unknown`

- **PlaceCharacteristicDTO**  
  `name: string` ; `value: string`

- **PlaceAvailabilityDTO**  
  `date: string` (YYYY-MM-DD) ; `available: boolean` ; `startTime?`, `endTime?` (HH:mm:ss) ; `customPricePerDay?`, `customPricePerHour?`

- **OccupiedSlotDTO**  
  `start`, `end` (ISO) ; `clientName?`, `totalPrice?`, `serviceFee?`, `hostAmount?`

- **SearchPlacesParams**  
  `city?`, `type?`, `title?`, `availableFrom?`, `availableTo?`, `maxPrice?`, `lat?`, `lng?`, `radius?`, `characteristics?` (Record<string, string>), `instantBooking?`, `freeCancellation?`, `noDeposit?`, `page?`, `size?` ; `[key: string]: unknown`

- **GetAllPlacesParams**  
  `page?`, `size?` (number)

- **AvailableFilters**  
  `placeTypes: string[]` ; `characteristics: Record<string, string[]>` ; `booleanFilters: string[]` ; `cities: string[]`

- **AutomatedMessageDTO**  
  `type: 'ON_RESERVATION' | 'BEFORE_START' | 'AFTER_END'` ; `content: string` ; `active: boolean` ; `sendingTime?`, `daysOffset?`

---

### 3.5 Réservations

- **EstimateReservationPayload**  
  `placeId: number` ; `startDateTime`, `endDateTime: string` (ISO) ; `reservationType?: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY'`

- **CreateReservationPayload**  
  `placeId`, `clientId: number` ; `startDateTime`, `endDateTime: string` (ISO) ; `reservationType?`, `totalPrice?`, `serviceFee?`, `hostAmount?`

- **UpdateReservationPayload**  
  `startDateTime?`, `endDateTime?`, `status?` (string)

- **ReservationDTO**  
  `id`, `placeId`, `clientId`, `totalPrice` ; `startDateTime`, `endDateTime`, `status`, `paymentStatus` ; `serviceFee?`, `hostAmount?`, `userRole?` ('GUEST' | 'HOST'), `createdAt?`, `requestedStartDateTime?`, `requestedEndDateTime?`, `priceDifference?` ; `[key: string]: unknown`

---

### 3.6 Avis (reviews)

- **CreateReviewPayload**  
  `rating: number` ; `comment: string` ; `authorId: number` ; `reservationId: number`

- **CreateReviewDTO** (reviewsAPI legacy)  
  `author: { id }`, `receiver: { id }`, `overallRating`, `generalFeedback?`, `specificRatings?`, `characteristics?`, `additionalComments?`

- **ReviewDTO**  
  `id?`, `reservationId?`, `authorId?`, `placeId?`, `author?`, `receiver?`, `overallRating?`, `rating?`, `accessibilityRating?`, `cleanlinessRating?`, `communicationRating?`, `valueForMoneyRating?`, `generalFeedback?`, `comment?`, `reply?`, `replyAt?`, `createdAt?`, `updatedAt?`, etc.

---

### 3.7 Paiements (Stripe)

- **CheckoutRequestDTO**  
  `placeId` (obligatoire), `clientId?`, `amount` (centimes), `currency?`, `orderId?`, `customerEmail?`, `successUrl`, `cancelUrl`, `startDateTime`, `endDateTime` (ISO), `reservationType: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY'`

- **CheckoutResponseDTO**  
  `url: string` ; `sessionId: string`

- **CreateCheckoutSessionPayload** (legacy)  
  `placeId`, `amount`, `currency?`, `successUrl`, `cancelUrl`

- **PaymentStatusResponse**  
  `status: 'SUCCEEDED' | 'PENDING' | 'FAILED' | 'CANCELED'` ; `sessionId?`

- **OwnerPayoutDTO**  
  `id`, `reservationId`, `placeTitle`, `grossAmountCents`, `platformFeeCents`, `netAmountCents`, `status` ('PENDING' | 'SENT' | 'FAILED' | 'BLOCKED_OWNER_NOT_READY'), `releaseAt`, `sentAt?`, `createdAt`, `transferId?`

---

### 3.8 Messages et contact

- **MessageDTO**  
  `id` (number | string), `senderId`, `receiverId`, `placeId`, `content`, `timestamp`, `isRead` ; `senderName?`, `receiverName?`, `placeName?`, `conversationId?`, `createdAt?`, `clientMessageId?`, `status?`

- **ConversationSummaryDTO**  
  `placeId`, `otherUserId`, `unreadCount` ; `placeTitle?`, `placeImage?`, `otherUserName?`, `otherUserAvatar?`, `lastMessage?`, `lastMessageDate?`

- **ContactRequestDTO**  
  `id?`, `userId?` ; `title: string` ; `description: string` ; `createdAt?`

---

### 3.9 Favoris (Rentoall)

- **FavoriteFolderDTO**  
  `id`, `name`, `userId` (number) ; `favorites?: number[]` ; `[key: string]: unknown`

---

### 3.10 Signalement et SIRENE

- **PlaceReportDTO**  
  `placeId: number` ; `reason: string` ; `description?`, `reporterId?`

- **UserReportDTO**  
  `userId: number` ; `reason: string` ; `description?`, `reporterId?`

- **SireneValidationResponse**  
  `name`, `address`, `siret`, `apeCode: string`

---

### 3.11 Localisation et géocodage

- **LocationSearchResult**  
  `id`, `postalCode`, `inseeCode`, `cityName`, `cityNameNormalized` ; `latitude?`, `longitude?` (ou `lat?`, `lng?`) ; `createdAt?`, `updatedAt?`

- **AddressSuggestionDTO**  
  `label: string` ; `houseNumber?`, `road?`, `city?`, `postcode?`, `country?`, `lat?`, `lng?`, `boundingBox?`

---

### 3.12 Annonces, candidatures, campagnes, etc.

- **AnnouncementResponse**  
  `id?`, `title`, `description`, `location`, `userType`, `startDate`, `endDate`, `postedById` ; `latitude?`, `longitude?`, `prestationType?`, `influencersNumber?`, `budget?`, `deposit?`, `categoryId?`, `subCategoryId?`, `createdAt?`, `updatedAt?`, `status?`, `preferredAgeRanges?`, `preferredGender?`

- **ApplicationDTO**  
  `id?`, `announcementId?`, `applicantId?`, `message?`, `mediaUrls?`, `photos?`, `videos?`, `price?`, `status?`, `createdAt?`, `updatedAt?`

- **CampaignCreateDTO**  
  `name: string`, `creatorId: string` ; `date?`, `photoIds?`

- **CampaignDTO**  
  `id`, `name`, `creatorId`, `photoIds: string[]` ; `date?`, `createdAt?`, `updatedAt?`

- **CampaignPhotoDTO** / **PhotoResponse**  
  `id`, `filePath?`, `url?`, `campaignId?`, `ownerId?`, `orderIndex?`, `order?`, `postId?`

- **InvestorInquiryDTO**  
  `firstName`, `lastName`, `email`, `amount`, `reason` (string) ; `linkedInUrl?`

- **DashboardSummaryDTO**  
  `hasNewMessages: boolean`, `pendingQuotesCount: number`, `recommendations: RecommendationDTO[]`

- **RecommendationDTO**  
  `user: UserDTO`, `score: number`, `reasonSummary: string`

- **QuoteDTO**  
  `id?`, `title`, `description?`, `price`, `deliveryTime?`, `duration?`, `createdById?`, `creatorId?`, `recipientId`, `status?`, `createdAt?`, `acceptedAt?`, `updatedAt?`

- **PunchlineDTO**, **PrestationDTO**, **CategoryDTO**, **SubCategoryDTO**, **ConversationDTO**, **OrganizationDTO**, etc.  
  Définis dans `api.ts` ; voir le fichier pour les champs complets.

---

## 4. Logique spéciale (résumé)

| Thème | Détail |
|-------|--------|
| **Auth** | Intercepteur Axios + header `Authorization: Bearer ${token}`. Beaucoup de méthodes utilisent aussi `axios` directement avec le même header. `geocodeAPI.autocomplete` et `placesAPI.getAvailableFilters` n’envoient pas le token. |
| **FormData** | **placesAPI.create** : part `"place"` (JSON sans videoUrl) + part `"video"` (File). **announcementsAPI.apply** : message, price, photos, videos. **applicationsAPI.create** : message, price, applicantId?, photos, videos. **campaignsAPI.addPhoto** : file, ownerId. **rentoallUsersAPI.updateProfilePicture** : fichier (clé `file`). |
| **Endpoint synchrone** | **placesAPI.updateCalendar** utilise `POST /places/{placeId}/calendar` (200 OK) pour que les données soient persistées avant tout rechargement. |
| **Erreurs → valeur par défaut** | referralsAPI (plusieurs méthodes → `[]` ou objet par défaut), generateReferralCode (code mock), announcementsAPI.getById (null), dashboardAPI.getSummary, favoritesAPI.getFavorites ([]), reviewsAPI ([]), placesAPI.getAutomatedMessages ([]), messagesAPI.getUnreadCount (0), locationsAPI ([]), geocodeAPI.autocomplete ([]), chatAPI.getAllConversations ([]), usersAPI.searchUsers ([]). |
| **Pagination** | **page / size** : placesAPI.getAll, placesAPI.search, usersAPI.searchUsers, featuredAPI.getFeatured. **recLimit** : dashboardAPI.getSummary. **limit** : announcementsAPI.getLatest, getLatestExcludingUser ; chatAPI.getMessages ; prestationsAPI.listOngoingByRecipient. |
| **Réponse liste** | placesAPI.getAll et placesAPI.search : retour `Array.isArray(response.data) ? response.data : (response.data?.content || [])`. |
| **Helpers** | `getReviewUserIdFromUserId(userId)` (utilise usersAPI.getUserById) pour reviewsAPI.createReviewFromUserIds. Export par défaut : instance `api` (axios). |

---

*Document généré à partir de `src/services/api.ts`. Dernière mise à jour : février 2025.*

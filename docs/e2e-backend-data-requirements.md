# Données backend attendues pour les tests E2E (Playwright)

Les tests E2E **ne mockent pas le backend**. Le frontend appelle le vrai API. Il faut que le backend expose les endpoints attendus et que certaines **données existent en base** (ou via seed) pour que les tests passent.

---

## 1. Variables d'environnement pour les tests

À définir (ex. dans `.env.e2e` ou CI) :

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `E2E_USER_EMAIL` | Oui (auth/user tests) | Email d'un **utilisateur client** existant en base |
| `E2E_USER_PASSWORD` | Oui | Mot de passe de ce compte client |
| `E2E_HOST_EMAIL` | Oui (owner tests) | Email d'un **utilisateur hôte** existant en base |
| `E2E_HOST_PASSWORD` | Oui | Mot de passe de ce compte hôte |
| `E2E_PLACE_ID` | Optionnel | ID d'un **bien (place)** existant (idéalement détenu par le host ci‑dessus) |
| `E2E_HOST_USER_ID` | Optionnel | **ID utilisateur** du propriétaire du bien (pour `messages?placeId=&userId=`) |
| `E2E_RESERVATION_ID` | Optionnel | ID d'une **réservation** existante (liée au client ou à l’hôte de test) |

Optionnellement :

- `E2E_BASE_URL` : URL du front (défaut `http://localhost:3000`)
- `E2E_API_URL` ou `NEXT_PUBLIC_API_URL` : URL de l’API (défaut `http://localhost:8080/api`)

---

## 2. Données que le backend doit exposer

### 2.1 Utilisateurs

- **Compte client (pour E2E_USER_EMAIL / E2E_USER_PASSWORD)**  
  - Un utilisateur avec email/mot de passe valides.  
  - Ce que le front attend : `POST /api/auth/login` (ou équivalent) accepte ces identifiants et renvoie un token ; `GET /api/users/{userId}` renvoie le profil (ou 404 si endpoint absent).

- **Compte hôte (pour E2E_HOST_EMAIL / E2E_HOST_PASSWORD)**  
  - Un utilisateur “propriétaire” avec au moins un bien.  
  - Même contrat login + `GET /api/users/{userId}` si les tests chargent le profil.

### 2.2 Biens (places)

- **Pour recherche et fiche bien**  
  - Au moins un bien actif (ex. `active: true`) retourné par `GET /api/places/search` (ou équivalent) avec au moins une ville dans la liste (ex. Paris, Lyon, Marseille).  
  - Champs attendus côté front : `id`, `address`, `city`, `description`, `photos` (array), `pricePerDay` / `pricePerHour` (selon config), `type` (PARKING, etc.), `ownerId`.

- **Pour E2E_PLACE_ID / host edit**  
  - Un bien dont l’`ownerId` est l’utilisateur hôte de test.  
  - Ce même `id` peut servir pour :  
    - `/parking/[id]` (fiche bien),  
    - `/host/my-places/[id]` (édition par le host),  
    - `messages?placeId=[id]&userId=[E2E_HOST_USER_ID]`.

### 2.3 Réservations

- **Pour E2E_RESERVATION_ID**  
  - Une réservation existante dont :  
    - soit le `clientId` est l’utilisateur client de test,  
    - soit l’hôte du bien est l’utilisateur hôte de test.  
  - Le front appelle typiquement un endpoint du type `GET /api/reservations/{id}` ou liste des réservations utilisateur et s’attend à voir les champs habituels (dates, statut, place, montant, etc.).

### 2.4 Messages

- **Pour messages et conversation**  
  - `GET /api/messages/user/{userId}` (ou équivalent) peut retourner une liste vide ou des messages.  
  - Pour le test “URL avec placeId + userId” :  
    - `GET /api/messages/conversation?placeId=...&user1Id=...&user2Id=...` (ou équivalent) doit exister et peut retourner un tableau vide (nouvelle conversation) ou des messages.  
  - Aucun mock : si l’endpoint n’existe pas ou renvoie 404, le test peut être skippé ou adapter les attentes (ex. pas d’erreur bloquante).

### 2.5 Auth

- **Login**  
  - `POST` vers l’endpoint de login (ex. `/api/auth/login`) avec `email` + `password` → retourne un token (JWT ou autre) et éventuellement l’`userId`.  
  - Le front stocke le token et l’`userId` (localStorage / cookies) et les envoie sur les requêtes protégées.

- **Profil utilisateur**  
  - `GET /api/users/{userId}` avec header `Authorization: Bearer <token>` : retourne le profil (ex. `firstName`, `lastName`, `email`, `profilePicture`) ou 404.  
  - En cas de 404, le front ne doit pas crasher (gestion déjà prévue).

---

## 3. Par fichier de tests et ce qu’il attend du back

| Fichier | Ce que le backend doit fournir |
|---------|---------------------------------|
| **01-auth.spec.ts** | Login/signup/forgot-password endpoints ; un compte valide (E2E_USER_*) pour “login with valid credentials” et “logout”. |
| **02-pages-public.spec.ts** | Aucune donnée métier ; juste que les pages renvoient 200 et le contenu attendu. |
| **03-search.spec.ts** | Au moins un bien en base (recherche par ville, type=PARKING) ; `GET /api/places/search` (ou équivalent) avec résultats pour au moins une ville. |
| **04-booking.spec.ts** | Même bien(s) ; endpoint réservation/checkout (redirection vers Stripe ou page de confirmation selon ton flow). |
| **05-owner.spec.ts** | Compte hôte (E2E_HOST_*) ; `GET /api/places` (mes biens) ou équivalent pour “host my-places”. |
| **06-user.spec.ts** | Compte client (E2E_USER_*) ; pages parametres, messages, favoris, reservations chargent (listes peuvent être vides). |
| **07-messages.spec.ts** | Compte client + `E2E_PLACE_ID` + `E2E_HOST_USER_ID` ; endpoint(s) messages/conversation pour que la page messages avec `?placeId=&userId=` ouvre le panneau conversation. |
| **08-reservations-detail.spec.ts** | `E2E_RESERVATION_ID` + une réservation accessible par le client ou l’hôte de test ; `GET /api/reservations/{id}` (ou équivalent). |
| **09-host-edit.spec.ts** | Un bien dont le propriétaire est le host de test (`E2E_PLACE_ID` = cet `id`) ; `GET /api/places/{id}` et éventuellement `PUT /api/places/{id}`. |
| **10-home-dashboard.spec.ts** | Compte client et compte hôte ; après login, la page home (ou redirection) affiche liens/navigation attendus. |

---

## 4. Résumé : à demander au backend

1. **Créer (ou garantir) 2 comptes de test**  
   - Un **client** : email + mot de passe (pour `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`).  
   - Un **hôte** : email + mot de passe (pour `E2E_HOST_EMAIL` / `E2E_HOST_PASSWORD`).

2. **Un bien (place)**  
   - Appartenant au compte hôte, actif, avec au moins une ville (ex. Paris) et des créneaux/dispos si la réservation est testée.  
   - Donner son **place ID** et l’**user ID du propriétaire** (pour `E2E_PLACE_ID` et `E2E_HOST_USER_ID`).

3. **Une réservation** (optionnel mais recommandé)  
   - Liée à ce bien et au client (ou à l’hôte).  
   - Donner son **reservation ID** pour `E2E_RESERVATION_ID`.

4. **Endpoints attendus (à confirmer avec le back)**  
   - Auth : login (et si tu testes signup/forgot-password, les endpoints correspondants).  
   - `GET /api/users/{id}` pour le profil (peut renvoyer 404 si non implémenté).  
   - Recherche biens : type `GET /api/places/search?...` (ou équivalent) avec au moins un résultat pour une ville.  
   - Réservations : détail d’une réservation par ID pour l’utilisateur connecté.  
   - Messages : liste/conversation pour l’utilisateur connecté (et si tu veux le test avec URL, conversation par `placeId` + `userId`).  
   - Places : `GET` (et si tu testes l’édition, `PUT`) pour un bien dont l’utilisateur est propriétaire.

Dès que ces données et endpoints sont en place, les tests E2E Playwright peuvent tourner sans mock, avec les variables d’env ci‑dessus.

---

## 5. Lancer les tests E2E

```bash
# Tous les tests (front sur http://localhost:3000, backend doit être disponible)
E2E_USER_EMAIL=client@example.com E2E_USER_PASSWORD=secret \
E2E_HOST_EMAIL=host@example.com E2E_HOST_PASSWORD=secret \
npm run test:e2e

# Avec IDs optionnels pour messages / réservation détail / édition annonce
E2E_PLACE_ID=123 E2E_HOST_USER_ID=456 E2E_RESERVATION_ID=789 \
E2E_USER_EMAIL=... E2E_USER_PASSWORD=... E2E_HOST_EMAIL=... E2E_HOST_PASSWORD=... \
npm run test:e2e

# Un seul navigateur (plus rapide)
npm run test:e2e -- --project=chromium

# Rapport après exécution
npm run test:e2e:report
```
